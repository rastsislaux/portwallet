import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AssetIcon, IconBack, IconChevronDown, IconCopy } from '../components/icons';
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

  const accountOptions = useMemo(
    () =>
      accounts.filter((a) =>
        balances.some((b) => b.accountId === a.id && b.symbol === asset),
      ),
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
        <IconBack size={20} />
        Back
      </button>
      <h1 className="screen-title">Receive</h1>

      <div className="field">
        <label htmlFor="recv-asset">Asset</label>
        <div className="asset-select">
          <AssetIcon symbol={asset} size={28} />
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
        <AssetIcon symbol={asset} size={44} />
        <div className="qr-placeholder" aria-hidden="true">
          QR
        </div>
      </div>

      {receive ? (
        <>
          <div className="address-line">
            <code className="tabular">{receive.address}</code>
            <button type="button" className="btn btn--icon" onClick={() => void copyAddress()}>
              <IconCopy size={16} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="notice notice--warning">{receive.warning}</div>
        </>
      ) : null}
    </section>
  );
}
