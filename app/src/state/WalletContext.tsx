import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AggregatedAsset,
  AssetBalance,
  CardCapability,
  CardOperation,
  ConnectConfig,
  ExchangeQuote,
  ExchangeRequest,
  FundingAssetBalance,
  OperationResult,
  ProviderCard,
  ProviderType,
  ReceiveAddress,
  SendPreview,
  SendRequest,
  Transaction,
  WalletAccount,
} from '../domain/types';
import { withPurchasePnl } from '../domain/costBasis';
import { ProviderRegistry } from '../providers/registry';
import {
  addSavedAccount,
  createSavedAccountId,
  readSavedAccounts,
  removeSavedAccount,
  updateSavedAccount,
  type SavedAccountCredentials,
} from './accountStorage';
import {
  findPortfolioSnapshot,
  mergePortfolioCache,
  readPortfolioCache,
  remapSnapshotToAccount,
  removePortfolioCacheBySavedId,
  removePortfolioCacheEntry,
  writePortfolioCache,
  type PortfolioAccountSnapshot,
} from './portfolioStorage';
import { BybitCryptoProvider } from '../providers/bybit/BybitCryptoProvider';
import { isBybitRateLimitError } from '../providers/bybit/client';

export type AccountFilter = 'all' | string;

export type AccountCardStatus = {
  account: WalletAccount;
  capability: CardCapability;
  cards: ProviderCard[];
};

export type RestoreFailure = {
  id: string;
  nickname: string;
  message: string;
};

export type CardDataWarning = {
  accountId: string;
  nickname: string;
  message: string;
};

/** How often portfolio data is refreshed while the app stays open. */
export const PORTFOLIO_POLL_INTERVAL_MS = 120_000;

/** Re-fetch when the app becomes visible again if data is older than this. */
export const PORTFOLIO_VISIBILITY_STALE_MS = 30_000;

type WalletContextValue = {
  ready: boolean;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  accounts: WalletAccount[];
  filter: AccountFilter;
  setFilter: (filter: AccountFilter) => void;
  selectedAccounts: WalletAccount[];
  balances: AssetBalance[];
  assets: AggregatedAsset[];
  totalFiatUsd: number;
  transactions: Transaction[];
  cards: ProviderCard[];
  cardOperations: CardOperation[];
  accountCardStatuses: AccountCardStatus[];
  fundingByAccountId: Record<string, FundingAssetBalance[]>;
  cardWarnings: CardDataWarning[];
  custodySummary: string;
  availableProviderTypes: ReturnType<ProviderRegistry['listAvailableTypes']>;
  restoreFailures: RestoreFailure[];
  discardSavedAccount: (savedId: string) => void;
  refresh: () => Promise<void>;
  addAccount: (
    type: ProviderType,
    config: ConnectConfig,
  ) => Promise<WalletAccount[]>;
  attachBybitCardKey: (
    providerInstanceId: string,
    cardApiKey: string,
    cardApiSecret: string,
  ) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  prepareSend: (request: SendRequest) => Promise<SendPreview>;
  submitSend: (accountId: string, previewId: string) => Promise<OperationResult>;
  getReceiveAddress: (
    accountId: string,
    assetSymbol: string,
    networkId: string,
  ) => Promise<ReceiveAddress>;
  listNetworks: (
    accountId: string,
    assetSymbol: string,
  ) => Promise<{ id: string; name: string; assetSymbol: string }[]>;
  prepareExchange: (request: ExchangeRequest) => Promise<ExchangeQuote>;
  submitExchange: (accountId: string, quoteId: string) => Promise<OperationResult>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const registry = new ProviderRegistry();

function aggregate(balances: AssetBalance[]): AggregatedAsset[] {
  const map = new Map<string, AggregatedAsset>();
  for (const b of balances) {
    const existing = map.get(b.assetId);
    if (!existing) {
      map.set(b.assetId, {
        assetId: b.assetId,
        symbol: b.symbol,
        name: b.name,
        quantity: b.quantity,
        fiatValueUsd: b.fiatValueUsd,
        accountIds: [b.accountId],
      });
    } else {
      existing.quantity += b.quantity;
      existing.fiatValueUsd += b.fiatValueUsd;
      if (!existing.accountIds.includes(b.accountId)) {
        existing.accountIds.push(b.accountId);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.fiatValueUsd - a.fiatValueUsd);
}

function buildCustodySummary(accounts: WalletAccount[]): string {
  if (accounts.length === 0) return 'No accounts connected';

  const custodial = accounts.filter((a) => a.custody === 'custodial');
  const nonCustodial = accounts.filter((a) => a.custody === 'non_custodial');

  if (custodial.length > 0 && nonCustodial.length > 0) {
    const venues = [...new Set(accounts.map((a) => a.venueLabel))].join(', ');
    return `Mixed custody · ${venues}`;
  }

  if (nonCustodial.length > 0) {
    const n = nonCustodial.length;
    return `Non-custodial · ${n} wallet${n === 1 ? '' : 's'}`;
  }

  const venues = [...new Set(custodial.map((a) => a.venueLabel))];
  if (venues.length === 1) {
    const n = custodial.length;
    return `Held by ${venues[0]} · ${n} account${n === 1 ? '' : 's'}`;
  }

  return `Custodial · ${venues.join(', ')}`;
}

function describeCardLoadFailure(err: unknown, nickname: string): string {
  if (isBybitRateLimitError(err)) {
    return `Bybit rate-limited card activity for ${nickname}. Showing the last loaded data — try again in a moment.`;
  }
  if (err instanceof Error && err.message.trim()) {
    return `Could not refresh card data for ${nickname}: ${err.message}`;
  }
  return `Could not refresh card data for ${nickname}. Showing the last loaded data.`;
}

function applyHydratedPortfolio(
  accounts: WalletAccount[],
  savedIdByInstance: Map<string, string>,
): {
  balances: AssetBalance[];
  transactions: Transaction[];
  cards: ProviderCard[];
  cardOperations: CardOperation[];
  accountCardStatuses: AccountCardStatus[];
  fundingByAccountId: Record<string, FundingAssetBalance[]>;
  updatedAt: string | null;
} | null {
  const cache = readPortfolioCache();
  if (!cache || accounts.length === 0) return null;

  const bals: AssetBalance[] = [];
  const txs: Transaction[] = [];
  const nextCards: ProviderCard[] = [];
  const nextOps: CardOperation[] = [];
  const statuses: AccountCardStatus[] = [];
  const fundingMap: Record<string, FundingAssetBalance[]> = {};
  let matched = 0;

  for (const account of accounts) {
    const savedId = savedIdByInstance.get(account.providerInstanceId);
    if (!savedId) continue;
    const raw = findPortfolioSnapshot(cache, savedId, account.product);
    if (!raw) continue;
    matched += 1;
    const snapshot = remapSnapshotToAccount(raw, account.id);
    bals.push(...snapshot.balances);
    txs.push(...snapshot.transactions);
    nextCards.push(...snapshot.cards);
    nextOps.push(...snapshot.cardOperations);
    statuses.push({
      account,
      capability: snapshot.capability,
      cards: snapshot.cards,
    });
    fundingMap[account.id] = snapshot.funding;
  }

  if (matched === 0) return null;

  txs.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  nextOps.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return {
    balances: bals,
    transactions: txs,
    cards: nextCards,
    cardOperations: nextOps,
    accountCardStatuses: statuses,
    fundingByAccountId: fundingMap,
    updatedAt: cache.updatedAt,
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [filter, setFilter] = useState<AccountFilter>('all');
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<ProviderCard[]>([]);
  const [cardOperations, setCardOperations] = useState<CardOperation[]>([]);
  const [accountCardStatuses, setAccountCardStatuses] = useState<AccountCardStatus[]>(
    [],
  );
  const [fundingByAccountId, setFundingByAccountId] = useState<
    Record<string, FundingAssetBalance[]>
  >({});
  const [cardWarnings, setCardWarnings] = useState<CardDataWarning[]>([]);
  const [restoreFailures, setRestoreFailures] = useState<RestoreFailure[]>([]);
  const instanceToSavedId = useRef(new Map<string, string>());
  const cardsRef = useRef<ProviderCard[]>([]);
  const cardOperationsRef = useRef<CardOperation[]>([]);
  const fundingRef = useRef<Record<string, FundingAssetBalance[]>>({});
  const refreshingRef = useRef(false);
  const refreshGen = useRef(0);
  const lastUpdatedAtRef = useRef<string | null>(null);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);
  useEffect(() => {
    cardOperationsRef.current = cardOperations;
  }, [cardOperations]);
  useEffect(() => {
    fundingRef.current = fundingByAccountId;
  }, [fundingByAccountId]);
  useEffect(() => {
    lastUpdatedAtRef.current = lastUpdatedAt;
  }, [lastUpdatedAt]);

  const selectedAccounts = useMemo(() => {
    if (filter === 'all') return accounts;
    return accounts.filter((a) => a.id === filter);
  }, [accounts, filter]);

  const refresh = useCallback(async () => {
    const gen = ++refreshGen.current;
    refreshingRef.current = true;
    setIsRefreshing(true);

    const bals: AssetBalance[] = [];
    const txs: Transaction[] = [];
    const nextCards: ProviderCard[] = [];
    const nextOps: CardOperation[] = [];
    const statuses: AccountCardStatus[] = [];
    const fundingMap: Record<string, FundingAssetBalance[]> = {};
    const warnings: CardDataWarning[] = [];
    const snapshots: PortfolioAccountSnapshot[] = [];

    try {
      for (const account of selectedAccounts) {
        const provider = registry.getForAccount(account.id);
        const accountBalances = await provider.listBalances(account.id);
        const accountTxs = await provider.getTransactions(account.id);
        bals.push(...accountBalances);
        txs.push(...accountTxs);

        const capability = await provider.getCardCapability(account.id);
        let accountCards: ProviderCard[] = [];
        let ops: CardOperation[] = [];
        let funding: FundingAssetBalance[] = [];

        if (!capability.supported) {
          statuses.push({ account, capability, cards: [] });
          fundingMap[account.id] = [];
        } else {
          try {
            accountCards = await provider.listCards(account.id);
            ops = await provider.getCardOperations(account.id);
            funding = await provider.listFundingBalances(account.id);
            nextCards.push(...accountCards);
            nextOps.push(...ops);
            statuses.push({ account, capability, cards: accountCards });
            fundingMap[account.id] = funding;
          } catch (err) {
            const priorCards = cardsRef.current.filter(
              (c) => c.accountId === account.id,
            );
            const priorOps = cardOperationsRef.current.filter(
              (o) => o.accountId === account.id,
            );
            const priorFunding = fundingRef.current[account.id] ?? [];
            accountCards = priorCards;
            ops = priorOps;
            funding = priorFunding;
            nextCards.push(...priorCards);
            nextOps.push(...priorOps);
            statuses.push({ account, capability, cards: priorCards });
            fundingMap[account.id] = priorFunding;
            warnings.push({
              accountId: account.id,
              nickname: account.nickname,
              message: describeCardLoadFailure(err, account.nickname),
            });
          }
        }

        const savedId = instanceToSavedId.current.get(account.providerInstanceId);
        if (savedId) {
          snapshots.push({
            savedId,
            accountId: account.id,
            product: account.product,
            providerType: account.providerType,
            nickname: account.nickname,
            capability,
            balances: accountBalances,
            transactions: accountTxs,
            cards: accountCards,
            cardOperations: ops,
            funding,
          });
        }
      }

      if (gen !== refreshGen.current) return;

      txs.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      nextOps.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      setBalances(bals);
      setTransactions(txs);
      setCards(nextCards);
      setCardOperations(nextOps);
      setAccountCardStatuses(statuses);
      setFundingByAccountId(fundingMap);
      setCardWarnings(warnings);

      if (snapshots.length > 0) {
        const updatedAt = new Date().toISOString();
        const nextCache = mergePortfolioCache(
          readPortfolioCache(),
          snapshots,
          updatedAt,
        );
        writePortfolioCache(nextCache);
        setLastUpdatedAt(updatedAt);
      } else if (selectedAccounts.length === 0) {
        setLastUpdatedAt(new Date().toISOString());
      }
    } finally {
      if (gen === refreshGen.current) {
        refreshingRef.current = false;
        setIsRefreshing(false);
      }
    }
  }, [selectedAccounts]);

  const didBootstrap = useRef(false);
  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;

    void (async () => {
      const saved = readSavedAccounts();
      const restored: WalletAccount[] = [];
      const failures: RestoreFailure[] = [];

      for (const entry of saved) {
        try {
          const provider = registry.getFactory(entry.providerType);
          const connected = await provider.connect({
            nickname: entry.nickname,
            apiKey: entry.apiKey,
            apiSecret: entry.apiSecret,
            bybitServer: entry.bybitServer,
            cardApiKey: entry.cardApiKey,
            cardApiSecret: entry.cardApiSecret,
          });
          for (const account of connected) {
            registry.bindAccount(account.id, provider);
          }
          if (connected[0]) {
            instanceToSavedId.current.set(connected[0].providerInstanceId, entry.id);
          }
          restored.push(...connected);
        } catch (err) {
          failures.push({
            id: entry.id,
            nickname: entry.nickname,
            message:
              err instanceof Error ? err.message : 'Could not restore account',
          });
        }
      }

      const hydrated = applyHydratedPortfolio(
        restored,
        instanceToSavedId.current,
      );
      if (hydrated) {
        setBalances(hydrated.balances);
        setTransactions(hydrated.transactions);
        setCards(hydrated.cards);
        setCardOperations(hydrated.cardOperations);
        setAccountCardStatuses(hydrated.accountCardStatuses);
        setFundingByAccountId(hydrated.fundingByAccountId);
        setLastUpdatedAt(hydrated.updatedAt);
      }

      setAccounts(restored);
      setRestoreFailures(failures);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, refresh]);

  useEffect(() => {
    if (!ready) return;

    const timer = window.setInterval(() => {
      if (!refreshingRef.current) {
        void refresh();
      }
    }, PORTFOLIO_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [ready, refresh]);

  useEffect(() => {
    if (!ready) return;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (refreshingRef.current) return;
      const updatedAt = lastUpdatedAtRef.current;
      const age = updatedAt ? Date.now() - Date.parse(updatedAt) : Number.POSITIVE_INFINITY;
      if (!Number.isFinite(age) || age >= PORTFOLIO_VISIBILITY_STALE_MS) {
        void refresh();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ready, refresh]);

  const assets = useMemo(
    () => withPurchasePnl(aggregate(balances), transactions),
    [balances, transactions],
  );
  const totalFiatUsd = useMemo(
    () => assets.reduce((sum, a) => sum + a.fiatValueUsd, 0),
    [assets],
  );
  const custodySummary = useMemo(
    () => buildCustodySummary(selectedAccounts),
    [selectedAccounts],
  );

  const addAccount = useCallback(
    async (type: ProviderType, config: ConnectConfig) => {
      const provider = registry.getFactory(type);
      const connected = await provider.connect(config);
      for (const account of connected) {
        registry.bindAccount(account.id, provider);
      }

      const saved: SavedAccountCredentials = {
        id: createSavedAccountId(),
        providerType: type,
        nickname: config.nickname.trim(),
        apiKey: config.apiKey?.trim() || undefined,
        apiSecret: config.apiSecret?.trim() || undefined,
        bybitServer: config.bybitServer,
        cardApiKey: config.cardApiKey?.trim() || undefined,
        cardApiSecret: config.cardApiSecret?.trim() || undefined,
      };
      addSavedAccount(saved);
      if (connected[0]) {
        instanceToSavedId.current.set(connected[0].providerInstanceId, saved.id);
      }

      setAccounts((prev) => [...prev, ...connected]);
      return connected;
    },
    [],
  );

  const attachBybitCardKey = useCallback(
    async (
      providerInstanceId: string,
      cardApiKey: string,
      cardApiSecret: string,
    ) => {
      const sample = accounts.find(
        (a) => a.providerInstanceId === providerInstanceId,
      );
      if (!sample) {
        throw new Error('Account not found.');
      }
      const provider = registry.getForAccount(sample.id);
      if (!(provider instanceof BybitCryptoProvider)) {
        throw new Error('Bybit Card keys are only supported for Bybit accounts.');
      }

      const updated = await provider.attachCardCredentials(
        providerInstanceId,
        cardApiKey,
        cardApiSecret,
      );

      const savedId = instanceToSavedId.current.get(providerInstanceId);
      if (savedId) {
        updateSavedAccount(savedId, {
          cardApiKey: cardApiKey.trim(),
          cardApiSecret: cardApiSecret.trim(),
        });
      }

      setAccounts((prev) =>
        prev.map((account) => {
          const next = updated.find((row) => row.id === account.id);
          return next ?? account;
        }),
      );
      await refresh();
    },
    [accounts, refresh],
  );

  const removeAccount = useCallback(async (accountId: string) => {
    const provider = registry.getForAccount(accountId);
    const removed = accounts.find((a) => a.id === accountId);
    await provider.disconnect(accountId);
    registry.unbindAccount(accountId);

    const nextAccounts = accounts.filter((a) => a.id !== accountId);
    if (removed) {
      const stillConnected = nextAccounts.some(
        (a) => a.providerInstanceId === removed.providerInstanceId,
      );
      const savedId = instanceToSavedId.current.get(removed.providerInstanceId);
      if (savedId) {
        if (!stillConnected) {
          removeSavedAccount(savedId);
          instanceToSavedId.current.delete(removed.providerInstanceId);
          removePortfolioCacheBySavedId(savedId);
        } else {
          removePortfolioCacheEntry(savedId, removed.product);
        }
      }
    }

    setAccounts(nextAccounts);
    setFilter((f) => (f === accountId ? 'all' : f));
    setBalances((prev) => prev.filter((row) => row.accountId !== accountId));
    setTransactions((prev) => prev.filter((row) => row.accountId !== accountId));
    setCards((prev) => prev.filter((row) => row.accountId !== accountId));
    setCardOperations((prev) => prev.filter((row) => row.accountId !== accountId));
    setAccountCardStatuses((prev) =>
      prev.filter((row) => row.account.id !== accountId),
    );
    setFundingByAccountId((prev) => {
      if (!(accountId in prev)) return prev;
      const next = { ...prev };
      delete next[accountId];
      return next;
    });
  }, [accounts]);

  const discardSavedAccount = useCallback((savedId: string) => {
    removeSavedAccount(savedId);
    removePortfolioCacheBySavedId(savedId);
    setRestoreFailures((prev) => prev.filter((row) => row.id !== savedId));
  }, []);

  const prepareSend = useCallback(
    (request: SendRequest) =>
      registry.getForAccount(request.accountId).prepareSend(request),
    [],
  );

  const submitSend = useCallback(
    async (accountId: string, previewId: string) => {
      const result = await registry.getForAccount(accountId).submitSend(previewId);
      await refresh();
      return result;
    },
    [refresh],
  );

  const getReceiveAddress = useCallback(
    (accountId: string, assetSymbol: string, networkId: string) =>
      registry
        .getForAccount(accountId)
        .getReceiveAddress(accountId, assetSymbol, networkId),
    [],
  );

  const listNetworks = useCallback(
    (accountId: string, assetSymbol: string) =>
      registry.getForAccount(accountId).listNetworks(accountId, assetSymbol),
    [],
  );

  const prepareExchange = useCallback(
    (request: ExchangeRequest) =>
      registry.getForAccount(request.accountId).prepareExchange(request),
    [],
  );

  const submitExchange = useCallback(
    async (accountId: string, quoteId: string) => {
      const result = await registry.getForAccount(accountId).submitExchange(quoteId);
      await refresh();
      return result;
    },
    [refresh],
  );

  const availableProviderTypes = useMemo(
    () => registry.listAvailableTypes(),
    [],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      ready,
      isRefreshing,
      lastUpdatedAt,
      accounts,
      filter,
      setFilter,
      selectedAccounts,
      balances,
      assets,
      totalFiatUsd,
      transactions,
      cards,
      cardOperations,
      accountCardStatuses,
      fundingByAccountId,
      cardWarnings,
      custodySummary,
      availableProviderTypes,
      restoreFailures,
      discardSavedAccount,
      refresh,
      addAccount,
      attachBybitCardKey,
      removeAccount,
      prepareSend,
      submitSend,
      getReceiveAddress,
      listNetworks,
      prepareExchange,
      submitExchange,
    }),
    [
      ready,
      isRefreshing,
      lastUpdatedAt,
      accounts,
      filter,
      selectedAccounts,
      balances,
      assets,
      totalFiatUsd,
      transactions,
      cards,
      cardOperations,
      accountCardStatuses,
      fundingByAccountId,
      cardWarnings,
      custodySummary,
      availableProviderTypes,
      restoreFailures,
      discardSavedAccount,
      refresh,
      addAccount,
      attachBybitCardKey,
      removeAccount,
      prepareSend,
      submitSend,
      getReceiveAddress,
      listNetworks,
      prepareExchange,
      submitExchange,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
