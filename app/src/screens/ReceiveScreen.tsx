import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ReceiveAddress } from '../domain/types';
import { useWallet } from '../state/WalletContext';

export function ReceiveScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { accounts, balances, getReceiveAddress, listNetworks } = useWallet();

  const assetSymbols = useMemo(
    () => [...new Set(balances.map((b) => b.symbol))],
    [balances],
  );

  const [asset, setAsset] = useState(params.get('asset') ?? assetSymbols[0] ?? 'BTC');
  const [accountId, setAccountId] = useState(
    () =>
      balances.find((b) => b.symbol === (params.get('asset') ?? assetSymbols[0]))
        ?.accountId ??
      accounts[0]?.id ??
      '',
  );
  const [networks, setNetworks] = useState<{ id: string; name: string }[]>([]);
  const [networkId, setNetworkId] = useState('');
  const [receive, setReceive] = useState<ReceiveAddress | null>(null);
  const [copied, setCopied] = useState(false);

  const accountOptions = accounts.filter((a) =>
    balances.some((b) => b.accountId === a.id && b.symbol === asset),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!accountId) return;
      const list = await listNetworks(accountId, asset);
      if (cancelled) return;
      setNetworks(list);
      const nextNetwork = list[0]?.id ?? '';
      setNetworkId(nextNetwork);
    })();
    return () => {
      cancelled = true;
    };
  }, [asset, accountId, listNetworks]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!accountId || !networkId) {
        setReceive(null);
        return;
      }
      const addr = await getReceiveAddress(accountId, asset, networkId);
      if (!cancelled) setReceive(addr);
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, asset, networkId, getReceiveAddress]);

  async function copyAddress() {
    if (!receive) return;
    await navigator.clipboard.writeText(receive.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="screen">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h1 className="screen-title">Receive</h1>

      <div className="field">
        <label htmlFor="recv-asset">Asset</label>
        <select
          id="recv-asset"
          value={asset}
          onChange={(e) => {
            const next = e.target.value;
            setAsset(next);
            const nextAccount =
              balances.find((b) => b.symbol === next)?.accountId ?? accountId;
            setAccountId(nextAccount);
          }}
        >
          {assetSymbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="recv-account">Account</label>
        <select
          id="recv-account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          {accountOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nickname} · {a.custody === 'custodial' ? 'Custodial' : 'Non-custodial'}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="recv-network">Network</label>
        <select
          id="recv-network"
          value={networkId}
          onChange={(e) => setNetworkId(e.target.value)}
        >
          {networks.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </div>

      <div className="qr-placeholder" aria-hidden="true">
        QR
      </div>

      {receive ? (
        <>
          <div className="address-line">
            <code className="tabular">{receive.address}</code>
            <button type="button" className="btn" onClick={() => void copyAddress()}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="notice notice--warning">{receive.warning}</div>
        </>
      ) : null}
    </section>
  );
}
