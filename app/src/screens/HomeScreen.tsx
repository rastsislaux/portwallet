import { Link } from 'react-router-dom';
import { AccountFilter } from '../components/AccountFilter';
import { formatFiat, formatQty } from '../components/Amount';
import { useWallet } from '../state/WalletContext';

export function HomeScreen() {
  const { ready, assets, totalFiatUsd, custodySummary, accounts } = useWallet();

  const btc = assets.find((a) => a.symbol === 'BTC');
  const btcApprox = btc
    ? formatQty(totalFiatUsd / (btc.fiatValueUsd / btc.quantity || 68420), 4)
    : formatQty(totalFiatUsd / 68420, 4);

  if (!ready) {
    return (
      <section className="screen">
        <div className="brand-header">
          <div className="brand-mark">Portwallet</div>
        </div>
        <p style={{ color: 'var(--ink-secondary)' }}>Loading accounts…</p>
      </section>
    );
  }

  return (
    <section className="screen">
      <header className="header-block">
        <div className="brand-header">
          <div className="brand-mark">Portwallet</div>
          <AccountFilter />
        </div>
        <p className="custody-strip">{custodySummary}</p>
      </header>

      {accounts.length === 0 ? (
        <div className="empty">
          <p>Connect an exchange or wallet account to see your portfolio.</p>
          <Link className="btn btn--primary" to="/accounts">
            Add account
          </Link>
        </div>
      ) : (
        <>
          <div className="portfolio-total">
            <div className="portfolio-total__value tabular">
              {formatFiat(totalFiatUsd)}
            </div>
            <div className="portfolio-total__meta">
              USD · ≈ {btcApprox} BTC
            </div>
          </div>

          <div className="action-row">
            <Link className="btn" to="/send">
              Send
            </Link>
            <Link className="btn" to="/receive">
              Receive
            </Link>
            <Link className="btn" to="/exchange">
              Exchange
            </Link>
          </div>

          <div>
            <div className="section-label" style={{ marginBottom: 4 }}>
              Assets
            </div>
            <div className="asset-list">
              {assets.map((asset) => (
                <Link
                  key={asset.assetId}
                  className="asset-row"
                  to={`/asset/${asset.assetId}`}
                >
                  <span className="asset-row__symbol">{asset.symbol}</span>
                  <span className="asset-row__qty tabular">
                    {formatQty(asset.quantity)}
                  </span>
                  <span className="asset-row__name">{asset.name}</span>
                  <span className="asset-row__fiat tabular">
                    {formatFiat(asset.fiatValueUsd)} USD
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
