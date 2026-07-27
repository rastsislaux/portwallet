import type { AggregatedAsset, Transaction } from './types';

const STABLECOINS = new Set(['USDT', 'USDC', 'DAI', 'FDUSD', 'USDE', 'BUSD']);

export type AveragePurchase = {
  /** Weighted average USD paid per unit acquired. */
  averagePriceUsd: number;
  /** Total USD spent across acquisitions used in the average. */
  totalCostUsd: number;
  /** Total quantity acquired that contributed to the average. */
  acquiredQuantity: number;
};

export type UnrealizedPnl = {
  averagePriceUsd: number;
  costBasisUsd: number;
  pnlUsd: number;
  pnlPct: number;
};

export function isStablecoin(symbol: string): boolean {
  return STABLECOINS.has(symbol.toUpperCase());
}

/**
 * USD cost of acquiring `symbol` in a completed deposit or exchange.
 * Returns null when the transaction does not acquire the symbol with a known cost.
 */
export function acquisitionCostUsd(
  tx: Transaction,
  symbol: string,
): { quantity: number; costUsd: number } | null {
  if (tx.status !== 'completed') return null;

  const target = symbol.toUpperCase();

  if (tx.kind === 'deposit' && tx.assetSymbol.toUpperCase() === target) {
    if (!(tx.quantity > 0) || !(tx.fiatValueUsd > 0)) return null;
    return { quantity: tx.quantity, costUsd: tx.fiatValueUsd };
  }

  if (tx.kind === 'exchange' && (tx.counterAssetSymbol ?? '').toUpperCase() === target) {
    const quantity = tx.counterQuantity ?? 0;
    if (!(quantity > 0)) return null;

    const costUsd = estimateExchangeCostUsd(tx);
    if (!(costUsd > 0)) return null;
    return { quantity, costUsd };
  }

  return null;
}

function estimateExchangeCostUsd(tx: Transaction): number {
  if (tx.fiatValueUsd > 0) return tx.fiatValueUsd;
  if (isStablecoin(tx.assetSymbol) && tx.quantity > 0) return tx.quantity;
  return 0;
}

/**
 * Weighted average purchase price from provider transaction history.
 * Buys (deposits with known fiat, exchanges receiving the asset) are averaged;
 * sells/withdrawals do not change the average buy price.
 */
export function averagePurchasePrice(
  transactions: Transaction[],
  symbol: string,
): AveragePurchase | null {
  let totalCostUsd = 0;
  let acquiredQuantity = 0;

  const chronological = [...transactions].sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
  );

  for (const tx of chronological) {
    const lot = acquisitionCostUsd(tx, symbol);
    if (!lot) continue;
    totalCostUsd += lot.costUsd;
    acquiredQuantity += lot.quantity;
  }

  if (!(acquiredQuantity > 0) || !(totalCostUsd > 0)) return null;

  return {
    averagePriceUsd: totalCostUsd / acquiredQuantity,
    totalCostUsd,
    acquiredQuantity,
  };
}

/**
 * Unrealized P&L vs average buy price for the current holding.
 * costBasis = avgBuyPrice × currentQuantity; pnl = marketValue − costBasis.
 */
export function unrealizedPnlFromAverageBuy(
  transactions: Transaction[],
  symbol: string,
  currentQuantity: number,
  currentValueUsd: number,
): UnrealizedPnl | null {
  if (!(currentQuantity > 0) || !Number.isFinite(currentValueUsd)) return null;
  if (isStablecoin(symbol)) return null;

  const purchase = averagePurchasePrice(transactions, symbol);
  if (!purchase) return null;

  const costBasisUsd = purchase.averagePriceUsd * currentQuantity;
  if (!(costBasisUsd > 0)) return null;

  const pnlUsd = currentValueUsd - costBasisUsd;
  const pnlPct = (pnlUsd / costBasisUsd) * 100;

  if (!Number.isFinite(pnlUsd) || !Number.isFinite(pnlPct)) return null;

  return {
    averagePriceUsd: purchase.averagePriceUsd,
    costBasisUsd,
    pnlUsd,
    pnlPct,
  };
}

export function withPurchasePnl(
  assets: AggregatedAsset[],
  transactions: Transaction[],
): AggregatedAsset[] {
  return assets.map((asset) => {
    const pnl = unrealizedPnlFromAverageBuy(
      transactions,
      asset.symbol,
      asset.quantity,
      asset.fiatValueUsd,
    );
    if (!pnl) {
      return {
        ...asset,
        averageBuyPriceUsd: null,
        costBasisUsd: null,
        unrealizedPnlUsd: null,
        unrealizedPnlPct: null,
      };
    }
    return {
      ...asset,
      averageBuyPriceUsd: pnl.averagePriceUsd,
      costBasisUsd: pnl.costBasisUsd,
      unrealizedPnlUsd: pnl.pnlUsd,
      unrealizedPnlPct: pnl.pnlPct,
    };
  });
}

/** Formats like `+100% (+15.00 USD)` / `-10% (-2.00 USD)`. */
export function formatPurchasePnl(
  pnlPct: number,
  pnlUsd: number,
  formatFromUsd: (usdAmount: number) => string,
): string {
  const pctRounded = Math.abs(pnlPct) >= 10 ? Math.round(pnlPct) : Math.round(pnlPct * 10) / 10;
  const pctSign = pctRounded > 0 ? '+' : '';
  const fiatAbs = formatFromUsd(Math.abs(pnlUsd));
  const fiatSigned =
    pnlUsd > 0 ? `+${fiatAbs}` : pnlUsd < 0 ? `-${fiatAbs}` : fiatAbs;
  return `${pctSign}${pctRounded}% (${fiatSigned})`;
}
