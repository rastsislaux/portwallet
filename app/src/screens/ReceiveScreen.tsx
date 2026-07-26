import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CryptoIcon, IconBack, IconChevronDown, IconCopy } from '../components/icons';
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

  const preferredAsset = params.get('asset') ?? assetSymbols[0] ?? 'BTC';
  const [asset, setAsset] = useState(preferredAsset);
  const [accountId, setAccountId] = useState('');
  const [networks, setNetworks] = useState<{ id: string; name: string }[]>([]);
  const [networkId, setNetworkId] = useState('');
  const [receive, setReceive] = useState<ReceiveAddress | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountOptions = useMemo(
    () =>
      accounts.filter((a) => {
        if (a.providerType === 'bybit' && a.product && a.product !== 'FUND') {
          return false;
        }
        return (
          balances.some((b) => b.accountId === a.id && b.symbol === asset) ||
          (a.providerType === 'bybit' && a.product === 'FUND')
        );
      }),
    [accounts, balances, asset],
  );

  useEffect(() => {
    if (!assetSymbols.includes(asset) && assetSymbols[0]) {
      setAsset(assetSymbols[0]);
    }
  }, [asset, assetSymbols]);

  useEffect(() => {
    const stillValid = accountOptions.some((a) => a.id === accountId);
    if (!stillValid) {
      setAccountId(accountOptions[0]?.id ?? '');
    }
  }, [accountId, accountOptions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!accountId) return;
      const list = await listNetworks(accountId, asset);
      if (cancelled) return;
      setNetworks(list);
      setNetworkId((current) =>
        list.some((n) => n.id === current) ? current : (list[0]?.id ?? ''),
      );
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
        setError(null);
        return;
      }
      try {
        const addr = await getReceiveAddress(accountId, asset, networkId);
        if (!cancelled) {
          setReceive(addr);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setReceive(null);
          setError(e instanceof Error ? e.message : 'Could not load address');
        }
      }
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

  async function copyTag() {
    if (!receive?.tag) return;
    await navigator.clipboard.writeText(receive.tag);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="screen">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <IconBack size={20} />
        Back
      </button>
      <h1 className="screen-title">Receive</h1>

      <div className="field">
        <label htmlFor="recv-asset">Asset</label>
        <div className="asset-select">
          <CryptoIcon symbol={asset} size={28} decorative />
          <span className="asset-select__label">{asset}</span>
          <span className="asset-select__chevron">
            <IconChevronDown size={16} />
          </span>
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

      <div className="qr-block">
        <CryptoIcon symbol={asset} size={44} decorative />
        <div className="qr-placeholder" aria-hidden="true">
          QR
        </div>
      </div>

      {error ? <div className="notice notice--danger">{error}</div> : null}

      {receive ? (
        <>
          <div className="address-line">
            <code className="tabular">{receive.address}</code>
            <button type="button" className="btn btn--icon" onClick={() => void copyAddress()}>
              <IconCopy size={16} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {receive.tag ? (
            <div className="address-line">
              <code className="tabular">Tag · {receive.tag}</code>
              <button type="button" className="btn btn--icon" onClick={() => void copyTag()}>
                <IconCopy size={16} />
                Copy tag
              </button>
            </div>
          ) : null}
          <div className="notice notice--warning">{receive.warning}</div>
        </>
      ) : null}
    </section>
  );
}
