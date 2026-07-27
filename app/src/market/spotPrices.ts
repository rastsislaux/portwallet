/** Public Bybit spot tickers used for cross-provider USD pricing / 24h change. */
const BYBIT_TICKERS_URL = 'https://api.bybit.com/v5/market/tickers?category=spot';

export const SPOT_PRICE_CACHE_TTL_MS = 30_000;

export type SpotPriceQuote = {
  symbol: string;
  lastPrice: number;
  prevPrice24h: number;
  /** Fractional 24h change, e.g. 0.021 for +2.1%. */
  price24hPcnt: number;
};

type BybitTickersResponse = {
  retCode?: number;
  retMsg?: string;
  result?: {
    list?: Array<{
      symbol?: string;
      lastPrice?: string;
      prevPrice24h?: string;
      price24hPcnt?: string;
      usdIndexPrice?: string;
    }>;
  };
};

type CacheEntry = {
  at: number;
  bySymbol: Map<string, SpotPriceQuote>;
};

let cache: CacheEntry | null = null;
let inflight: Promise<Map<string, SpotPriceQuote>> | null = null;

function num(value: string | undefined): number {
  if (value == null || value === '') return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function baseFromPair(pair: string): string | null {
  if (pair.endsWith('USDT')) {
    const base = pair.slice(0, -4);
    return base || null;
  }
  if (pair.endsWith('USD')) {
    const base = pair.slice(0, -3);
    return base || null;
  }
  return null;
}

function parseTickers(payload: BybitTickersResponse): Map<string, SpotPriceQuote> {
  const bySymbol = new Map<string, SpotPriceQuote>();
  for (const row of payload.result?.list ?? []) {
    const pair = (row.symbol ?? '').toUpperCase();
    const base = baseFromPair(pair);
    if (!base) continue;

    const lastPrice = num(row.usdIndexPrice || row.lastPrice);
    const prevPrice24h = num(row.prevPrice24h);
    const price24hPcnt = num(row.price24hPcnt);
    if (!(lastPrice > 0)) continue;

    const existing = bySymbol.get(base);
    // Prefer USDT pairs when both USD and USDT exist.
    if (existing && pair.endsWith('USD') && !pair.endsWith('USDT')) continue;

    const resolvedPrev =
      prevPrice24h > 0
        ? prevPrice24h
        : Number.isFinite(price24hPcnt) && price24hPcnt > -1
          ? lastPrice / (1 + price24hPcnt)
          : NaN;
    if (!(resolvedPrev > 0)) continue;

    const resolvedPcnt = Number.isFinite(price24hPcnt)
      ? price24hPcnt
      : (lastPrice - resolvedPrev) / resolvedPrev;

    bySymbol.set(base, {
      symbol: base,
      lastPrice,
      prevPrice24h: resolvedPrev,
      price24hPcnt: resolvedPcnt,
    });
  }
  return bySymbol;
}

async function fetchAllSpotPrices(): Promise<Map<string, SpotPriceQuote>> {
  const res = await fetch(BYBIT_TICKERS_URL);
  if (!res.ok) {
    throw new Error(`Spot ticker request failed (${res.status})`);
  }
  const payload = (await res.json()) as BybitTickersResponse;
  if (payload.retCode !== 0) {
    throw new Error(payload.retMsg || 'Spot ticker request failed');
  }
  return parseTickers(payload);
}

/** Fetch (or reuse cached) USD spot quotes keyed by base asset symbol. */
export async function fetchSpotPriceMap(
  now = Date.now(),
): Promise<Map<string, SpotPriceQuote>> {
  if (cache && now - cache.at < SPOT_PRICE_CACHE_TTL_MS && cache.bySymbol.size > 0) {
    return cache.bySymbol;
  }

  if (!inflight) {
    inflight = fetchAllSpotPrices()
      .then((bySymbol) => {
        cache = { at: Date.now(), bySymbol };
        return bySymbol;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}

/** Test helper — clears in-memory ticker cache. */
export function clearSpotPriceCache(): void {
  cache = null;
  inflight = null;
}

/** Test helper — seed cache without network. */
export function seedSpotPriceCache(
  quotes: SpotPriceQuote[],
  at = Date.now(),
): void {
  const bySymbol = new Map<string, SpotPriceQuote>();
  for (const quote of quotes) {
    bySymbol.set(quote.symbol.toUpperCase(), {
      ...quote,
      symbol: quote.symbol.toUpperCase(),
    });
  }
  cache = { at, bySymbol };
}
