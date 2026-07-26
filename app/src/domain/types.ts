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

export type CardNetwork = 'visa' | 'mastercard';

export type CardStatus = 'active' | 'frozen' | 'pending';

export type CardBalanceSource = 'provider' | 'calculated';

export type CardOperationKind =
  | 'purchase'
  | 'refund'
  | 'atm'
  | 'fee'
  | 'top_up';

/**
 * Whether a connected account can have payment cards.
 * Providers may omit cards entirely, or support them without issuing any yet.
 */
export interface CardCapability {
  supported: boolean;
  /** Present when supported is false (e.g. non-custodial wallets). */
  unsupportedReason?: string;
}

export interface ProviderCard {
  id: string;
  accountId: string;
  providerType: ProviderType;
  label: string;
  lastFour: string;
  network: CardNetwork;
  status: CardStatus;
  holderName: string;
  currency: string;
  /** Available spend balance in fiat (USD-normalized for the prototype). */
  balanceUsd: number;
  /**
   * `provider` — venue reported the balance.
   * `calculated` — app summed allowed funding-account coins (e.g. Bybit).
   */
  balanceSource: CardBalanceSource;
  /** Assets included when balanceSource is `calculated`. */
  fundingAssetSymbols: string[];
  expiresLabel: string;
}

export interface CardOperation {
  id: string;
  cardId: string;
  accountId: string;
  kind: CardOperationKind;
  status: OperationStatus;
  merchant: string;
  amountFiat: number;
  currency: string;
  assetSymbol?: string;
  quantity?: number;
  createdAt: string;
  providerLabel: string;
  failureReason?: string;
}

export interface FundingAssetBalance {
  symbol: string;
  name: string;
  quantity: number;
  fiatValueUsd: number;
  /** Whether this asset can fund card spend for the account. */
  cardEligible: boolean;
}
