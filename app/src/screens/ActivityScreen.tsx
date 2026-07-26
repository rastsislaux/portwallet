import { useMemo, useState } from 'react';
import { formatQty } from '../components/Amount';
import { CryptoIcon } from '../components/icons';
import { StatusBadge } from '../components/StatusBadge';
import type { OperationStatus } from '../domain/types';
import { useWallet } from '../state/WalletContext';

type Filter = 'all' | OperationStatus;

export function ActivityScreen() {
  const { transactions } = useWallet();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter((t) => t.status === filter);
  }, [transactions, filter]);

  const pending = filtered.filter((t) => t.status === 'pending');
  const rest = filtered.filter((t) => t.status !== 'pending');

  return (
    <section className="screen">
      <header className="header-block">
        <h1 className="screen-title">Activity</h1>
      </header>

      <div className="segmented" role="tablist" aria-label="Status filter">
        {(
          [
            ['all', 'All'],
            ['pending', 'Pending'],
            ['failed', 'Failed'],
            ['completed', 'Done'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            data-active={filter === value ? 'true' : 'false'}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <p>No operations match this filter.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && filter === 'all' ? (
            <div className="section-block">
              <div className="section-eyebrow">Pending</div>
              <TxList items={pending} />
            </div>
          ) : null}

          <div className="section-block">
            {filter === 'all' && pending.length > 0 ? (
              <div className="section-eyebrow">Earlier</div>
            ) : null}
            <TxList items={filter === 'all' ? rest : filtered} />
          </div>
        </>
      )}
    </section>
  );
}

function TxList({ items }: { items: ReturnType<typeof useWallet>['transactions'] }) {
  return (
    <div className="tx-list">
      {items.map((tx) => {
        const title =
          tx.kind === 'exchange'
            ? `Exchange ${tx.assetSymbol}→${tx.counterAssetSymbol}`
            : `${labelKind(tx.kind)} · ${tx.assetSymbol}`;
        const signed =
          tx.kind === 'deposit' ? `+${formatQty(tx.quantity)}` : `−${formatQty(tx.quantity)}`;

        return (
          <div key={tx.id} className="tx-row">
            <span className="tx-row__icon">
              <CryptoIcon symbol={tx.assetSymbol} size={32} decorative />
            </span>
            <span className="tx-row__title">{title}</span>
            <span className="tx-row__amount tabular">{signed}</span>
            <span className="tx-row__meta">
              {tx.providerLabel}
              {tx.networkName ? ` · ${tx.networkName}` : ''}
              {tx.failureReason ? ` · ${tx.failureReason}` : ''}
            </span>
            <span className="tx-row__status">
              <StatusBadge status={tx.status} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function labelKind(kind: string) {
  switch (kind) {
    case 'withdrawal':
      return 'Withdrawal';
    case 'internal':
      return 'Internal';
    case 'transfer':
      return 'Transfer';
    case 'deposit':
      return 'Received';
    default:
      return kind;
  }
}
