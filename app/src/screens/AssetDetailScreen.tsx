import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatQty } from '../components/Amount';
import {
  AssetIcon,
  IconBack,
  IconExchange,
  IconReceive,
  IconSend,
  ProviderIcon,
} from '../components/icons';
import { StatusBadge } from '../components/StatusBadge';
import { useSettings } from '../state/SettingsContext';
import { useWallet } from '../state/WalletContext';

export function AssetDetailScreen() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { assets, balances, accounts, transactions } = useWallet();
  const { formatFromUsd } = useSettings();

  const asset = assets.find((a) => a.assetId === assetId);
  if (!asset) {
    return (
      <section className="screen">
        <button type="button" className="back-link" onClick={() => navigate(-1)}>
          <IconBack size={20} />
          Back
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
        <IconBack size={20} />
        Back
      </button>
      <header className="header-block">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AssetIcon symbol={asset.symbol} size={44} />
          <h1 className="screen-title">{asset.name}</h1>
        </div>
        <div className="portfolio-total">
          <div className="portfolio-total__value tabular" style={{ fontSize: 40 }}>
            {formatQty(asset.quantity)} {asset.symbol}
          </div>
          <div className="portfolio-total__meta">
            {formatFromUsd(asset.fiatValueUsd)}
          </div>
        </div>
      </header>

      <div className="action-row">
        <Link className="btn btn--soft" to={`/send?asset=${asset.symbol}`}>
          <IconSend size={16} strokeWidth={2.25} />
          Send
        </Link>
        <Link className="btn btn--soft" to={`/receive?asset=${asset.symbol}`}>
          <IconReceive size={16} strokeWidth={2.25} />
          Receive
        </Link>
        <Link className="btn btn--soft" to={`/exchange?from=${asset.symbol}`}>
          <IconExchange size={16} strokeWidth={2.25} />
          Exchange
        </Link>
      </div>

      <div className="section-block">
        <div className="section-label">Held in</div>
        <div className="grouped-list">
          {holdings.map((h) => {
            const account = accounts.find((a) => a.id === h.accountId);
            return (
              <div
                key={`${h.accountId}-${h.product ?? 'default'}`}
                className="grouped-row"
              >
                <ProviderIcon type={account?.providerType ?? 'mock'} size={36} />
                <div className="grouped-row__body">
                  <div className="grouped-row__title">
                    {account?.nickname ?? 'Account'}
                    {h.productLabel ? ` · ${h.productLabel}` : ''}
                  </div>
                  <div className="grouped-row__meta">
                    {account?.venueLabel}
                    {' · '}
                    {account?.custody === 'custodial' ? 'Custodial' : 'Non-custodial'}
                  </div>
                </div>
                <span className="tabular" style={{ fontWeight: 510, fontSize: 15 }}>
                  {formatQty(h.quantity)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {holdings.some((h) => {
        const account = accounts.find((a) => a.id === h.accountId);
        return h.product === 'EARN' || account?.product === 'EARN';
      }) ? (
        <div className="notice notice--info">
          Earn products are read-only in Portwallet. Stake and redeem in the Bybit app.
        </div>
      ) : null}

      <div className="section-block">
        <div className="section-label">Recent</div>
        <div className="tx-list">
          {recent.length === 0 ? (
            <p className="muted" style={{ padding: '16px' }}>No recent activity.</p>
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
                <span className="tx-row__status">
                  <StatusBadge status={tx.status} />
                </span>
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
