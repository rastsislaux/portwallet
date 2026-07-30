import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  assetChoiceOptions,
  ChoiceScreen,
  ChoiceTrigger,
  networkChoiceOptions,
} from '../components/ChoiceScreen';
import { CryptoIcon, IconBack, IconCopy } from '../components/icons';
import type { ReceiveAddress } from '../domain/types';
import { useWallet } from '../state/WalletContext';

type Step = 'select' | 'address';
type Picker = 'asset' | 'network' | null;

export function ReceiveScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { accounts, balances, assets, getReceiveAddress, listNetworks } = useWallet();

  const assetOptions = useMemo(
    () => assetChoiceOptions(balances, assets),
    [balances, assets],
  );
  const assetSymbols = useMemo(
    () => assetOptions.map((option) => option.id),
    [assetOptions],
  );

  const preferredAsset = params.get('asset') ?? assetSymbols[0] ?? 'BTC';
  const [step, setStep] = useState<Step>('select');
  const [picker, setPicker] = useState<Picker>(null);
  const [asset, setAsset] = useState(preferredAsset);
  const [accountId, setAccountId] = useState('');
  const [networks, setNetworks] = useState<{ id: string; name: string; chain?: string }[]>([]);
  const [networkId, setNetworkId] = useState('');
  const [networksLoading, setNetworksLoading] = useState(false);
  const [receive, setReceive] = useState<ReceiveAddress | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const networkLocked = networks.length === 1;
  const networkOptions = useMemo(
    () => networkChoiceOptions(networks, asset),
    [networks, asset],
  );
  const selectedNetwork = networks.find((n) => n.id === networkId);

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
      if (!accountId) {
        setNetworks([]);
        setNetworkId('');
        return;
      }
      setNetworksLoading(true);
      try {
        const list = await listNetworks(accountId, asset);
        if (cancelled) return;
        setNetworks(list);
        setNetworkId((current) =>
          list.some((n) => n.id === current) ? current : (list[0]?.id ?? ''),
        );
      } catch (e) {
        if (!cancelled) {
          setNetworks([]);
          setNetworkId('');
          setError(e instanceof Error ? e.message : 'Could not load networks');
        }
      } finally {
        if (!cancelled) setNetworksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asset, accountId, listNetworks]);

  const canContinue = Boolean(accountId && networkId && !networksLoading && !busy);

  async function onContinue() {
    if (!canContinue) return;
    setBusy(true);
    setError(null);
    try {
      const addr = await getReceiveAddress(accountId, asset, networkId);
      setReceive(addr);
      setStep('address');
    } catch (e) {
      setReceive(null);
      setError(e instanceof Error ? e.message : 'Could not load address');
    } finally {
      setBusy(false);
    }
  }

  function onBackToSelect() {
    setStep('select');
    setCopied(false);
    setError(null);
  }

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

  if (step === 'address' && receive) {
    const accountNickname = accounts.find((a) => a.id === receive.accountId)?.nickname;

    return (
      <section className="screen">
        <button type="button" className="back-link" onClick={onBackToSelect}>
          <IconBack size={20} />
          Back
        </button>
        <h1 className="screen-title">Receive {receive.assetSymbol}</h1>

        <div className="section-block">
          <div className="section-eyebrow">
            {receive.networkName}
            {accountNickname ? ` · ${accountNickname}` : ''}
          </div>
        </div>

        <div className="qr-block">
          <CryptoIcon symbol={receive.assetSymbol} size={44} decorative />
          <div className="qr-code">
            <QRCodeSVG
              value={receive.address}
              size={180}
              level="M"
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#111111"
              title={`${receive.assetSymbol} receive address`}
            />
          </div>
        </div>

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
      </section>
    );
  }

  return (
    <section className="screen">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <IconBack size={20} />
        Back
      </button>
      <h1 className="screen-title">Receive</h1>

      <ChoiceTrigger
        label="Asset"
        valueLabel={asset}
        iconSymbol={asset}
        onClick={() => setPicker('asset')}
      />

      <div className="field">
        <label htmlFor="recv-account">Account</label>
        <select
          id="recv-account"
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value);
            setError(null);
          }}
        >
          {accountOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nickname} · {a.custody === 'custodial' ? 'Custodial' : 'Non-custodial'}
            </option>
          ))}
        </select>
      </div>

      {networks.length > 0 || networksLoading ? (
        <ChoiceTrigger
          label="Network"
          valueLabel={selectedNetwork?.name ?? (networksLoading ? 'Loading…' : 'Select network')}
          iconSymbol={asset}
          disabled={networkLocked}
          loading={networksLoading}
          onClick={() => setPicker('network')}
        />
      ) : null}

      {error ? <div className="notice notice--danger">{error}</div> : null}

      <div className="stack-actions">
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={!canContinue}
          onClick={() => void onContinue()}
        >
          {busy ? 'Loading…' : 'Continue'}
        </button>
      </div>

      {picker === 'asset' ? (
        <ChoiceScreen
          title="Select asset"
          searchPlaceholder="Search assets"
          options={assetOptions}
          value={asset}
          onSelect={(next) => {
            setAsset(next);
            const nextAccount =
              balances.find((b) => b.symbol === next)?.accountId ?? accountId;
            setAccountId(nextAccount);
            setError(null);
          }}
          onClose={() => setPicker(null)}
        />
      ) : null}

      {picker === 'network' ? (
        <ChoiceScreen
          title="Select network"
          searchPlaceholder="Search networks"
          options={networkOptions}
          value={networkId}
          onSelect={(next) => {
            setNetworkId(next);
            setError(null);
          }}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </section>
  );
}
