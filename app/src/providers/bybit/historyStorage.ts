import { APP_VERSION } from '../../appVersion';
import type { BybitServerId } from '../../domain/types';
import type { SpotExecutionRow } from './spotExecutions';

export const STORAGE_BYBIT_HISTORY = 'portwallet.bybitHistory';

/** Overlap when fetching only new history so boundary fills are not missed. */
export const HISTORY_FETCH_OVERLAP_MS = 60 * 60 * 1000;

export type DepositHistoryRow = {
  txID?: string;
  coin?: string;
  amount?: string;
  chain?: string;
  status?: number;
  successAt?: string;
  createTime?: string;
};

export type ConvertHistoryRow = {
  exchangeTxId?: string;
  fromCoin?: string;
  toCoin?: string;
  fromAmount?: string;
  toAmount?: string;
  exchangeStatus?: string;
  createdAt?: string;
  accountType?: string;
};

export type HistoryStreamState<T> = {
  /** Newest timestamp we have successfully checked through. */
  checkedAtMs: number;
  /**
   * Oldest timestamp covered by a completed backward scan.
   * While backfill is incomplete this moves earlier as windows are fetched.
   */
  coveredFromMs: number;
  /** True once the configured lookback has been fully scanned. */
  backfillComplete: boolean;
  rows: T[];
};

export type BybitAccountHistory = {
  spot: HistoryStreamState<SpotExecutionRow>;
  deposits: HistoryStreamState<DepositHistoryRow>;
  converts: HistoryStreamState<ConvertHistoryRow>;
};

export type BybitHistoryStore = {
  appVersion: string;
  accounts: Record<string, BybitAccountHistory>;
};

export function bybitHistoryCacheKey(
  server: BybitServerId,
  userId: string | number,
): string {
  return `${server}:${userId}`;
}

export function emptyHistoryStream<T>(now = Date.now()): HistoryStreamState<T> {
  return {
    checkedAtMs: now,
    coveredFromMs: now,
    backfillComplete: false,
    rows: [],
  };
}

export function emptyAccountHistory(now = Date.now()): BybitAccountHistory {
  return {
    spot: emptyHistoryStream(now),
    deposits: emptyHistoryStream(now),
    converts: emptyHistoryStream(now),
  };
}

function isHistoryStream(value: unknown): value is HistoryStreamState<unknown> {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.checkedAtMs === 'number' &&
    typeof row.coveredFromMs === 'number' &&
    typeof row.backfillComplete === 'boolean' &&
    Array.isArray(row.rows)
  );
}

function parseAccountHistory(value: unknown): BybitAccountHistory | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (!isHistoryStream(row.spot)) return null;
  if (!isHistoryStream(row.deposits)) return null;
  if (!isHistoryStream(row.converts)) return null;
  return {
    spot: row.spot as HistoryStreamState<SpotExecutionRow>,
    deposits: row.deposits as HistoryStreamState<DepositHistoryRow>,
    converts: row.converts as HistoryStreamState<ConvertHistoryRow>,
  };
}

export function readBybitHistoryStore(): BybitHistoryStore | null {
  try {
    const raw = localStorage.getItem(STORAGE_BYBIT_HISTORY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const row = parsed as Record<string, unknown>;
    if (row.appVersion !== APP_VERSION) return null;
    if (!row.accounts || typeof row.accounts !== 'object') return null;

    const accounts: Record<string, BybitAccountHistory> = {};
    for (const [key, value] of Object.entries(
      row.accounts as Record<string, unknown>,
    )) {
      const account = parseAccountHistory(value);
      if (account) accounts[key] = account;
    }
    return { appVersion: APP_VERSION, accounts };
  } catch {
    return null;
  }
}

export function readBybitAccountHistory(
  cacheKey: string,
): BybitAccountHistory | null {
  const store = readBybitHistoryStore();
  return store?.accounts[cacheKey] ?? null;
}

export function writeBybitAccountHistory(
  cacheKey: string,
  history: BybitAccountHistory,
): void {
  try {
    const existing = readBybitHistoryStore();
    const store: BybitHistoryStore = {
      appVersion: APP_VERSION,
      accounts: { ...(existing?.accounts ?? {}), [cacheKey]: history },
    };
    localStorage.setItem(STORAGE_BYBIT_HISTORY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

export function clearBybitHistoryStore(): void {
  try {
    localStorage.removeItem(STORAGE_BYBIT_HISTORY);
  } catch {
    /* ignore */
  }
}

/** Start of the incremental forward window, with overlap. */
export function incrementalStartMs(checkedAtMs: number, now = Date.now()): number {
  return Math.min(now, Math.max(0, checkedAtMs - HISTORY_FETCH_OVERLAP_MS));
}
