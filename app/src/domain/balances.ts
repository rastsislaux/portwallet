import type { AssetBalance } from './types';

export function balanceQuantity(
  balances: AssetBalance[],
  accountId: string,
  symbol: string,
): number {
  return (
    balances.find((b) => b.accountId === accountId && b.symbol === symbol)
      ?.quantity ?? 0
  );
}

export function isInsufficientBalance(
  quantity: number,
  available: number,
): boolean {
  return Number.isFinite(quantity) && quantity > 0 && quantity > available + 1e-12;
}
