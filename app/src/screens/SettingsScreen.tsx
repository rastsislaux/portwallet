import { Link } from 'react-router-dom';
import { IconAccounts, IconBack, IconChevronDown } from '../components/icons';
import { useSettings } from '../state/SettingsContext';

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
  } = useSettings();

  const selected = currencies.find((c) => c.code === mainCurrency);

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
        <div className="section-label">Data sources</div>
        <div className="settings-sources">
          {dataSources.map((source) => (
            <div key={source.id} className="settings-sources__item">
              <div className="settings-sources__title">{source.title}</div>
              <p className="settings-sources__detail">{source.detail}</p>
            </div>
          ))}
          <p className="settings-sources__note">
            Fiat display converts from USD portfolio values using the sources above.
            Crypto prices themselves come from connected providers.
          </p>
        </div>
      </div>
    </section>
  );
}
