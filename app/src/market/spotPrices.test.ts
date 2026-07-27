import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSpotPriceCache,
  fetchSpotPriceMap,
  seedSpotPriceCache,
} from './spotPrices';

afterEach(() => {
  clearSpotPriceCache();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchSpotPriceMap', () => {
  it('parses USDT spot tickers into base-asset quotes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          retCode: 0,
          retMsg: 'OK',
          result: {
            list: [
              {
                symbol: 'BTCUSDT',
                lastPrice: '70000',
                prevPrice24h: '68000',
                price24hPcnt: '0.02941176',
                usdIndexPrice: '70010',
              },
              {
                symbol: 'ETHUSDT',
                lastPrice: '3000',
                prevPrice24h: '2900',
                price24hPcnt: '0.03448276',
              },
            ],
          },
        }),
      })),
    );

    const map = await fetchSpotPriceMap();
    expect(map.get('BTC')?.lastPrice).toBe(70010);
    expect(map.get('BTC')?.prevPrice24h).toBe(68000);
    expect(map.get('ETH')?.lastPrice).toBe(3000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reuses cache within TTL', async () => {
    seedSpotPriceCache(
      [{ symbol: 'BTC', lastPrice: 1, prevPrice24h: 1, price24hPcnt: 0 }],
      Date.now(),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const map = await fetchSpotPriceMap();
    expect(map.get('BTC')?.lastPrice).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when Bybit returns an error code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ retCode: 10001, retMsg: 'bad request' }),
      })),
    );

    await expect(fetchSpotPriceMap()).rejects.toThrow(/bad request/);
  });
});
