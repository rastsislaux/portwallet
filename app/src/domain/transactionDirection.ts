import type { Transaction } from './types';

/** Whether the row should display as a credit (+) for the owning account. */
export function isTransactionCredit(tx: Transaction): boolean {
  if (tx.kind === 'deposit') return true;
  if (tx.kind === 'internal' && tx.direction === 'in') return true;
  return false;
}

export function transactionAmountSign(tx: Transaction): '+' | '−' {
  return isTransactionCredit(tx) ? '+' : '−';
}
