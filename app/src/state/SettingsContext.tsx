import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_MAIN_CURRENCY,
  MAIN_CURRENCIES,
  getCurrency,
  type FiatCurrency,
} from '../fx/currencies';
import { FX_DATA_SOURCES, fetchUsdToQuote, type FxQuote } from '../fx/rates';
import { formatFiat, formatFiatParts } from '../components/Amount';
import { readStoredFxQuote, writeStoredFxQuote } from './fxStorage';

const STORAGE_MAIN_CURRENCY = 'portwallet.mainCurrency';
const STORAGE_HIDE_BELOW_ENABLED = 'portwallet.hideBelowThreshold.enabled';
const STORAGE_HIDE_BELOW_AMOUNT = 'portwallet.hideBelowThreshold.amount';
const STORAGE_HIDE_BELOW_CURRENCY = 'portwallet.hideBelowThreshold.currency';

const DEFAULT_HIDE_BELOW_AMOUNT = 1;

/** How often FX quotes are refreshed while the app stays open. */
export const FX_POLL_INTERVAL_MS = 300_000;

type RateStatus = 'idle' | 'loading' | 'ready' | 'error';

type SettingsContextValue = {
  mainCurrency: string;
  displayCurrency: string;
  setMainCurrency: (code: string) => void;
  currencies: FiatCurrency[];
  usdToMainRate: number;
  convertFromUsd: (usdAmount: number) => number;
  formatFromUsd: (usdAmount: number) => string;
  formatFromUsdParts: (usdAmount: number) => { integer: string; decimal: string };
  rateStatus: RateStatus;
  rateQuote: FxQuote | null;
  rateError: string | null;
  refreshRate: () => Promise<void>;
  dataSources: typeof FX_DATA_SOURCES;
  hideBelowThresholdEnabled: boolean;
  hideBelowThresholdAmount: number;
  hideBelowThresholdCurrency: string;
  setHideBelowThresholdEnabled: (enabled: boolean) => void;
  setHideBelowThresholdAmount: (amount: number) => void;
  setHideBelowThresholdCurrency: (code: string) => void;
  /** USD value to compare against; null when filtering is inactive. */
  hideBelowThresholdUsd: number | null;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readStoredCurrency(key: string, fallback: string): string {
  try {
    const stored = localStorage.getItem(key);
    if (stored && getCurrency(stored)) return stored;
  } catch {
    /* ignore */
  }
  return fallback;
}

function readStoredBool(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(key);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    /* ignore */
  }
  return fallback;
}

function readStoredAmount(key: string, fallback: number): number {
  try {
    const stored = localStorage.getItem(key);
    if (stored == null) return fallback;
    const n = Number(stored);
    if (Number.isFinite(n) && n >= 0) return n;
  } catch {
    /* ignore */
  }
  return fallback;
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function usdIdentityQuote(): FxQuote {
  return {
    base: 'USD',
    quote: 'USD',
    rate: 1,
    date: new Date().toISOString().slice(0, 10),
    source: 'identity',
    sourceLabel: '—',
  };
}

function resolveActiveQuote(currency: string, quote: FxQuote | null): FxQuote | null {
  if (currency === 'USD') {
    return quote?.quote === 'USD' ? quote : usdIdentityQuote();
  }
  return quote?.quote === currency ? quote : null;
}

function initialStoredQuote(currency: string): FxQuote | null {
  const stored = readStoredFxQuote();
  if (!stored) return null;
  if (currency === 'USD') {
    return stored.quote.quote === 'USD' ? stored.quote : usdIdentityQuote();
  }
  return stored.quote.quote === currency ? stored.quote : null;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [mainCurrency, setMainCurrencyState] = useState(() =>
    readStoredCurrency(STORAGE_MAIN_CURRENCY, DEFAULT_MAIN_CURRENCY),
  );
  const [rateQuote, setRateQuote] = useState<FxQuote | null>(() =>
    initialStoredQuote(
      readStoredCurrency(STORAGE_MAIN_CURRENCY, DEFAULT_MAIN_CURRENCY),
    ),
  );
  const [rateStatus, setRateStatus] = useState<RateStatus>(() =>
    initialStoredQuote(
      readStoredCurrency(STORAGE_MAIN_CURRENCY, DEFAULT_MAIN_CURRENCY),
    )
      ? 'ready'
      : 'idle',
  );
  const [rateError, setRateError] = useState<string | null>(null);

  const [hideBelowThresholdEnabled, setHideBelowEnabledState] = useState(() =>
    readStoredBool(STORAGE_HIDE_BELOW_ENABLED, false),
  );
  const [hideBelowThresholdAmount, setHideBelowAmountState] = useState(() =>
    readStoredAmount(STORAGE_HIDE_BELOW_AMOUNT, DEFAULT_HIDE_BELOW_AMOUNT),
  );
  const [hideBelowThresholdCurrency, setHideBelowCurrencyState] = useState(() =>
    readStoredCurrency(STORAGE_HIDE_BELOW_CURRENCY, readStoredCurrency(STORAGE_MAIN_CURRENCY, DEFAULT_MAIN_CURRENCY)),
  );
  const [thresholdRateQuote, setThresholdRateQuote] = useState<FxQuote | null>(null);

  const setMainCurrency = useCallback((code: string) => {
    const next = code.toUpperCase();
    if (!getCurrency(next)) return;
    setMainCurrencyState(next);
    writeStorage(STORAGE_MAIN_CURRENCY, next);
  }, []);

  const setHideBelowThresholdEnabled = useCallback((enabled: boolean) => {
    setHideBelowEnabledState(enabled);
    writeStorage(STORAGE_HIDE_BELOW_ENABLED, String(enabled));
  }, []);

  const setHideBelowThresholdAmount = useCallback((amount: number) => {
    const next = Number.isFinite(amount) && amount >= 0 ? amount : 0;
    setHideBelowAmountState(next);
    writeStorage(STORAGE_HIDE_BELOW_AMOUNT, String(next));
  }, []);

  const setHideBelowThresholdCurrency = useCallback((code: string) => {
    const next = code.toUpperCase();
    if (!getCurrency(next)) return;
    setHideBelowCurrencyState(next);
    writeStorage(STORAGE_HIDE_BELOW_CURRENCY, next);
  }, []);

  const refreshRate = useCallback(async () => {
    setRateStatus('loading');
    setRateError(null);
    try {
      const quote = await fetchUsdToQuote(mainCurrency);
      setRateQuote(quote);
      writeStoredFxQuote(quote);
      setRateStatus('ready');
    } catch (err) {
      setRateStatus('error');
      setRateError(err instanceof Error ? err.message : 'Failed to load exchange rate');
      setRateQuote((prev) => {
        const matching = resolveActiveQuote(mainCurrency, prev);
        return matching ?? prev;
      });
    }
  }, [mainCurrency]);

  useEffect(() => {
    void refreshRate();
  }, [refreshRate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshRate();
    }, FX_POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [refreshRate]);

  useEffect(() => {
    let cancelled = false;

    if (hideBelowThresholdCurrency === mainCurrency) {
      setThresholdRateQuote(null);
      return;
    }

    if (hideBelowThresholdCurrency === 'USD') {
      setThresholdRateQuote(usdIdentityQuote());
      return;
    }

    void fetchUsdToQuote(hideBelowThresholdCurrency)
      .then((quote) => {
        if (!cancelled) setThresholdRateQuote(quote);
      })
      .catch(() => {
        if (!cancelled) setThresholdRateQuote(null);
      });

    return () => {
      cancelled = true;
    };
  }, [hideBelowThresholdCurrency, mainCurrency]);

  const activeQuote = resolveActiveQuote(mainCurrency, rateQuote);
  const usdToMainRate = activeQuote?.rate ?? 1;
  const displayCurrency = activeQuote?.quote ?? 'USD';

  const thresholdQuote =
    hideBelowThresholdCurrency === mainCurrency
      ? activeQuote
      : resolveActiveQuote(hideBelowThresholdCurrency, thresholdRateQuote);

  const hideBelowThresholdUsd = useMemo(() => {
    if (!hideBelowThresholdEnabled) return null;
    if (!Number.isFinite(hideBelowThresholdAmount) || hideBelowThresholdAmount <= 0) return null;
    const rate = thresholdQuote?.rate;
    if (!rate || rate <= 0) return null;
    return hideBelowThresholdAmount / rate;
  }, [hideBelowThresholdEnabled, hideBelowThresholdAmount, thresholdQuote]);

  const convertFromUsd = useCallback(
    (usdAmount: number) => usdAmount * usdToMainRate,
    [usdToMainRate],
  );

  const formatFromUsd = useCallback(
    (usdAmount: number) => `${formatFiat(convertFromUsd(usdAmount))} ${displayCurrency}`,
    [convertFromUsd, displayCurrency],
  );

  const formatFromUsdParts = useCallback(
    (usdAmount: number) => formatFiatParts(convertFromUsd(usdAmount)),
    [convertFromUsd],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      mainCurrency,
      displayCurrency,
      setMainCurrency,
      currencies: MAIN_CURRENCIES,
      usdToMainRate,
      convertFromUsd,
      formatFromUsd,
      formatFromUsdParts,
      rateStatus,
      rateQuote: activeQuote,
      rateError,
      refreshRate,
      dataSources: FX_DATA_SOURCES,
      hideBelowThresholdEnabled,
      hideBelowThresholdAmount,
      hideBelowThresholdCurrency,
      setHideBelowThresholdEnabled,
      setHideBelowThresholdAmount,
      setHideBelowThresholdCurrency,
      hideBelowThresholdUsd,
    }),
    [
      mainCurrency,
      displayCurrency,
      setMainCurrency,
      usdToMainRate,
      convertFromUsd,
      formatFromUsd,
      formatFromUsdParts,
      rateStatus,
      activeQuote,
      rateError,
      refreshRate,
      hideBelowThresholdEnabled,
      hideBelowThresholdAmount,
      hideBelowThresholdCurrency,
      setHideBelowThresholdEnabled,
      setHideBelowThresholdAmount,
      setHideBelowThresholdCurrency,
      hideBelowThresholdUsd,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
