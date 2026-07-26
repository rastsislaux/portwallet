import { useState } from 'react';
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
        <p className="custody-strip" style={{ marginTop: 0 }}>
          Multiple accounts allowed — including several of the same venue.
        </p>
      </header>

      <div className="account-list">
        {accounts.map((account) => (
          <div key={account.id} className="account-row">
            <span className="account-row__title">{account.nickname}</span>
            <button
              type="button"
              className="filter-button"
              onClick={() => setConfirmRemoveId(account.id)}
            >
              Remove
            </button>
            <span className="account-row__meta">
              {account.custody === 'custodial' ? 'Custodial' : 'Non-custodial'} ·{' '}
              {account.venueLabel} · Connected
            </span>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn--block" onClick={() => setAdding(true)}>
        + Add account
      </button>

      {adding ? (
        <div className="sheet-backdrop" role="dialog" aria-modal="true">
          <div className="sheet">
            <h2 className="screen-title" style={{ fontSize: 20 }}>
              Add account
            </h2>
            <div className="field">
              <label htmlFor="provider-type">Provider</label>
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
            <div className="notice notice--warning">
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
                className="btn"
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
            <h2 className="screen-title" style={{ fontSize: 20 }}>
              Remove account?
            </h2>
            <p style={{ margin: 0, color: 'var(--ink-secondary)' }}>
              This only disconnects the account from Portwallet. Funds remain with the
              provider.
            </p>
            <div className="stack-actions">
              <button
                type="button"
                className="btn"
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
