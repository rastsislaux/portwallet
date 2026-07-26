import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatQty } from '../components/Amount';
import type {
  OperationResult,
  SendPreview,
  TransactionKind,
} from '../domain/types';
import { useWallet } from '../state/WalletContext';

type Step = 'form' | 'review' | 'result';

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

  function onAssetChange(next: string) {
    setAsset(next);
  }

  async function onContinue() {
    setError(null);
    const qty = Number(quantity);
    if (!accountId || !destination || !networkId || !(qty > 0)) {
      setError('Fill asset, account, amount, network, and destination.');
      return;
    }
    setBusy(true);
    try {
      const p = await prepareSend({
        accountId,
        assetSymbol: asset,
        quantity: qty,
        destination,
        networkId,
        kind,
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
          <button type="button" className="btn" onClick={() => navigate('/')}>
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
          ← Edit
        </button>
        <h1 className="screen-title">Review send</h1>

        <div>
          <div className="section-label">You send</div>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 500 }}>
            {formatQty(preview.request.quantity)} {preview.request.assetSymbol}
          </div>
        </div>

        <div>
          <div className="section-label">To</div>
          <div style={{ wordBreak: 'break-all' }}>{preview.request.destination}</div>
          <div style={{ color: 'var(--ink-secondary)', fontSize: 13, marginTop: 4 }}>
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
          <button type="button" className="btn" onClick={() => setStep('form')} disabled={busy}>
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

  return (
    <section className="screen">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h1 className="screen-title">Send</h1>

      <div className="field">
        <label htmlFor="send-asset">Asset</label>
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

      <div className="field">
        <label htmlFor="send-kind">Type</label>
        <select
          id="send-kind"
          value={kind}
          onChange={(e) =>
            setKind(e.target.value as typeof kind)
          }
        >
          <option value="withdrawal">Withdrawal · on-chain</option>
          <option value="internal">Internal · exchange move</option>
          <option value="transfer">Transfer · between contacts</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="send-network">Network</label>
        <select
          id="send-network"
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

      <div className="field">
        <label htmlFor="send-dest">Destination</label>
        <textarea
          id="send-dest"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Address or account identifier"
        />
      </div>

      {error ? <div className="notice notice--danger">{error}</div> : null}

      <button
        type="button"
        className="btn btn--primary btn--block"
        onClick={() => void onContinue()}
        disabled={busy}
      >
        Review
      </button>
    </section>
  );
}

function labelKind(kind: string) {
  if (kind === 'withdrawal') return 'Withdrawal · on-chain';
  if (kind === 'internal') return 'Internal · exchange move';
  return 'Transfer';
}
