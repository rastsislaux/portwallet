import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatQty } from '../components/Amount';
import {
  AssetIcon,
  IconChevronDown,
  IconSwap,
  ProviderIcon,
} from '../components/icons';
import type {
  ExchangeQuote,
  OperationResult,
  WalletProduct,
} from '../domain/types';
import { WALLET_PRODUCT_LABELS } from '../domain/types';
import { useWallet } from '../state/WalletContext';

type Step = 'form' | 'result';

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
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState<Exclude<WalletProduct, 'EARN'>>('FUND');

  const accountOptions = useMemo(
    () =>
      accounts.filter((a) =>
        balances.some((b) => b.accountId === a.id && b.symbol === fromSymbol),
      ),
    [accounts, balances, fromSymbol],
  );

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isBybit = selectedAccount?.providerType === 'bybit';
  const exchangeBlocked =
    isBybit && selectedAccount?.permissions
      ? !selectedAccount.permissions.canExchange
      : false;

  const productOptions = useMemo(() => {
    const products = balances
      .filter(
        (b) =>
          b.accountId === accountId &&
          b.symbol === fromSymbol &&
          (b.product === 'FUND' || b.product === 'UNIFIED'),
      )
      .map((b) => b.product as Exclude<WalletProduct, 'EARN'>);
    const unique = [...new Set(products)];
    return unique.length > 0 ? unique : (['FUND'] as Exclude<WalletProduct, 'EARN'>[]);
  }, [balances, accountId, fromSymbol]);

  useEffect(() => {
    if (!productOptions.includes(product)) {
      setProduct(productOptions[0] ?? 'FUND');
    }
  }, [product, productOptions]);

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

  useEffect(() => {
    const qty = Number(quantity);
    if (!accountId || !(qty > 0) || fromSymbol === toSymbol) {
      setQuote(null);
      setError(
        fromSymbol === toSymbol ? 'Choose different assets.' : null,
      );
      setQuoting(false);
      return;
    }

    if (exchangeBlocked) {
      setQuote(null);
      setError(
        'This API key cannot exchange. Enable Exchange → ExchangeHistory, then reconnect.',
      );
      setQuoting(false);
      return;
    }

    let cancelled = false;
    setQuoting(true);
    setError(null);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const q = await prepareExchange({
            accountId,
            fromSymbol,
            toSymbol,
            fromQuantity: qty,
            product: isBybit ? product : undefined,
          });
          if (!cancelled) {
            setQuote(q);
            setError(null);
          }
        } catch (e) {
          if (!cancelled) {
            setQuote(null);
            setError(e instanceof Error ? e.message : 'Quote unavailable');
          }
        } finally {
          if (!cancelled) setQuoting(false);
        }
      })();
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    accountId,
    fromSymbol,
    toSymbol,
    quantity,
    prepareExchange,
    product,
    isBybit,
    exchangeBlocked,
  ]);

  function swapAssets() {
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    if (quote) {
      setQuantity(String(quote.youReceiveQuantity));
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
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setStep('form');
              setResult(null);
            }}
          >
            Exchange again
          </button>
        </div>
      </section>
    );
  }

  const receiveLabel = quote
    ? formatQty(quote.youReceiveQuantity)
    : quoting
      ? '…'
      : '0';

  return (
    <section className="screen screen--exchange">
      <header className="header-block">
        <h1 className="screen-title">Exchange</h1>
      </header>

      {accountOptions.length > 0 ? (
        <div className="account-chip" style={{ alignSelf: 'flex-start' }}>
          {selectedAccount ? (
            <ProviderIcon type={selectedAccount.providerType} size={28} />
          ) : null}
          <span className="account-chip__label">
            {selectedAccount?.nickname ?? 'Account'}
          </span>
          <IconChevronDown size={14} className="account-chip__chevron" />
          <select
            aria-label="Account"
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
      ) : null}

      {isBybit ? (
        <div className="field" style={{ marginTop: 0 }}>
          <label htmlFor="exchange-product">Wallet</label>
          <select
            id="exchange-product"
            value={product}
            onChange={(e) =>
              setProduct(e.target.value as Exclude<WalletProduct, 'EARN'>)
            }
          >
            {productOptions.map((p) => (
              <option key={p} value={p}>
                {WALLET_PRODUCT_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="conversion-widget">
        <div className="conversion-leg">
          <div className="conversion-leg__top">
            <span className="conversion-leg__hint">You pay</span>
            <label className="selector">
              <AssetIcon symbol={fromSymbol} size={28} />
              <span className="selector__ticker">{fromSymbol}</span>
              <span className="selector__chevron">
                <IconChevronDown size={14} />
              </span>
              <select
                aria-label="From asset"
                value={fromSymbol}
                onChange={(e) => setFromSymbol(e.target.value)}
              >
                {assetSymbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <input
            className="conversion-leg__amount tabular"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            aria-label="Amount to exchange"
          />
        </div>

        <div className="conversion-swap">
          <button
            type="button"
            className="btn btn--swap"
            onClick={swapAssets}
            aria-label="Swap assets"
          >
            <IconSwap size={16} strokeWidth={2.25} />
          </button>
        </div>

        <div className="conversion-divider" />

        <div className="conversion-leg">
          <div className="conversion-leg__top">
            <span className="conversion-leg__hint">You receive</span>
            <label className="selector">
              <AssetIcon symbol={toSymbol} size={28} />
              <span className="selector__ticker">{toSymbol}</span>
              <span className="selector__chevron">
                <IconChevronDown size={14} />
              </span>
              <select
                aria-label="To asset"
                value={toSymbol}
                onChange={(e) => setToSymbol(e.target.value)}
              >
                {assetSymbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div
            className={`conversion-leg__receive tabular ${quote ? '' : 'is-muted'}`}
            aria-live="polite"
          >
            {receiveLabel}
          </div>
        </div>
      </div>

      <div className="quote-inline">
        {quote ? (
          <>
            <div className="quote-inline__row quote-inline__row--primary">
              <span>Rate</span>
              <span>{quote.rateLabel}</span>
            </div>
            <div className="quote-inline__row">
              <span>Fee</span>
              <span className="tabular">
                {formatQty(quote.feeQuantity)} {quote.feeAssetSymbol}
              </span>
            </div>
            <button
              type="button"
              className="details-toggle"
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails ? 'Hide details' : 'Details'}
            </button>
            {showDetails ? (
              <div className="details-panel">
                <div className="quote-inline__row">
                  <span>Spread</span>
                  <span>{quote.spreadBps} bps</span>
                </div>
                <div className="quote-inline__row">
                  <span>Minimum</span>
                  <span className="tabular">
                    {formatQty(quote.minFromQuantity)} {quote.request.fromSymbol}
                  </span>
                </div>
                <div className="quote-inline__row">
                  <span>Via</span>
                  <span>{quote.providerLabel}</span>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="quote-status">
            {quoting ? 'Updating quote…' : error ?? 'Enter an amount to see your quote'}
          </div>
        )}
      </div>

      {error && quote === null && !quoting ? (
        <div className="notice notice--danger">{error}</div>
      ) : null}

      <button
        type="button"
        className="btn btn--primary btn--block exchange-confirm"
        onClick={() => void onConfirm()}
        disabled={busy || !quote || quoting || exchangeBlocked}
      >
        Confirm exchange
      </button>
    </section>
  );
}
