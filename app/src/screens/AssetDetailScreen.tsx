import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatAssetQty, formatQty } from '../components/Amount';
import {
  CryptoIcon,
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
  const showName = asset.name.trim().toUpperCase() !== asset.symbol.toUpperCase();
  const unitPriceUsd =
    asset.quantity > 0 ? asset.fiatValueUsd / asset.quantity : null;
  const unitRateLabel =
    unitPriceUsd != null && Number.isFinite(unitPriceUsd)
      ? `1 ${asset.symbol} = ${formatFromUsd(unitPriceUsd)}`
      : null;

  return (
    <section className="screen screen--asset">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <IconBack size={20} />
        Back
      </button>

      <header className="asset-hero">
        <div className="asset-hero__identity">
          <CryptoIcon symbol={asset.symbol} name={asset.name} size={48} decorative />
          <div className="asset-hero__titles">
            <h1 className="asset-hero__symbol">{asset.symbol}</h1>
            {showName ? <p className="asset-hero__name">{asset.name}</p> : null}
          </div>
        </div>

        <div className="asset-hero__balance">
          <div
            className="asset-hero__qty tabular"
            aria-label={`${formatAssetQty(asset.symbol, asset.quantity)} ${asset.symbol}`}
          >
            {formatAssetQty(asset.symbol, asset.quantity)}
          </div>
          <div className="asset-hero__fiat">{formatFromUsd(asset.fiatValueUsd)}</div>
          {unitRateLabel ? (
            <div className="asset-hero__rate">{unitRateLabel}</div>
          ) : null}
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

      <div className="section-block section-block--secondary">
        <div className="section-label section-label--quiet">Held in</div>
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

      <div className="section-block section-block--secondary">
        <div className="section-label section-label--quiet">Recent</div>
        <div className="tx-list">
          {recent.length === 0 ? (
            <p className="muted" style={{ padding: '16px' }}>No recent activity.</p>
          ) : (
            recent.map((tx) => (
              <div key={tx.id} className="tx-row">
                <span className="tx-row__icon">
                  <CryptoIcon symbol={tx.assetSymbol} size={32} decorative />
                </span>
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
