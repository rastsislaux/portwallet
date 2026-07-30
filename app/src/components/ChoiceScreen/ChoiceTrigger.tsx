import type { ReactNode } from 'react';
import { CryptoIcon, IconChevronDown } from '../icons';

type ChoiceTriggerProps = {
  label?: string;
  valueLabel: string;
  iconSymbol?: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'field' | 'pill';
  'aria-label'?: string;
  onClick: () => void;
  trailing?: ReactNode;
};

export function ChoiceTrigger({
  label,
  valueLabel,
  iconSymbol,
  disabled = false,
  loading = false,
  variant = 'field',
  'aria-label': ariaLabel,
  onClick,
  trailing,
}: ChoiceTriggerProps) {
  const content = (
    <>
      {iconSymbol ? <CryptoIcon symbol={iconSymbol} size={28} decorative /> : null}
      <span className={variant === 'pill' ? 'selector__ticker' : 'asset-select__label'}>
        {loading ? 'Loading…' : valueLabel}
      </span>
      {trailing}
      <span
        className={variant === 'pill' ? 'selector__chevron' : 'asset-select__chevron'}
        aria-hidden="true"
      >
        <IconChevronDown size={variant === 'pill' ? 14 : 16} />
      </span>
    </>
  );

  if (variant === 'pill') {
    return (
      <button
        type="button"
        className="selector selector--button"
        aria-label={ariaLabel ?? label}
        disabled={disabled || loading}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="field">
      {label ? <span className="field-label">{label}</span> : null}
      <button
        type="button"
        className="asset-select asset-select--button"
        aria-label={ariaLabel ?? label}
        disabled={disabled || loading}
        onClick={onClick}
      >
        {content}
      </button>
    </div>
  );
}
