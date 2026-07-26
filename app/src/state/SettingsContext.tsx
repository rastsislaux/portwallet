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

const STORAGE_KEY = 'portwallet.mainCurrency';

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
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readStoredCurrency(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && getCurrency(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_MAIN_CURRENCY;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [mainCurrency, setMainCurrencyState] = useState(readStoredCurrency);
  const [rateQuote, setRateQuote] = useState<FxQuote | null>(null);
  const [rateStatus, setRateStatus] = useState<RateStatus>('idle');
  const [rateError, setRateError] = useState<string | null>(null);

  const setMainCurrency = useCallback((code: string) => {
    const next = code.toUpperCase();
    if (!getCurrency(next)) return;
    setMainCurrencyState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshRate = useCallback(async () => {
    setRateStatus('loading');
    setRateError(null);
    try {
      const quote = await fetchUsdToQuote(mainCurrency);
      setRateQuote(quote);
      setRateStatus('ready');
    } catch (err) {
      setRateQuote(null);
      setRateStatus('error');
      setRateError(err instanceof Error ? err.message : 'Failed to load exchange rate');
    }
  }, [mainCurrency]);

  useEffect(() => {
    void refreshRate();
  }, [refreshRate]);

  const activeQuote =
    mainCurrency === 'USD'
      ? rateQuote?.quote === 'USD'
        ? rateQuote
        : ({
            base: 'USD',
            quote: 'USD',
            rate: 1,
            date: new Date().toISOString().slice(0, 10),
            source: 'identity',
            sourceLabel: '—',
          } satisfies FxQuote)
      : rateQuote?.quote === mainCurrency
        ? rateQuote
        : null;

  const usdToMainRate = activeQuote?.rate ?? 1;
  const displayCurrency = activeQuote?.quote ?? 'USD';

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
