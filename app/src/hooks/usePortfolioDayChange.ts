import { useEffect, useState } from 'react';
import {
  computePortfolioDayChange,
  type PortfolioDayChange,
  type PortfolioHolding,
} from '../domain/portfolioChange';
import { fetchSpotPriceMap } from '../market/spotPrices';

export type DayChangeStatus = 'idle' | 'loading' | 'ready' | 'error';

export type DayChangeState = {
  status: DayChangeStatus;
  change: PortfolioDayChange | null;
  error: string | null;
};

const IDLE: DayChangeState = { status: 'idle', change: null, error: null };

function holdingsFingerprint(holdings: PortfolioHolding[]): string {
  return holdings
    .filter((h) => h.quantity > 0)
    .map((h) => `${h.symbol}:${h.quantity}:${h.fiatValueUsd}`)
    .join('|');
}

/**
 * Loads public spot tickers and computes 24h mark-to-market change for holdings.
 * No-ops when disabled or when there are no holdings.
 */
export function usePortfolioDayChange(
  enabled: boolean,
  holdings: PortfolioHolding[],
  /** Bump (e.g. lastUpdatedAt) to refetch after portfolio refresh. */
  refreshKey: string | null,
): DayChangeState {
  const [state, setState] = useState<DayChangeState>(IDLE);
  const fingerprint = holdingsFingerprint(holdings);

  useEffect(() => {
    if (!enabled) {
      setState(IDLE);
      return;
    }

    const activeHoldings = holdings.filter((h) => h.quantity > 0);
    if (activeHoldings.length === 0) {
      setState(IDLE);
      return;
    }

    let cancelled = false;
    setState((prev) => ({
      status: 'loading',
      change: prev.change,
      error: null,
    }));

    void fetchSpotPriceMap()
      .then((prices) => {
        if (cancelled) return;
        const change = computePortfolioDayChange(activeHoldings, prices);
        if (change.pricedAssetCount === 0) {
          setState({
            status: 'error',
            change: null,
            error: 'No market prices available for current holdings',
          });
          return;
        }
        setState({ status: 'ready', change, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          change: null,
          error: err instanceof Error ? err.message : 'Failed to load 24h change',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, fingerprint, refreshKey, holdings]);

  return state;
}
