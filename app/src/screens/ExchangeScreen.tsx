import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatAssetQty, formatQty } from '../components/Amount';
import {
  assetChoiceOptions,
  ChoiceScreen,
  ChoiceTrigger,
} from '../components/ChoiceScreen';
import {
  IconChevronDown,
  IconSwap,
  ProviderIcon,
} from '../components/icons';
import { balanceQuantity, isInsufficientBalance } from '../domain/balances';
import type { ExchangeQuote, OperationResult } from '../domain/types';
import { useWallet } from '../state/WalletContext';

type Step = 'form' | 'result';
type Picker = 'from' | 'to' | null;

export function ExchangeScreen() {
  const [params] = useSearchParams();
  const {
    accounts,
    balances,
    assets,
    prepareExchange,
    submitExchange,
  } = useWallet();

  const assetOptions = useMemo(
    () => assetChoiceOptions(balances, assets),
    [balances, assets],
  );
  const assetSymbols = useMemo(
    () => assetOptions.map((option) => option.id),
    [assetOptions],
  );

  const [step, setStep] = useState<Step>('form');
  const [picker, setPicker] = useState<Picker>(null);
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

  const accountOptions = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.product !== 'EARN' &&
          balances.some((b) => b.accountId === a.id && b.symbol === fromSymbol),
      ),
    [accounts, balances, fromSymbol],
  );

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isBybit = selectedAccount?.providerType === 'bybit';
  const exchangeBlocked =
    isBybit && selectedAccount?.permissions
      ? !selectedAccount.permissions.canExchange || selectedAccount.product === 'EARN'
      : false;

  const fromAvailable = useMemo(
    () => (accountId ? balanceQuantity(balances, accountId, fromSymbol) : 0),
    [balances, accountId, fromSymbol],
  );

  const toAvailable = useMemo(
    () => (accountId ? balanceQuantity(balances, accountId, toSymbol) : 0),
    [balances, accountId, toSymbol],
  );

  const qty = Number(quantity);
  const insufficientBalance = isInsufficientBalance(qty, fromAvailable);

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
    const amount = Number(quantity);
    if (!accountId || !(amount > 0) || fromSymbol === toSymbol) {
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

    if (isInsufficientBalance(amount, fromAvailable)) {
      setQuote(null);
      setError(
        `Insufficient balance. Available ${formatAssetQty(fromSymbol, fromAvailable)} ${fromSymbol}.`,
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
            fromQuantity: amount,
            product:
              isBybit &&
              (selectedAccount?.product === 'FUND' ||
                selectedAccount?.product === 'UNIFIED')
                ? selectedAccount.product
                : undefined,
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
    isBybit,
    selectedAccount?.product,
    exchangeBlocked,
    fromAvailable,
  ]);

  function swapAssets() {
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    if (quote) {
      setQuantity(String(quote.youReceiveQuantity));
    }
  }

  async function onConfirm() {
    if (!quote || insufficientBalance) return;
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
            View history
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
                {a.nickname} ·{' '}
                {formatAssetQty(fromSymbol, balanceQuantity(balances, a.id, fromSymbol))}{' '}
                {fromSymbol}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="conversion-widget">
        <div className="conversion-leg">
          <div className="conversion-leg__top">
            <span className="conversion-leg__hint">You pay</span>
            <ChoiceTrigger
              variant="pill"
              aria-label="From asset"
              valueLabel={fromSymbol}
              iconSymbol={fromSymbol}
              onClick={() => setPicker('from')}
            />
          </div>
          <input
            className="conversion-leg__amount tabular"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            aria-label="Amount to exchange"
          />
          {accountId ? (
            <div className="conversion-leg__balance">
              <span className="tabular">
                Available {formatAssetQty(fromSymbol, fromAvailable)} {fromSymbol}
              </span>
              <button
                type="button"
                className="conversion-leg__balance-max"
                disabled={fromAvailable <= 0}
                onClick={() => setQuantity(String(fromAvailable))}
              >
                Max
              </button>
            </div>
          ) : null}
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
            <ChoiceTrigger
              variant="pill"
              aria-label="To asset"
              valueLabel={toSymbol}
              iconSymbol={toSymbol}
              onClick={() => setPicker('to')}
            />
          </div>
          <div
            className={`conversion-leg__receive tabular ${quote ? '' : 'is-muted'}`}
            aria-live="polite"
          >
            {receiveLabel}
          </div>
          {accountId ? (
            <div className="conversion-leg__balance">
              <span className="tabular">
                Balance {formatAssetQty(toSymbol, toAvailable)} {toSymbol}
              </span>
            </div>
          ) : null}
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
            {quoting
              ? 'Updating quote…'
              : insufficientBalance
                ? 'Amount exceeds available balance'
                : error ?? 'Enter an amount to see your quote'}
          </div>
        )}
      </div>

      {insufficientBalance ? (
        <div className="notice notice--danger">
          Insufficient balance. Available {formatAssetQty(fromSymbol, fromAvailable)}{' '}
          {fromSymbol}.
        </div>
      ) : null}

      {error && quote === null && !quoting && !insufficientBalance ? (
        <div className="notice notice--danger">{error}</div>
      ) : null}

      <button
        type="button"
        className="btn btn--primary btn--block exchange-confirm"
        onClick={() => void onConfirm()}
        disabled={
          busy || !quote || quoting || exchangeBlocked || insufficientBalance
        }
      >
        Confirm exchange
      </button>

      {picker === 'from' ? (
        <ChoiceScreen
          title="You pay"
          searchPlaceholder="Search assets"
          options={assetOptions}
          value={fromSymbol}
          onSelect={setFromSymbol}
          onClose={() => setPicker(null)}
        />
      ) : null}

      {picker === 'to' ? (
        <ChoiceScreen
          title="You receive"
          searchPlaceholder="Search assets"
          options={assetOptions}
          value={toSymbol}
          onSelect={setToSymbol}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </section>
  );
}
