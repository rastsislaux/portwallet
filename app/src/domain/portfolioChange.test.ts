import { describe, expect, it } from 'vitest';
import type { SpotPriceQuote } from '../market/spotPrices';
import { computePortfolioDayChange } from './portfolioChange';

function quote(
  symbol: string,
  lastPrice: number,
  prevPrice24h: number,
): SpotPriceQuote {
  return {
    symbol,
    lastPrice,
    prevPrice24h,
    price24hPcnt: (lastPrice - prevPrice24h) / prevPrice24h,
  };
}

describe('computePortfolioDayChange', () => {
  it('sums mark-to-market change across holdings', () => {
    const prices = new Map<string, SpotPriceQuote>([
      ['BTC', quote('BTC', 70_000, 68_000)],
      ['ETH', quote('ETH', 3_000, 3_200)],
    ]);

    const result = computePortfolioDayChange(
      [
        { symbol: 'BTC', quantity: 0.5, fiatValueUsd: 35_000 },
        { symbol: 'ETH', quantity: 2, fiatValueUsd: 6_000 },
        { symbol: 'USDT', quantity: 1_000, fiatValueUsd: 1_000 },
      ],
      prices,
    );

    // BTC: 0.5 * (70000-68000) = +1000
    // ETH: 2 * (3000-3200) = -400
    // USDT: 0
    expect(result.changeUsd).toBeCloseTo(600);
    expect(result.previousWorthUsd).toBeCloseTo(0.5 * 68_000 + 2 * 3_200 + 1_000);
    expect(result.changePct).toBeCloseTo((600 / result.previousWorthUsd) * 100);
    expect(result.pricedAssetCount).toBe(3);
    expect(result.skippedAssetCount).toBe(0);
  });

  it('skips assets without prices', () => {
    const result = computePortfolioDayChange(
      [{ symbol: 'OBSCURE', quantity: 10, fiatValueUsd: 50 }],
      new Map(),
    );
    expect(result.changeUsd).toBe(0);
    expect(result.pricedAssetCount).toBe(0);
    expect(result.skippedAssetCount).toBe(1);
    expect(result.changePct).toBeNull();
  });

  it('falls back to fiat × price24hPcnt when only pct is usable', () => {
    const prices = new Map<string, SpotPriceQuote>([
      [
        'SOL',
        {
          symbol: 'SOL',
          lastPrice: 0,
          prevPrice24h: 0,
          price24hPcnt: 0.1,
        },
      ],
    ]);

    const result = computePortfolioDayChange(
      [{ symbol: 'SOL', quantity: 5, fiatValueUsd: 110 }],
      prices,
    );

    expect(result.previousWorthUsd).toBeCloseTo(100);
    expect(result.changeUsd).toBeCloseTo(10);
    expect(result.changePct).toBeCloseTo(10);
  });
});
