import type { OperationStatus, Transaction, WalletProduct } from '../../domain/types';
import { exchangeLegs } from '../../domain/exchangeLegs';

const QUOTE_SUFFIXES = ['USDT', 'USDC', 'USD', 'EUR', 'BTC', 'ETH'] as const;
const STABLE_QUOTES = new Set(['USDT', 'USDC', 'USD', 'EUR']);

export type SpotExecutionRow = {
  execId?: string;
  symbol?: string;
  side?: string;
  execQty?: string;
  execPrice?: string;
  execValue?: string;
  execTime?: string | number;
  orderId?: string;
};

export function splitSpotPair(pair: string): { base: string; quote: string } | null {
  const upper = pair.toUpperCase();
  for (const quote of QUOTE_SUFFIXES) {
    if (upper.endsWith(quote) && upper.length > quote.length) {
      const base = upper.slice(0, -quote.length);
      if (base) return { base, quote };
    }
  }
  return null;
}

function num(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toIso(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString();
  }
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  if (/^\d+$/.test(value)) {
    const n = Number(value);
    const ms = n < 1e12 ? n * 1000 : n;
    return new Date(ms).toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(+d) ? new Date().toISOString() : d.toISOString();
}

/**
 * Map a Bybit spot fill into debit + credit exchange legs.
 * Buy BTCUSDT → spent quote (USDT), received base (BTC).
 * Sell BTCUSDT → spent base (BTC), received quote (USDT).
 */
export function spotExecutionToTransactions(
  row: SpotExecutionRow,
  accountId: string,
  providerLabel: string,
  product?: WalletProduct,
): Transaction[] {
  const pair = (row.symbol ?? '').toUpperCase();
  const parts = splitSpotPair(pair);
  if (!parts) return [];

  const side = (row.side ?? '').toLowerCase();
  const isBuy = side === 'buy';
  const isSell = side === 'sell';
  if (!isBuy && !isSell) return [];

  const baseQty = num(row.execQty);
  const execValue = num(row.execValue);
  const execPrice = num(row.execPrice);
  const quoteQty = execValue > 0 ? execValue : execPrice > 0 && baseQty > 0 ? execPrice * baseQty : 0;
  if (!(baseQty > 0) || !(quoteQty > 0)) return [];

  const execId = row.execId || row.orderId;
  if (!execId) return [];

  const status: OperationStatus = 'completed';
  const fiatValueUsd = STABLE_QUOTES.has(parts.quote) ? quoteQty : 0;

  const fromSymbol = isBuy ? parts.quote : parts.base;
  const fromQuantity = isBuy ? quoteQty : baseQty;
  const toSymbol = isBuy ? parts.base : parts.quote;
  const toQuantity = isBuy ? baseQty : quoteQty;

  return exchangeLegs({
    idBase: `exec_${execId}`,
    accountId,
    providerLabel,
    product,
    status,
    fromSymbol,
    fromQuantity,
    toSymbol,
    toQuantity,
    fiatValueUsd,
    createdAt: toIso(row.execTime),
  });
}
