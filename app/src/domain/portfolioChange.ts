import type { SpotPriceQuote } from '../market/spotPrices';

const STABLECOINS = new Set(['USDT', 'USDC', 'DAI', 'FDUSD', 'USDE', 'BUSD', 'TUSD']);

export type PortfolioHolding = {
  symbol: string;
  quantity: number;
  fiatValueUsd: number;
};

export type PortfolioDayChange = {
  /** Mark-to-market USD change over ~24h for current holdings. */
  changeUsd: number;
  /** Change relative to estimated worth 24h ago; null when previous worth is 0. */
  changePct: number | null;
  previousWorthUsd: number;
  pricedAssetCount: number;
  skippedAssetCount: number;
};

/**
 * Estimate 24h portfolio worth change from current quantities and spot tickers.
 * Uses the same holdings (does not model deposits/withdrawals). Stables contribute ~0.
 */
export function computePortfolioDayChange(
  holdings: PortfolioHolding[],
  prices: Map<string, SpotPriceQuote>,
): PortfolioDayChange {
  let changeUsd = 0;
  let previousWorthUsd = 0;
  let pricedAssetCount = 0;
  let skippedAssetCount = 0;

  for (const holding of holdings) {
    if (!(holding.quantity > 0)) continue;

    const symbol = holding.symbol.toUpperCase();
    if (STABLECOINS.has(symbol)) {
      previousWorthUsd += holding.quantity;
      pricedAssetCount += 1;
      continue;
    }

    const quote = prices.get(symbol);
    if (quote && quote.prevPrice24h > 0 && quote.lastPrice > 0) {
      const prev = holding.quantity * quote.prevPrice24h;
      const now = holding.quantity * quote.lastPrice;
      previousWorthUsd += prev;
      changeUsd += now - prev;
      pricedAssetCount += 1;
      continue;
    }

    // Fallback: apply ticker % to the provider's current USD valuation.
    if (quote && Number.isFinite(quote.price24hPcnt) && quote.price24hPcnt > -1) {
      const fiat = holding.fiatValueUsd;
      if (fiat > 0) {
        const prev = fiat / (1 + quote.price24hPcnt);
        previousWorthUsd += prev;
        changeUsd += fiat - prev;
        pricedAssetCount += 1;
        continue;
      }
    }

    skippedAssetCount += 1;
  }

  const changePct =
    previousWorthUsd > 0 ? (changeUsd / previousWorthUsd) * 100 : null;

  return {
    changeUsd,
    changePct,
    previousWorthUsd,
    pricedAssetCount,
    skippedAssetCount,
  };
}
