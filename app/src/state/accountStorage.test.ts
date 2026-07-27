import { afterEach, describe, expect, it } from 'vitest';
import {
  STORAGE_SAVED_ACCOUNTS,
  addSavedAccount,
  createSavedAccountId,
  readSavedAccounts,
  removeSavedAccount,
  updateSavedAccount,
  writeSavedAccounts,
  type SavedAccountCredentials,
} from './accountStorage';
import { getBybitApiManagementUrl } from '../providers/bybit/servers';

afterEach(() => {
  localStorage.removeItem(STORAGE_SAVED_ACCOUNTS);
});

function sample(partial?: Partial<SavedAccountCredentials>): SavedAccountCredentials {
  return {
    id: 'saved-1',
    providerType: 'bybit',
    nickname: 'Personal Bybit',
    apiKey: 'key-123',
    apiSecret: 'secret-456',
    bybitServer: 'mainnet',
    ...partial,
  };
}

describe('accountStorage', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(readSavedAccounts()).toEqual([]);
  });

  it('round-trips saved account credentials', () => {
    const account = sample();
    addSavedAccount(account);
    expect(readSavedAccounts()).toEqual([account]);
  });

  it('round-trips optional Bybit Card credentials', () => {
    const account = sample({
      cardApiKey: 'card-key',
      cardApiSecret: 'card-secret',
    });
    addSavedAccount(account);
    expect(readSavedAccounts()).toEqual([account]);
  });

  it('drops incomplete card credential pairs', () => {
    writeSavedAccounts([
      sample({ id: 'half', cardApiKey: 'only-key' }),
      sample({ id: 'ok', cardApiKey: 'k', cardApiSecret: 's' }),
    ]);
    expect(readSavedAccounts()).toEqual([
      sample({ id: 'half' }),
      sample({ id: 'ok', cardApiKey: 'k', cardApiSecret: 's' }),
    ]);
  });

  it('updates card credentials on an existing saved account', () => {
    addSavedAccount(sample());
    const updated = updateSavedAccount('saved-1', {
      cardApiKey: 'card-key',
      cardApiSecret: 'card-secret',
    });
    expect(updated?.cardApiKey).toBe('card-key');
    expect(readSavedAccounts()[0].cardApiSecret).toBe('card-secret');
  });

  it('replaces an existing entry with the same id', () => {
    addSavedAccount(sample({ nickname: 'Old' }));
    addSavedAccount(sample({ nickname: 'New' }));
    expect(readSavedAccounts()).toEqual([sample({ nickname: 'New' })]);
  });

  it('removes a saved account by id', () => {
    addSavedAccount(sample({ id: 'a' }));
    addSavedAccount(sample({ id: 'b', nickname: 'Other', apiKey: 'k2' }));
    removeSavedAccount('a');
    expect(readSavedAccounts().map((row) => row.id)).toEqual(['b']);
  });

  it('ignores invalid JSON and incomplete bybit rows', () => {
    localStorage.setItem(STORAGE_SAVED_ACCOUNTS, '{not-json');
    expect(readSavedAccounts()).toEqual([]);

    writeSavedAccounts([
      sample({ apiSecret: undefined }),
      sample({ id: 'ok' }),
      {
        id: 'mock-1',
        providerType: 'binance',
        nickname: 'Binance main',
      },
    ]);

    expect(readSavedAccounts()).toEqual([
      sample({ id: 'ok' }),
      {
        id: 'mock-1',
        providerType: 'binance',
        nickname: 'Binance main',
      },
    ]);
  });

  it('creates unique saved account ids', () => {
    const a = createSavedAccountId();
    const b = createSavedAccountId();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe('getBybitApiManagementUrl', () => {
  it('points mainnet and testnet at the API Management pages', () => {
    expect(getBybitApiManagementUrl('mainnet')).toBe(
      'https://www.bybit.com/app/user/api-management',
    );
    expect(getBybitApiManagementUrl('testnet')).toBe(
      'https://testnet.bybit.com/app/user/api-management',
    );
  });

  it('uses regional website hosts', () => {
    expect(getBybitApiManagementUrl('mainnet_eu')).toBe(
      'https://www.bybit.eu/app/user/api-management',
    );
  });
});
