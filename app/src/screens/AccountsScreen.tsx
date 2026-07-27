import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconBack, ProviderIcon } from '../components/icons';
import type { BybitServerId, ProviderType, WalletAccount } from '../domain/types';
import { WALLET_PRODUCT_LABELS } from '../domain/types';
import {
  BYBIT_SERVERS,
  getBybitApiManagementUrl,
} from '../providers/bybit/servers';
import { useWallet } from '../state/WalletContext';

export function AccountsScreen() {
  const {
    accounts,
    availableProviderTypes,
    restoreFailures,
    discardSavedAccount,
    addAccount,
    attachBybitCardKey,
    removeAccount,
  } = useWallet();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<ProviderType>('bybit');
  const [nickname, setNickname] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [cardApiKey, setCardApiKey] = useState('');
  const [cardApiSecret, setCardApiSecret] = useState('');
  const [bybitServer, setBybitServer] = useState<BybitServerId>('mainnet');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [cardKeyTarget, setCardKeyTarget] = useState<WalletAccount | null>(null);
  const [attachCardKey, setAttachCardKey] = useState('');
  const [attachCardSecret, setAttachCardSecret] = useState('');
  const [attachError, setAttachError] = useState<string | null>(null);

  const selectedType = availableProviderTypes.find((t) => t.type === type);
  const needsBybitCredentials = type === 'bybit';
  const apiManagementUrl = getBybitApiManagementUrl(bybitServer);

  const bybitConnectionsNeedingCardKey = useMemo(() => {
    const seen = new Set<string>();
    const rows: WalletAccount[] = [];
    for (const account of accounts) {
      if (account.providerType !== 'bybit') continue;
      if (account.product !== 'FUND') continue;
      if (account.permissions?.canCard) continue;
      if (seen.has(account.providerInstanceId)) continue;
      seen.add(account.providerInstanceId);
      rows.push(account);
    }
    return rows;
  }, [accounts]);

  const canConnect = useMemo(() => {
    if (!nickname.trim()) return false;
    if (needsBybitCredentials) {
      if (!apiKey.trim() || !apiSecret.trim()) return false;
      const hasCardKey = Boolean(cardApiKey.trim());
      const hasCardSecret = Boolean(cardApiSecret.trim());
      if (hasCardKey !== hasCardSecret) return false;
      return true;
    }
    return true;
  }, [nickname, needsBybitCredentials, apiKey, apiSecret, cardApiKey, cardApiSecret]);

  const canAttachCard = Boolean(attachCardKey.trim() && attachCardSecret.trim());

  async function onAdd() {
    if (!canConnect) return;
    setBusy(true);
    setError(null);
    try {
      await addAccount(type, {
        nickname: nickname.trim(),
        apiKey: needsBybitCredentials ? apiKey.trim() : undefined,
        apiSecret: needsBybitCredentials ? apiSecret.trim() : undefined,
        bybitServer: needsBybitCredentials ? bybitServer : undefined,
        cardApiKey: needsBybitCredentials ? cardApiKey.trim() || undefined : undefined,
        cardApiSecret: needsBybitCredentials
          ? cardApiSecret.trim() || undefined
          : undefined,
      });
      setNickname('');
      setApiKey('');
      setApiSecret('');
      setCardApiKey('');
      setCardApiSecret('');
      setBybitServer('mainnet');
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect account');
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

  async function onAttachCardKey() {
    if (!cardKeyTarget || !canAttachCard) return;
    setBusy(true);
    setAttachError(null);
    try {
      await attachBybitCardKey(
        cardKeyTarget.providerInstanceId,
        attachCardKey.trim(),
        attachCardSecret.trim(),
      );
      setCardKeyTarget(null);
      setAttachCardKey('');
      setAttachCardSecret('');
    } catch (e) {
      setAttachError(e instanceof Error ? e.message : 'Could not attach card key');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="screen">
      <Link className="back-link" to="/settings">
        <IconBack size={20} />
        Settings
      </Link>

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
                {account.product
                  ? ` · ${WALLET_PRODUCT_LABELS[account.product]}`
                  : ''}
                {' · '}
                {account.custody === 'custodial' ? 'Custodial' : 'Non-custodial'}
                {account.bybitServer ? ` · ${serverLabel(account.bybitServer)}` : ''}
              </div>
              {account.permissions ? (
                <div className="grouped-row__meta">
                  {permissionSummary(account.permissions)}
                </div>
              ) : null}
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

      {bybitConnectionsNeedingCardKey.length > 0 ? (
        <div className="notice notice--info" style={{ marginTop: 8 }}>
          {bybitConnectionsNeedingCardKey.map((account) => (
            <div
              key={account.providerInstanceId}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginTop:
                  account === bybitConnectionsNeedingCardKey[0] ? 0 : 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  {baseNickname(account.nickname)} · Bybit Card key missing
                </div>
                <div>
                  BitCard cannot be added to a typical read-write key. Create a
                  separate read-only key with only the Bybit Card permission.
                </div>
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setAttachError(null);
                  setAttachCardKey('');
                  setAttachCardSecret('');
                  setCardKeyTarget(account);
                }}
              >
                Add card key
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {restoreFailures.length > 0 ? (
        <div className="notice notice--danger" style={{ marginTop: 8 }}>
          {restoreFailures.map((failure) => (
            <div
              key={failure.id}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginTop: failure === restoreFailures[0] ? 0 : 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{failure.nickname}</div>
                <div>Could not restore saved credentials: {failure.message}</div>
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => discardSavedAccount(failure.id)}
              >
                Discard
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <div className="empty" style={{ marginTop: 8 }}>
          <p>
            Connect Bybit with an API key. Portwallet creates separate Funding, UTA,
            and Earn accounts when your key allows them.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn--block btn--soft add-account-btn"
        onClick={() => {
          setError(null);
          setAdding(true);
        }}
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
                autoComplete="off"
              />
            </div>

            {needsBybitCredentials ? (
              <>
                <div className="field">
                  <label htmlFor="bybit-server">Bybit server</label>
                  <select
                    id="bybit-server"
                    value={bybitServer}
                    onChange={(e) => setBybitServer(e.target.value as BybitServerId)}
                  >
                    {BYBIT_SERVERS.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="section-eyebrow" style={{ marginTop: 4 }}>
                  Main API key
                </div>
                <div className="notice notice--info" style={{ margin: 0 }}>
                  Create a key for Funding / UTA / Earn. Enable the Wallet,
                  Exchange, and Earn permissions you need. Bybit Card (BitCard)
                  usually cannot be added to a read-write key — use the separate
                  card key below instead.
                </div>
                <a
                  className="btn btn--block btn--soft"
                  href={apiManagementUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Create main API key on Bybit
                </a>
                <div className="field">
                  <label htmlFor="bybit-api-key">API key</label>
                  <input
                    id="bybit-api-key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="field">
                  <label htmlFor="bybit-api-secret">API secret</label>
                  <input
                    id="bybit-api-secret"
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <div className="section-eyebrow" style={{ marginTop: 8 }}>
                  Bybit Card key (optional)
                </div>
                <div className="notice notice--info" style={{ margin: 0 }}>
                  To read card info, create a second key: choose{' '}
                  <strong>Read-only</strong> and enable only the{' '}
                  <strong>Bybit Card</strong> permission. Leave other permissions
                  off.
                </div>
                <a
                  className="btn btn--block btn--soft"
                  href={apiManagementUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Create Bybit Card API key
                </a>
                <div className="field">
                  <label htmlFor="bybit-card-api-key">Card API key</label>
                  <input
                    id="bybit-card-api-key"
                    value={cardApiKey}
                    onChange={(e) => setCardApiKey(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Optional"
                  />
                </div>
                <div className="field">
                  <label htmlFor="bybit-card-api-secret">Card API secret</label>
                  <input
                    id="bybit-card-api-secret"
                    type="password"
                    value={cardApiSecret}
                    onChange={(e) => setCardApiSecret(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Optional"
                  />
                </div>

                <div className="notice notice--info" style={{ margin: 0 }}>
                  Keys are saved in this browser&apos;s local storage so they survive
                  reloads. One connect creates Funding, UTA, and Earn accounts when
                  permissions allow. Earn is view-only.
                </div>
              </>
            ) : null}

            {error ? <div className="notice notice--danger">{error}</div> : null}

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
                disabled={busy || !canConnect}
              >
                {busy ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cardKeyTarget ? (
        <div className="sheet-backdrop" role="dialog" aria-modal="true">
          <div className="sheet">
            <h2 className="screen-title screen-title--sheet">Add Bybit Card key</h2>
            <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: 15, lineHeight: 1.4 }}>
              For {baseNickname(cardKeyTarget.nickname)}. Create a{' '}
              <strong>read-only</strong> API key with only the{' '}
              <strong>Bybit Card</strong> permission, then paste it here.
            </p>
            <a
              className="btn btn--block btn--soft"
              href={getBybitApiManagementUrl(cardKeyTarget.bybitServer ?? 'mainnet')}
              target="_blank"
              rel="noreferrer"
            >
              Create Bybit Card API key
            </a>
            <div className="field">
              <label htmlFor="attach-card-api-key">Card API key</label>
              <input
                id="attach-card-api-key"
                value={attachCardKey}
                onChange={(e) => setAttachCardKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="field">
              <label htmlFor="attach-card-api-secret">Card API secret</label>
              <input
                id="attach-card-api-secret"
                type="password"
                value={attachCardSecret}
                onChange={(e) => setAttachCardSecret(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {attachError ? (
              <div className="notice notice--danger">{attachError}</div>
            ) : null}
            <div className="stack-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setCardKeyTarget(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void onAttachCardKey()}
                disabled={busy || !canAttachCard}
              >
                {busy ? 'Saving…' : 'Save card key'}
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
              provider. Saved API keys for this account are removed from local storage.
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

function serverLabel(id: BybitServerId): string {
  return BYBIT_SERVERS.find((s) => s.id === id)?.label ?? id;
}

function baseNickname(nickname: string): string {
  return nickname.replace(/\s+·\s+(Funding|UTA|Earn)$/i, '') || nickname;
}

function permissionSummary(
  permissions: NonNullable<WalletAccount['permissions']>,
): string {
  const bits: string[] = [];
  if (permissions.readOnly) bits.push('Read-only');
  if (permissions.uta) bits.push('UTA');
  if (permissions.canTransfer) bits.push('Transfer');
  if (permissions.canWithdraw) bits.push('Withdraw');
  if (permissions.canExchange) bits.push('Exchange');
  if (permissions.canEarnRead) bits.push('Earn');
  if (permissions.canCard) bits.push('Card');
  return bits.length ? bits.join(' · ') : 'Limited permissions';
}
