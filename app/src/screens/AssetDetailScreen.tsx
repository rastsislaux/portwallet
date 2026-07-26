import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatFiat, formatQty } from '../components/Amount';
import { StatusBadge } from '../components/StatusBadge';
import { useWallet } from '../state/WalletContext';

export function AssetDetailScreen() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { assets, balances, accounts, transactions } = useWallet();

  const asset = assets.find((a) => a.assetId === assetId);
  if (!asset) {
    return (
      <section className="screen">
        <button type="button" className="back-link" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <p>Asset not found in selected accounts.</p>
      </section>
    );
  }

  const holdings = balances.filter((b) => b.assetId === asset.assetId);
  const recent = transactions
    .filter((t) => t.assetSymbol === asset.symbol || t.counterAssetSymbol === asset.symbol)
    .slice(0, 5);

  return (
    <section className="screen">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <header className="header-block">
        <h1 className="screen-title">{asset.name}</h1>
        <div className="portfolio-total">
          <div className="portfolio-total__value tabular" style={{ fontSize: 32 }}>
            {formatQty(asset.quantity)} {asset.symbol}
          </div>
          <div className="portfolio-total__meta">
            {formatFiat(asset.fiatValueUsd)} USD
          </div>
        </div>
      </header>

      <div className="action-row">
        <Link className="btn" to={`/send?asset=${asset.symbol}`}>
          Send
        </Link>
        <Link className="btn" to={`/receive?asset=${asset.symbol}`}>
          Receive
        </Link>
        <Link className="btn" to={`/exchange?from=${asset.symbol}`}>
          Exchange
        </Link>
      </div>

      <div>
        <div className="section-label" style={{ marginBottom: 4 }}>
          Held in
        </div>
        <div className="account-list">
          {holdings.map((h) => {
            const account = accounts.find((a) => a.id === h.accountId);
            return (
              <div key={h.accountId} className="account-row">
                <span className="account-row__title">
                  {account?.nickname ?? 'Account'}
                </span>
                <span className="tabular">{formatQty(h.quantity)}</span>
                <span className="account-row__meta">
                  {account?.custody === 'custodial' ? 'Custodial' : 'Non-custodial'} ·{' '}
                  {account?.venueLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="section-label" style={{ marginBottom: 4 }}>
          Recent
        </div>
        <div className="tx-list">
          {recent.length === 0 ? (
            <p style={{ color: 'var(--ink-secondary)' }}>No recent activity.</p>
          ) : (
            recent.map((tx) => (
              <div key={tx.id} className="tx-row">
                <span className="tx-row__title">
                  {tx.kind === 'exchange'
                    ? `Exchange ${tx.assetSymbol}→${tx.counterAssetSymbol}`
                    : `${capitalize(tx.kind)} · ${tx.assetSymbol}`}
                </span>
                <span className="tx-row__amount tabular">
                  {tx.kind === 'deposit' || tx.kind === 'internal' ? '+' : '−'}
                  {formatQty(tx.quantity)}
                </span>
                <span className="tx-row__meta">
                  {tx.providerLabel}
                  {tx.networkName ? ` · ${tx.networkName}` : ''}
                </span>
                <StatusBadge status={tx.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
