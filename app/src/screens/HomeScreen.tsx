import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AccountFilter } from '../components/AccountFilter';
import { formatAssetQty, formatFiat, formatQty } from '../components/Amount';
import {
  CryptoIcon,
  IconExchange,
  IconReceive,
  IconRefresh,
  IconSend,
  IconSettings,
} from '../components/icons';
import { PwaInstallBanner } from '../components/PwaInstallBanner';
import { formatPurchasePnl } from '../domain/costBasis';
import { useSettings } from '../state/SettingsContext';
import { useWallet } from '../state/WalletContext';

function formatUpdatedAt(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function assetSecondaryTone(
  pnlUsd: number | null | undefined,
): 'up' | 'down' | 'flat' | null {
  if (pnlUsd == null || !Number.isFinite(pnlUsd)) return null;
  if (pnlUsd > 0) return 'up';
  if (pnlUsd < 0) return 'down';
  return 'flat';
}

export function HomeScreen() {
  const {
    ready,
    assets,
    totalFiatUsd,
    custodySummary,
    accounts,
    refresh,
    isRefreshing,
    lastUpdatedAt,
  } = useWallet();
  const {
    displayCurrency,
    formatFromUsd,
    formatFromUsdParts,
    hideBelowThresholdUsd,
    hideBelowThresholdAmount,
    hideBelowThresholdCurrency,
  } = useSettings();

  const visibleAssets = useMemo(() => {
    if (hideBelowThresholdUsd == null) return assets;
    return assets.filter((a) => a.fiatValueUsd >= hideBelowThresholdUsd);
  }, [assets, hideBelowThresholdUsd]);

  const hiddenCount = assets.length - visibleAssets.length;

  const btc = assets.find((a) => a.symbol === 'BTC');
  const btcApprox = btc
    ? formatQty(totalFiatUsd / (btc.fiatValueUsd / btc.quantity || 68420), 4)
    : formatQty(totalFiatUsd / 68420, 4);
  const balance = formatFromUsdParts(totalFiatUsd);
  const updatedLabel = formatUpdatedAt(lastUpdatedAt);

  if (!ready) {
    return (
      <section className="screen screen--home">
        <div className="brand-header">
          <div className="brand-mark">Portwallet</div>
        </div>
        <PwaInstallBanner />
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
            <button
              type="button"
              className="icon-button"
              aria-label={isRefreshing ? 'Refreshing portfolio' : 'Refresh portfolio'}
              title={isRefreshing ? 'Refreshing…' : 'Refresh'}
              disabled={isRefreshing || accounts.length === 0}
              onClick={() => {
                void refresh();
              }}
            >
              <IconRefresh
                size={20}
                strokeWidth={1.75}
                className={isRefreshing ? 'icon-spin' : undefined}
              />
            </button>
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
        <p className="custody-strip">
          {custodySummary}
          {accounts.length > 0 && updatedLabel
            ? ` · ${isRefreshing ? 'Updating…' : `Updated ${updatedLabel}`}`
            : null}
        </p>
      </header>

      <PwaInstallBanner />

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
              <span className="portfolio-total__currency">{displayCurrency}</span>
            </div>
            <div className="portfolio-total__meta">≈ {btcApprox} BTC</div>
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
              {visibleAssets.map((asset) => {
                const hasPnl =
                  asset.unrealizedPnlUsd != null &&
                  asset.unrealizedPnlPct != null &&
                  Number.isFinite(asset.unrealizedPnlUsd) &&
                  Number.isFinite(asset.unrealizedPnlPct);
                const tone = assetSecondaryTone(asset.unrealizedPnlUsd);
                const secondary = hasPnl
                  ? formatPurchasePnl(
                      asset.unrealizedPnlPct!,
                      asset.unrealizedPnlUsd!,
                      formatFromUsd,
                    )
                  : asset.name;

                return (
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
                    <span
                      className={[
                        'asset-row__name',
                        'tabular',
                        tone ? `asset-row__name--${tone}` : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {secondary}
                    </span>
                    <span className="asset-row__fiat tabular">
                      {formatFromUsd(asset.fiatValueUsd)}
                    </span>
                  </Link>
                );
              })}
            </div>
            {hiddenCount > 0 ? (
              <p className="asset-list__hidden-note">
                {visibleAssets.length === 0
                  ? 'All assets are below'
                  : `${hiddenCount} small ${hiddenCount === 1 ? 'asset' : 'assets'} hidden below`}{' '}
                {formatFiat(hideBelowThresholdAmount)} {hideBelowThresholdCurrency}
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
