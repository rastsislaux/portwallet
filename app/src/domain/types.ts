export type ProviderType = 'bybit' | 'binance' | 'non_custodial' | 'mock';

export type CustodyKind = 'custodial' | 'non_custodial';

export type OperationStatus = 'pending' | 'completed' | 'failed';

export type TransactionKind =
  | 'transfer'
  | 'internal'
  | 'withdrawal'
  | 'deposit'
  | 'exchange';

export interface WalletAccount {
  id: string;
  nickname: string;
  providerType: ProviderType;
  providerInstanceId: string;
  custody: CustodyKind;
  venueLabel: string;
  connectedAt: string;
}

export interface AssetBalance {
  assetId: string;
  symbol: string;
  name: string;
  quantity: number;
  fiatValueUsd: number;
  accountId: string;
}

export interface AggregatedAsset {
  assetId: string;
  symbol: string;
  name: string;
  quantity: number;
  fiatValueUsd: number;
  accountIds: string[];
}

export interface NetworkInfo {
  id: string;
  name: string;
  assetSymbol: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  kind: TransactionKind;
  status: OperationStatus;
  assetSymbol: string;
  quantity: number;
  fiatValueUsd: number;
  counterAssetSymbol?: string;
  counterQuantity?: number;
  networkName?: string;
  counterparty?: string;
  createdAt: string;
  failureReason?: string;
  providerLabel: string;
}

export interface SendRequest {
  accountId: string;
  assetSymbol: string;
  quantity: number;
  destination: string;
  networkId: string;
  kind: Extract<TransactionKind, 'transfer' | 'internal' | 'withdrawal'>;
}

export interface SendPreview {
  id: string;
  request: SendRequest;
  networkName: string;
  feeQuantity: number;
  feeAssetSymbol: string;
  youReceiveQuantity: number;
  estimatedArrival: string;
  irreversible: boolean;
}

export interface ReceiveAddress {
  accountId: string;
  assetSymbol: string;
  networkId: string;
  networkName: string;
  address: string;
  warning: string;
}

export interface ExchangeRequest {
  accountId: string;
  fromSymbol: string;
  toSymbol: string;
  fromQuantity: number;
}

export interface ExchangeQuote {
  id: string;
  request: ExchangeRequest;
  rateLabel: string;
  feeQuantity: number;
  feeAssetSymbol: string;
  youReceiveQuantity: number;
  minFromQuantity: number;
  spreadBps: number;
  providerLabel: string;
}

export interface OperationResult {
  operationId: string;
  status: OperationStatus;
  message: string;
  transactionId?: string;
}

export interface ConnectConfig {
  nickname: string;
  /** Distinguishes multiple accounts of the same provider type */
  labelHint?: string;
}
