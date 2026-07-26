export type FiatCurrency = {
  code: string;
  name: string;
  /** Prefer NBRB for BYN; Frankfurter for other non-USD currencies. */
  source: 'identity' | 'frankfurter' | 'nbrb';
};

export const MAIN_CURRENCIES: FiatCurrency[] = [
  { code: 'USD', name: 'US Dollar', source: 'identity' },
  { code: 'EUR', name: 'Euro', source: 'frankfurter' },
  { code: 'GBP', name: 'British Pound', source: 'frankfurter' },
  { code: 'PLN', name: 'Polish Złoty', source: 'frankfurter' },
  { code: 'BYN', name: 'Belarusian Ruble', source: 'nbrb' },
  { code: 'CHF', name: 'Swiss Franc', source: 'frankfurter' },
  { code: 'JPY', name: 'Japanese Yen', source: 'frankfurter' },
  { code: 'CAD', name: 'Canadian Dollar', source: 'frankfurter' },
  { code: 'AUD', name: 'Australian Dollar', source: 'frankfurter' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', source: 'frankfurter' },
];

export const DEFAULT_MAIN_CURRENCY = 'USD';

export function getCurrency(code: string): FiatCurrency | undefined {
  return MAIN_CURRENCIES.find((c) => c.code === code);
}
