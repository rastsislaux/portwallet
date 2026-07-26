import type { KeyboardEvent } from 'react';
import type { ProviderCard } from '../domain/types';
import { formatFiat } from './Amount';

type PaymentCardProps = {
  card: ProviderCard;
  accountNickname: string;
  selected?: boolean;
  onSelect?: () => void;
};

export function PaymentCard({
  card,
  accountNickname,
  selected = false,
  onSelect,
}: PaymentCardProps) {
  const interactive = Boolean(onSelect);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onSelect) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      className={`payment-card payment-card--${card.providerType}${selected ? ' is-selected' : ''}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <div className="payment-card__top">
        <span className="payment-card__brand">{card.label}</span>
        <span className="payment-card__network" aria-label={card.network}>
          {card.network === 'visa' ? 'VISA' : 'mastercard'}
        </span>
      </div>

      <div className="payment-card__mid">
        <span className="payment-card__chip" aria-hidden="true" />
        <div
          className="payment-card__number tabular"
          aria-label={`Card ending ${card.lastFour}`}
        >
          <span aria-hidden="true">••••</span>
          <span aria-hidden="true">••••</span>
          <span aria-hidden="true">••••</span>
          <span>{card.lastFour}</span>
        </div>
      </div>

      <div className="payment-card__bottom">
        <div className="payment-card__meta">
          <span className="payment-card__meta-label">Account</span>
          <span className="payment-card__meta-value">{accountNickname}</span>
        </div>
        <div className="payment-card__meta payment-card__meta--end">
          <span className="payment-card__meta-label">Available</span>
          <span className="payment-card__meta-value tabular">
            {formatFiat(card.balanceUsd)} {card.currency}
          </span>
        </div>
      </div>
    </div>
  );
}
