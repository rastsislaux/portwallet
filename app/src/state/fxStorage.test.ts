import { afterEach, describe, expect, it } from 'vitest';
import {
  STORAGE_FX_QUOTE,
  clearStoredFxQuote,
  readStoredFxQuote,
  writeStoredFxQuote,
} from './fxStorage';

afterEach(() => {
  clearStoredFxQuote();
});

describe('fxStorage', () => {
  it('returns null when nothing is stored', () => {
    expect(readStoredFxQuote()).toBeNull();
  });

  it('round-trips a quote', () => {
    const quote = {
      base: 'USD' as const,
      quote: 'EUR',
      rate: 0.92,
      date: '2026-07-27',
      source: 'frankfurter' as const,
      sourceLabel: 'Frankfurter',
    };
    writeStoredFxQuote(quote, '2026-07-27T10:00:00.000Z');
    expect(readStoredFxQuote()).toEqual({
      quote,
      fetchedAt: '2026-07-27T10:00:00.000Z',
    });
  });

  it('ignores invalid payloads', () => {
    localStorage.setItem(STORAGE_FX_QUOTE, '{bad');
    expect(readStoredFxQuote()).toBeNull();

    localStorage.setItem(
      STORAGE_FX_QUOTE,
      JSON.stringify({
        fetchedAt: '2026-07-27T10:00:00.000Z',
        quote: { base: 'USD', quote: 'EUR', rate: -1, date: 'x', source: 'frankfurter', sourceLabel: 'x' },
      }),
    );
    expect(readStoredFxQuote()).toBeNull();
  });
});
