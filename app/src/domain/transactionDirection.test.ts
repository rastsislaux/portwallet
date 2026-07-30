import { describe, expect, it } from 'vitest';
import type { Transaction } from './types';
import { isTransactionCredit, transactionAmountSign } from './transactionDirection';

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: 'tx1',
    accountId: 'acct',
    kind: 'withdrawal',
    status: 'completed',
    assetSymbol: 'ETH',
    quantity: 0.01,
    fiatValueUsd: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    providerLabel: 'bybit main',
    ...partial,
  };
}

describe('transactionDirection', () => {
  it('treats deposits as credits', () => {
    const deposit = tx({ kind: 'deposit' });
    expect(isTransactionCredit(deposit)).toBe(true);
    expect(transactionAmountSign(deposit)).toBe('+');
  });

  it('treats internal transfers by direction', () => {
    const out = tx({ kind: 'internal', direction: 'out' });
    const inn = tx({ kind: 'internal', direction: 'in' });
    expect(isTransactionCredit(out)).toBe(false);
    expect(isTransactionCredit(inn)).toBe(true);
    expect(transactionAmountSign(out)).toBe('−');
    expect(transactionAmountSign(inn)).toBe('+');
  });

  it('defaults internal without direction to debit', () => {
    const legacy = tx({ kind: 'internal' });
    expect(isTransactionCredit(legacy)).toBe(false);
    expect(transactionAmountSign(legacy)).toBe('−');
  });

  it('treats exchange legs by direction', () => {
    const out = tx({ kind: 'exchange', direction: 'out' });
    const inn = tx({ kind: 'exchange', direction: 'in' });
    expect(isTransactionCredit(out)).toBe(false);
    expect(isTransactionCredit(inn)).toBe(true);
    expect(transactionAmountSign(out)).toBe('−');
    expect(transactionAmountSign(inn)).toBe('+');
  });

  it('treats withdrawals and legacy exchanges as debits of the spent asset', () => {
    expect(isTransactionCredit(tx({ kind: 'withdrawal' }))).toBe(false);
    expect(isTransactionCredit(tx({ kind: 'exchange' }))).toBe(false);
  });
});
