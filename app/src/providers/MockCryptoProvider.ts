import type { CryptoProvider } from '../domain/CryptoProvider';
import type {
  AssetBalance,
  CardCapability,
  CardOperation,
  ConnectConfig,
  CustodyKind,
  ExchangeQuote,
  ExchangeRequest,
  FundingAssetBalance,
  NetworkInfo,
  OperationResult,
  ProviderCard,
  ProviderType,
  ReceiveAddress,
  SendPreview,
  SendRequest,
  Transaction,
  WalletAccount,
} from '../domain/types';

let idSeq = 1;
const nextId = (prefix: string) => `${prefix}_${idSeq++}`;

const NETWORKS: NetworkInfo[] = [
  { id: 'btc', name: 'Bitcoin', assetSymbol: 'BTC' },
  { id: 'eth', name: 'Ethereum', assetSymbol: 'ETH' },
  { id: 'trc20', name: 'Tron (TRC20)', assetSymbol: 'USDT' },
  { id: 'erc20', name: 'Ethereum (ERC20)', assetSymbol: 'USDT' },
];

/** Stablecoins Bybit allows for card spend from the funding account. */
const BYBIT_CARD_ELIGIBLE = new Set(['USDT', 'USDC']);
const STABLECOINS = new Set(['USDT', 'USDC', 'DAI', 'FDUSD', 'USDE', 'BUSD']);

const SPOT_USD: Record<string, number> = {
  BTC: 68420,
  ETH: 2704,
  SOL: 148,
  LINK: 14.2,
  SUI: 1.85,
};

function usdNotional(symbol: string, quantity: number): number {
  if (!(quantity > 0)) return 0;
  if (STABLECOINS.has(symbol.toUpperCase())) return quantity;
  const px = SPOT_USD[symbol.toUpperCase()];
  return px ? quantity * px : 0;
}

type InstanceSeed = {
  balances: Omit<AssetBalance, 'accountId'>[];
  transactions: Omit<Transaction, 'accountId' | 'providerLabel'>[];
  funding: Omit<FundingAssetBalance, never>[];
  /**
   * `unsupported` — venue never issues cards.
   * `none` — venue supports cards but this account has none.
   * `issued` — one or more cards exist for the account.
   */
  cardMode: 'unsupported' | 'none' | 'issued';
};

function seedFor(type: ProviderType, instanceIndex: number): InstanceSeed {
  if (type === 'non_custodial') {
    return {
      balances: [
        {
          assetId: 'btc',
          symbol: 'BTC',
          name: 'Bitcoin',
          quantity: 0.02,
          fiatValueUsd: 1368.4,
        },
        {
          assetId: 'eth',
          symbol: 'ETH',
          name: 'Ethereum',
          quantity: 0.35,
          fiatValueUsd: 945.7,
        },
      ],
      transactions: [
        {
          id: nextId('tx'),
          kind: 'deposit',
          status: 'completed',
          assetSymbol: 'BTC',
          quantity: 0.01,
          fiatValueUsd: 500,
          networkName: 'Bitcoin',
          createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        },
        {
          id: nextId('tx'),
          kind: 'deposit',
          status: 'completed',
          assetSymbol: 'BTC',
          quantity: 0.01,
          fiatValueUsd: 600,
          networkName: 'Bitcoin',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
        {
          id: nextId('tx'),
          kind: 'deposit',
          status: 'completed',
          assetSymbol: 'ETH',
          quantity: 0.35,
          fiatValueUsd: 700,
          networkName: 'Ethereum',
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
      ],
      funding: [],
      cardMode: 'unsupported',
    };
  }

  const skew = instanceIndex % 2 === 0 ? 1 : 0.55;
  const usdtQty = 220 * (instanceIndex + 1);
  const usdcQty = type === 'bybit' ? 180 * skew : 90 * skew;

  let cardMode: InstanceSeed['cardMode'] = 'issued';
  if (type === 'bybit') {
    // First Bybit account has a card; additional Bybit accounts support cards but none issued.
    cardMode = instanceIndex === 0 ? 'issued' : 'none';
  } else if (type === 'binance') {
    cardMode = 'issued';
  } else {
    cardMode = 'unsupported';
  }

  return {
    balances: [
      {
        assetId: 'btc',
        symbol: 'BTC',
        name: 'Bitcoin',
        quantity: 0.1 * skew,
        fiatValueUsd: 6842 * skew,
      },
      {
        assetId: 'eth',
        symbol: 'ETH',
        name: 'Ethereum',
        quantity: 1.1 * skew,
        fiatValueUsd: 2974.4 * skew,
      },
      {
        assetId: 'usdt',
        symbol: 'USDT',
        name: 'Tether',
        quantity: usdtQty,
        fiatValueUsd: usdtQty,
      },
    ],
    transactions: [
      {
        id: nextId('tx'),
        kind: 'exchange',
        status: 'pending',
        assetSymbol: 'BTC',
        quantity: 0.01,
        fiatValueUsd: usdNotional('BTC', 0.01),
        counterAssetSymbol: 'USDT',
        counterQuantity: 682.15,
        createdAt: new Date(Date.now() - 120000).toISOString(),
      },
      {
        id: nextId('tx'),
        kind: 'withdrawal',
        status: 'failed',
        assetSymbol: 'ETH',
        quantity: 0.05,
        fiatValueUsd: usdNotional('ETH', 0.05),
        networkName: 'Ethereum',
        failureReason: 'Insufficient fee balance',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: nextId('tx'),
        kind: 'internal',
        status: 'completed',
        assetSymbol: 'USDT',
        quantity: 200,
        fiatValueUsd: 200,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: nextId('tx'),
        kind: 'exchange',
        status: 'completed',
        assetSymbol: 'USDT',
        quantity: 2500 * skew,
        fiatValueUsd: 2500 * skew,
        counterAssetSymbol: 'BTC',
        counterQuantity: 0.05 * skew,
        createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      },
      {
        id: nextId('tx'),
        kind: 'exchange',
        status: 'completed',
        assetSymbol: 'USDT',
        quantity: 3000 * skew,
        fiatValueUsd: 3000 * skew,
        counterAssetSymbol: 'BTC',
        counterQuantity: 0.05 * skew,
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: nextId('tx'),
        kind: 'exchange',
        status: 'completed',
        assetSymbol: 'USDT',
        quantity: 2000 * skew,
        fiatValueUsd: 2000 * skew,
        counterAssetSymbol: 'ETH',
        counterQuantity: 1.1 * skew,
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
      {
        id: nextId('tx'),
        kind: 'deposit',
        status: 'completed',
        assetSymbol: 'USDT',
        quantity: usdtQty,
        fiatValueUsd: usdtQty,
        networkName: 'Tron (TRC20)',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    funding: [
      {
        symbol: 'USDT',
        name: 'Tether',
        quantity: usdtQty,
        fiatValueUsd: usdtQty,
        cardEligible: true,
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        quantity: usdcQty,
        fiatValueUsd: usdcQty,
        cardEligible: type === 'bybit' ? BYBIT_CARD_ELIGIBLE.has('USDC') : true,
      },
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        quantity: 0.004 * skew,
        fiatValueUsd: 273.68 * skew,
        cardEligible: false,
      },
    ],
    cardMode,
  };
}

function sumEligibleFunding(funding: FundingAssetBalance[]): {
  balanceUsd: number;
  symbols: string[];
} {
  const eligible = funding.filter((f) => f.cardEligible);
  return {
    balanceUsd: eligible.reduce((sum, f) => sum + f.fiatValueUsd, 0),
    symbols: eligible.map((f) => f.symbol),
  };
}

function seedCardOperations(
  cardId: string,
  accountId: string,
  providerLabel: string,
): CardOperation[] {
  return [
    {
      id: nextId('cardop'),
      cardId,
      accountId,
      kind: 'purchase',
      status: 'completed',
      merchant: 'Apple Store',
      amountFiat: 48.99,
      currency: 'USD',
      assetSymbol: 'USDT',
      quantity: 48.99,
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      providerLabel,
    },
    {
      id: nextId('cardop'),
      cardId,
      accountId,
      kind: 'purchase',
      status: 'pending',
      merchant: 'Uber',
      amountFiat: 18.4,
      currency: 'USD',
      assetSymbol: 'USDT',
      quantity: 18.4,
      createdAt: new Date(Date.now() - 900000).toISOString(),
      providerLabel,
    },
    {
      id: nextId('cardop'),
      cardId,
      accountId,
      kind: 'atm',
      status: 'failed',
      merchant: 'ATM · Berlin',
      amountFiat: 100,
      currency: 'USD',
      failureReason: 'Daily ATM limit exceeded',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      providerLabel,
    },
    {
      id: nextId('cardop'),
      cardId,
      accountId,
      kind: 'refund',
      status: 'completed',
      merchant: 'Amazon',
      amountFiat: 24.5,
      currency: 'USD',
      assetSymbol: 'USDC',
      quantity: 24.5,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      providerLabel,
    },
    {
      id: nextId('cardop'),
      cardId,
      accountId,
      kind: 'fee',
      status: 'completed',
      merchant: 'Foreign transaction fee',
      amountFiat: 0.62,
      currency: 'USD',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      providerLabel,
    },
    {
      id: nextId('cardop'),
      cardId,
      accountId,
      kind: 'top_up',
      status: 'completed',
      merchant: 'Funding account',
      amountFiat: 200,
      currency: 'USD',
      assetSymbol: 'USDT',
      quantity: 200,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      providerLabel,
    },
  ];
}

/**
 * Prototype provider. Construct once per logical venue type factory;
 * each `connect()` creates a distinct WalletAccount (multiple of same type OK).
 */
export class MockCryptoProvider implements CryptoProvider {
  readonly type: ProviderType;
  readonly custody: CustodyKind;
  readonly venueLabel: string;

  private accounts = new Map<string, WalletAccount>();
  private balances = new Map<string, AssetBalance[]>();
  private transactions = new Map<string, Transaction[]>();
  private funding = new Map<string, FundingAssetBalance[]>();
  private cardModes = new Map<string, InstanceSeed['cardMode']>();
  private cards = new Map<string, ProviderCard[]>();
  private cardOperations = new Map<string, CardOperation[]>();
  private sendPreviews = new Map<string, SendPreview>();
  private exchangeQuotes = new Map<string, ExchangeQuote>();
  private instanceCount = 0;

  constructor(type: ProviderType = 'mock', venueLabel = 'Mock venue') {
    this.type = type;
    this.venueLabel = venueLabel;
    this.custody = type === 'non_custodial' ? 'non_custodial' : 'custodial';
  }

  async connect(config: ConnectConfig): Promise<WalletAccount[]> {
    const instanceIndex = this.instanceCount++;
    const providerInstanceId = `${this.type}_inst_${instanceIndex}_${Date.now()}`;
    const account: WalletAccount = {
      id: nextId('acct'),
      nickname: config.nickname,
      providerType: this.type,
      providerInstanceId,
      custody: this.custody,
      venueLabel: this.venueLabel,
      connectedAt: new Date().toISOString(),
    };

    const seed = seedFor(this.type, instanceIndex);
    this.accounts.set(account.id, account);
    this.balances.set(
      account.id,
      seed.balances.map((b) => ({ ...b, accountId: account.id })),
    );
    this.transactions.set(
      account.id,
      seed.transactions.map((t) => ({
        ...t,
        accountId: account.id,
        providerLabel: account.nickname,
      })),
    );
    this.funding.set(
      account.id,
      seed.funding.map((f) => ({ ...f })),
    );
    this.cardModes.set(account.id, seed.cardMode);

    if (seed.cardMode === 'issued') {
      const cards = this.buildCards(account, seed.funding);
      this.cards.set(account.id, cards);
      const ops = cards.flatMap((card) =>
        seedCardOperations(card.id, account.id, account.nickname),
      );
      this.cardOperations.set(account.id, ops);
    } else {
      this.cards.set(account.id, []);
      this.cardOperations.set(account.id, []);
    }

    return [account];
  }

  private buildCards(
    account: WalletAccount,
    funding: FundingAssetBalance[],
  ): ProviderCard[] {
    if (account.providerType === 'bybit') {
      const { balanceUsd, symbols } = sumEligibleFunding(funding);
      return [
        {
          id: `${account.id}_card_4281`,
          accountId: account.id,
          providerType: 'bybit',
          label: 'Bybit Card',
          lastFour: '4281',
          network: 'visa',
          status: 'active',
          holderName: account.nickname.replace(/\s+Bybit$/i, '') || 'Cardholder',
          currency: 'USD',
          balanceUsd,
          balanceSource: 'calculated',
          fundingAssetSymbols: symbols,
          expiresLabel: '09/28',
        },
        {
          id: `${account.id}_card_9054`,
          accountId: account.id,
          providerType: 'bybit',
          label: 'Bybit Card · Metal',
          lastFour: '9054',
          network: 'visa',
          status: 'active',
          holderName: account.nickname.replace(/\s+Bybit$/i, '') || 'Cardholder',
          currency: 'USD',
          balanceUsd,
          balanceSource: 'calculated',
          fundingAssetSymbols: symbols,
          expiresLabel: '09/28',
        },
      ];
    }

    if (account.providerType === 'binance') {
      return [
        {
          id: `${account.id}_card_7712`,
          accountId: account.id,
          providerType: 'binance',
          label: 'Binance Card',
          lastFour: '7712',
          network: 'mastercard',
          status: 'active',
          holderName: account.nickname.replace(/\s+Binance$/i, '') || 'Cardholder',
          currency: 'USD',
          balanceUsd: 512.4,
          balanceSource: 'provider',
          fundingAssetSymbols: [],
          expiresLabel: '11/27',
        },
      ];
    }

    return [];
  }

  async disconnect(accountId: string): Promise<void> {
    this.accounts.delete(accountId);
    this.balances.delete(accountId);
    this.transactions.delete(accountId);
    this.funding.delete(accountId);
    this.cardModes.delete(accountId);
    this.cards.delete(accountId);
    this.cardOperations.delete(accountId);
  }

  async listBalances(accountId: string): Promise<AssetBalance[]> {
    return [...(this.balances.get(accountId) ?? [])];
  }

  async listNetworks(
    _accountId: string,
    assetSymbol: string,
  ): Promise<NetworkInfo[]> {
    return NETWORKS.filter((n) => n.assetSymbol === assetSymbol);
  }

  async getTransactions(accountId: string): Promise<Transaction[]> {
    return [...(this.transactions.get(accountId) ?? [])];
  }

  async getCardCapability(accountId: string): Promise<CardCapability> {
    const mode = this.cardModes.get(accountId);
    if (!mode || mode === 'unsupported') {
      return {
        supported: false,
        unsupportedReason:
          this.type === 'non_custodial'
            ? 'Non-custodial wallets do not issue payment cards.'
            : `${this.venueLabel} does not issue payment cards.`,
      };
    }
    return { supported: true };
  }

  async listCards(accountId: string): Promise<ProviderCard[]> {
    const cards = this.cards.get(accountId) ?? [];
    // Refresh calculated balances from current funding (Bybit-style).
    return cards.map((card) => {
      if (card.balanceSource !== 'calculated') return { ...card };
      const funding = this.funding.get(accountId) ?? [];
      const { balanceUsd, symbols } = sumEligibleFunding(funding);
      return {
        ...card,
        balanceUsd,
        fundingAssetSymbols: symbols,
      };
    });
  }

  async getCardOperations(
    accountId: string,
    cardId?: string,
  ): Promise<CardOperation[]> {
    const ops = this.cardOperations.get(accountId) ?? [];
    const filtered = cardId ? ops.filter((o) => o.cardId === cardId) : ops;
    return [...filtered].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  }

  async listFundingBalances(accountId: string): Promise<FundingAssetBalance[]> {
    return [...(this.funding.get(accountId) ?? [])];
  }

  async prepareSend(request: SendRequest): Promise<SendPreview> {
    const network =
      NETWORKS.find((n) => n.id === request.networkId) ??
      NETWORKS.find((n) => n.assetSymbol === request.assetSymbol);
    if (!network) {
      throw new Error('Network not available for asset');
    }

    const feeQuantity =
      request.kind === 'withdrawal'
        ? request.assetSymbol === 'BTC'
          ? 0.000012
          : 0.0012
        : 0;

    const preview: SendPreview = {
      id: nextId('send'),
      request,
      networkName: network.name,
      feeQuantity,
      feeAssetSymbol: request.assetSymbol,
      youReceiveQuantity: Math.max(0, request.quantity - feeQuantity),
      estimatedArrival:
        request.kind === 'withdrawal' ? '~20 min' : 'Usually under a minute',
      irreversible: request.kind === 'withdrawal',
    };
    this.sendPreviews.set(preview.id, preview);
    return preview;
  }

  async submitSend(previewId: string): Promise<OperationResult> {
    const preview = this.sendPreviews.get(previewId);
    if (!preview) {
      return {
        operationId: nextId('op'),
        status: 'failed',
        message: 'Send preview expired. Start again.',
      };
    }

    const tx: Transaction = {
      id: nextId('tx'),
      accountId: preview.request.accountId,
      kind: preview.request.kind,
      status: preview.request.kind === 'withdrawal' ? 'pending' : 'completed',
      assetSymbol: preview.request.assetSymbol,
      quantity: preview.request.quantity,
      fiatValueUsd: preview.request.quantity * 68420,
      networkName: preview.networkName,
      counterparty: preview.request.destination,
      createdAt: new Date().toISOString(),
      providerLabel:
        this.accounts.get(preview.request.accountId)?.nickname ?? this.venueLabel,
    };

    const list = this.transactions.get(preview.request.accountId) ?? [];
    list.unshift(tx);
    this.transactions.set(preview.request.accountId, list);

    const bals = this.balances.get(preview.request.accountId) ?? [];
    const bal = bals.find((b) => b.symbol === preview.request.assetSymbol);
    if (bal) {
      bal.quantity = Math.max(0, bal.quantity - preview.request.quantity);
      bal.fiatValueUsd = bal.quantity * (bal.symbol === 'BTC' ? 68420 : bal.symbol === 'ETH' ? 2704 : 1);
    }

    return {
      operationId: nextId('op'),
      status: tx.status,
      message:
        tx.status === 'pending'
          ? 'Withdrawal submitted. Waiting for network confirmation.'
          : 'Transfer completed.',
      transactionId: tx.id,
    };
  }

  async getReceiveAddress(
    accountId: string,
    assetSymbol: string,
    networkId: string,
  ): Promise<ReceiveAddress> {
    const network = NETWORKS.find((n) => n.id === networkId);
    if (!network || network.assetSymbol !== assetSymbol) {
      throw new Error('Invalid network for asset');
    }

    const suffix = accountId.replace(/\W/g, '').slice(-6).padStart(6, '0');
    const address =
      assetSymbol === 'BTC'
        ? `bc1qport${suffix}mockreceive9k2a`
        : assetSymbol === 'ETH'
          ? `0xPort${suffix}a1b2c3d4e5f60718293a`
          : `TPort${suffix}USDTReceiveMockAddr`;

    return {
      accountId,
      assetSymbol,
      networkId,
      networkName: network.name,
      address,
      warning: `Only send ${assetSymbol} on ${network.name} to this address. Other assets or networks may be lost.`,
    };
  }

  async prepareExchange(request: ExchangeRequest): Promise<ExchangeQuote> {
    const rates: Record<string, number> = {
      'BTC:USDT': 68420,
      'ETH:USDT': 2704,
      'USDT:BTC': 1 / 68420,
      'USDT:ETH': 1 / 2704,
      'BTC:ETH': 68420 / 2704,
      'ETH:BTC': 2704 / 68420,
    };
    const key = `${request.fromSymbol}:${request.toSymbol}`;
    const rate = rates[key];
    if (!rate) {
      throw new Error('Pair not available in prototype');
    }

    const gross = request.fromQuantity * rate;
    const feeQuantity = gross * 0.003;
    const youReceive = gross - feeQuantity;
    const account = this.accounts.get(request.accountId);

    const quote: ExchangeQuote = {
      id: nextId('quote'),
      request,
      rateLabel: `1 ${request.fromSymbol} = ${rate.toLocaleString('en-US', {
        maximumFractionDigits: 8,
      })} ${request.toSymbol}`,
      feeQuantity,
      feeAssetSymbol: request.toSymbol,
      youReceiveQuantity: youReceive,
      minFromQuantity: request.fromSymbol === 'BTC' ? 0.0001 : 0.001,
      spreadBps: 12,
      providerLabel: account?.nickname ?? this.venueLabel,
    };
    this.exchangeQuotes.set(quote.id, quote);
    return quote;
  }

  async submitExchange(quoteId: string): Promise<OperationResult> {
    const quote = this.exchangeQuotes.get(quoteId);
    if (!quote) {
      return {
        operationId: nextId('op'),
        status: 'failed',
        message: 'Quote expired. Request a new one.',
      };
    }

    const tx: Transaction = {
      id: nextId('tx'),
      accountId: quote.request.accountId,
      kind: 'exchange',
      status: 'completed',
      assetSymbol: quote.request.fromSymbol,
      quantity: quote.request.fromQuantity,
      fiatValueUsd: usdNotional(quote.request.fromSymbol, quote.request.fromQuantity),
      counterAssetSymbol: quote.request.toSymbol,
      counterQuantity: quote.youReceiveQuantity,
      createdAt: new Date().toISOString(),
      providerLabel: quote.providerLabel,
    };

    const list = this.transactions.get(quote.request.accountId) ?? [];
    list.unshift(tx);
    this.transactions.set(quote.request.accountId, list);

    return {
      operationId: nextId('op'),
      status: 'completed',
      message: `Exchanged to ${quote.youReceiveQuantity.toLocaleString('en-US', {
        maximumFractionDigits: 8,
      })} ${quote.request.toSymbol}.`,
      transactionId: tx.id,
    };
  }
}

/** Factory helpers for future real providers to mirror. */
export function createMockBybitProvider(): MockCryptoProvider {
  return new MockCryptoProvider('bybit', 'Bybit');
}

export function createMockBinanceProvider(): MockCryptoProvider {
  return new MockCryptoProvider('binance', 'Binance');
}

export function createMockNonCustodialProvider(): MockCryptoProvider {
  return new MockCryptoProvider('non_custodial', 'Local wallet');
}
