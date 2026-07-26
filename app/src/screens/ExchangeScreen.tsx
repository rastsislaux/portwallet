import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatQty } from '../components/Amount';
import { AssetIcon, IconArrowDown, IconBack } from '../components/icons';
import type { ExchangeQuote, OperationResult } from '../domain/types';
import { useWallet } from '../state/WalletContext';

type Step = 'form' | 'review' | 'result';

export function ExchangeScreen() {
  const [params] = useSearchParams();
  const {
    accounts,
    balances,
    prepareExchange,
    submitExchange,
  } = useWallet();

  const assetSymbols = useMemo(
    () => [...new Set(balances.map((b) => b.symbol))],
    [balances],
  );

  const [step, setStep] = useState<Step>('form');
  const [fromSymbol, setFromSymbol] = useState(params.get('from') ?? 'BTC');
  const [toSymbol, setToSymbol] = useState('USDT');
  const [accountId, setAccountId] = useState('');
  const [quantity, setQuantity] = useState('0.01');
  const [quote, setQuote] = useState<ExchangeQuote | null>(null);
  const [result, setResult] = useState<OperationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accountOptions = useMemo(
    () =>
      accounts.filter((a) =>
        balances.some((b) => b.accountId === a.id && b.symbol === fromSymbol),
      ),
    [accounts, balances, fromSymbol],
  );

  useEffect(() => {
    if (!assetSymbols.includes(fromSymbol) && assetSymbols[0]) {
      setFromSymbol(assetSymbols[0]);
    }
    if (!assetSymbols.includes(toSymbol)) {
      const fallback =
        assetSymbols.find((s) => s !== fromSymbol) ?? assetSymbols[0] ?? 'USDT';
      setToSymbol(fallback);
    }
  }, [assetSymbols, fromSymbol, toSymbol]);

  useEffect(() => {
    const stillValid = accountOptions.some((a) => a.id === accountId);
    if (!stillValid) {
      setAccountId(accountOptions[0]?.id ?? '');
    }
  }, [accountId, accountOptions]);

  async function onQuote() {
    setError(null);
    const qty = Number(quantity);
    if (!accountId || !(qty > 0) || fromSymbol === toSymbol) {
      setError('Choose different assets and a valid amount.');
      return;
    }
    setBusy(true);
    try {
      const q = await prepareExchange({
        accountId,
        fromSymbol,
        toSymbol,
        fromQuantity: qty,
      });
      setQuote(q);
    } catch (e) {
      setQuote(null);
      setError(e instanceof Error ? e.message : 'Quote unavailable');
    } finally {
      setBusy(false);
    }
  }

  async function onReview() {
    setError(null);
    setBusy(true);
    try {
      const q = await prepareExchange({
        accountId,
        fromSymbol,
        toSymbol,
        fromQuantity: Number(quantity),
      });
      setQuote(q);
      setStep('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Quote unavailable');
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    if (!quote) return;
    setBusy(true);
    try {
      const r = await submitExchange(quote.request.accountId, quote.id);
      setResult(r);
      setStep('result');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'result' && result) {
    return (
      <section className="screen">
        <h1 className="screen-title">Exchange status</h1>
        <div className="result-panel">
          <div
            className={`notice ${result.status === 'failed' ? 'notice--danger' : 'notice--warning'}`}
          >
            {result.message}
          </div>
          <Link className="btn btn--primary" to="/activity">
            View activity
          </Link>
          <button type="button" className="btn" onClick={() => setStep('form')}>
            Exchange again
          </button>
        </div>
      </section>
    );
  }

  if (step === 'review' && quote) {
    return (
      <section className="screen">
        <button type="button" className="back-link" onClick={() => setStep('form')}>
          <IconBack />
          Edit
        </button>
        <h1 className="screen-title">Review exchange</h1>

        <div className="conversion-hero">
          <div className="conversion-hero__asset">
            <AssetIcon symbol={quote.request.fromSymbol} size={36} />
            <span className="tabular">
              {formatQty(quote.request.fromQuantity)} {quote.request.fromSymbol}
            </span>
          </div>
          <div className="conversion-hero__arrow">
            <IconArrowDown size={18} />
          </div>
          <div className="conversion-hero__asset">
            <AssetIcon symbol={quote.request.toSymbol} size={36} />
            <span className="tabular">
              {formatQty(quote.youReceiveQuantity)} {quote.request.toSymbol}
            </span>
          </div>
        </div>

        <div className="review-block">
          <div className="review-row">
            <span>Rate</span>
            <span>{quote.rateLabel}</span>
          </div>
          <div className="review-row">
            <span>Fee</span>
            <span className="tabular">
              {formatQty(quote.feeQuantity)} {quote.feeAssetSymbol}
            </span>
          </div>
          <div className="review-row">
            <span>Via</span>
            <span>{quote.providerLabel}</span>
          </div>
        </div>

        <div className="notice notice--warning">
          Quoted amounts can change if the market moves. Confirm only if the receive
          amount is acceptable.
        </div>

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
            Confirm exchange
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen">
      <header className="header-block">
        <h1 className="screen-title">Exchange</h1>
        <p className="custody-strip" style={{ marginTop: 0 }}>
          Convert within a connected account. Fees and final amount shown before confirm.
        </p>
      </header>

      <div className="conversion-hero">
        <div className="conversion-hero__asset">
          <AssetIcon symbol={fromSymbol} size={36} />
          <span>{fromSymbol}</span>
        </div>
        <div className="conversion-hero__arrow">
          <IconArrowDown size={18} />
        </div>
        <div className="conversion-hero__asset">
          <AssetIcon symbol={toSymbol} size={36} />
          <span>{toSymbol}</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="ex-account">Account</label>
        <select
          id="ex-account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          {accountOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nickname}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="ex-from">From</label>
        <div className="field-row">
          <select
            id="ex-from"
            value={fromSymbol}
            onChange={(e) => {
              setFromSymbol(e.target.value);
              setQuote(null);
            }}
          >
            {assetSymbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="tabular"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setQuote(null);
            }}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="ex-to">To</label>
        <select
          id="ex-to"
          value={toSymbol}
          onChange={(e) => {
            setToSymbol(e.target.value);
            setQuote(null);
          }}
        >
          {assetSymbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {quote ? (
        <div className="review-block">
          <div className="review-row">
            <span>Rate</span>
            <span>{quote.rateLabel}</span>
          </div>
          <div className="review-row">
            <span>Fee</span>
            <span className="tabular">
              {formatQty(quote.feeQuantity)} {quote.feeAssetSymbol}
            </span>
          </div>
          <div className="review-row review-row--emphasis">
            <span>You receive</span>
            <span className="tabular">
              {formatQty(quote.youReceiveQuantity)} {quote.request.toSymbol}
            </span>
          </div>
          <div className="review-row">
            <span>Via</span>
            <span>{quote.providerLabel}</span>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn--block btn--soft" onClick={() => void onQuote()} disabled={busy}>
          Get quote
        </button>
      )}

      <button
        type="button"
        className="details-toggle"
        onClick={() => setShowDetails((v) => !v)}
      >
        {showDetails ? '▾' : '▸'} Details (spread, min amount)
      </button>
      {showDetails && quote ? (
        <div className="details-panel">
          <div>Spread: {quote.spreadBps} bps</div>
          <div>
            Minimum: {formatQty(quote.minFromQuantity)} {quote.request.fromSymbol}
          </div>
        </div>
      ) : null}

      {error ? <div className="notice notice--danger">{error}</div> : null}

      <button
        type="button"
        className="btn btn--primary btn--block"
        onClick={() => void onReview()}
        disabled={busy}
      >
        Review exchange
      </button>
    </section>
  );
}
