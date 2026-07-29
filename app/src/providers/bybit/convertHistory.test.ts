import { describe, expect, it } from 'vitest';
import {
  convertHistoryAccountTypes,
  convertMatchesProduct,
} from './convertHistory';

describe('convertMatchesProduct', () => {
  it('maps Bybit convert accountType to FUND / UNIFIED', () => {
    expect(convertMatchesProduct('eb_convert_funding', 'FUND')).toBe(true);
    expect(convertMatchesProduct('funding', 'FUND')).toBe(true);
    expect(convertMatchesProduct('funding_fiat', 'FUND')).toBe(true);
    expect(convertMatchesProduct('eb_convert_uta', 'UNIFIED')).toBe(true);

    expect(convertMatchesProduct('eb_convert_uta', 'FUND')).toBe(false);
    expect(convertMatchesProduct('funding', 'UNIFIED')).toBe(false);
    expect(convertMatchesProduct('FUND', 'FUND')).toBe(false);
  });

  it('attributes missing accountType to Funding only', () => {
    expect(convertMatchesProduct('', 'FUND')).toBe(true);
    expect(convertMatchesProduct(undefined, 'UNIFIED')).toBe(false);
  });
});

describe('convertHistoryAccountTypes', () => {
  it('requests the wallet-specific convert types', () => {
    expect(convertHistoryAccountTypes('UNIFIED')).toBe('eb_convert_uta');
    expect(convertHistoryAccountTypes('FUND')).toContain('eb_convert_funding');
    expect(convertHistoryAccountTypes('FUND')).toContain('funding');
  });
});
