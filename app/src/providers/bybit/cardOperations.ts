import type {
  CardOperation,
  CardOperationKind,
  OperationStatus,
} from '../../domain/types';

/** Raw row from Bybit `/v5/card/transaction/query-asset-records`. */
export type BybitCardAssetRecord = {
  pan4?: string;
  pan6?: string;
  side?: string;
  status?: string;
  tradeStatus?: string;
  basicAmount?: string;
  billAmount?: string;
  paidAmount?: string;
  basicCurrency?: string;
  paidCurrency?: string;
  transactionAmount?: string;
  transactionCurrency?: string;
  transactionCurrencyAmount?: string;
  merchName?: string;
  merchCity?: string;
  merchCountry?: string;
  txnId?: string;
  orderNo?: string;
  txnCreate?: number | string;
  declinedReason?: string;
  totalFees?: string;
  foreignTransactionFee?: string;
};

const CRYPTO_PAID = new Set([
  'USDT',
  'USDC',
  'DAI',
  'FDUSD',
  'USDE',
  'BTC',
  'ETH',
]);

function num(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toIso(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString();
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(n) && n > 0) return new Date(n).toISOString();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

export function mapCardSide(side: string): CardOperationKind {
  if (side === '5' || side === '4' || side === '8' || side === '10') return 'refund';
  if (side === '13') return 'atm';
  if (side === '12') return 'fee';
  return 'purchase';
}

export function mapCardStatus(status: string, tradeStatus: string): OperationStatus {
  if (status === '2' || tradeStatus === '2') return 'failed';
  if (status === '0' || status === '-1' || tradeStatus === '0') return 'pending';
  return 'completed';
}

/** Bybit returns `"0"` for no decline reason. */
export function cleanDeclinedReason(reason: string | undefined): string | undefined {
  if (!reason || reason === '0') return undefined;
  return reason;
}

/**
 * Map a Bybit card asset record into our domain model.
 *
 * From real Bybit payloads (e.g. Apple.COM/BILL):
 * - `paidAmount` + `paidCurrency` — what left the user's balance (e.g. 1490 KZT)
 * - `transactionAmount` + `transactionCurrency` — card-network / merchant amount (e.g. 3.13 USD)
 * - `basicAmount` + `basicCurrency` — total including fees (e.g. 3.19 USD)
 * - `billAmount` — bill amount (often equals transactionAmount)
 */
export function mapBybitCardAssetRecord(
  row: BybitCardAssetRecord,
  ctx: {
    accountId: string;
    providerLabel: string;
    fallbackId: string;
  },
): CardOperation {
  const pan4 = row.pan4 || '····';

  const paidAmount = num(row.paidAmount);
  const paidCurrency = (row.paidCurrency || '').toUpperCase() || 'USD';

  const cardAmount = num(row.transactionAmount || row.billAmount);
  const cardCurrency = (row.transactionCurrency || row.basicCurrency || '').toUpperCase() || undefined;

  const totalAmount = num(row.basicAmount);
  const totalCurrency = (row.basicCurrency || '').toUpperCase() || undefined;

  const feeAmount = num(row.totalFees || row.foreignTransactionFee);

  const isCryptoPaid = CRYPTO_PAID.has(paidCurrency);

  return {
    id: row.txnId || row.orderNo || ctx.fallbackId,
    cardId: `${ctx.accountId}_card_${pan4}`,
    accountId: ctx.accountId,
    kind: mapCardSide(row.side ?? '3'),
    status: mapCardStatus(row.status ?? '1', row.tradeStatus ?? '1'),
    merchant: row.merchName || 'Bybit Card',
    // List primary: what was deducted from the user's funding balance.
    amountFiat: paidAmount > 0 ? paidAmount : cardAmount || totalAmount,
    currency: paidAmount > 0 ? paidCurrency : cardCurrency || totalCurrency || 'USD',
    // Card-network / merchant amount (often USD).
    cardAmount: cardAmount > 0 ? cardAmount : undefined,
    cardCurrency: cardAmount > 0 ? cardCurrency : undefined,
    // Total including fees (basic*).
    settlementAmount: totalAmount > 0 ? totalAmount : undefined,
    settlementCurrency: totalAmount > 0 ? totalCurrency : undefined,
    feeAmount: feeAmount > 0 ? feeAmount : undefined,
    feeCurrency: feeAmount > 0 ? totalCurrency || cardCurrency : undefined,
    // When funding currency is crypto, expose as token fields too.
    amountTokenValue: isCryptoPaid && paidAmount > 0 ? paidAmount : undefined,
    tokenSymbol: isCryptoPaid ? paidCurrency : undefined,
    assetSymbol: isCryptoPaid ? paidCurrency : undefined,
    quantity: isCryptoPaid && paidAmount > 0 ? paidAmount : undefined,
    createdAt: toIso(row.txnCreate),
    providerLabel: ctx.providerLabel,
    failureReason: cleanDeclinedReason(row.declinedReason),
    cardLastFour: pan4,
    merchantCity: row.merchCity || undefined,
    merchantCountry: row.merchCountry || undefined,
  };
}
