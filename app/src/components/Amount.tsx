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
