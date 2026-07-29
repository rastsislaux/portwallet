import type { WalletProduct } from '../../domain/types';

/** Account types that credit the Funding wallet. */
const FUND_CONVERT_TYPES = new Set([
  'eb_convert_funding',
  'funding',
  'funding_fiat',
  'funding_fbtc_convert',
  'funding_block_trade',
]);

/** Account types that credit the Unified Trading Account. */
const UTA_CONVERT_TYPES = new Set(['eb_convert_uta']);

/** Comma-separated accountType query for convert history. */
export function convertHistoryAccountTypes(
  product: Exclude<WalletProduct, 'EARN'>,
): string {
  if (product === 'UNIFIED') {
    return [...UTA_CONVERT_TYPES].join(',');
  }
  return [...FUND_CONVERT_TYPES].join(',');
}

/**
 * Whether a convert row belongs to the given Portwallet product.
 * Bybit returns types like `eb_convert_funding` / `funding`, not `FUND`.
 */
export function convertMatchesProduct(
  accountType: string | undefined | null,
  product: WalletProduct,
): boolean {
  const type = (accountType ?? '').trim().toLowerCase();
  if (!type) {
    // Older rows may omit accountType; attribute to Funding only.
    return product === 'FUND';
  }
  if (product === 'UNIFIED') return UTA_CONVERT_TYPES.has(type);
  if (product === 'FUND') return FUND_CONVERT_TYPES.has(type);
  return false;
}
