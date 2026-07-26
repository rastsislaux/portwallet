import { Link } from 'react-router-dom';
import { AccountFilter } from '../components/AccountFilter';
import { formatAssetQty, formatQty } from '../components/Amount';
import { CryptoIcon, IconExchange, IconReceive, IconSend, IconSettings } from '../components/icons';
import { useSettings } from '../state/SettingsContext';
import { useWallet } from '../state/WalletContext';

export function HomeScreen() {
  const { ready, assets, totalFiatUsd, custodySummary, accounts } = useWallet();
  const { displayCurrency, formatFromUsd, formatFromUsdParts } = useSettings();

  const btc = assets.find((a) => a.symbol === 'BTC');
  const btcApprox = btc
    ? formatQty(totalFiatUsd / (btc.fiatValueUsd / btc.quantity || 68420), 4)
    : formatQty(totalFiatUsd / 68420, 4);
  const balance = formatFromUsdParts(totalFiatUsd);

  if (!ready) {
    return (
      <section className="screen screen--home">
        <div className="brand-header">
          <div className="brand-mark">Portwallet</div>
        </div>
        <p className="loading-line">Loading accounts…</p>
      </section>
    );
  }

  return (
    <section className="screen screen--home">
      <header className="header-block">
        <div className="brand-header">
          <div className="brand-mark">Portwallet</div>
          <div className="brand-header__actions">
            <AccountFilter />
            <Link
              to="/settings"
              className="icon-button"
              aria-label="Settings"
              title="Settings"
            >
              <IconSettings size={20} strokeWidth={1.75} />
            </Link>
          </div>
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
            <div
              className="portfolio-total__value tabular"
              aria-label={`${balance.integer}.${balance.decimal} ${displayCurrency}`}
            >
              <span className="portfolio-total__int">{balance.integer}</span>
              <span className="portfolio-total__dec">.{balance.decimal}</span>
            </div>
            <div className="portfolio-total__meta">
              {displayCurrency} ≈ {btcApprox} BTC
            </div>
          </div>

          <div className="action-row">
            <Link className="btn btn--soft" to="/send">
              <IconSend size={16} strokeWidth={2.25} />
              Send
            </Link>
            <Link className="btn btn--soft" to="/receive">
              <IconReceive size={16} strokeWidth={2.25} />
              Receive
            </Link>
            <Link className="btn btn--soft" to="/exchange">
              <IconExchange size={16} strokeWidth={2.25} />
              Exchange
            </Link>
          </div>

          <div className="section-block">
            <div className="section-label">Assets</div>
            <div className="asset-list">
              {assets.map((asset) => (
                <Link
                  key={asset.assetId}
                  className="asset-row"
                  to={`/asset/${asset.assetId}`}
                >
                  <span className="asset-row__icon">
                    <CryptoIcon symbol={asset.symbol} name={asset.name} size={40} decorative />
                  </span>
                  <span className="asset-row__symbol">{asset.symbol}</span>
                  <span className="asset-row__qty tabular">
                    {formatAssetQty(asset.symbol, asset.quantity)}
                  </span>
                  <span className="asset-row__name">{asset.name}</span>
                  <span className="asset-row__fiat tabular">
                    {formatFromUsd(asset.fiatValueUsd)}
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
