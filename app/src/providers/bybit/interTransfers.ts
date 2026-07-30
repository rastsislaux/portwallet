import type {
  OperationStatus,
  Transaction,
  TransactionDirection,
  WalletProduct,
} from '../../domain/types';

export type InterTransferRow = {
  transferId?: string;
  coin?: string;
  amount?: string;
  status?: string;
  timestamp?: string | number;
  fromAccountType?: string;
  toAccountType?: string;
};

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

function mapStatus(status: string | undefined): OperationStatus {
  const st = (status ?? '').toUpperCase();
  if (st === 'SUCCESS') return 'completed';
  if (st === 'FAILED') return 'failed';
  return 'pending';
}

/**
 * Direction of an inter-account transfer relative to `product`.
 * Returns null when the product is neither sender nor receiver.
 */
export function interTransferDirection(
  fromAccountType: string | undefined | null,
  toAccountType: string | undefined | null,
  product: WalletProduct,
): TransactionDirection | null {
  const from = (fromAccountType ?? '').toUpperCase();
  const to = (toAccountType ?? '').toUpperCase();
  const isFrom = from === product;
  const isTo = to === product;
  if (isTo && !isFrom) return 'in';
  if (isFrom && !isTo) return 'out';
  return null;
}

/**
 * Map a Bybit inter-transfer row onto one product account.
 * Funding → UTA yields `out` on FUND and `in` on UNIFIED (same absolute qty).
 */
export function interTransferToTransaction(
  row: InterTransferRow,
  accountId: string,
  providerLabel: string,
  product: WalletProduct,
): Transaction | null {
  const direction = interTransferDirection(
    row.fromAccountType,
    row.toAccountType,
    product,
  );
  if (!direction) return null;

  const quantity = num(row.amount);
  if (!(quantity > 0)) return null;

  const transferId = row.transferId;
  if (!transferId) return null;

  return {
    id: `${transferId}_${product}`,
    accountId,
    kind: 'internal',
    status: mapStatus(row.status),
    assetSymbol: (row.coin ?? '').toUpperCase(),
    quantity,
    fiatValueUsd: 0,
    counterparty: `${row.fromAccountType ?? '?'} → ${row.toAccountType ?? '?'}`,
    createdAt: toIso(row.timestamp),
    providerLabel,
    product,
    direction,
  };
}
