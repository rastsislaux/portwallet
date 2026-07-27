import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconAccounts, IconBack, IconChevronDown, IconDownload } from '../components/icons';
import { MARKET_DATA_SOURCES } from '../fx/rates';
import { usePwaInstall } from '../state/PwaInstallContext';
import { useSettings } from '../state/SettingsContext';
import { useWallet } from '../state/WalletContext';

export function SettingsScreen() {
  const {
    mainCurrency,
    setMainCurrency,
    currencies,
    rateStatus,
    rateQuote,
    rateError,
    refreshRate,
    dataSources,
    hideBelowThresholdEnabled,
    hideBelowThresholdAmount,
    hideBelowThresholdCurrency,
    setHideBelowThresholdEnabled,
    setHideBelowThresholdAmount,
    setHideBelowThresholdCurrency,
    show24hChangeEnabled,
    setShow24hChangeEnabled,
  } = useSettings();
  const { refresh, isRefreshing, lastUpdatedAt, accounts } = useWallet();
  const {
    showInstallInSettings,
    installHint,
    promptInstall,
    showInstallButtonAgain,
  } = usePwaInstall();

  const selected = currencies.find((c) => c.code === mainCurrency);
  const [amountText, setAmountText] = useState(() => String(hideBelowThresholdAmount));

  useEffect(() => {
    setAmountText((prev) => {
      const parsed = Number(prev);
      if (Number.isFinite(parsed) && parsed === hideBelowThresholdAmount) return prev;
      return String(hideBelowThresholdAmount);
    });
  }, [hideBelowThresholdAmount]);

  return (
    <section className="screen">
      <Link className="back-link" to="/">
        <IconBack size={20} />
        Home
      </Link>

      <header className="header-block">
        <h1 className="screen-title">Settings</h1>
      </header>

      <div className="section-block">
        <div className="section-label">Display</div>
        <div className="grouped-list">
          <div className="grouped-row grouped-row--field">
            <div className="grouped-row__body">
              <div className="grouped-row__title">Main currency</div>
              <div className="grouped-row__meta">
                Portfolio totals and asset values
              </div>
            </div>
            <div className="currency-select">
              <span className="currency-select__value">
                {mainCurrency}
                <IconChevronDown size={14} strokeWidth={2} />
              </span>
              <select
                aria-label="Main currency"
                value={mainCurrency}
                onChange={(e) => setMainCurrency(e.target.value)}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grouped-row grouped-row--field">
            <div className="grouped-row__body">
              <div className="grouped-row__title">24h portfolio change</div>
              <div className="grouped-row__meta">
                Show today’s total worth change under the balance
              </div>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={show24hChangeEnabled}
                onChange={(e) => setShow24hChangeEnabled(e.target.checked)}
                aria-label="Show 24h portfolio change"
              />
              <span className="settings-switch__track" aria-hidden="true" />
            </label>
          </div>

          <div className="grouped-row grouped-row--field">
            <div className="grouped-row__body">
              <div className="grouped-row__title">Hide small assets</div>
              <div className="grouped-row__meta">
                Hide assets below a value threshold
              </div>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={hideBelowThresholdEnabled}
                onChange={(e) => setHideBelowThresholdEnabled(e.target.checked)}
                aria-label="Hide small assets"
              />
              <span className="settings-switch__track" aria-hidden="true" />
            </label>
          </div>

          {hideBelowThresholdEnabled ? (
            <div className="grouped-row grouped-row--field">
              <div className="grouped-row__body">
                <div className="grouped-row__title">Minimum value</div>
                <div className="grouped-row__meta">
                  Assets worth less than this are hidden
                </div>
              </div>
              <div className="threshold-input">
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Minimum asset value"
                  value={amountText}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                      setAmountText(raw);
                      if (raw === '' || raw === '.') {
                        setHideBelowThresholdAmount(0);
                        return;
                      }
                      const n = Number(raw);
                      if (Number.isFinite(n) && n >= 0) {
                        setHideBelowThresholdAmount(n);
                      }
                    }
                  }}
                  onBlur={() => {
                    setAmountText(String(hideBelowThresholdAmount));
                  }}
                />
                <div className="currency-select">
                  <span className="currency-select__value">
                    {hideBelowThresholdCurrency}
                    <IconChevronDown size={14} strokeWidth={2} />
                  </span>
                  <select
                    aria-label="Threshold currency"
                    value={hideBelowThresholdCurrency}
                    onChange={(e) => setHideBelowThresholdCurrency(e.target.value)}
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <p className="settings-rate-meta">
          {rateStatus === 'loading'
            ? 'Loading exchange rate…'
            : rateStatus === 'error'
              ? rateError
              : rateQuote && mainCurrency !== 'USD'
                ? `1 USD = ${rateQuote.rate.toLocaleString('en-US', {
                    maximumFractionDigits: 6,
                  })} ${mainCurrency} · ${rateQuote.sourceLabel} · ${rateQuote.date}`
                : selected
                  ? `${selected.name} (no conversion)`
                  : null}
          {rateStatus === 'error' ? (
            <>
              {' '}
              <button type="button" className="text-button" onClick={() => void refreshRate()}>
                Retry
              </button>
            </>
          ) : null}
        </p>
      </div>

      {showInstallInSettings ? (
        <div className="section-block">
          <div className="section-label">App</div>
          <div className="grouped-list">
            <div className="grouped-row grouped-row--field">
              <div className="grouped-row__body">
                <div className="grouped-row__title">Install Portwallet</div>
                <div className="grouped-row__meta">
                  {installHint ?? 'Add to your home screen for quick access'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn--text"
                onClick={() => {
                  void promptInstall();
                }}
              >
                <IconDownload size={16} strokeWidth={2.25} />
                Install
              </button>
            </div>
          </div>
          <p className="settings-rate-meta">
            You hid the install button on Home.{' '}
            <button
              type="button"
              className="text-button"
              onClick={showInstallButtonAgain}
            >
              Show it again
            </button>
          </p>
        </div>
      ) : null}

      <div className="section-block">
        <div className="section-label">Accounts</div>
        <div className="grouped-list">
          <Link className="grouped-row grouped-row--link" to="/accounts">
            <IconAccounts size={28} strokeWidth={1.75} />
            <div className="grouped-row__body">
              <div className="grouped-row__title">Manage accounts</div>
              <div className="grouped-row__meta">Connect or remove providers</div>
            </div>
            <span className="grouped-row__chevron" aria-hidden="true">
              ›
            </span>
          </Link>
        </div>
      </div>

      <div className="section-block">
        <div className="section-label">Data</div>
        <div className="grouped-list">
          <div className="grouped-row grouped-row--field">
            <div className="grouped-row__body">
              <div className="grouped-row__title">Portfolio cache</div>
              <div className="grouped-row__meta">
                {accounts.length === 0
                  ? 'Connect an account to load balances, cards, and activity'
                  : lastUpdatedAt
                    ? `Last updated ${new Date(lastUpdatedAt).toLocaleString()}`
                    : 'Showing live provider data'}
              </div>
            </div>
            <button
              type="button"
              className="btn btn--text"
              disabled={isRefreshing || accounts.length === 0}
              onClick={() => {
                void Promise.all([refresh(), refreshRate()]);
              }}
            >
              {isRefreshing || rateStatus === 'loading' ? 'Refreshing…' : 'Refresh now'}
            </button>
          </div>
        </div>
        <p className="settings-rate-meta">
          Portfolio data is kept in this browser so the app can open instantly, then
          updates in the background every couple of minutes.
        </p>
      </div>

      <div className="section-block">
        <div className="section-label">Data sources</div>
        <div className="settings-sources">
          {dataSources.map((source) => (
            <div key={source.id} className="settings-sources__item">
              <div className="settings-sources__title">{source.title}</div>
              <p className="settings-sources__detail">{source.detail}</p>
            </div>
          ))}
          {MARKET_DATA_SOURCES.map((source) => (
            <div key={source.id} className="settings-sources__item">
              <div className="settings-sources__title">{source.title}</div>
              <p className="settings-sources__detail">{source.detail}</p>
            </div>
          ))}
          <p className="settings-sources__note">
            Fiat display converts from USD portfolio values using the sources above.
            Crypto prices themselves come from connected providers; 24h change uses
            Bybit public market data.
          </p>
        </div>
      </div>
    </section>
  );
}
