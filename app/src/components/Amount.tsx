type AmountProps = {
  value: number;
  options?: Intl.NumberFormatOptions;
  className?: string;
};

export function Amount({ value, options, className }: AmountProps) {
  const formatted = value.toLocaleString('en-US', {
    maximumFractionDigits: 8,
    ...options,
  });
  return <span className={`tabular ${className ?? ''}`.trim()}>{formatted}</span>;
}

export function formatFiat(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const WHOLE_UNIT_CURRENCIES = new Set([
  'KZT',
  'JPY',
  'KRW',
  'VND',
  'CLP',
  'ISK',
  'HUF',
]);

/** Format a fiat amount in its native currency (whole units for JPY/KZT/etc.). */
export function formatLocalAmount(value: number, currency: string): string {
  if (WHOLE_UNIT_CURRENCIES.has(currency.toUpperCase())) {
    return Math.round(value).toLocaleString('en-US');
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatFiatParts(value: number): { integer: string; decimal: string } {
  const formatted = formatFiat(value);
  const [integer, decimal = '00'] = formatted.split('.');
  return { integer, decimal };
}

export function formatQty(value: number, max = 8, min = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

export function formatAssetQty(symbol: string, value: number): string {
  if (symbol === 'BTC') return formatQty(value, 8, 4);
  if (symbol === 'ETH') return formatQty(value, 8, 4);
  if (symbol === 'USDT' || symbol === 'USDC') return formatQty(value, 2, 2);
  return formatQty(value);
}
