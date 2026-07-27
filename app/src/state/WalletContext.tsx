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
import { ProviderRegistry } from '../providers/registry';
import {
  addSavedAccount,
  createSavedAccountId,
  readSavedAccounts,
  removeSavedAccount,
  updateSavedAccount,
  type SavedAccountCredentials,
} from './accountStorage';
import { BybitCryptoProvider } from '../providers/bybit/BybitCryptoProvider';

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

type WalletContextValue = {
  ready: boolean;
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

export function WalletProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
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
  const [restoreFailures, setRestoreFailures] = useState<RestoreFailure[]>([]);
  const instanceToSavedId = useRef(new Map<string, string>());

  const selectedAccounts = useMemo(() => {
    if (filter === 'all') return accounts;
    return accounts.filter((a) => a.id === filter);
  }, [accounts, filter]);

  const refresh = useCallback(async () => {
    const bals: AssetBalance[] = [];
    const txs: Transaction[] = [];
    const nextCards: ProviderCard[] = [];
    const nextOps: CardOperation[] = [];
    const statuses: AccountCardStatus[] = [];
    const fundingMap: Record<string, FundingAssetBalance[]> = {};

    for (const account of selectedAccounts) {
      const provider = registry.getForAccount(account.id);
      bals.push(...(await provider.listBalances(account.id)));
      txs.push(...(await provider.getTransactions(account.id)));

      const capability = await provider.getCardCapability(account.id);
      const accountCards = capability.supported
        ? await provider.listCards(account.id)
        : [];
      const ops = capability.supported
        ? await provider.getCardOperations(account.id)
        : [];
      const funding = capability.supported
        ? await provider.listFundingBalances(account.id)
        : [];

      nextCards.push(...accountCards);
      nextOps.push(...ops);
      statuses.push({ account, capability, cards: accountCards });
      fundingMap[account.id] = funding;
    }

    txs.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    nextOps.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    setBalances(bals);
    setTransactions(txs);
    setCards(nextCards);
    setCardOperations(nextOps);
    setAccountCardStatuses(statuses);
    setFundingByAccountId(fundingMap);
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

      setAccounts(restored);
      setRestoreFailures(failures);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, refresh]);

  const assets = useMemo(() => aggregate(balances), [balances]);
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
    await provider.disconnect(accountId);
    registry.unbindAccount(accountId);
    setAccounts((prev) => {
      const removed = prev.find((a) => a.id === accountId);
      const next = prev.filter((a) => a.id !== accountId);
      if (removed) {
        const stillConnected = next.some(
          (a) => a.providerInstanceId === removed.providerInstanceId,
        );
        if (!stillConnected) {
          const savedId = instanceToSavedId.current.get(removed.providerInstanceId);
          if (savedId) {
            removeSavedAccount(savedId);
            instanceToSavedId.current.delete(removed.providerInstanceId);
          }
        }
      }
      return next;
    });
    setFilter((f) => (f === accountId ? 'all' : f));
  }, []);

  const discardSavedAccount = useCallback((savedId: string) => {
    removeSavedAccount(savedId);
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
