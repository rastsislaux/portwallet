import { MAIN_CURRENCIES, getCurrency } from './currencies';

export type SecondaryCurrencyKind = 'fiat' | 'crypto';

export type SecondaryCurrency = {
  code: string;
  name: string;
  kind: SecondaryCurrencyKind;
};

/** Common cryptos offered as the Home total-worth secondary line. */
export const SECONDARY_CRYPTOS: SecondaryCurrency[] = [
  { code: 'BTC', name: 'Bitcoin', kind: 'crypto' },
  { code: 'ETH', name: 'Ethereum', kind: 'crypto' },
  { code: 'USDT', name: 'Tether', kind: 'crypto' },
  { code: 'USDC', name: 'USD Coin', kind: 'crypto' },
];

export const DEFAULT_SECONDARY_CURRENCY = 'BTC';

/** Fallback USD unit prices when the portfolio has no holding to derive from. */
export const CRYPTO_USD_FALLBACKS: Record<string, number> = {
  BTC: 68420,
  ETH: 2704,
  USDT: 1,
  USDC: 1,
};

export function listSecondaryCurrencies(): SecondaryCurrency[] {
  return [
    ...MAIN_CURRENCIES.map((c) => ({
      code: c.code,
      name: c.name,
      kind: 'fiat' as const,
    })),
    ...SECONDARY_CRYPTOS,
  ];
}

export function getSecondaryCurrency(code: string): SecondaryCurrency | undefined {
  const upper = code.toUpperCase();
  const crypto = SECONDARY_CRYPTOS.find((c) => c.code === upper);
  if (crypto) return crypto;
  const fiat = getCurrency(upper);
  if (fiat) return { code: fiat.code, name: fiat.name, kind: 'fiat' };
  return undefined;
}

export function isFiatSecondary(code: string): boolean {
  return getSecondaryCurrency(code)?.kind === 'fiat';
}
