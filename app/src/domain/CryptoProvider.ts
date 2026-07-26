import type {
  AssetBalance,
  CardCapability,
  CardOperation,
  ConnectConfig,
  ExchangeQuote,
  ExchangeRequest,
  FundingAssetBalance,
  NetworkInfo,
  OperationResult,
  ProviderCard,
  ProviderType,
  CustodyKind,
  ReceiveAddress,
  SendPreview,
  SendRequest,
  Transaction,
  WalletAccount,
} from './types';

/**
 * Execution + custody backend. UI never talks to exchanges directly —
 * only through this interface. Multiple instances of the same type are allowed.
 */
export interface CryptoProvider {
  readonly type: ProviderType;
  readonly custody: CustodyKind;
  readonly venueLabel: string;

  /** May return multiple accounts (e.g. Bybit Funding / UTA / Earn from one key). */
  connect(config: ConnectConfig): Promise<WalletAccount[]>;
  disconnect(accountId: string): Promise<void>;

  listBalances(accountId: string): Promise<AssetBalance[]>;
  listNetworks(accountId: string, assetSymbol: string): Promise<NetworkInfo[]>;
  getTransactions(accountId: string): Promise<Transaction[]>;

  prepareSend(request: SendRequest): Promise<SendPreview>;
  submitSend(previewId: string): Promise<OperationResult>;

  getReceiveAddress(
    accountId: string,
    assetSymbol: string,
    networkId: string,
  ): Promise<ReceiveAddress>;

  prepareExchange(request: ExchangeRequest): Promise<ExchangeQuote>;
  submitExchange(quoteId: string): Promise<OperationResult>;

  /** Whether this venue issues payment cards for the given account. */
  getCardCapability(accountId: string): Promise<CardCapability>;
  listCards(accountId: string): Promise<ProviderCard[]>;
  getCardOperations(accountId: string, cardId?: string): Promise<CardOperation[]>;
  /**
   * Funding-account balances used when card spend balance is calculated
   * (e.g. Bybit sums eligible coins instead of exposing a card balance API).
   */
  listFundingBalances(accountId: string): Promise<FundingAssetBalance[]>;
}
