import { describe, expect, it } from 'vitest';
import { exchangeLegs, exchangeRouteLabel } from './exchangeLegs';
import type { Transaction } from './types';

describe('exchangeLegs', () => {
  it('emits debit on spent asset and credit on received asset', () => {
    const legs = exchangeLegs({
      idBase: 'conv_1_FUND',
      accountId: 'acct',
      providerLabel: 'bybit main',
      product: 'FUND',
      status: 'completed',
      fromSymbol: 'USDT',
      fromQuantity: 10,
      toSymbol: 'GRAM',
      toQuantity: 100,
      fiatValueUsd: 10,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(legs).toHaveLength(2);
    expect(legs[0]).toMatchObject({
      id: 'conv_1_FUND_out',
      kind: 'exchange',
      direction: 'out',
      assetSymbol: 'USDT',
      quantity: 10,
      counterAssetSymbol: 'GRAM',
      counterQuantity: 100,
      fiatValueUsd: 10,
    });
    expect(legs[1]).toMatchObject({
      id: 'conv_1_FUND_in',
      kind: 'exchange',
      direction: 'in',
      assetSymbol: 'GRAM',
      quantity: 100,
      counterAssetSymbol: 'USDT',
      counterQuantity: 10,
      fiatValueUsd: 10,
    });
  });

  it('skips invalid amounts or missing ids', () => {
    expect(
      exchangeLegs({
        idBase: '',
        accountId: 'acct',
        providerLabel: 'bybit',
        status: 'completed',
        fromSymbol: 'USDT',
        fromQuantity: 1,
        toSymbol: 'BTC',
        toQuantity: 1,
        fiatValueUsd: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toEqual([]);
  });
});

describe('exchangeRouteLabel', () => {
  it('keeps spent→received order on both legs', () => {
    const out: Transaction = {
      id: 'x_out',
      accountId: 'a',
      kind: 'exchange',
      status: 'completed',
      assetSymbol: 'USDT',
      quantity: 10,
      fiatValueUsd: 10,
      counterAssetSymbol: 'GRAM',
      counterQuantity: 100,
      direction: 'out',
      createdAt: '2026-01-01T00:00:00.000Z',
      providerLabel: 'bybit',
    };
    const inn: Transaction = {
      ...out,
      id: 'x_in',
      assetSymbol: 'GRAM',
      quantity: 100,
      counterAssetSymbol: 'USDT',
      counterQuantity: 10,
      direction: 'in',
    };
    expect(exchangeRouteLabel(out)).toBe('Exchange USDT→GRAM');
    expect(exchangeRouteLabel(inn)).toBe('Exchange USDT→GRAM');
  });
});
