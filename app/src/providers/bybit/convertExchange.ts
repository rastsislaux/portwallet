import type { OperationStatus, Transaction, WalletProduct } from '../../domain/types';
import { exchangeLegs } from '../../domain/exchangeLegs';
import type { ConvertHistoryRow } from './historyStorage';

function num(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toIso(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString();
  }
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  if (/^\d+$/.test(String(value))) {
    const n = Number(value);
    const ms = n < 1e12 ? n * 1000 : n;
    return new Date(ms).toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(+d) ? new Date().toISOString() : d.toISOString();
}

function mapConvertStatus(status: string | undefined): OperationStatus {
  const st = (status ?? '').toLowerCase();
  if (st.includes('success') || st === 'init_ok') return 'completed';
  if (st.includes('fail')) return 'failed';
  return 'pending';
}

export type ConvertFiatEstimator = (
  fromCoin: string,
  toCoin: string,
  fromAmount: number,
  toAmount: number,
) => number;

/**
 * Map a Bybit convert row into debit + credit legs for the given product.
 */
export function convertToTransactions(
  row: ConvertHistoryRow,
  accountId: string,
  providerLabel: string,
  product: WalletProduct,
  estimateFiatUsd: ConvertFiatEstimator,
): Transaction[] {
  const fromCoin = (row.fromCoin ?? '').toUpperCase();
  const toCoin = (row.toCoin ?? '').toUpperCase();
  const fromAmount = num(row.fromAmount);
  const toAmount = num(row.toAmount);
  const exchangeTxId = row.exchangeTxId;
  if (!exchangeTxId || !fromCoin || !toCoin) return [];
  if (!(fromAmount > 0) || !(toAmount > 0)) return [];

  return exchangeLegs({
    idBase: `${exchangeTxId}_${product}`,
    accountId,
    providerLabel,
    product,
    status: mapConvertStatus(row.exchangeStatus),
    fromSymbol: fromCoin,
    fromQuantity: fromAmount,
    toSymbol: toCoin,
    toQuantity: toAmount,
    fiatValueUsd: estimateFiatUsd(fromCoin, toCoin, fromAmount, toAmount),
    createdAt: toIso(row.createdAt),
  });
}
