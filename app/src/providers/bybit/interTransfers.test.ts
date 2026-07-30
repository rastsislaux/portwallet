import { describe, expect, it } from 'vitest';
import {
  interTransferDirection,
  interTransferToTransaction,
  type InterTransferRow,
} from './interTransfers';

const row: InterTransferRow = {
  transferId: 'tr_1',
  coin: 'ETH',
  amount: '0.00279496',
  status: 'SUCCESS',
  timestamp: '1700000000000',
  fromAccountType: 'FUND',
  toAccountType: 'UNIFIED',
};

describe('interTransferDirection', () => {
  it('marks Funding → UTA as out on FUND and in on UNIFIED', () => {
    expect(interTransferDirection('FUND', 'UNIFIED', 'FUND')).toBe('out');
    expect(interTransferDirection('FUND', 'UNIFIED', 'UNIFIED')).toBe('in');
  });

  it('marks UTA → Funding as out on UNIFIED and in on FUND', () => {
    expect(interTransferDirection('UNIFIED', 'FUND', 'UNIFIED')).toBe('out');
    expect(interTransferDirection('UNIFIED', 'FUND', 'FUND')).toBe('in');
  });

  it('returns null for unrelated products', () => {
    expect(interTransferDirection('FUND', 'UNIFIED', 'EARN')).toBeNull();
  });
});

describe('interTransferToTransaction', () => {
  it('emits debit on sender and credit on receiver with absolute quantity', () => {
    const fromFund = interTransferToTransaction(row, 'acct_fund', 'bybit main', 'FUND');
    const toUta = interTransferToTransaction(row, 'acct_uta', 'bybit main', 'UNIFIED');

    expect(fromFund).toMatchObject({
      id: 'tr_1_FUND',
      accountId: 'acct_fund',
      kind: 'internal',
      status: 'completed',
      assetSymbol: 'ETH',
      quantity: 0.00279496,
      product: 'FUND',
      direction: 'out',
      counterparty: 'FUND → UNIFIED',
    });

    expect(toUta).toMatchObject({
      id: 'tr_1_UNIFIED',
      accountId: 'acct_uta',
      kind: 'internal',
      status: 'completed',
      assetSymbol: 'ETH',
      quantity: 0.00279496,
      product: 'UNIFIED',
      direction: 'in',
      counterparty: 'FUND → UNIFIED',
    });
  });

  it('skips rows that do not involve the product', () => {
    expect(
      interTransferToTransaction(row, 'acct_earn', 'bybit main', 'EARN'),
    ).toBeNull();
  });

  it('skips invalid amounts and missing transfer ids', () => {
    expect(
      interTransferToTransaction(
        { ...row, amount: '0' },
        'acct_fund',
        'bybit main',
        'FUND',
      ),
    ).toBeNull();
    expect(
      interTransferToTransaction(
        { ...row, transferId: undefined },
        'acct_fund',
        'bybit main',
        'FUND',
      ),
    ).toBeNull();
  });
});
