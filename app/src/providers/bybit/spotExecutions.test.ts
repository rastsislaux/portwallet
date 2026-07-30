import { describe, expect, it } from 'vitest';
import { splitSpotPair, spotExecutionToTransactions } from './spotExecutions';

describe('splitSpotPair', () => {
  it('splits USDT and USDC pairs', () => {
    expect(splitSpotPair('BTCUSDT')).toEqual({ base: 'BTC', quote: 'USDT' });
    expect(splitSpotPair('ethusdc')).toEqual({ base: 'ETH', quote: 'USDC' });
  });

  it('returns null for unknown quotes', () => {
    expect(splitSpotPair('BTC')).toBeNull();
  });
});

describe('spotExecutionToTransactions', () => {
  it('maps a buy fill as quote debit and base credit with USD cost', () => {
    const txs = spotExecutionToTransactions(
      {
        execId: 'e1',
        symbol: 'BTCUSDT',
        side: 'Buy',
        execQty: '0.05',
        execPrice: '50000',
        execValue: '2500',
        execTime: '1700000000000',
      },
      'acc',
      'Bybit',
      'UNIFIED',
    );

    expect(txs).toHaveLength(2);
    expect(txs[0]).toMatchObject({
      id: 'exec_e1_out',
      kind: 'exchange',
      status: 'completed',
      direction: 'out',
      assetSymbol: 'USDT',
      quantity: 2500,
      fiatValueUsd: 2500,
      counterAssetSymbol: 'BTC',
      counterQuantity: 0.05,
      product: 'UNIFIED',
    });
    expect(txs[1]).toMatchObject({
      id: 'exec_e1_in',
      direction: 'in',
      assetSymbol: 'BTC',
      quantity: 0.05,
      fiatValueUsd: 2500,
      counterAssetSymbol: 'USDT',
      counterQuantity: 2500,
    });
  });

  it('maps a sell fill as base debit and quote credit', () => {
    const txs = spotExecutionToTransactions(
      {
        execId: 'e2',
        symbol: 'ETHUSDT',
        side: 'Sell',
        execQty: '1',
        execPrice: '2700',
        execValue: '2700',
        execTime: 1700000000,
      },
      'acc',
      'Bybit',
    );

    expect(txs[0]).toMatchObject({
      id: 'exec_e2_out',
      direction: 'out',
      assetSymbol: 'ETH',
      quantity: 1,
      fiatValueUsd: 2700,
      counterAssetSymbol: 'USDT',
      counterQuantity: 2700,
    });
    expect(txs[1]).toMatchObject({
      id: 'exec_e2_in',
      direction: 'in',
      assetSymbol: 'USDT',
      quantity: 2700,
      counterAssetSymbol: 'ETH',
      counterQuantity: 1,
    });
  });

  it('derives execValue from price × qty when value missing', () => {
    const txs = spotExecutionToTransactions(
      {
        execId: 'e3',
        symbol: 'SOLUSDT',
        side: 'Buy',
        execQty: '10',
        execPrice: '150',
        execTime: '1700000000000',
      },
      'acc',
      'Bybit',
    );
    expect(txs[0]?.quantity).toBe(1500);
    expect(txs[0]?.fiatValueUsd).toBe(1500);
    expect(txs[1]?.quantity).toBe(10);
  });
});
