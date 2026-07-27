import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatAssetQty, formatQty } from '../components/Amount';
import { CryptoIcon, IconBack, IconChevronDown } from '../components/icons';
import { balanceQuantity, isInsufficientBalance } from '../domain/balances';
import type {
  OperationResult,
  SendPreview,
  TransactionKind,
  WalletProduct,
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
  const [destinationAccountId, setDestinationAccountId] = useState('');
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
      accounts.filter(
        (a) =>
          a.product !== 'EARN' &&
          balances.some((b) => b.accountId === a.id && b.symbol === asset),
      ),
    [accounts, balances, asset],
  );

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const fromProduct = selectedAccount?.product;
  const isBybit = selectedAccount?.providerType === 'bybit';

  const siblingAccounts = useMemo(() => {
    if (!selectedAccount) return [];
    return accounts.filter(
      (a) =>
        a.id !== selectedAccount.id &&
        a.providerInstanceId === selectedAccount.providerInstanceId &&
        (a.product === 'FUND' || a.product === 'UNIFIED') &&
        a.product !== selectedAccount.product,
    );
  }, [accounts, selectedAccount]);

  const availableQuantity = useMemo(
    () => (accountId ? balanceQuantity(balances, accountId, asset) : 0),
    [balances, accountId, asset],
  );

  const destinationAvailableQuantity = useMemo(() => {
    if (kind !== 'internal' || !destinationAccountId) return null;
    return balanceQuantity(balances, destinationAccountId, asset);
  }, [kind, destinationAccountId, balances, asset]);

  const qty = Number(quantity);
  const insufficientBalance = isInsufficientBalance(qty, availableQuantity);

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
    const stillValid = siblingAccounts.some((a) => a.id === destinationAccountId);
    if (!stillValid) {
      setDestinationAccountId(siblingAccounts[0]?.id ?? '');
    }
  }, [destinationAccountId, siblingAccounts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!accountId || kind === 'internal' || kind === 'transfer') {
        setNetworks([]);
        setNetworkId(kind === 'transfer' ? 'internal' : 'internal');
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

  async function onContinue() {
    setError(null);
    if (!accountId || !(qty > 0)) {
      setError('Fill asset, account, and amount.');
      return;
    }
    if (insufficientBalance) {
      setError(
        `Insufficient balance. Available ${formatAssetQty(asset, availableQuantity)} ${asset}.`,
      );
      return;
    }
    if (fromProduct === 'EARN') {
      setError(
        'Earn products are read-only in Portwallet. Move funds to Funding or UTA in Bybit first.',
      );
      return;
    }

    let toProduct: WalletProduct | undefined;
    let dest = destination.trim();
    let net = networkId;

    if (kind === 'internal') {
      const sibling = accounts.find((a) => a.id === destinationAccountId);
      if (!sibling?.product || sibling.product === fromProduct) {
        setError('Choose a different destination wallet.');
        return;
      }
      toProduct = sibling.product;
      dest = sibling.id;
      net = 'internal';
    } else if (kind === 'transfer') {
      if (!dest) {
        setError('Enter a Bybit UID or internal address.');
        return;
      }
      net = 'internal';
    } else if (!dest || !net) {
      setError('Fill network and destination.');
      return;
    }

    setBusy(true);
    try {
      const p = await prepareSend({
        accountId,
        assetSymbol: asset,
        quantity: qty,
        destination: dest,
        networkId: net,
        kind,
        fromProduct,
        toProduct,
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
            View history
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
            <CryptoIcon symbol={preview.request.assetSymbol} size={40} decorative />
            <div className="review-amount tabular">
              {formatQty(preview.request.quantity)} {preview.request.assetSymbol}
            </div>
          </div>
        </div>

        <div className="section-block">
          <div className="section-label">To</div>
          <div style={{ wordBreak: 'break-all', fontSize: 15 }}>
            {preview.request.kind === 'internal'
              ? preview.networkName
              : preview.request.destination}
          </div>
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
          <CryptoIcon symbol={asset} size={28} decorative />
          <span className="asset-select__label">{asset}</span>
          <span className="asset-select__chevron">
            <IconChevronDown size={16} />
          </span>
          <select
            id="send-asset"
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
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
              {a.nickname} · {formatAssetQty(asset, balanceQuantity(balances, a.id, asset))} {asset}
            </option>
          ))}
        </select>
      </div>

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
          <label htmlFor="send-to-account">To account</label>
          <select
            id="send-to-account"
            value={destinationAccountId}
            onChange={(e) => setDestinationAccountId(e.target.value)}
          >
            {siblingAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nickname} · {formatAssetQty(asset, balanceQuantity(balances, a.id, asset))} {asset}
              </option>
            ))}
          </select>
          {siblingAccounts.length === 0 ? (
            <div className="notice notice--warning" style={{ marginTop: 8 }}>
              No sibling Funding/UTA account is connected for this key.
            </div>
          ) : destinationAvailableQuantity !== null ? (
            <div className="field-balance">
              <span className="field-balance__value tabular">
                Receiver balance {formatAssetQty(asset, destinationAvailableQuantity)} {asset}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {kind === 'withdrawal' ? (
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
          ) : null}
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
          onChange={(e) => {
            setQuantity(e.target.value);
            setError(null);
          }}
          placeholder="0.00"
        />
        {accountId ? (
          <div className="field-balance">
            <span className="field-balance__value tabular">
              Available {formatAssetQty(asset, availableQuantity)} {asset}
            </span>
            <button
              type="button"
              className="field-balance__max"
              disabled={availableQuantity <= 0}
              onClick={() => {
                setQuantity(String(availableQuantity));
                setError(null);
              }}
            >
              Max
            </button>
          </div>
        ) : null}
      </div>

      {blockedByPermissions ? (
        <div className="notice notice--danger">
          This API key cannot perform this action. Enable the required Wallet
          permission in Bybit, then reconnect.
        </div>
      ) : null}

      {insufficientBalance ? (
        <div className="notice notice--danger">
          Insufficient balance. Available {formatAssetQty(asset, availableQuantity)}{' '}
          {asset}.
        </div>
      ) : null}

      {error && !insufficientBalance ? (
        <div className="notice notice--danger">{error}</div>
      ) : null}

      <button
        type="button"
        className="btn btn--primary btn--block"
        onClick={() => void onContinue()}
        disabled={busy || blockedByPermissions || insufficientBalance}
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
