import type { CryptoProvider } from '../../domain/CryptoProvider';
import type {
  AssetBalance,
  BybitServerId,
  CardCapability,
  CardOperation,
  CardOperationKind,
  ConnectConfig,
  CustodyKind,
  ExchangeQuote,
  ExchangeRequest,
  FundingAssetBalance,
  NetworkInfo,
  OperationResult,
  OperationStatus,
  ProviderCard,
  ProviderPermissionSnapshot,
  ProviderType,
  ReceiveAddress,
  SendPreview,
  SendRequest,
  Transaction,
  WalletAccount,
  WalletProduct,
} from '../../domain/types';
import { WALLET_PRODUCT_LABELS } from '../../domain/types';
import {
  BybitApiError,
  BybitRestClient,
  isBybitRateLimitError,
} from './client';
import {
  assertCan,
  parseBybitPermissions,
  type BybitApiKeyInfo,
} from './permissions';

const BYBIT_CARD_ELIGIBLE = new Set(['USDT', 'USDC']);
const STABLECOINS = new Set(['USDT', 'USDC', 'DAI', 'FDUSD', 'USDE']);
/** Share one query-asset-records response across listCards + getCardOperations. */
const CARD_RECORDS_CACHE_TTL_MS = 30_000;

type CardAssetRecord = {
  pan4?: string;
  side?: string;
  status?: string;
  tradeStatus?: string;
  basicAmount?: string;
  billAmount?: string;
  paidAmount?: string;
  basicCurrency?: string;
  paidCurrency?: string;
  transactionCurrencyAmount?: string;
  merchName?: string;
  txnId?: string;
  orderNo?: string;
  txnCreate?: number | string;
  declinedReason?: string;
};

type CardRecordsCache = {
  fetchedAt: number;
  records: CardAssetRecord[];
  inFlight?: Promise<CardAssetRecord[]>;
};

type Connection = {
  id: string;
  client: BybitRestClient;
  /** Separate read-only BitCard key when the main key cannot include BitCard. */
  cardClient?: BybitRestClient;
  permissions: ProviderPermissionSnapshot;
  coinNames: Map<string, string>;
  bybitServer: BybitServerId;
  priceCache: Map<string, number>;
  priceCachedAt: number;
  cardRecordsCache?: CardRecordsCache;
};

type Session = {
  account: WalletAccount;
  connectionId: string;
  product: WalletProduct;
};

type CoinChain = {
  chain: string;
  chainType: string;
  withdrawFee: string;
  chainDeposit: string;
  chainWithdraw: string;
};

type CoinInfoRow = {
  name: string;
  coin: string;
  chains: CoinChain[];
};

type WalletCoin = {
  coin: string;
  walletBalance: string;
  transferBalance?: string;
  usdValue?: string;
  equity?: string;
};

type SendPreviewState = SendPreview & {
  withdrawFee?: number;
  chain?: string;
};

type ExchangeQuoteState = ExchangeQuote & {
  quoteTxId?: string;
  convertAccountType?: string;
};

let idSeq = 1;
const nextId = (prefix: string) => `${prefix}_${idSeq++}`;

function num(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function productLabel(product: WalletProduct): string {
  return WALLET_PRODUCT_LABELS[product];
}

function convertAccountType(product: Exclude<WalletProduct, 'EARN'>): string {
  return product === 'UNIFIED' ? 'eb_convert_uta' : 'eb_convert_funding';
}

function mapCardSide(side: string): CardOperationKind {
  if (side === '5' || side === '4' || side === '8' || side === '10') return 'refund';
  if (side === '13') return 'atm';
  if (side === '12') return 'fee';
  return 'purchase';
}

function mapCardStatus(status: string, tradeStatus: string): OperationStatus {
  if (status === '2' || tradeStatus === '2') return 'failed';
  if (status === '0' || status === '-1' || tradeStatus === '0') return 'pending';
  return 'completed';
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

/**
 * Real Bybit V5 provider. One API-key connect creates separate Funding / UTA /
 * Earn accounts that share credentials in memory.
 */
export class BybitCryptoProvider implements CryptoProvider {
  readonly type: ProviderType = 'bybit';
  readonly custody: CustodyKind = 'custodial';
  readonly venueLabel = 'Bybit';

  private connections = new Map<string, Connection>();
  private sessions = new Map<string, Session>();
  private sendPreviews = new Map<string, SendPreviewState>();
  private exchangeQuotes = new Map<string, ExchangeQuoteState>();
  private coinInfoCache = new Map<string, CoinInfoRow[]>();

  async connect(config: ConnectConfig): Promise<WalletAccount[]> {
    const apiKey = config.apiKey?.trim();
    const apiSecret = config.apiSecret?.trim();
    const bybitServer: BybitServerId = config.bybitServer ?? 'mainnet';

    if (!apiKey || !apiSecret) {
      throw new Error('Bybit API key and secret are required.');
    }

    const client = new BybitRestClient(apiKey, apiSecret, bybitServer);
    const keyInfo = await client.get<BybitApiKeyInfo>('/v5/user/query-api');
    const permissions = parseBybitPermissions(keyInfo);
    const cardClient = await this.createCardClient(
      bybitServer,
      config.cardApiKey,
      config.cardApiSecret,
    );
    if (cardClient) {
      permissions.canCard = true;
    }
    const walletTypes = await this.resolveWalletTypes(client, permissions);

    const products: WalletProduct[] = [];
    if (walletTypes.has('FUND')) products.push('FUND');
    if (walletTypes.has('UNIFIED') || permissions.uta) products.push('UNIFIED');
    if (permissions.canEarnRead) products.push('EARN');

    if (products.length === 0) {
      throw new Error(
        'This API key has no accessible Funding, UTA, or Earn wallets. Check key permissions.',
      );
    }

    const connectionId = `bybit_${bybitServer}_${keyInfo.userID ?? 'user'}_${Date.now()}`;
    const connection: Connection = {
      id: connectionId,
      client,
      cardClient,
      permissions,
      coinNames: new Map(),
      bybitServer,
      priceCache: new Map(),
      priceCachedAt: 0,
    };
    this.connections.set(connectionId, connection);

    const venueLabel = bybitServer === 'testnet' ? 'Bybit Testnet' : 'Bybit';
    const connectedAt = new Date().toISOString();
    const baseNickname = config.nickname.trim();
    const accounts: WalletAccount[] = [];

    for (const product of products) {
      const account: WalletAccount = {
        id: nextId('acct'),
        nickname: `${baseNickname} · ${productLabel(product)}`,
        providerType: 'bybit',
        providerInstanceId: connectionId,
        custody: 'custodial',
        venueLabel,
        connectedAt,
        product,
        bybitServer,
        permissions,
      };
      this.sessions.set(account.id, {
        account,
        connectionId,
        product,
      });
      accounts.push(account);
    }

    return accounts;
  }

  /**
   * Attach or replace the separate Bybit Card (BitCard) API key for an existing
   * connection. Returns updated accounts that share the connection.
   */
  async attachCardCredentials(
    providerInstanceId: string,
    cardApiKey: string,
    cardApiSecret: string,
  ): Promise<WalletAccount[]> {
    const connection = this.connections.get(providerInstanceId);
    if (!connection) {
      throw new Error('Bybit connection not found. Reconnect the account first.');
    }

    const cardClient = await this.createCardClient(
      connection.bybitServer,
      cardApiKey,
      cardApiSecret,
    );
    if (!cardClient) {
      throw new Error('Bybit Card API key and secret are required.');
    }

    connection.cardClient = cardClient;
    connection.permissions = {
      ...connection.permissions,
      canCard: true,
    };

    const updated: WalletAccount[] = [];
    for (const session of this.sessions.values()) {
      if (session.connectionId !== providerInstanceId) continue;
      session.account = {
        ...session.account,
        permissions: connection.permissions,
      };
      updated.push(session.account);
    }
    return updated;
  }

  async disconnect(accountId: string): Promise<void> {
    const session = this.sessions.get(accountId);
    this.sessions.delete(accountId);
    for (const [id, preview] of this.sendPreviews) {
      if (preview.request.accountId === accountId) this.sendPreviews.delete(id);
    }
    for (const [id, quote] of this.exchangeQuotes) {
      if (quote.request.accountId === accountId) this.exchangeQuotes.delete(id);
    }

    if (!session) return;
    const stillUsed = [...this.sessions.values()].some(
      (s) => s.connectionId === session.connectionId,
    );
    if (!stillUsed) {
      this.connections.delete(session.connectionId);
    }
  }

  async listBalances(accountId: string): Promise<AssetBalance[]> {
    const { session, connection } = this.requireSession(accountId);

    let balances: AssetBalance[];
    switch (session.product) {
      case 'FUND':
        balances = await this.fetchFundBalances(connection, accountId);
        break;
      case 'UNIFIED':
        balances = await this.fetchUtaBalances(connection, accountId);
        break;
      case 'EARN':
        balances = await this.fetchEarnBalances(connection, accountId);
        break;
    }

    return this.withUsdValues(connection, balances).then((priced) =>
      priced.filter((b) => b.quantity > 0 || b.fiatValueUsd > 0),
    );
  }

  async listNetworks(
    accountId: string,
    assetSymbol: string,
  ): Promise<NetworkInfo[]> {
    const { connection } = this.requireSession(accountId);
    const rows = await this.getCoinInfo(connection, assetSymbol);
    const coin = rows.find((r) => r.coin === assetSymbol.toUpperCase());
    if (!coin) return [];

    return coin.chains.map((chain) => ({
      id: `${coin.coin}:${chain.chain}`,
      name: chain.chainType || chain.chain,
      assetSymbol: coin.coin,
      chain: chain.chain,
      withdrawFee: num(chain.withdrawFee),
      depositEnabled: chain.chainDeposit === '1',
      withdrawEnabled: chain.chainWithdraw === '1',
    }));
  }

  async getTransactions(accountId: string): Promise<Transaction[]> {
    const { session, connection } = this.requireSession(accountId);
    const label = session.account.nickname;
    const txs: Transaction[] = [];
    const product = session.product;

    if (product === 'FUND' || product === 'UNIFIED') {
      try {
        const deposits = await connection.client.get<{
          rows?: Array<{
            txID?: string;
            coin?: string;
            amount?: string;
            chain?: string;
            status?: number;
            successAt?: string;
            createTime?: string;
          }>;
        }>('/v5/asset/deposit/query-record', { limit: 50 });

        if (product === 'FUND') {
          for (const row of deposits.rows ?? []) {
            const statusNum = row.status ?? 0;
            txs.push({
              id: row.txID || nextId('tx'),
              accountId,
              kind: 'deposit',
              status:
                statusNum === 3 ? 'completed' : statusNum === 4 ? 'failed' : 'pending',
              assetSymbol: (row.coin ?? '').toUpperCase(),
              quantity: num(row.amount),
              fiatValueUsd: 0,
              networkName: row.chain,
              createdAt: toIso(row.successAt || row.createTime),
              providerLabel: label,
              product: 'FUND',
            });
          }
        }
      } catch {
        /* optional */
      }
    }

    if (product === 'FUND' || product === 'UNIFIED') {
      try {
        const withdraws = await connection.client.get<{
          rows?: Array<{
            withdrawId?: string;
            txID?: string;
            coin?: string;
            amount?: string;
            chain?: string;
            status?: string;
            createTime?: string;
            toAddress?: string;
            rejectReason?: string;
          }>;
        }>('/v5/asset/withdraw/query-record', { limit: 50 });

        if (product === 'FUND') {
          for (const row of withdraws.rows ?? []) {
            const st = (row.status ?? '').toLowerCase();
            let status: OperationStatus = 'pending';
            if (st.includes('success') || st === '3' || st === '4') status = 'completed';
            if (st.includes('fail') || st.includes('reject') || st === '2') {
              status = 'failed';
            }
            txs.push({
              id: row.withdrawId || row.txID || nextId('tx'),
              accountId,
              kind: 'withdrawal',
              status,
              assetSymbol: (row.coin ?? '').toUpperCase(),
              quantity: num(row.amount),
              fiatValueUsd: 0,
              networkName: row.chain,
              counterparty: row.toAddress,
              failureReason: row.rejectReason || undefined,
              createdAt: toIso(row.createTime),
              providerLabel: label,
              product: 'FUND',
            });
          }
        }
      } catch {
        /* optional */
      }

      try {
        const transfers = await connection.client.get<{
          list?: Array<{
            transferId?: string;
            coin?: string;
            amount?: string;
            status?: string;
            timestamp?: string;
            fromAccountType?: string;
            toAccountType?: string;
          }>;
        }>('/v5/asset/transfer/query-inter-transfer-list', { limit: 50 });

        for (const row of transfers.list ?? []) {
          const from = (row.fromAccountType ?? '').toUpperCase();
          const to = (row.toAccountType ?? '').toUpperCase();
          const involves =
            from === product ||
            to === product ||
            (product === 'UNIFIED' && (from === 'UNIFIED' || to === 'UNIFIED')) ||
            (product === 'FUND' && (from === 'FUND' || to === 'FUND'));
          if (!involves) continue;

          const st = (row.status ?? '').toUpperCase();
          txs.push({
            id: `${row.transferId || nextId('tx')}_${product}`,
            accountId,
            kind: 'internal',
            status:
              st === 'SUCCESS' ? 'completed' : st === 'FAILED' ? 'failed' : 'pending',
            assetSymbol: (row.coin ?? '').toUpperCase(),
            quantity: num(row.amount),
            fiatValueUsd: 0,
            counterparty: `${row.fromAccountType ?? '?'} → ${row.toAccountType ?? '?'}`,
            createdAt: toIso(row.timestamp),
            providerLabel: label,
            product,
          });
        }
      } catch {
        /* optional */
      }

      try {
        const converts = await connection.client.get<{
          list?: Array<{
            exchangeTxId?: string;
            fromCoin?: string;
            toCoin?: string;
            fromAmount?: string;
            toAmount?: string;
            exchangeStatus?: string;
            createdAt?: string;
            accountType?: string;
          }>;
        }>('/v5/asset/exchange/query-convert-history', { limit: 50 });

        for (const row of converts.list ?? []) {
          const st = (row.exchangeStatus ?? '').toLowerCase();
          txs.push({
            id: `${row.exchangeTxId || nextId('tx')}_${product}`,
            accountId,
            kind: 'exchange',
            status:
              st.includes('success') || st === 'init_ok'
                ? 'completed'
                : st.includes('fail')
                  ? 'failed'
                  : 'pending',
            assetSymbol: (row.fromCoin ?? '').toUpperCase(),
            quantity: num(row.fromAmount),
            fiatValueUsd: 0,
            counterAssetSymbol: (row.toCoin ?? '').toUpperCase(),
            counterQuantity: num(row.toAmount),
            createdAt: toIso(row.createdAt),
            providerLabel: label,
            product,
          });
        }
      } catch {
        /* optional */
      }
    }

    return txs.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  async prepareSend(request: SendRequest): Promise<SendPreview> {
    const { session, connection } = this.requireSession(request.accountId);
    const fromProduct = session.product;

    if (fromProduct === 'EARN') {
      throw new Error(
        'Earn products are read-only in Portwallet. Transfer assets to Funding or UTA in the Bybit app first.',
      );
    }

    if (request.kind === 'withdrawal') {
      assertCan(connection.permissions, 'withdraw');
      const networks = await this.listNetworks(
        request.accountId,
        request.assetSymbol,
      );
      const network =
        networks.find((n) => n.id === request.networkId) ??
        networks.find((n) => n.chain === request.networkId);
      if (!network?.chain) {
        throw new Error('Select a valid withdrawal network.');
      }
      if (network.withdrawEnabled === false) {
        throw new Error(`${network.name} withdrawals are currently suspended.`);
      }

      const fee = network.withdrawFee ?? 0;
      const preview: SendPreviewState = {
        id: nextId('send'),
        request: { ...request, fromProduct },
        networkName: network.name,
        feeQuantity: fee,
        feeAssetSymbol: request.assetSymbol,
        youReceiveQuantity: Math.max(0, request.quantity - fee),
        estimatedArrival: '~10–60 min',
        irreversible: true,
        withdrawFee: fee,
        chain: network.chain,
      };
      this.sendPreviews.set(preview.id, preview);
      return preview;
    }

    if (request.kind === 'internal') {
      assertCan(connection.permissions, 'transfer');
      const toProduct =
        request.toProduct ??
        this.resolveSiblingProduct(session, request.destination);
      if (!toProduct || toProduct === fromProduct) {
        throw new Error('Choose a different destination wallet (Funding ↔ UTA).');
      }
      if (toProduct === 'EARN') {
        throw new Error(
          'Transfers into Earn are not supported here. Earn is read-only in Portwallet.',
        );
      }

      const preview: SendPreviewState = {
        id: nextId('send'),
        request: {
          ...request,
          fromProduct,
          toProduct,
          destination: toProduct,
          networkId: 'internal',
        },
        networkName: `${productLabel(fromProduct)} → ${productLabel(toProduct)}`,
        feeQuantity: 0,
        feeAssetSymbol: request.assetSymbol,
        youReceiveQuantity: request.quantity,
        estimatedArrival: 'Usually under a minute',
        irreversible: false,
      };
      this.sendPreviews.set(preview.id, preview);
      return preview;
    }

    assertCan(connection.permissions, 'withdraw');
    const preview: SendPreviewState = {
      id: nextId('send'),
      request: { ...request, fromProduct },
      networkName: 'Bybit internal',
      feeQuantity: 0,
      feeAssetSymbol: request.assetSymbol,
      youReceiveQuantity: request.quantity,
      estimatedArrival: 'Usually under a minute',
      irreversible: false,
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

    const { session, connection } = this.requireSession(preview.request.accountId);
    const { request } = preview;

    try {
      if (request.kind === 'internal') {
        assertCan(connection.permissions, 'transfer');
        const result = await connection.client.post<{
          transferId: string;
          status: string;
        }>('/v5/asset/transfer/inter-transfer', {
          transferId: crypto.randomUUID(),
          coin: request.assetSymbol.toUpperCase(),
          amount: String(request.quantity),
          fromAccountType: session.product,
          toAccountType: request.toProduct ?? 'UNIFIED',
        });

        const status: OperationStatus =
          result.status === 'SUCCESS'
            ? 'completed'
            : result.status === 'FAILED'
              ? 'failed'
              : 'pending';

        return {
          operationId: result.transferId,
          status,
          message:
            status === 'completed'
              ? `Moved ${request.quantity} ${request.assetSymbol} to ${productLabel(request.toProduct ?? 'UNIFIED')}.`
              : `Transfer ${result.status.toLowerCase()}.`,
          transactionId: result.transferId,
        };
      }

      assertCan(connection.permissions, 'withdraw');
      const forceChain = request.kind === 'transfer' ? 2 : 0;
      const body: Record<string, unknown> = {
        coin: request.assetSymbol.toUpperCase(),
        address: request.destination,
        amount: String(request.quantity),
        timestamp: Date.now(),
        forceChain,
        accountType: session.product === 'UNIFIED' ? 'UTA' : 'FUND',
      };
      if (forceChain !== 2 && preview.chain) {
        body.chain = preview.chain;
      }

      const result = await connection.client.post<{ id: string }>(
        '/v5/asset/withdraw/create',
        body,
      );

      return {
        operationId: result.id,
        status: 'pending',
        message:
          request.kind === 'transfer'
            ? 'Internal Bybit transfer submitted.'
            : 'Withdrawal submitted. Waiting for network confirmation.',
        transactionId: result.id,
      };
    } catch (err) {
      return {
        operationId: nextId('op'),
        status: 'failed',
        message: err instanceof Error ? err.message : 'Send failed',
      };
    }
  }

  async getReceiveAddress(
    accountId: string,
    assetSymbol: string,
    networkId: string,
  ): Promise<ReceiveAddress> {
    const { session, connection } = this.requireSession(accountId);
    if (session.product === 'EARN') {
      throw new Error(
        'Earn is read-only. Receive deposits into the Funding account instead.',
      );
    }
    if (session.product !== 'FUND') {
      throw new Error(
        'On-chain deposits credit the Funding wallet. Switch to the Funding account to receive.',
      );
    }

    const networks = await this.listNetworks(accountId, assetSymbol);
    const network =
      networks.find((n) => n.id === networkId) ??
      networks.find((n) => n.chain === networkId);
    if (!network?.chain) {
      throw new Error('Invalid network for asset');
    }
    if (network.depositEnabled === false) {
      throw new Error(`${network.name} deposits are currently suspended.`);
    }

    const result = await connection.client.get<{
      coin: string;
      chains: Array<{
        chainType: string;
        addressDeposit: string;
        tagDeposit: string;
        chain: string;
      }>;
    }>('/v5/asset/deposit/query-address', {
      coin: assetSymbol.toUpperCase(),
      chainType: network.chain,
    });

    const chain =
      result.chains.find((c) => c.chain === network.chain) ?? result.chains[0];
    if (!chain?.addressDeposit) {
      throw new Error('No deposit address available for this network.');
    }

    return {
      accountId,
      assetSymbol: assetSymbol.toUpperCase(),
      networkId: network.id,
      networkName: chain.chainType || network.name,
      address: chain.addressDeposit,
      tag: chain.tagDeposit || undefined,
      product: 'FUND',
      warning: `Only send ${assetSymbol.toUpperCase()} on ${chain.chainType || network.name} to this address. Deposits credit the Funding wallet.`,
    };
  }

  async prepareExchange(request: ExchangeRequest): Promise<ExchangeQuote> {
    const { session, connection } = this.requireSession(request.accountId);
    assertCan(connection.permissions, 'exchange');

    if (session.product === 'EARN') {
      throw new Error('Earn products are read-only. Convert from Funding or UTA.');
    }

    const product = session.product as Exclude<WalletProduct, 'EARN'>;
    const accountType = convertAccountType(product);
    const quote = await connection.client.post<{
      quoteTxId: string;
      exchangeRate: string;
      fromCoin: string;
      toCoin: string;
      fromAmount: string;
      toAmount: string;
    }>('/v5/asset/exchange/quote-apply', {
      fromCoin: request.fromSymbol.toUpperCase(),
      toCoin: request.toSymbol.toUpperCase(),
      accountType,
      requestCoin: request.fromSymbol.toUpperCase(),
      requestAmount: String(request.fromQuantity),
      requestId: crypto.randomUUID(),
    });

    const youReceive = num(quote.toAmount);
    const rate = num(quote.exchangeRate);
    const state: ExchangeQuoteState = {
      id: nextId('quote'),
      request: { ...request, product },
      rateLabel: `1 ${quote.fromCoin} ≈ ${rate.toLocaleString('en-US', {
        maximumFractionDigits: 8,
      })} ${quote.toCoin}`,
      feeQuantity: 0,
      feeAssetSymbol: quote.toCoin,
      youReceiveQuantity: youReceive,
      minFromQuantity: 0,
      spreadBps: 0,
      providerLabel: session.account.nickname,
      venueQuoteId: quote.quoteTxId,
      quoteTxId: quote.quoteTxId,
      convertAccountType: accountType,
    };
    this.exchangeQuotes.set(state.id, state);
    return state;
  }

  async submitExchange(quoteId: string): Promise<OperationResult> {
    const quote = this.exchangeQuotes.get(quoteId);
    if (!quote?.quoteTxId) {
      return {
        operationId: nextId('op'),
        status: 'failed',
        message: 'Quote expired. Request a new one.',
      };
    }

    const { connection } = this.requireSession(quote.request.accountId);
    assertCan(connection.permissions, 'exchange');

    try {
      const result = await connection.client.post<{
        exchangeStatus: string;
        quoteTxId: string;
      }>('/v5/asset/exchange/convert-execute', {
        quoteTxId: quote.quoteTxId,
      });

      const st = (result.exchangeStatus ?? '').toLowerCase();
      const status: OperationStatus = st.includes('fail')
        ? 'failed'
        : st.includes('success') || st === 'init_ok'
          ? 'completed'
          : 'pending';

      return {
        operationId: result.quoteTxId,
        status,
        message:
          status === 'completed'
            ? `Exchanged to ${quote.youReceiveQuantity.toLocaleString('en-US', {
                maximumFractionDigits: 8,
              })} ${quote.request.toSymbol}.`
            : `Convert status: ${result.exchangeStatus}`,
        transactionId: result.quoteTxId,
      };
    } catch (err) {
      return {
        operationId: nextId('op'),
        status: 'failed',
        message: err instanceof Error ? err.message : 'Exchange failed',
      };
    }
  }

  async getCardCapability(accountId: string): Promise<CardCapability> {
    const { session, connection } = this.requireSession(accountId);
    if (session.product !== 'FUND') {
      return {
        supported: false,
        unsupportedReason:
          'Bybit Card spend is tied to the Funding wallet. Open the Funding account.',
      };
    }
    if (!connection.permissions.canCard && !connection.cardClient) {
      return {
        supported: false,
        unsupportedReason:
          'Bybit Card needs a separate read-only API key with only the Bybit Card permission. Add it from Accounts.',
      };
    }
    return { supported: true };
  }

  async listCards(accountId: string): Promise<ProviderCard[]> {
    const capability = await this.getCardCapability(accountId);
    if (!capability.supported) return [];

    const { session, connection } = this.requireSession(accountId);
    const funding = await this.listFundingBalances(accountId);
    const { balanceUsd, symbols } = sumEligibleFunding(funding);
    const pans = await this.discoverCardPans(connection);

    if (pans.length === 0) {
      return [
        {
          id: `${accountId}_card_default`,
          accountId,
          providerType: 'bybit',
          label: 'Bybit Card',
          lastFour: '····',
          network: 'visa',
          status: 'active',
          holderName:
            session.account.nickname.replace(/\s+·\s+Funding$/i, '') || 'Cardholder',
          currency: 'USD',
          balanceUsd,
          balanceSource: 'calculated',
          fundingAssetSymbols: symbols,
          expiresLabel: '—',
        },
      ];
    }

    return pans.map((pan4, index) => ({
      id: `${accountId}_card_${pan4}`,
      accountId,
      providerType: 'bybit' as const,
      label: index === 0 ? 'Bybit Card' : `Bybit Card · ${pan4}`,
      lastFour: pan4,
      network: 'visa' as const,
      status: 'active' as const,
      holderName:
        session.account.nickname.replace(/\s+·\s+Funding$/i, '') || 'Cardholder',
      currency: 'USD',
      balanceUsd,
      balanceSource: 'calculated' as const,
      fundingAssetSymbols: symbols,
      expiresLabel: '—',
    }));
  }

  async getCardOperations(
    accountId: string,
    cardId?: string,
  ): Promise<CardOperation[]> {
    const capability = await this.getCardCapability(accountId);
    if (!capability.supported) return [];

    const { session, connection } = this.requireSession(accountId);
    const panFilter =
      cardId && cardId.includes('_card_') && !cardId.endsWith('_default')
        ? cardId.split('_card_').pop()
        : undefined;

    const records = await this.fetchCardRecords(connection, panFilter);
    return records
      .map((row) => {
        const pan4 = row.pan4 || '····';
        return {
          id: row.txnId || row.orderNo || nextId('cardop'),
          cardId: `${accountId}_card_${pan4}`,
          accountId,
          kind: mapCardSide(row.side ?? '3'),
          status: mapCardStatus(row.status ?? '1', row.tradeStatus ?? '1'),
          merchant: row.merchName || 'Bybit Card',
          amountFiat: num(row.basicAmount || row.billAmount || row.paidAmount),
          currency: row.basicCurrency || row.paidCurrency || 'USD',
          assetSymbol: row.paidCurrency || undefined,
          quantity: num(row.paidAmount || row.transactionCurrencyAmount),
          createdAt: toIso(row.txnCreate),
          providerLabel: session.account.nickname,
          failureReason: row.declinedReason || undefined,
        } satisfies CardOperation;
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  async listFundingBalances(accountId: string): Promise<FundingAssetBalance[]> {
    const { session, connection } = this.requireSession(accountId);
    if (session.product !== 'FUND') return [];

    const fund = await this.fetchFundBalances(connection, accountId);
    const priced = await this.withUsdValues(connection, fund);
    return priced.map((b) => ({
      symbol: b.symbol,
      name: b.name,
      quantity: b.quantity,
      fiatValueUsd: b.fiatValueUsd,
      cardEligible: BYBIT_CARD_ELIGIBLE.has(b.symbol),
    }));
  }

  private async createCardClient(
    bybitServer: BybitServerId,
    cardApiKey?: string,
    cardApiSecret?: string,
  ): Promise<BybitRestClient | undefined> {
    const key = cardApiKey?.trim();
    const secret = cardApiSecret?.trim();
    if (!key && !secret) return undefined;
    if (!key || !secret) {
      throw new Error(
        'Bybit Card API key and secret must both be provided (or both left empty).',
      );
    }

    const cardClient = new BybitRestClient(key, secret, bybitServer);
    const cardKeyInfo = await cardClient.get<BybitApiKeyInfo>('/v5/user/query-api');
    const cardPermissions = parseBybitPermissions(cardKeyInfo);
    if (!cardPermissions.canCard) {
      throw new Error(
        'The Bybit Card API key must include Bybit Card (BitCard) permission. Create a read-only key with only that permission.',
      );
    }
    return cardClient;
  }

  private cardApiClient(connection: Connection): BybitRestClient {
    return connection.cardClient ?? connection.client;
  }

  private async resolveWalletTypes(
    client: BybitRestClient,
    permissions: ProviderPermissionSnapshot,
  ): Promise<Set<string>> {
    const types = new Set<string>();
    try {
      const result = await client.get<{
        accounts?: Array<{ accountType?: string[] }>;
      }>('/v5/user/get-member-type');
      for (const account of result.accounts ?? []) {
        for (const t of account.accountType ?? []) {
          types.add(t.toUpperCase());
        }
      }
    } catch {
      types.add('FUND');
      if (permissions.uta) types.add('UNIFIED');
    }
    if (types.size === 0) {
      types.add('FUND');
      if (permissions.uta) types.add('UNIFIED');
    }
    return types;
  }

  private requireSession(accountId: string): {
    session: Session;
    connection: Connection;
  } {
    const session = this.sessions.get(accountId);
    if (!session) throw new Error('Bybit account is not connected.');
    const connection = this.connections.get(session.connectionId);
    if (!connection) throw new Error('Bybit connection credentials are gone. Reconnect.');
    return { session, connection };
  }

  private resolveSiblingProduct(
    session: Session,
    destination: string,
  ): WalletProduct | undefined {
    if (destination === 'FUND' || destination === 'UNIFIED' || destination === 'EARN') {
      return destination;
    }
    const sibling = [...this.sessions.values()].find(
      (s) =>
        s.connectionId === session.connectionId &&
        (s.account.id === destination ||
          s.account.nickname === destination ||
          s.product === destination),
    );
    return sibling?.product;
  }

  private async getCoinInfo(
    connection: Connection,
    coin?: string,
  ): Promise<CoinInfoRow[]> {
    const cacheKey = `${connection.bybitServer}:${coin ?? '*'}`;
    const cached = this.coinInfoCache.get(cacheKey);
    if (cached) return cached;

    const result = await connection.client.get<{ rows: CoinInfoRow[] }>(
      '/v5/asset/coin/query-info',
      coin ? { coin: coin.toUpperCase() } : {},
    );
    const rows = result.rows ?? [];
    this.coinInfoCache.set(cacheKey, rows);
    for (const row of rows) {
      connection.coinNames.set(row.coin, row.name || row.coin);
    }
    return rows;
  }

  private async fetchFundBalances(
    connection: Connection,
    accountId: string,
  ): Promise<AssetBalance[]> {
    const result = await connection.client.get<{
      accountType: string;
      balance: WalletCoin[];
    }>('/v5/asset/transfer/query-account-coins-balance', {
      accountType: 'FUND',
    });

    return (result.balance ?? [])
      .map((c) => this.toBalance(connection, accountId, c, 'FUND'))
      .filter((b) => b.quantity > 0);
  }

  private async fetchUtaBalances(
    connection: Connection,
    accountId: string,
  ): Promise<AssetBalance[]> {
    const result = await connection.client.get<{
      list: Array<{ coin: WalletCoin[] }>;
    }>('/v5/account/wallet-balance', { accountType: 'UNIFIED' });

    const coins = result.list?.[0]?.coin ?? [];
    return coins
      .map((c) => this.toBalance(connection, accountId, c, 'UNIFIED'))
      .filter((b) => b.quantity > 0 || b.fiatValueUsd > 0);
  }

  private async fetchEarnBalances(
    connection: Connection,
    accountId: string,
  ): Promise<AssetBalance[]> {
    assertCan(connection.permissions, 'earnRead');
    const categories = ['FlexibleSaving', 'OnChain'] as const;
    const merged = new Map<string, number>();

    for (const category of categories) {
      try {
        const result = await connection.client.get<{
          list?: Array<{ coin?: string; amount?: string }>;
        }>('/v5/earn/position', { category });
        for (const row of result.list ?? []) {
          const coin = (row.coin ?? '').toUpperCase();
          if (!coin) continue;
          merged.set(coin, (merged.get(coin) ?? 0) + num(row.amount));
        }
      } catch (err) {
        if (err instanceof BybitApiError && err.retCode !== 0) {
          /* category may be empty / unsupported */
        }
      }
    }

    return [...merged.entries()]
      .filter(([, qty]) => qty > 0)
      .map(([symbol, quantity]) => ({
        assetId: symbol.toLowerCase(),
        symbol,
        name: connection.coinNames.get(symbol) ?? symbol,
        quantity,
        fiatValueUsd: 0,
        accountId,
        product: 'EARN' as const,
        productLabel: productLabel('EARN'),
      }));
  }

  private toBalance(
    connection: Connection,
    accountId: string,
    coin: WalletCoin,
    product: WalletProduct,
  ): AssetBalance {
    const symbol = coin.coin.toUpperCase();
    const quantity = num(coin.walletBalance || coin.equity || coin.transferBalance);
    const fiatValueUsd = num(coin.usdValue);
    return {
      assetId: symbol.toLowerCase(),
      symbol,
      name: connection.coinNames.get(symbol) ?? symbol,
      quantity,
      fiatValueUsd: fiatValueUsd || 0,
      accountId,
      product,
      productLabel: productLabel(product),
    };
  }

  private async withUsdValues(
    connection: Connection,
    balances: AssetBalance[],
  ): Promise<AssetBalance[]> {
    const needsPrice = balances.filter(
      (b) => b.fiatValueUsd <= 0 && b.quantity > 0 && !STABLECOINS.has(b.symbol),
    );
    for (const b of balances) {
      if (STABLECOINS.has(b.symbol) && b.fiatValueUsd <= 0) {
        b.fiatValueUsd = b.quantity;
      }
    }
    if (needsPrice.length === 0) return balances;

    await this.refreshPrices(
      connection,
      needsPrice.map((b) => b.symbol),
    );

    return balances.map((b) => {
      if (b.fiatValueUsd > 0) return b;
      if (STABLECOINS.has(b.symbol)) {
        return { ...b, fiatValueUsd: b.quantity };
      }
      const px = connection.priceCache.get(b.symbol) ?? 0;
      return { ...b, fiatValueUsd: b.quantity * px };
    });
  }

  private async refreshPrices(
    connection: Connection,
    symbols: string[],
  ): Promise<void> {
    const now = Date.now();
    if (now - connection.priceCachedAt < 30_000 && connection.priceCache.size > 0) {
      const missing = symbols.filter((s) => !connection.priceCache.has(s));
      if (missing.length === 0) return;
    }

    try {
      const result = await connection.client.get<{
        list?: Array<{ symbol?: string; lastPrice?: string; usdIndexPrice?: string }>;
      }>('/v5/market/tickers', { category: 'spot' });

      for (const row of result.list ?? []) {
        const pair = (row.symbol ?? '').toUpperCase();
        const last = num(row.usdIndexPrice || row.lastPrice);
        if (!pair || !(last > 0)) continue;
        if (pair.endsWith('USDT')) {
          const base = pair.slice(0, -4);
          if (base) connection.priceCache.set(base, last);
        } else if (pair.endsWith('USD')) {
          const base = pair.slice(0, -3);
          if (base) connection.priceCache.set(base, last);
        }
      }
      connection.priceCachedAt = now;
    } catch {
      /* pricing is best-effort */
    }
  }

  private async discoverCardPans(connection: Connection): Promise<string[]> {
    const records = await this.fetchCardRecords(connection);
    const pans = new Set<string>();
    for (const row of records) {
      if (row.pan4 && /^\d{2,4}$/.test(row.pan4)) pans.add(row.pan4);
    }
    return [...pans];
  }

  private async fetchCardRecords(
    connection: Connection,
    pan4?: string,
  ): Promise<CardAssetRecord[]> {
    const records = await this.loadCardRecords(connection);
    if (pan4 && pan4 !== '····') {
      return records.filter((row) => row.pan4 === pan4);
    }
    return records;
  }

  private async loadCardRecords(
    connection: Connection,
  ): Promise<CardAssetRecord[]> {
    const cached = connection.cardRecordsCache;
    const now = Date.now();
    if (cached?.inFlight) {
      return cached.inFlight;
    }
    if (cached && now - cached.fetchedAt < CARD_RECORDS_CACHE_TTL_MS) {
      return cached.records;
    }

    const inFlight = this.requestCardRecords(connection);
    connection.cardRecordsCache = {
      fetchedAt: 0,
      records: cached?.records ?? [],
      inFlight,
    };

    try {
      const records = await inFlight;
      connection.cardRecordsCache = { fetchedAt: Date.now(), records };
      return records;
    } catch (err) {
      connection.cardRecordsCache = undefined;
      throw err;
    }
  }

  private async requestCardRecords(
    connection: Connection,
  ): Promise<CardAssetRecord[]> {
    // Bybit `/v5/card/transaction/query-asset-records` only accepts
    // `SIDE_QUERY_AUTH` for `type` in practice. `SIDE_QUERY_FINANCIAL` and
    // `SIDE_QUERY_REFUND` are rejected as invalid parameters despite appearing
    // in older docs / client samples — do not request them.
    const client = this.cardApiClient(connection);

    try {
      const result = await client.post<{
        data?: Array<Record<string, string | number | undefined>>;
      }>('/v5/card/transaction/query-asset-records', {
        type: 'SIDE_QUERY_AUTH',
        limit: 100,
        page: 1,
      });
      return (result.data ?? []) as CardAssetRecord[];
    } catch (err) {
      // Rate limits are retried in BybitRestClient; if still failing, surface
      // them so the wallet layer can keep prior data and warn the user.
      if (isBybitRateLimitError(err)) throw err;
      /* BitCard endpoints may 403 without card / missing permission */
      return [];
    }
  }
}

function toIso(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString();
  }
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  if (/^\d+$/.test(value)) {
    const n = Number(value);
    const ms = n < 1e12 ? n * 1000 : n;
    return new Date(ms).toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(+d) ? new Date().toISOString() : d.toISOString();
}

export function createBybitProvider(): BybitCryptoProvider {
  return new BybitCryptoProvider();
}
