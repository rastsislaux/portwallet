import { describe, expect, it } from 'vitest';
import {
  formatSecondaryApprox,
  usdPriceForCrypto,
} from './formatSecondaryApprox';

const assets = [
  { symbol: 'BTC', quantity: 0.1, fiatValueUsd: 6842 },
  { symbol: 'ETH', quantity: 1, fiatValueUsd: 2704 },
];

describe('usdPriceForCrypto', () => {
  it('prefers portfolio-derived price', () => {
    expect(usdPriceForCrypto('BTC', assets)).toBe(68420);
    expect(usdPriceForCrypto('ETH', assets)).toBe(2704);
  });

  it('falls back when the asset is not held', () => {
    expect(usdPriceForCrypto('BTC', [])).toBe(68420);
    expect(usdPriceForCrypto('USDT', [])).toBe(1);
  });

  it('returns null for unknown symbols without a holding', () => {
    expect(usdPriceForCrypto('DOGE', [])).toBeNull();
  });
});

describe('formatSecondaryApprox', () => {
  it('formats crypto secondary from holdings', () => {
    expect(
      formatSecondaryApprox({
        totalFiatUsd: 6842,
        secondaryCode: 'BTC',
        mainCurrency: 'USD',
        assets,
        usdToSecondaryRate: null,
      }),
    ).toBe('≈ 0.1 BTC');
  });

  it('formats ETH secondary with fallback price', () => {
    expect(
      formatSecondaryApprox({
        totalFiatUsd: 2704,
        secondaryCode: 'ETH',
        mainCurrency: 'BYN',
        assets: [],
        usdToSecondaryRate: null,
      }),
    ).toBe('≈ 1 ETH');
  });

  it('formats stablecoin secondary with two decimals', () => {
    expect(
      formatSecondaryApprox({
        totalFiatUsd: 1234.5,
        secondaryCode: 'USDT',
        mainCurrency: 'EUR',
        assets: [],
        usdToSecondaryRate: null,
      }),
    ).toBe('≈ 1,234.50 USDT');
  });

  it('formats fiat secondary via FX rate', () => {
    expect(
      formatSecondaryApprox({
        totalFiatUsd: 100,
        secondaryCode: 'USD',
        mainCurrency: 'BYN',
        assets,
        usdToSecondaryRate: 1,
      }),
    ).toBe('≈ 100.00 USD');
  });

  it('hides fiat secondary when it matches main currency', () => {
    expect(
      formatSecondaryApprox({
        totalFiatUsd: 100,
        secondaryCode: 'BYN',
        mainCurrency: 'BYN',
        assets,
        usdToSecondaryRate: 3.2,
      }),
    ).toBeNull();
  });

  it('returns null when fiat rate is missing', () => {
    expect(
      formatSecondaryApprox({
        totalFiatUsd: 100,
        secondaryCode: 'EUR',
        mainCurrency: 'USD',
        assets,
        usdToSecondaryRate: null,
      }),
    ).toBeNull();
  });
});
