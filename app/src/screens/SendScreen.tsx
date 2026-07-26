import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatQty } from '../components/Amount';
import { AssetIcon, IconBack, IconChevronDown } from '../components/icons';
import type {
  OperationResult,
  SendPreview,
  TransactionKind,
  WalletProduct,
} from '../domain/types';
import { WALLET_PRODUCT_LABELS } from '../domain/types';
import { useWallet } from '../state/WalletContext';

type Step = 'form' | 'review' | 'result';

const MOVABLE_PRODUCTS: WalletProduct[] = ['FUND', 'UNIFIED'];

export function SendScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    accounts,
    balances,
    prepareSend,
    submitSend,
    listNetworks,
  } = useWallet();

  const assetSymbols = useMemo(
    () => [...new Set(balances.map((b) => b.symbol))],
    [balances],
  );

  const [step, setStep] = useState<Step>('form');
  const [asset, setAsset] = useState(params.get('asset') ?? 'BTC');
  const [accountId, setAccountId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [destination, setDestination] = useState('');
  const [kind, setKind] = useState<
    Extract<TransactionKind, 'transfer' | 'internal' | 'withdrawal'>
  >('withdrawal');
  const [fromProduct, setFromProduct] = useState<WalletProduct>('FUND');
  const [toProduct, setToProduct] = useState<WalletProduct>('UNIFIED');
  const [networks, setNetworks] = useState<{ id: string; name: string }[]>([]);
  const [networkId, setNetworkId] = useState('');
  const [preview, setPreview] = useState<SendPreview | null>(null);
  const [result, setResult] = useState<OperationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accountOptions = useMemo(
    () =>
      accounts.filter((a) =>
        balances.some((b) => b.accountId === a.id && b.symbol === asset),
      ),
    [accounts, balances, asset],
  );

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isBybit = selectedAccount?.providerType === 'bybit';

  const productOptions = useMemo(() => {
    const products = balances
      .filter(
        (b) =>
          b.accountId === accountId &&
          b.symbol === asset &&
          b.product &&
          MOVABLE_PRODUCTS.includes(b.product),
      )
      .map((b) => b.product!);
    const unique = [...new Set(products)];
    return unique.length > 0 ? unique : (['FUND'] as WalletProduct[]);
  }, [balances, accountId, asset]);

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
    if (!productOptions.includes(fromProduct)) {
      setFromProduct(productOptions[0] ?? 'FUND');
    }
  }, [fromProduct, productOptions]);

  useEffect(() => {
    if (kind === 'internal' && toProduct === fromProduct) {
      const alt = MOVABLE_PRODUCTS.find((p) => p !== fromProduct) ?? 'UNIFIED';
      setToProduct(alt);
    }
  }, [kind, fromProduct, toProduct]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!accountId || kind === 'internal') {
        setNetworks([]);
        setNetworkId('internal');
        return;
      }
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
          setError(e instanceof Error ? e.message : 'Could not load networks');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asset, accountId, listNetworks, kind]);

  function onAssetChange(next: string) {
    setAsset(next);
  }

  async function onContinue() {
    setError(null);
    const qty = Number(quantity);
    if (!accountId || !(qty > 0)) {
      setError('Fill asset, account, and amount.');
      return;
    }
    if (kind === 'internal') {
      if (!toProduct || toProduct === fromProduct) {
        setError('Choose a different destination wallet.');
        return;
      }
    } else if (!destination.trim() || !networkId) {
      setError('Fill network and destination.');
      return;
    }

    if (fromProduct === 'EARN') {
      setError(
        'Earn products are read-only in Portwallet. Move funds to Funding or UTA in Bybit first.',
      );
      return;
    }

    setBusy(true);
    try {
      const p = await prepareSend({
        accountId,
        assetSymbol: asset,
        quantity: qty,
        destination:
          kind === 'internal' ? toProduct : destination.trim(),
        networkId: kind === 'internal' ? 'internal' : networkId,
        kind,
        fromProduct: isBybit ? fromProduct : undefined,
        toProduct: kind === 'internal' ? toProduct : undefined,
      });
      setPreview(p);
      setStep('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare send');
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    if (!preview) return;
    setBusy(true);
    try {
      const r = await submitSend(preview.request.accountId, preview.id);
      setResult(r);
      setStep('result');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'result' && result) {
    return (
      <section className="screen">
        <h1 className="screen-title">Send status</h1>
        <div className="result-panel">
          <div className={`notice ${result.status === 'failed' ? 'notice--danger' : 'notice--warning'}`}>
            {result.message}
          </div>
          <Link className="btn btn--primary" to="/activity">
            View activity
          </Link>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/')}>
            Back to home
          </button>
        </div>
      </section>
    );
  }

  if (step === 'review' && preview) {
    return (
      <section className="screen">
        <button type="button" className="back-link" onClick={() => setStep('form')}>
          <IconBack size={20} />
          Edit
        </button>
        <h1 className="screen-title">Review send</h1>

        <div className="section-block">
          <div className="section-label">You send</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AssetIcon symbol={preview.request.assetSymbol} size={40} />
            <div className="review-amount tabular">
              {formatQty(preview.request.quantity)} {preview.request.assetSymbol}
            </div>
          </div>
        </div>

        <div className="section-block">
          <div className="section-label">To</div>
          <div style={{ wordBreak: 'break-all', fontSize: 15 }}>{preview.request.destination}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {preview.networkName} · {labelKind(preview.request.kind)}
          </div>
        </div>

        <div className="review-block">
          <div className="review-row">
            <span>Network fee</span>
            <span className="tabular">
              {formatQty(preview.feeQuantity)} {preview.feeAssetSymbol}
            </span>
          </div>
          <div className="review-row review-row--emphasis">
            <span>You will receive</span>
            <span className="tabular">
              {formatQty(preview.youReceiveQuantity)} {preview.request.assetSymbol}
            </span>
          </div>
          <div className="review-row">
            <span>Arrives in</span>
            <span>{preview.estimatedArrival}</span>
          </div>
        </div>

        {preview.irreversible ? (
          <div className="notice notice--warning">
            On-chain withdrawals cannot be reversed once sent. Verify the network and
            address before confirming.
          </div>
        ) : (
          <div className="notice notice--warning">
            Confirm the destination account. Internal moves stay on the exchange.
          </div>
        )}

        <div className="stack-actions">
          <button type="button" className="btn btn--ghost" onClick={() => setStep('form')} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void onConfirm()}
            disabled={busy}
          >
            Confirm send
          </button>
        </div>
      </section>
    );
  }

  const blockedByPermissions =
    isBybit && selectedAccount?.permissions
      ? kind === 'withdrawal' || kind === 'transfer'
        ? !selectedAccount.permissions.canWithdraw
        : !selectedAccount.permissions.canTransfer
      : false;

  return (
    <section className="screen">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <IconBack size={20} />
        Back
      </button>
      <h1 className="screen-title">Send</h1>

      <div className="field">
        <label htmlFor="send-asset">Asset</label>
        <div className="asset-select">
          <AssetIcon symbol={asset} size={28} />
          <span className="asset-select__label">{asset}</span>
          <span className="asset-select__chevron">
            <IconChevronDown size={16} />
          </span>
          <select
            id="send-asset"
            value={asset}
            onChange={(e) => onAssetChange(e.target.value)}
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
        <label htmlFor="send-account">From account</label>
        <select
          id="send-account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          {accountOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nickname} · {a.venueLabel}
            </option>
          ))}
        </select>
      </div>

      {isBybit ? (
        <div className="field">
          <label htmlFor="send-from-product">From wallet</label>
          <select
            id="send-from-product"
            value={fromProduct}
            onChange={(e) => setFromProduct(e.target.value as WalletProduct)}
          >
            {productOptions.map((p) => (
              <option key={p} value={p}>
                {WALLET_PRODUCT_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="send-kind">Type</label>
        <select
          id="send-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          <option value="withdrawal">Withdrawal · on-chain</option>
          <option value="internal">Internal · Funding ↔ UTA</option>
          <option value="transfer">Transfer · Bybit internal</option>
        </select>
      </div>

      {kind === 'internal' ? (
        <div className="field">
          <label htmlFor="send-to-product">To wallet</label>
          <select
            id="send-to-product"
            value={toProduct}
            onChange={(e) => setToProduct(e.target.value as WalletProduct)}
          >
            {MOVABLE_PRODUCTS.filter((p) => p !== fromProduct).map((p) => (
              <option key={p} value={p}>
                {WALLET_PRODUCT_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="send-network">Network</label>
            <select
              id="send-network"
              value={networkId}
              onChange={(e) => setNetworkId(e.target.value)}
              disabled={kind === 'transfer'}
            >
              {kind === 'transfer' ? (
                <option value="internal">Bybit internal</option>
              ) : (
                networks.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="field">
            <label htmlFor="send-dest">Destination</label>
            <textarea
              id="send-dest"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={
                kind === 'transfer'
                  ? 'Bybit UID or internal address'
                  : 'On-chain address'
              }
            />
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor="send-amount">Amount</label>
        <input
          id="send-amount"
          className="tabular"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0.00"
        />
      </div>

      {blockedByPermissions ? (
        <div className="notice notice--danger">
          This API key cannot perform this action. Enable the required Wallet
          permission in Bybit, then reconnect.
        </div>
      ) : null}

      {error ? <div className="notice notice--danger">{error}</div> : null}

      <button
        type="button"
        className="btn btn--primary btn--block"
        onClick={() => void onContinue()}
        disabled={busy || blockedByPermissions}
      >
        Review
      </button>
    </section>
  );
}

function labelKind(kind: string) {
  if (kind === 'withdrawal') return 'Withdrawal · on-chain';
  if (kind === 'internal') return 'Internal · Funding ↔ UTA';
  return 'Transfer · Bybit internal';
}
