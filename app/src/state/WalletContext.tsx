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

export type AccountFilter = 'all' | string;

export type AccountCardStatus = {
  account: WalletAccount;
  capability: CardCapability;
  cards: ProviderCard[];
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
  refresh: () => Promise<void>;
  addAccount: (type: ProviderType, nickname: string) => Promise<WalletAccount>;
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

async function bootstrapAccounts(): Promise<WalletAccount[]> {
  const bybit = registry.getFactory('bybit');
  const a1 = await bybit.connect({ nickname: 'Personal Bybit' });
  registry.bindAccount(a1.id, bybit);
  const a2 = await bybit.connect({ nickname: 'Trading Bybit' });
  registry.bindAccount(a2.id, bybit);
  return [a1, a2];
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
      const initial = await bootstrapAccounts();
      setAccounts(initial);
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

  const addAccount = useCallback(async (type: ProviderType, nickname: string) => {
    const provider = registry.getFactory(type);
    const account = await provider.connect({ nickname });
    registry.bindAccount(account.id, provider);
    setAccounts((prev) => [...prev, account]);
    return account;
  }, []);

  const removeAccount = useCallback(
    async (accountId: string) => {
      const provider = registry.getForAccount(accountId);
      await provider.disconnect(accountId);
      registry.unbindAccount(accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      setFilter((f) => (f === accountId ? 'all' : f));
    },
    [],
  );

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
      registry.getForAccount(accountId).listNetworks(assetSymbol),
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
      refresh,
      addAccount,
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
      refresh,
      addAccount,
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
