import type {
  AssetBalance,
  CardCapability,
  CardOperation,
  FundingAssetBalance,
  ProviderCard,
  ProviderType,
  Transaction,
  WalletProduct,
} from '../domain/types';

export const STORAGE_PORTFOLIO_CACHE = 'portwallet.portfolioCache';

export const PORTFOLIO_CACHE_VERSION = 1 as const;

export type PortfolioAccountSnapshot = {
  savedId: string;
  /** Account id at the time of caching; used to remap ids after reconnect. */
  accountId: string;
  product?: WalletProduct;
  providerType: ProviderType;
  nickname: string;
  capability: CardCapability;
  balances: AssetBalance[];
  transactions: Transaction[];
  cards: ProviderCard[];
  cardOperations: CardOperation[];
  funding: FundingAssetBalance[];
};

export type PortfolioCache = {
  version: typeof PORTFOLIO_CACHE_VERSION;
  updatedAt: string;
  accounts: PortfolioAccountSnapshot[];
};

function isWalletProduct(value: unknown): value is WalletProduct {
  return value === 'FUND' || value === 'UNIFIED' || value === 'EARN';
}

function isProviderType(value: unknown): value is ProviderType {
  return (
    value === 'bybit' ||
    value === 'binance' ||
    value === 'non_custodial' ||
    value === 'mock'
  );
}

function isCardCapability(value: unknown): value is CardCapability {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  if (typeof row.supported !== 'boolean') return false;
  if (
    row.unsupportedReason != null &&
    typeof row.unsupportedReason !== 'string'
  ) {
    return false;
  }
  return true;
}

function parseSnapshot(value: unknown): PortfolioAccountSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.savedId !== 'string' || !row.savedId) return null;
  if (typeof row.accountId !== 'string' || !row.accountId) return null;
  if (!isProviderType(row.providerType)) return null;
  if (typeof row.nickname !== 'string') return null;
  if (!isCardCapability(row.capability)) return null;
  if (!Array.isArray(row.balances)) return null;
  if (!Array.isArray(row.transactions)) return null;
  if (!Array.isArray(row.cards)) return null;
  if (!Array.isArray(row.cardOperations)) return null;
  if (!Array.isArray(row.funding)) return null;

  const snapshot: PortfolioAccountSnapshot = {
    savedId: row.savedId,
    accountId: row.accountId,
    providerType: row.providerType,
    nickname: row.nickname,
    capability: {
      supported: row.capability.supported,
      ...(typeof row.capability.unsupportedReason === 'string'
        ? { unsupportedReason: row.capability.unsupportedReason }
        : {}),
    },
    balances: row.balances as AssetBalance[],
    transactions: row.transactions as Transaction[],
    cards: row.cards as ProviderCard[],
    cardOperations: row.cardOperations as CardOperation[],
    funding: row.funding as FundingAssetBalance[],
  };

  if (isWalletProduct(row.product)) {
    snapshot.product = row.product;
  }

  return snapshot;
}

export function readPortfolioCache(): PortfolioCache | null {
  try {
    const raw = localStorage.getItem(STORAGE_PORTFOLIO_CACHE);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const row = parsed as Record<string, unknown>;
    if (row.version !== PORTFOLIO_CACHE_VERSION) return null;
    if (typeof row.updatedAt !== 'string' || !row.updatedAt) return null;
    if (!Array.isArray(row.accounts)) return null;

    const accounts = row.accounts
      .map(parseSnapshot)
      .filter((entry): entry is PortfolioAccountSnapshot => entry != null);

    return {
      version: PORTFOLIO_CACHE_VERSION,
      updatedAt: row.updatedAt,
      accounts,
    };
  } catch {
    return null;
  }
}

export function writePortfolioCache(cache: PortfolioCache): void {
  try {
    localStorage.setItem(STORAGE_PORTFOLIO_CACHE, JSON.stringify(cache));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearPortfolioCache(): void {
  try {
    localStorage.removeItem(STORAGE_PORTFOLIO_CACHE);
  } catch {
    /* ignore */
  }
}

export function snapshotKey(
  savedId: string,
  product?: WalletProduct,
): string {
  return product ? `${savedId}::${product}` : savedId;
}

/** Replace cached slices for the given accounts; keep unrelated entries. */
export function mergePortfolioCache(
  previous: PortfolioCache | null,
  snapshots: PortfolioAccountSnapshot[],
  updatedAt: string = new Date().toISOString(),
): PortfolioCache {
  const map = new Map<string, PortfolioAccountSnapshot>();
  for (const entry of previous?.accounts ?? []) {
    map.set(snapshotKey(entry.savedId, entry.product), entry);
  }
  for (const entry of snapshots) {
    map.set(snapshotKey(entry.savedId, entry.product), entry);
  }
  return {
    version: PORTFOLIO_CACHE_VERSION,
    updatedAt,
    accounts: [...map.values()],
  };
}

export function removePortfolioCacheBySavedId(savedId: string): void {
  const previous = readPortfolioCache();
  if (!previous) return;
  const accounts = previous.accounts.filter((entry) => entry.savedId !== savedId);
  if (accounts.length === 0) {
    clearPortfolioCache();
    return;
  }
  writePortfolioCache({
    version: PORTFOLIO_CACHE_VERSION,
    updatedAt: previous.updatedAt,
    accounts,
  });
}

export function removePortfolioCacheEntry(
  savedId: string,
  product?: WalletProduct,
): void {
  const previous = readPortfolioCache();
  if (!previous) return;
  const key = snapshotKey(savedId, product);
  const accounts = previous.accounts.filter(
    (entry) => snapshotKey(entry.savedId, entry.product) !== key,
  );
  if (accounts.length === previous.accounts.length) return;
  if (accounts.length === 0) {
    clearPortfolioCache();
    return;
  }
  writePortfolioCache({
    version: PORTFOLIO_CACHE_VERSION,
    updatedAt: previous.updatedAt,
    accounts,
  });
}

function rewriteId(value: string, fromId: string, toId: string): string {
  if (value === fromId) return toId;
  if (value.startsWith(`${fromId}_`)) {
    return `${toId}${value.slice(fromId.length)}`;
  }
  return value;
}

/** Remap a cached snapshot onto a freshly connected account id. */
export function remapSnapshotToAccount(
  snapshot: PortfolioAccountSnapshot,
  accountId: string,
): PortfolioAccountSnapshot {
  const fromId = snapshot.accountId;
  if (fromId === accountId) {
    return { ...snapshot, accountId };
  }

  return {
    ...snapshot,
    accountId,
    balances: snapshot.balances.map((row) => ({
      ...row,
      accountId: rewriteId(row.accountId, fromId, accountId),
    })),
    transactions: snapshot.transactions.map((row) => ({
      ...row,
      accountId: rewriteId(row.accountId, fromId, accountId),
    })),
    cards: snapshot.cards.map((row) => ({
      ...row,
      id: rewriteId(row.id, fromId, accountId),
      accountId: rewriteId(row.accountId, fromId, accountId),
    })),
    cardOperations: snapshot.cardOperations.map((row) => ({
      ...row,
      id: row.id,
      cardId: rewriteId(row.cardId, fromId, accountId),
      accountId: rewriteId(row.accountId, fromId, accountId),
    })),
  };
}

export function findPortfolioSnapshot(
  cache: PortfolioCache | null,
  savedId: string,
  product?: WalletProduct,
): PortfolioAccountSnapshot | null {
  if (!cache) return null;
  const key = snapshotKey(savedId, product);
  return (
    cache.accounts.find(
      (entry) => snapshotKey(entry.savedId, entry.product) === key,
    ) ?? null
  );
}
