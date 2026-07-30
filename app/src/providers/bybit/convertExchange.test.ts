import { describe, expect, it } from 'vitest';
import { convertToTransactions } from './convertExchange';

describe('convertToTransactions', () => {
  it('emits out/in legs for a Funding convert', () => {
    const txs = convertToTransactions(
      {
        exchangeTxId: 'c1',
        fromCoin: 'USDT',
        toCoin: 'GRAM',
        fromAmount: '10',
        toAmount: '123.4',
        exchangeStatus: 'success',
        createdAt: '1700000000000',
        accountType: 'eb_convert_funding',
      },
      'acct_fund',
      'bybit main',
      'FUND',
      () => 10,
    );

    expect(txs).toHaveLength(2);
    expect(txs[0]).toMatchObject({
      id: 'c1_FUND_out',
      direction: 'out',
      assetSymbol: 'USDT',
      quantity: 10,
      counterAssetSymbol: 'GRAM',
      counterQuantity: 123.4,
      product: 'FUND',
      status: 'completed',
      fiatValueUsd: 10,
    });
    expect(txs[1]).toMatchObject({
      id: 'c1_FUND_in',
      direction: 'in',
      assetSymbol: 'GRAM',
      quantity: 123.4,
      counterAssetSymbol: 'USDT',
      counterQuantity: 10,
    });
  });

  it('skips incomplete convert rows', () => {
    expect(
      convertToTransactions(
        {
          exchangeTxId: 'c2',
          fromCoin: 'USDT',
          toCoin: 'BTC',
          fromAmount: '0',
          toAmount: '1',
          exchangeStatus: 'success',
        },
        'acct',
        'bybit',
        'FUND',
        () => 0,
      ),
    ).toEqual([]);
  });
});
