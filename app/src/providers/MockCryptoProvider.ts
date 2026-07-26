import type { CryptoProvider } from '../domain/CryptoProvider';
import type {
  AssetBalance,
  ConnectConfig,
  CustodyKind,
  ExchangeQuote,
  ExchangeRequest,
  NetworkInfo,
  OperationResult,
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

type InstanceSeed = {
  balances: Omit<AssetBalance, 'accountId'>[];
  transactions: Omit<Transaction, 'accountId' | 'providerLabel'>[];
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
          quantity: 0.02,
          fiatValueUsd: 1368.4,
          networkName: 'Bitcoin',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
      ],
    };
  }

  const skew = instanceIndex % 2 === 0 ? 1 : 0.55;
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
        quantity: 220 * (instanceIndex + 1),
        fiatValueUsd: 220 * (instanceIndex + 1),
      },
    ],
    transactions: [
      {
        id: nextId('tx'),
        kind: 'exchange',
        status: 'pending',
        assetSymbol: 'BTC',
        quantity: 0.01,
        fiatValueUsd: 684.2,
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
        fiatValueUsd: 135.2,
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
        kind: 'deposit',
        status: 'completed',
        assetSymbol: 'BTC',
        quantity: 0.02,
        fiatValueUsd: 1368.4,
        networkName: 'Bitcoin',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
  };
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
  private sendPreviews = new Map<string, SendPreview>();
  private exchangeQuotes = new Map<string, ExchangeQuote>();
  private instanceCount = 0;

  constructor(type: ProviderType = 'mock', venueLabel = 'Mock venue') {
    this.type = type;
    this.venueLabel = venueLabel;
    this.custody = type === 'non_custodial' ? 'non_custodial' : 'custodial';
  }

  async connect(config: ConnectConfig): Promise<WalletAccount> {
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

    return account;
  }

  async disconnect(accountId: string): Promise<void> {
    this.accounts.delete(accountId);
    this.balances.delete(accountId);
    this.transactions.delete(accountId);
  }

  async listBalances(accountId: string): Promise<AssetBalance[]> {
    return [...(this.balances.get(accountId) ?? [])];
  }

  async listNetworks(assetSymbol: string): Promise<NetworkInfo[]> {
    return NETWORKS.filter((n) => n.assetSymbol === assetSymbol);
  }

  async getTransactions(accountId: string): Promise<Transaction[]> {
    return [...(this.transactions.get(accountId) ?? [])];
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
      fiatValueUsd: quote.request.fromQuantity * 68420,
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
