import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AccountFilter } from '../components/AccountFilter';
import { formatAssetQty, formatFiat } from '../components/Amount';
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
import { formatSecondaryApprox } from '../fx/formatSecondaryApprox';
import { usePortfolioDayChange } from '../hooks/usePortfolioDayChange';
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

function formatSignedFiat(value: number): string {
  const abs = formatFiat(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

function formatSignedPct(value: number): string {
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value > 0) return `+${abs}%`;
  if (value < 0) return `−${abs}%`;
  return `${abs}%`;
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
    convertFromUsd,
    hideBelowThresholdUsd,
    hideBelowThresholdAmount,
    hideBelowThresholdCurrency,
    show24hChangeEnabled,
    mainCurrency,
    secondaryCurrency,
    usdToSecondaryRate,
  } = useSettings();

  const visibleAssets = useMemo(() => {
    if (hideBelowThresholdUsd == null) return assets;
    return assets.filter((a) => a.fiatValueUsd >= hideBelowThresholdUsd);
  }, [assets, hideBelowThresholdUsd]);

  const hiddenCount = assets.length - visibleAssets.length;

  const dayChange = usePortfolioDayChange(
    show24hChangeEnabled && accounts.length > 0,
    assets,
    lastUpdatedAt,
  );

  const secondaryApprox = useMemo(
    () =>
      formatSecondaryApprox({
        totalFiatUsd,
        secondaryCode: secondaryCurrency,
        mainCurrency,
        assets,
        usdToSecondaryRate,
      }),
    [totalFiatUsd, secondaryCurrency, mainCurrency, assets, usdToSecondaryRate],
  );
  const balance = formatFromUsdParts(totalFiatUsd);
  const updatedLabel = formatUpdatedAt(lastUpdatedAt);

  const changeTone =
    dayChange.change == null
      ? 'flat'
      : dayChange.change.changeUsd > 0
        ? 'up'
        : dayChange.change.changeUsd < 0
          ? 'down'
          : 'flat';

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
            {show24hChangeEnabled && dayChange.status === 'ready' && dayChange.change ? (
              <div
                className={`portfolio-total__change portfolio-total__change--${changeTone} tabular`}
                aria-label={`24 hour change ${formatSignedFiat(convertFromUsd(dayChange.change.changeUsd))} ${displayCurrency}${
                  dayChange.change.changePct == null
                    ? ''
                    : ` (${formatSignedPct(dayChange.change.changePct)})`
                }`}
              >
                <span>
                  {formatSignedFiat(convertFromUsd(dayChange.change.changeUsd))}{' '}
                  {displayCurrency}
                </span>
                {dayChange.change.changePct != null ? (
                  <span className="portfolio-total__change-pct">
                    ({formatSignedPct(dayChange.change.changePct)})
                  </span>
                ) : null}
                <span className="portfolio-total__change-label">24h</span>
              </div>
            ) : null}
            {secondaryApprox ? (
              <div className="portfolio-total__meta">{secondaryApprox}</div>
            ) : null}
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
                const pnlUsd = asset.unrealizedPnlUsd;
                const pnlPct = asset.unrealizedPnlPct;
                const hasPnl =
                  pnlUsd != null &&
                  pnlPct != null &&
                  Number.isFinite(pnlUsd) &&
                  Number.isFinite(pnlPct);
                const tone = assetSecondaryTone(pnlUsd);
                const distinctName =
                  asset.name.trim().toUpperCase() !== asset.symbol.toUpperCase();
                const secondary = hasPnl
                  ? formatPurchasePnl(pnlPct, pnlUsd, formatFromUsd)
                  : distinctName
                    ? asset.name
                    : null;

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
                        !secondary ? 'asset-row__name--empty' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {secondary ?? '\u00a0'}
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
