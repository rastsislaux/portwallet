import { formatFiat, formatQty } from '../components/Amount';
import {
  CRYPTO_USD_FALLBACKS,
  getSecondaryCurrency,
} from './secondaryCurrencies';

export type PricedAsset = {
  symbol: string;
  quantity: number;
  fiatValueUsd: number;
};

/** USD unit price for a crypto secondary, preferring portfolio holdings. */
export function usdPriceForCrypto(
  symbol: string,
  assets: readonly PricedAsset[],
): number | null {
  const asset = assets.find((a) => a.symbol === symbol);
  if (asset && asset.quantity > 0) {
    const px = asset.fiatValueUsd / asset.quantity;
    if (Number.isFinite(px) && px > 0) return px;
  }
  const fallback = CRYPTO_USD_FALLBACKS[symbol];
  return fallback != null && fallback > 0 ? fallback : null;
}

function formatSecondaryCryptoQty(symbol: string, qty: number): string {
  if (symbol === 'USDT' || symbol === 'USDC') return formatQty(qty, 2, 2);
  return formatQty(qty, 4);
}

/**
 * Formats the Home "≈ …" secondary total, or null when it should be hidden
 * (same as main fiat, unknown code, or missing rate/price).
 */
export function formatSecondaryApprox(opts: {
  totalFiatUsd: number;
  secondaryCode: string;
  mainCurrency: string;
  assets: readonly PricedAsset[];
  /** Units of secondary fiat per 1 USD; ignored for crypto. */
  usdToSecondaryRate: number | null;
}): string | null {
  const meta = getSecondaryCurrency(opts.secondaryCode);
  if (!meta) return null;

  if (meta.kind === 'fiat') {
    if (meta.code === opts.mainCurrency) return null;
    const rate = opts.usdToSecondaryRate;
    if (rate == null || !(rate > 0)) return null;
    const amount = opts.totalFiatUsd * rate;
    if (!Number.isFinite(amount)) return null;
    return `≈ ${formatFiat(amount)} ${meta.code}`;
  }

  const px = usdPriceForCrypto(meta.code, opts.assets);
  if (px == null) return null;
  const qty = opts.totalFiatUsd / px;
  if (!Number.isFinite(qty)) return null;
  return `≈ ${formatSecondaryCryptoQty(meta.code, qty)} ${meta.code}`;
}
