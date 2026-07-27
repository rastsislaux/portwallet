import { afterEach, describe, expect, it } from 'vitest';
import type {
  AssetBalance,
  CardOperation,
  ProviderCard,
  Transaction,
} from '../domain/types';
import {
  STORAGE_PORTFOLIO_CACHE,
  clearPortfolioCache,
  findPortfolioSnapshot,
  mergePortfolioCache,
  readPortfolioCache,
  remapSnapshotToAccount,
  removePortfolioCacheBySavedId,
  writePortfolioCache,
  type PortfolioAccountSnapshot,
  type PortfolioCache,
} from './portfolioStorage';

afterEach(() => {
  clearPortfolioCache();
});

function balance(partial?: Partial<AssetBalance>): AssetBalance {
  return {
    assetId: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    quantity: 1.5,
    fiatValueUsd: 100_000,
    accountId: 'acct_old',
    product: 'FUND',
    ...partial,
  };
}

function tx(partial?: Partial<Transaction>): Transaction {
  return {
    id: 'tx1',
    accountId: 'acct_old',
    kind: 'deposit',
    status: 'completed',
    assetSymbol: 'BTC',
    quantity: 0.1,
    fiatValueUsd: 6000,
    createdAt: '2026-01-01T00:00:00.000Z',
    providerLabel: 'Bybit',
    ...partial,
  };
}

function card(partial?: Partial<ProviderCard>): ProviderCard {
  return {
    id: 'acct_old_card_1234',
    accountId: 'acct_old',
    providerType: 'bybit',
    label: 'Bybit Card',
    lastFour: '1234',
    network: 'visa',
    status: 'active',
    holderName: 'Ada',
    currency: 'USD',
    balanceUsd: 250,
    balanceSource: 'calculated',
    fundingAssetSymbols: ['USDT'],
    expiresLabel: '12/28',
    ...partial,
  };
}

function op(partial?: Partial<CardOperation>): CardOperation {
  return {
    id: 'op1',
    cardId: 'acct_old_card_1234',
    accountId: 'acct_old',
    kind: 'purchase',
    status: 'completed',
    merchant: 'Cafe',
    amountFiat: 12,
    currency: 'USD',
    createdAt: '2026-01-02T00:00:00.000Z',
    providerLabel: 'Bybit',
    ...partial,
  };
}

function snapshot(
  partial?: Partial<PortfolioAccountSnapshot>,
): PortfolioAccountSnapshot {
  return {
    savedId: 'saved-1',
    accountId: 'acct_old',
    product: 'FUND',
    providerType: 'bybit',
    nickname: 'Personal · Funding',
    capability: { supported: true },
    balances: [balance()],
    transactions: [tx()],
    cards: [card()],
    cardOperations: [op()],
    funding: [
      {
        symbol: 'USDT',
        name: 'Tether',
        quantity: 250,
        fiatValueUsd: 250,
        cardEligible: true,
      },
    ],
    ...partial,
  };
}

describe('portfolioStorage', () => {
  it('returns null when nothing is stored', () => {
    expect(readPortfolioCache()).toBeNull();
  });

  it('round-trips a portfolio cache', () => {
    const cache: PortfolioCache = {
      version: 1,
      updatedAt: '2026-07-27T10:00:00.000Z',
      accounts: [snapshot()],
    };
    writePortfolioCache(cache);
    expect(readPortfolioCache()).toEqual(cache);
  });

  it('ignores invalid JSON and unsupported versions', () => {
    localStorage.setItem(STORAGE_PORTFOLIO_CACHE, '{nope');
    expect(readPortfolioCache()).toBeNull();

    localStorage.setItem(
      STORAGE_PORTFOLIO_CACHE,
      JSON.stringify({ version: 99, updatedAt: 'x', accounts: [] }),
    );
    expect(readPortfolioCache()).toBeNull();
  });

  it('merges account snapshots without dropping siblings', () => {
    const initial = mergePortfolioCache(null, [
      snapshot({ product: 'FUND' }),
      snapshot({
        product: 'UNIFIED',
        accountId: 'acct_uta',
        nickname: 'Personal · UTA',
        balances: [balance({ accountId: 'acct_uta', product: 'UNIFIED' })],
        transactions: [],
        cards: [],
        cardOperations: [],
        funding: [],
        capability: { supported: false, unsupportedReason: 'UTA has no cards' },
      }),
    ]);

    const merged = mergePortfolioCache(initial, [
      snapshot({
        product: 'FUND',
        balances: [balance({ quantity: 2 })],
      }),
    ]);

    expect(merged.accounts).toHaveLength(2);
    expect(
      findPortfolioSnapshot(merged, 'saved-1', 'FUND')?.balances[0].quantity,
    ).toBe(2);
    expect(findPortfolioSnapshot(merged, 'saved-1', 'UNIFIED')).toBeTruthy();
  });

  it('removes all snapshots for a saved account id', () => {
    writePortfolioCache(
      mergePortfolioCache(null, [
        snapshot({ product: 'FUND' }),
        snapshot({ product: 'UNIFIED', accountId: 'acct_uta' }),
        snapshot({ savedId: 'saved-2', accountId: 'acct_other', product: 'FUND' }),
      ]),
    );
    removePortfolioCacheBySavedId('saved-1');
    const next = readPortfolioCache();
    expect(next?.accounts.map((row) => row.savedId)).toEqual(['saved-2']);
  });

  it('remaps cached ids onto a newly connected account', () => {
    const remapped = remapSnapshotToAccount(snapshot(), 'acct_new');
    expect(remapped.accountId).toBe('acct_new');
    expect(remapped.balances[0].accountId).toBe('acct_new');
    expect(remapped.transactions[0].accountId).toBe('acct_new');
    expect(remapped.cards[0].accountId).toBe('acct_new');
    expect(remapped.cards[0].id).toBe('acct_new_card_1234');
    expect(remapped.cardOperations[0].accountId).toBe('acct_new');
    expect(remapped.cardOperations[0].cardId).toBe('acct_new_card_1234');
  });
});
