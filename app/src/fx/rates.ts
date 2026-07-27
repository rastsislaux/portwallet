import { getCurrency } from './currencies';

const FRANKFURTER_BASE = 'https://api.frankfurter.dev';
const NBRB_BASE = 'https://api.nbrb.by';

export type FxQuote = {
  base: 'USD';
  quote: string;
  rate: number;
  date: string;
  source: 'identity' | 'frankfurter' | 'nbrb';
  sourceLabel: string;
};

type FrankfurterRateResponse = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

type NbrbRateResponse = {
  Date: string;
  Cur_Abbreviation: string;
  Cur_Scale: number;
  Cur_OfficialRate: number;
};

export const FX_DATA_SOURCES = [
  {
    id: 'frankfurter',
    title: 'Frankfurter',
    detail:
      'Open exchange-rate API (frankfurter.dev) using published central-bank reference rates for most display currencies.',
  },
  {
    id: 'nbrb',
    title: 'NBRB',
    detail:
      'Official Belarusian ruble (BYN) rates from the National Bank of the Republic of Belarus (api.nbrb.by).',
  },
] as const;

/** Extra non-FX sources shown on the Settings data-sources section. */
export const MARKET_DATA_SOURCES = [
  {
    id: 'bybit-market',
    title: 'Bybit market',
    detail:
      'Public Bybit spot tickers power the optional 24h portfolio change on Home, using the same mark-to-market approach across every connected account.',
  },
] as const;

function sourceLabel(source: FxQuote['source']): string {
  if (source === 'nbrb') return 'NBRB';
  if (source === 'frankfurter') return 'Frankfurter';
  return '—';
}

async function fetchFrankfurterUsdRate(quote: string): Promise<FxQuote> {
  const res = await fetch(`${FRANKFURTER_BASE}/v2/rate/USD/${encodeURIComponent(quote)}`);
  if (!res.ok) {
    throw new Error(`Frankfurter request failed (${res.status})`);
  }
  const data = (await res.json()) as FrankfurterRateResponse;
  if (!Number.isFinite(data.rate) || data.rate <= 0) {
    throw new Error('Frankfurter returned an invalid rate');
  }
  return {
    base: 'USD',
    quote: data.quote || quote,
    rate: data.rate,
    date: data.date,
    source: 'frankfurter',
    sourceLabel: sourceLabel('frankfurter'),
  };
}

async function fetchNbrbUsdToByn(): Promise<FxQuote> {
  const res = await fetch(`${NBRB_BASE}/exrates/rates/USD?parammode=2`);
  if (!res.ok) {
    throw new Error(`NBRB request failed (${res.status})`);
  }
  const data = (await res.json()) as NbrbRateResponse;
  const scale = data.Cur_Scale || 1;
  const rate = data.Cur_OfficialRate / scale;
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('NBRB returned an invalid rate');
  }
  return {
    base: 'USD',
    quote: 'BYN',
    rate,
    date: data.Date.slice(0, 10),
    source: 'nbrb',
    sourceLabel: sourceLabel('nbrb'),
  };
}

/** Returns how many units of `quoteCurrency` equal 1 USD. */
export async function fetchUsdToQuote(quoteCurrency: string): Promise<FxQuote> {
  const code = quoteCurrency.toUpperCase();
  const meta = getCurrency(code);

  if (code === 'USD' || meta?.source === 'identity') {
    return {
      base: 'USD',
      quote: 'USD',
      rate: 1,
      date: new Date().toISOString().slice(0, 10),
      source: 'identity',
      sourceLabel: sourceLabel('identity'),
    };
  }

  if (code === 'BYN' || meta?.source === 'nbrb') {
    try {
      return await fetchNbrbUsdToByn();
    } catch {
      // Frankfurter also carries NBRB-sourced BYN when the direct API fails.
      const fallback = await fetch(
        `${FRANKFURTER_BASE}/v2/rate/USD/BYN?providers=NBRB`,
      );
      if (!fallback.ok) throw new Error('Unable to load BYN rate');
      const data = (await fallback.json()) as FrankfurterRateResponse;
      return {
        base: 'USD',
        quote: 'BYN',
        rate: data.rate,
        date: data.date,
        source: 'nbrb',
        sourceLabel: 'NBRB via Frankfurter',
      };
    }
  }

  return fetchFrankfurterUsdRate(code);
}
