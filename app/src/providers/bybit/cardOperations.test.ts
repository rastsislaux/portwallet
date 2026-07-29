import { describe, expect, it } from 'vitest';
import {
  cleanDeclinedReason,
  mapBybitCardAssetRecord,
  mapCardSide,
  mapCardStatus,
} from './cardOperations';

/** Real Bybit payload from Apple.COM/BILL (user-provided). */
const APPLE_BILL = {
  pan4: '8734',
  pan6: '537872',
  tradeStatus: '0',
  side: '1',
  basicAmount: '3.190000000000000000',
  basicCurrency: 'USD',
  transactionAmount: '3.130000000000000000',
  transactionCurrency: 'USD',
  txnCreate: '1785318689000',
  merchCountry: 'IRL',
  merchCity: 'CORK',
  merchName: 'APPLE.COM/BILL',
  txnId: '2000000119512424',
  declinedReason: '0',
  totalFees: '0.06000000',
  uid: '547479670',
  transactionCurrencyAmount: '3.1900000000',
  fxPad: '0E-8',
  interchangeFee: '0E-18',
  billAmount: '3.130000000000000000',
  paidAmount: '1490.000000000000000000',
  paidCurrency: 'KZT',
  bonusAmount: '0E-18',
  foreignTransactionFee: '0.06000000',
  totalTax: '0',
  paidFiat: '0.000000000000000000',
  withdrawalFee: '0',
  status: '1',
  orderNo: '2026208240363085808025668692_547479670',
  mccCode: '5818',
  merchCategoryDesc: '5818',
} as const;

describe('mapBybitCardAssetRecord', () => {
  it('maps paid* as list primary and keeps USD card/total separate', () => {
    const op = mapBybitCardAssetRecord(APPLE_BILL, {
      accountId: 'acct_1',
      providerLabel: 'Bybit',
      fallbackId: 'cardop_x',
    });

    expect(op.amountFiat).toBe(1490);
    expect(op.currency).toBe('KZT');
    expect(op.cardAmount).toBe(3.13);
    expect(op.cardCurrency).toBe('USD');
    expect(op.settlementAmount).toBe(3.19);
    expect(op.settlementCurrency).toBe('USD');
    expect(op.feeAmount).toBe(0.06);
    expect(op.feeCurrency).toBe('USD');
    expect(op.amountTokenValue).toBeUndefined();
    expect(op.tokenSymbol).toBeUndefined();
    expect(op.merchant).toBe('APPLE.COM/BILL');
    expect(op.merchantCity).toBe('CORK');
    expect(op.merchantCountry).toBe('IRL');
    expect(op.cardLastFour).toBe('8734');
    expect(op.failureReason).toBeUndefined();
    expect(op.status).toBe('pending');
    expect(op.kind).toBe('purchase');
  });

  it('exposes token fields when paid currency is crypto', () => {
    const op = mapBybitCardAssetRecord(
      {
        ...APPLE_BILL,
        paidAmount: '3.19000000',
        paidCurrency: 'USDT',
        tradeStatus: '1',
        status: '1',
        declinedReason: '',
      },
      {
        accountId: 'acct_1',
        providerLabel: 'Bybit',
        fallbackId: 'cardop_x',
      },
    );

    expect(op.amountFiat).toBe(3.19);
    expect(op.currency).toBe('USDT');
    expect(op.amountTokenValue).toBe(3.19);
    expect(op.tokenSymbol).toBe('USDT');
    expect(op.cardAmount).toBe(3.13);
    expect(op.cardCurrency).toBe('USD');
  });
});

describe('cleanDeclinedReason', () => {
  it('treats "0" and empty as no reason', () => {
    expect(cleanDeclinedReason('0')).toBeUndefined();
    expect(cleanDeclinedReason('')).toBeUndefined();
    expect(cleanDeclinedReason(undefined)).toBeUndefined();
    expect(cleanDeclinedReason('Insufficient funds')).toBe('Insufficient funds');
  });
});

describe('mapCardSide / mapCardStatus', () => {
  it('maps side and status codes', () => {
    expect(mapCardSide('13')).toBe('atm');
    expect(mapCardSide('5')).toBe('refund');
    expect(mapCardSide('1')).toBe('purchase');
    expect(mapCardStatus('1', '0')).toBe('pending');
    expect(mapCardStatus('2', '1')).toBe('failed');
    expect(mapCardStatus('1', '1')).toBe('completed');
  });
});
