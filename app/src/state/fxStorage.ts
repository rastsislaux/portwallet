import type { FxQuote } from '../fx/rates';

export const STORAGE_FX_QUOTE = 'portwallet.fxQuote';

export type StoredFxQuote = {
  quote: FxQuote;
  fetchedAt: string;
};

function isFxSource(value: unknown): value is FxQuote['source'] {
  return (
    value === 'identity' || value === 'frankfurter' || value === 'nbrb'
  );
}

function parseQuote(value: unknown): FxQuote | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.base !== 'USD') return null;
  if (typeof row.quote !== 'string' || !row.quote) return null;
  if (typeof row.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0) {
    return null;
  }
  if (typeof row.date !== 'string' || !row.date) return null;
  if (!isFxSource(row.source)) return null;
  if (typeof row.sourceLabel !== 'string') return null;
  return {
    base: 'USD',
    quote: row.quote,
    rate: row.rate,
    date: row.date,
    source: row.source,
    sourceLabel: row.sourceLabel,
  };
}

export function readStoredFxQuote(): StoredFxQuote | null {
  try {
    const raw = localStorage.getItem(STORAGE_FX_QUOTE);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const row = parsed as Record<string, unknown>;
    if (typeof row.fetchedAt !== 'string' || !row.fetchedAt) return null;
    const quote = parseQuote(row.quote);
    if (!quote) return null;
    return { quote, fetchedAt: row.fetchedAt };
  } catch {
    return null;
  }
}

export function writeStoredFxQuote(quote: FxQuote, fetchedAt = new Date().toISOString()): void {
  try {
    const payload: StoredFxQuote = { quote, fetchedAt };
    localStorage.setItem(STORAGE_FX_QUOTE, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function clearStoredFxQuote(): void {
  try {
    localStorage.removeItem(STORAGE_FX_QUOTE);
  } catch {
    /* ignore */
  }
}
