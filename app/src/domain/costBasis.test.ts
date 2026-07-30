import { describe, expect, it } from 'vitest';
import {
  acquisitionCostUsd,
  averagePurchasePrice,
  formatPurchasePnl,
  unrealizedPnlFromAverageBuy,
  withPurchasePnl,
} from './costBasis';
import type { AggregatedAsset, Transaction } from './types';

function tx(partial: Partial<Transaction> & Pick<Transaction, 'kind' | 'assetSymbol' | 'quantity'>): Transaction {
  return {
    id: partial.id ?? `tx_${Math.random().toString(36).slice(2, 10)}`,
    accountId: partial.accountId ?? 'acc',
    kind: partial.kind,
    status: partial.status ?? 'completed',
    assetSymbol: partial.assetSymbol,
    quantity: partial.quantity,
    fiatValueUsd: partial.fiatValueUsd ?? 0,
    counterAssetSymbol: partial.counterAssetSymbol,
    counterQuantity: partial.counterQuantity,
    direction: partial.direction,
    createdAt: partial.createdAt ?? '2024-01-01T00:00:00.000Z',
    providerLabel: partial.providerLabel ?? 'Mock',
  };
}

describe('averagePurchasePrice', () => {
  it('weights multiple buys into an average purchase price', () => {
    const txs = [
      tx({
        kind: 'exchange',
        assetSymbol: 'USDT',
        quantity: 5,
        fiatValueUsd: 5,
        counterAssetSymbol: 'COIN',
        counterQuantity: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
      tx({
        kind: 'exchange',
        assetSymbol: 'USDT',
        quantity: 10,
        fiatValueUsd: 10,
        counterAssetSymbol: 'COIN',
        counterQuantity: 5,
        createdAt: '2024-01-02T00:00:00.000Z',
      }),
    ];

    const purchase = averagePurchasePrice(txs, 'COIN');
    expect(purchase).toEqual({
      averagePriceUsd: 1.5,
      totalCostUsd: 15,
      acquiredQuantity: 10,
    });
  });

  it('includes deposits with known fiat value', () => {
    const purchase = averagePurchasePrice(
      [
        tx({
          kind: 'deposit',
          assetSymbol: 'BTC',
          quantity: 0.02,
          fiatValueUsd: 1000,
        }),
      ],
      'BTC',
    );
    expect(purchase?.averagePriceUsd).toBe(50_000);
  });

  it('ignores pending, failed, and zero-cost acquisitions', () => {
    const purchase = averagePurchasePrice(
      [
        tx({
          kind: 'deposit',
          assetSymbol: 'ETH',
          quantity: 1,
          fiatValueUsd: 0,
        }),
        tx({
          kind: 'exchange',
          status: 'pending',
          assetSymbol: 'USDT',
          quantity: 100,
          fiatValueUsd: 100,
          counterAssetSymbol: 'ETH',
          counterQuantity: 0.05,
        }),
        tx({
          kind: 'withdrawal',
          assetSymbol: 'ETH',
          quantity: 0.1,
          fiatValueUsd: 200,
        }),
      ],
      'ETH',
    );
    expect(purchase).toBeNull();
  });

  it('dedupes acquisitions that share the same transaction id', () => {
    const buy = tx({
      id: 'exec_1',
      kind: 'exchange',
      assetSymbol: 'USDT',
      quantity: 100,
      fiatValueUsd: 100,
      counterAssetSymbol: 'ETH',
      counterQuantity: 0.05,
    });
    const purchase = averagePurchasePrice([buy, { ...buy }], 'ETH');
    expect(purchase).toEqual({
      averagePriceUsd: 2000,
      totalCostUsd: 100,
      acquiredQuantity: 0.05,
    });
  });

  it('estimates cost from stablecoin from-amount when fiat is missing', () => {
    const lot = acquisitionCostUsd(
      tx({
        kind: 'exchange',
        assetSymbol: 'USDT',
        quantity: 270,
        fiatValueUsd: 0,
        counterAssetSymbol: 'ETH',
        counterQuantity: 0.1,
      }),
      'ETH',
    );
    expect(lot).toEqual({ quantity: 0.1, costUsd: 270 });
  });

  it('uses dual-entry credit legs for acquisition cost', () => {
    const lot = acquisitionCostUsd(
      tx({
        kind: 'exchange',
        direction: 'in',
        assetSymbol: 'ETH',
        quantity: 0.1,
        fiatValueUsd: 270,
        counterAssetSymbol: 'USDT',
        counterQuantity: 270,
      }),
      'ETH',
    );
    expect(lot).toEqual({ quantity: 0.1, costUsd: 270 });
  });

  it('estimates dual-entry credit cost from stablecoin spent when fiat missing', () => {
    const lot = acquisitionCostUsd(
      tx({
        kind: 'exchange',
        direction: 'in',
        assetSymbol: 'ETH',
        quantity: 0.1,
        fiatValueUsd: 0,
        counterAssetSymbol: 'USDT',
        counterQuantity: 270,
      }),
      'ETH',
    );
    expect(lot).toEqual({ quantity: 0.1, costUsd: 270 });
  });

  it('ignores dual-entry debit legs for acquisition', () => {
    const lot = acquisitionCostUsd(
      tx({
        kind: 'exchange',
        direction: 'out',
        assetSymbol: 'USDT',
        quantity: 270,
        fiatValueUsd: 270,
        counterAssetSymbol: 'ETH',
        counterQuantity: 0.1,
      }),
      'ETH',
    );
    expect(lot).toBeNull();
  });
});

describe('unrealizedPnlFromAverageBuy', () => {
  it('reports 100% profit when price doubles vs average buy', () => {
    const txs = [
      tx({
        kind: 'exchange',
        assetSymbol: 'USDT',
        quantity: 5,
        fiatValueUsd: 5,
        counterAssetSymbol: 'COIN',
        counterQuantity: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
      tx({
        kind: 'exchange',
        assetSymbol: 'USDT',
        quantity: 10,
        fiatValueUsd: 10,
        counterAssetSymbol: 'COIN',
        counterQuantity: 5,
        createdAt: '2024-01-02T00:00:00.000Z',
      }),
    ];

    // 10 coins @ avg 1.5 = 15 cost; mark at 3 each = 30 → +15 (+100%)
    const pnl = unrealizedPnlFromAverageBuy(txs, 'COIN', 10, 30);
    expect(pnl).toEqual({
      averagePriceUsd: 1.5,
      costBasisUsd: 15,
      pnlUsd: 15,
      pnlPct: 100,
    });
  });

  it('reports a loss when mark is below average buy', () => {
    const txs = [
      tx({
        kind: 'deposit',
        assetSymbol: 'BTC',
        quantity: 1,
        fiatValueUsd: 100,
      }),
    ];
    const pnl = unrealizedPnlFromAverageBuy(txs, 'BTC', 1, 90);
    expect(pnl?.pnlUsd).toBe(-10);
    expect(pnl?.pnlPct).toBe(-10);
  });

  it('skips stablecoins', () => {
    const pnl = unrealizedPnlFromAverageBuy(
      [
        tx({
          kind: 'deposit',
          assetSymbol: 'USDT',
          quantity: 100,
          fiatValueUsd: 100,
        }),
      ],
      'USDT',
      100,
      100,
    );
    expect(pnl).toBeNull();
  });
});

describe('withPurchasePnl / formatPurchasePnl', () => {
  it('attaches pnl fields onto aggregated assets', () => {
    const assets: AggregatedAsset[] = [
      {
        assetId: 'coin',
        symbol: 'COIN',
        name: 'Coin',
        quantity: 10,
        fiatValueUsd: 30,
        accountIds: ['a'],
      },
    ];
    const txs = [
      tx({
        kind: 'exchange',
        assetSymbol: 'USDT',
        quantity: 15,
        fiatValueUsd: 15,
        counterAssetSymbol: 'COIN',
        counterQuantity: 10,
      }),
    ];
    const [enriched] = withPurchasePnl(assets, txs);
    expect(enriched.unrealizedPnlPct).toBe(100);
    expect(enriched.unrealizedPnlUsd).toBe(15);
    expect(enriched.averageBuyPriceUsd).toBe(1.5);
  });

  it('formats signed percent and fiat', () => {
    expect(formatPurchasePnl(100, 15, (n) => `${n.toFixed(2)} USD`)).toBe(
      '+100% (+15.00 USD)',
    );
    expect(formatPurchasePnl(-10, -2, (n) => `${n.toFixed(2)} USD`)).toBe(
      '-10% (-2.00 USD)',
    );
  });
});
