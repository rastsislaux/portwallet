import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatLocalAmount } from '../components/Amount';
import { CardKindIcon } from '../components/icons';
import { StatusBadge } from '../components/StatusBadge';
import type { CardOperation } from '../domain/types';
import { useWallet } from '../state/WalletContext';

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

function sameMoney(
  a: number | undefined,
  aCur: string | undefined,
  b: number | undefined,
  bCur: string | undefined,
): boolean {
  return a != null && b != null && a === b && aCur === bCur;
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
  const lastFour = op.cardLastFour || card?.lastFour;
  const location = [op.merchantCity, op.merchantCountry].filter(Boolean).join(', ');

  const chargedLabel = op.tokenSymbol ? 'Token charged' : 'Amount charged';
  const showCardAmount =
    op.cardAmount != null &&
    op.cardCurrency &&
    !sameMoney(op.cardAmount, op.cardCurrency, op.amountFiat, op.currency);
  const showTotal =
    op.settlementAmount != null &&
    op.settlementCurrency &&
    !sameMoney(op.settlementAmount, op.settlementCurrency, op.amountFiat, op.currency) &&
    !sameMoney(op.settlementAmount, op.settlementCurrency, op.cardAmount, op.cardCurrency);

  return (
    <section className="screen">
      <header className="header-block">
        <button type="button" className="btn btn--text" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </header>

      <div className="op-detail">
        <div className="op-detail__hero">
          <span className="op-detail__kind-icon" aria-hidden="true">
            <CardKindIcon kind={op.kind} size={28} />
          </span>
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

          {location ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Location</span>
              <span className="op-detail__value">{location}</span>
            </div>
          ) : null}

          <div className="op-detail__row">
            <span className="op-detail__label">{chargedLabel}</span>
            <span className="op-detail__value tabular">
              {formatLocalAmount(op.amountFiat, op.currency)} {op.currency}
            </span>
          </div>

          {showCardAmount ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Card amount</span>
              <span className="op-detail__value tabular">
                {formatLocalAmount(op.cardAmount!, op.cardCurrency!)} {op.cardCurrency}
              </span>
            </div>
          ) : null}

          {showTotal ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Total with fees</span>
              <span className="op-detail__value tabular">
                {formatLocalAmount(op.settlementAmount!, op.settlementCurrency!)}{' '}
                {op.settlementCurrency}
              </span>
            </div>
          ) : null}

          {op.feeAmount != null && op.feeCurrency ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Fees</span>
              <span className="op-detail__value tabular">
                {formatLocalAmount(op.feeAmount, op.feeCurrency)} {op.feeCurrency}
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
          {card || lastFour ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Card</span>
              <span className="op-detail__value">
                {card ? `${card.label} ·· ${lastFour}` : `·· ${lastFour}`}
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
