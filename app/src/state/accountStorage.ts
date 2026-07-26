import type { BybitServerId, ProviderType } from '../domain/types';

export const STORAGE_SAVED_ACCOUNTS = 'portwallet.savedAccounts';

export type SavedAccountCredentials = {
  id: string;
  providerType: ProviderType;
  nickname: string;
  apiKey?: string;
  apiSecret?: string;
  bybitServer?: BybitServerId;
};

function isProviderType(value: unknown): value is ProviderType {
  return (
    value === 'bybit' ||
    value === 'binance' ||
    value === 'non_custodial' ||
    value === 'mock'
  );
}

function isBybitServerId(value: unknown): value is BybitServerId {
  return (
    value === 'mainnet' ||
    value === 'testnet' ||
    value === 'mainnet_nl' ||
    value === 'mainnet_eu' ||
    value === 'mainnet_tr' ||
    value === 'mainnet_ae' ||
    value === 'mainnet_kz' ||
    value === 'mainnet_id'
  );
}

function parseSavedAccount(value: unknown): SavedAccountCredentials | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || !row.id) return null;
  if (!isProviderType(row.providerType)) return null;
  if (typeof row.nickname !== 'string' || !row.nickname.trim()) return null;

  const saved: SavedAccountCredentials = {
    id: row.id,
    providerType: row.providerType,
    nickname: row.nickname.trim(),
  };

  if (typeof row.apiKey === 'string' && row.apiKey) saved.apiKey = row.apiKey;
  if (typeof row.apiSecret === 'string' && row.apiSecret) {
    saved.apiSecret = row.apiSecret;
  }
  if (isBybitServerId(row.bybitServer)) saved.bybitServer = row.bybitServer;

  if (saved.providerType === 'bybit' && (!saved.apiKey || !saved.apiSecret)) {
    return null;
  }

  return saved;
}

export function readSavedAccounts(): SavedAccountCredentials[] {
  try {
    const raw = localStorage.getItem(STORAGE_SAVED_ACCOUNTS);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseSavedAccount)
      .filter((row): row is SavedAccountCredentials => row != null);
  } catch {
    return [];
  }
}

export function writeSavedAccounts(accounts: SavedAccountCredentials[]): void {
  try {
    localStorage.setItem(STORAGE_SAVED_ACCOUNTS, JSON.stringify(accounts));
  } catch {
    /* ignore */
  }
}

export function addSavedAccount(account: SavedAccountCredentials): void {
  const next = readSavedAccounts().filter((row) => row.id !== account.id);
  next.push(account);
  writeSavedAccounts(next);
}

export function removeSavedAccount(id: string): void {
  writeSavedAccounts(readSavedAccounts().filter((row) => row.id !== id));
}

export function createSavedAccountId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `saved_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
