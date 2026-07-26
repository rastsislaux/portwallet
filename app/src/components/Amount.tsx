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

export function formatQty(value: number, max = 8): string {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: max,
  });
}
