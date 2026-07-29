import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CryptoIcon } from '../components/icons';
import { StatusBadge } from '../components/StatusBadge';
import type { CardOperation } from '../domain/types';
import { useWallet } from '../state/WalletContext';

function formatLocalAmount(value: number, currency: string): string {
  const isWholeUnit = ['KZT', 'JPY', 'KRW', 'VND', 'CLP', 'ISK', 'HUF'].includes(currency);
  if (isWholeUnit) {
    return Math.round(value).toLocaleString('en-US');
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function labelCardKind(kind: CardOperation['kind']): string {
  switch (kind) {
    case 'purchase':
      return 'Purchase';
    case 'refund':
      return 'Refund';
    case 'atm':
      return 'ATM Withdrawal';
    case 'fee':
      return 'Fee';
    case 'top_up':
      return 'Top Up';
    default:
      return kind;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CardOperationDetailScreen() {
  const { operationId } = useParams<{ operationId: string }>();
  const navigate = useNavigate();
  const { cardOperations, cards, accounts } = useWallet();

  const op = useMemo(
    () => cardOperations.find((o) => o.id === operationId) ?? null,
    [cardOperations, operationId],
  );

  const card = useMemo(
    () => (op ? cards.find((c) => c.id === op.cardId) ?? null : null),
    [cards, op],
  );

  const account = useMemo(
    () => (op ? accounts.find((a) => a.id === op.accountId) ?? null : null),
    [accounts, op],
  );

  if (!op) {
    return (
      <section className="screen">
        <header className="header-block">
          <button type="button" className="btn btn--text" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className="screen-title">Transaction not found</h1>
        </header>
      </section>
    );
  }

  const sign = op.kind === 'refund' || op.kind === 'top_up' ? '+' : '−';
  const formattedAmount = `${sign}${formatLocalAmount(op.amountFiat, op.currency)} ${op.currency}`;

  return (
    <section className="screen">
      <header className="header-block">
        <button type="button" className="btn btn--text" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </header>

      <div className="op-detail">
        <div className="op-detail__hero">
          {op.assetSymbol ? (
            <CryptoIcon symbol={op.assetSymbol} size={48} decorative />
          ) : null}
          <div className="op-detail__amount tabular">{formattedAmount}</div>
          <div className="op-detail__type">{labelCardKind(op.kind)}</div>
          <StatusBadge status={op.status} />
        </div>

        <div className="op-detail__section">
          {op.merchant ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Merchant</span>
              <span className="op-detail__value">{op.merchant}</span>
            </div>
          ) : null}

          <div className="op-detail__row">
            <span className="op-detail__label">Original amount</span>
            <span className="op-detail__value tabular">
              {formatLocalAmount(op.amountFiat, op.currency)} {op.currency}
            </span>
          </div>

          {op.amountTokenValue != null && op.tokenSymbol ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Token charged</span>
              <span className="op-detail__value tabular">
                {op.amountTokenValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}{' '}
                {op.tokenSymbol}
              </span>
            </div>
          ) : null}

          {op.assetSymbol && op.quantity != null ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Funding asset</span>
              <span className="op-detail__value tabular">
                {op.quantity.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 8,
                })}{' '}
                {op.assetSymbol}
              </span>
            </div>
          ) : null}
        </div>

        <div className="op-detail__section">
          <div className="op-detail__row">
            <span className="op-detail__label">Date & time</span>
            <span className="op-detail__value">{formatDateTime(op.createdAt)}</span>
          </div>

          <div className="op-detail__row">
            <span className="op-detail__label">Status</span>
            <span className="op-detail__value">
              <StatusBadge status={op.status} />
            </span>
          </div>

          {op.failureReason ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Failure reason</span>
              <span className="op-detail__value op-detail__value--error">{op.failureReason}</span>
            </div>
          ) : null}
        </div>

        <div className="op-detail__section">
          {card ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Card</span>
              <span className="op-detail__value">
                {card.label} ·· {card.lastFour}
              </span>
            </div>
          ) : null}

          {account ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Account</span>
              <span className="op-detail__value">{account.nickname}</span>
            </div>
          ) : null}

          <div className="op-detail__row">
            <span className="op-detail__label">Provider</span>
            <span className="op-detail__value">{op.providerLabel}</span>
          </div>

          <div className="op-detail__row">
            <span className="op-detail__label">Operation ID</span>
            <span className="op-detail__value op-detail__value--mono">{op.id}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
