import { useState } from 'react';
import { ProviderIcon } from '../components/icons';
import type { ProviderType } from '../domain/types';
import { useWallet } from '../state/WalletContext';

export function AccountsScreen() {
  const {
    accounts,
    availableProviderTypes,
    addAccount,
    removeAccount,
  } = useWallet();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<ProviderType>('bybit');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const selectedType = availableProviderTypes.find((t) => t.type === type);

  async function onAdd() {
    if (!nickname.trim()) return;
    setBusy(true);
    try {
      await addAccount(type, nickname.trim());
      setNickname('');
      setAdding(false);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setBusy(true);
    try {
      await removeAccount(id);
      setConfirmRemoveId(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen">
      <header className="header-block">
        <h1 className="screen-title">Accounts</h1>
      </header>

      <div className="grouped-list">
        {accounts.map((account) => (
          <div key={account.id} className="grouped-row">
            <ProviderIcon type={account.providerType} size={36} />
            <div className="grouped-row__body">
              <div className="grouped-row__title">{account.nickname}</div>
              <div className="grouped-row__meta">
                {account.venueLabel}
                {' · '}
                {account.custody === 'custodial' ? 'Custodial' : 'Non-custodial'}
              </div>
            </div>
            <div className="grouped-row__aside">
              <span className="connection-dot">Connected</span>
              <button
                type="button"
                className="grouped-row__action"
                onClick={() => setConfirmRemoveId(account.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn--block btn--soft add-account-btn"
        onClick={() => setAdding(true)}
      >
        Add account
      </button>

      {adding ? (
        <div className="sheet-backdrop" role="dialog" aria-modal="true">
          <div className="sheet">
            <h2 className="screen-title screen-title--sheet">Add account</h2>
            <div className="field">
              <label htmlFor="provider-type">Provider</label>
              <div className="asset-select">
                <ProviderIcon type={type} size={28} />
                <span className="asset-select__label">
                  {availableProviderTypes.find((p) => p.type === type)?.label}
                </span>
                <span className="asset-select__chevron" aria-hidden="true">
                  ▾
                </span>
                <select
                  id="provider-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as ProviderType)}
                >
                  {availableProviderTypes.map((p) => (
                    <option key={p.type} value={p.type}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="notice notice--warning" style={{ margin: 0 }}>
              {selectedType?.custodyLabel}. Assets stay with this provider — Portwallet
              does not take custody.
            </div>
            <div className="field">
              <label htmlFor="nickname">Nickname</label>
              <input
                id="nickname"
                value={nickname}
                placeholder={
                  type === 'bybit'
                    ? 'e.g. Personal Bybit'
                    : type === 'binance'
                      ? 'e.g. Binance main'
                      : 'e.g. Phone wallet'
                }
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <div className="stack-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setAdding(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void onAdd()}
                disabled={busy || !nickname.trim()}
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmRemoveId ? (
        <div className="sheet-backdrop" role="dialog" aria-modal="true">
          <div className="sheet">
            <h2 className="screen-title screen-title--sheet">Remove account?</h2>
            <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: 15, lineHeight: 1.4 }}>
              This only disconnects the account from Portwallet. Funds remain with the
              provider.
            </p>
            <div className="stack-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setConfirmRemoveId(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => void onRemove(confirmRemoveId)}
                disabled={busy}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
