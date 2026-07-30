import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatAssetQty } from '../components/Amount';
import { CryptoIcon } from '../components/icons';
import { StatusBadge } from '../components/StatusBadge';
import { WALLET_PRODUCT_LABELS, type Transaction } from '../domain/types';
import { exchangeRouteLabel } from '../domain/exchangeLegs';
import { isTransactionCredit, transactionAmountSign } from '../domain/transactionDirection';
import { useSettings } from '../state/SettingsContext';
import { useWallet } from '../state/WalletContext';

function labelKind(kind: Transaction['kind']): string {
  switch (kind) {
    case 'withdrawal':
      return 'Withdrawal';
    case 'internal':
      return 'Internal';
    case 'transfer':
      return 'Transfer';
    case 'deposit':
      return 'Received';
    case 'exchange':
      return 'Exchange';
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

export function TransactionDetailScreen() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const { transactions, accounts } = useWallet();
  const { formatFromUsd } = useSettings();

  const tx = useMemo(
    () => transactions.find((t) => t.id === transactionId) ?? null,
    [transactions, transactionId],
  );

  const account = useMemo(
    () => (tx ? accounts.find((a) => a.id === tx.accountId) ?? null : null),
    [accounts, tx],
  );

  if (!tx) {
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

  const isCredit = isTransactionCredit(tx);
  const formattedAmount = `${transactionAmountSign(tx)}${formatAssetQty(tx.assetSymbol, tx.quantity)} ${tx.assetSymbol}`;
  const typeLabel = exchangeRouteLabel(tx) ?? labelKind(tx.kind);
  const productLabel = tx.product ? WALLET_PRODUCT_LABELS[tx.product] : null;

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
            <CryptoIcon symbol={tx.assetSymbol} size={28} decorative />
          </span>
          <div className="op-detail__amount tabular">{formattedAmount}</div>
          <div className="op-detail__type">{typeLabel}</div>
          <StatusBadge status={tx.status} />
        </div>

        <div className="op-detail__section">
          <div className="op-detail__row">
            <span className="op-detail__label">Amount</span>
            <span className="op-detail__value tabular">
              {formatAssetQty(tx.assetSymbol, tx.quantity)} {tx.assetSymbol}
            </span>
          </div>

          {tx.fiatValueUsd > 0 ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Value</span>
              <span className="op-detail__value tabular">{formatFromUsd(tx.fiatValueUsd)}</span>
            </div>
          ) : null}

          {tx.kind === 'exchange' && tx.counterAssetSymbol != null && tx.counterQuantity != null ? (
            <div className="op-detail__row">
              <span className="op-detail__label">{isCredit ? 'Spent' : 'Received'}</span>
              <span className="op-detail__value tabular">
                {formatAssetQty(tx.counterAssetSymbol, tx.counterQuantity)} {tx.counterAssetSymbol}
              </span>
            </div>
          ) : null}

          {tx.counterparty ? (
            <div className="op-detail__row">
              <span className="op-detail__label">
                {tx.kind === 'internal' ? 'Route' : isCredit ? 'From' : 'To'}
              </span>
              <span className="op-detail__value op-detail__value--mono">{tx.counterparty}</span>
            </div>
          ) : null}

          {tx.networkName ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Network</span>
              <span className="op-detail__value">{tx.networkName}</span>
            </div>
          ) : null}
        </div>

        <div className="op-detail__section">
          <div className="op-detail__row">
            <span className="op-detail__label">Date & time</span>
            <span className="op-detail__value">{formatDateTime(tx.createdAt)}</span>
          </div>

          <div className="op-detail__row">
            <span className="op-detail__label">Status</span>
            <span className="op-detail__value">
              <StatusBadge status={tx.status} />
            </span>
          </div>

          {tx.failureReason ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Failure reason</span>
              <span className="op-detail__value op-detail__value--error">{tx.failureReason}</span>
            </div>
          ) : null}
        </div>

        <div className="op-detail__section">
          {account ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Account</span>
              <span className="op-detail__value">{account.nickname}</span>
            </div>
          ) : null}

          {productLabel ? (
            <div className="op-detail__row">
              <span className="op-detail__label">Wallet</span>
              <span className="op-detail__value">{productLabel}</span>
            </div>
          ) : null}

          <div className="op-detail__row">
            <span className="op-detail__label">Provider</span>
            <span className="op-detail__value">{tx.providerLabel}</span>
          </div>

          <div className="op-detail__row">
            <span className="op-detail__label">Transaction ID</span>
            <span className="op-detail__value op-detail__value--mono">{tx.id}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
