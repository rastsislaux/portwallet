import { describe, expect, it } from 'vitest';
import { splitSpotPair, spotExecutionToTransaction } from './spotExecutions';

describe('splitSpotPair', () => {
  it('splits USDT and USDC pairs', () => {
    expect(splitSpotPair('BTCUSDT')).toEqual({ base: 'BTC', quote: 'USDT' });
    expect(splitSpotPair('ethusdc')).toEqual({ base: 'ETH', quote: 'USDC' });
  });

  it('returns null for unknown quotes', () => {
    expect(splitSpotPair('BTC')).toBeNull();
  });
});

describe('spotExecutionToTransaction', () => {
  it('maps a buy fill as quote→base exchange with USD cost', () => {
    const tx = spotExecutionToTransaction(
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

    expect(tx).toMatchObject({
      id: 'exec_e1',
      kind: 'exchange',
      status: 'completed',
      assetSymbol: 'USDT',
      quantity: 2500,
      fiatValueUsd: 2500,
      counterAssetSymbol: 'BTC',
      counterQuantity: 0.05,
      product: 'UNIFIED',
    });
  });

  it('maps a sell fill as base→quote exchange', () => {
    const tx = spotExecutionToTransaction(
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

    expect(tx).toMatchObject({
      id: 'exec_e2',
      assetSymbol: 'ETH',
      quantity: 1,
      fiatValueUsd: 2700,
      counterAssetSymbol: 'USDT',
      counterQuantity: 2700,
    });
  });

  it('derives execValue from price × qty when value missing', () => {
    const tx = spotExecutionToTransaction(
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
    expect(tx?.quantity).toBe(1500);
    expect(tx?.fiatValueUsd).toBe(1500);
    expect(tx?.counterQuantity).toBe(10);
  });
});
