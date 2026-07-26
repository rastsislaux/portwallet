import type {
  AssetBalance,
  ConnectConfig,
  ExchangeQuote,
  ExchangeRequest,
  NetworkInfo,
  OperationResult,
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

  connect(config: ConnectConfig): Promise<WalletAccount>;
  disconnect(accountId: string): Promise<void>;

  listBalances(accountId: string): Promise<AssetBalance[]>;
  listNetworks(assetSymbol: string): Promise<NetworkInfo[]>;
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
}
