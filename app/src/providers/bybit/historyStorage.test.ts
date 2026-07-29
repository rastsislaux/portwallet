import { beforeEach, describe, expect, it } from 'vitest';
import { APP_VERSION } from '../../appVersion';
import {
  bybitHistoryCacheKey,
  clearBybitHistoryStore,
  emptyAccountHistory,
  incrementalStartMs,
  HISTORY_FETCH_OVERLAP_MS,
  readBybitAccountHistory,
  STORAGE_BYBIT_HISTORY,
  writeBybitAccountHistory,
} from './historyStorage';

describe('bybitHistoryCacheKey', () => {
  it('joins server and user id', () => {
    expect(bybitHistoryCacheKey('mainnet', 42)).toBe('mainnet:42');
  });
});

describe('bybit history localStorage', () => {
  beforeEach(() => {
    clearBybitHistoryStore();
  });

  it('round-trips account history', () => {
    const key = bybitHistoryCacheKey('mainnet', 'u1');
    const history = emptyAccountHistory(1_700_000_000_000);
    history.spot.rows = [{ execId: 'e1', symbol: 'BTCUSDT', side: 'Buy' }];
    history.spot.backfillComplete = true;
    history.spot.coveredFromMs = 1_600_000_000_000;
    writeBybitAccountHistory(key, history);

    const loaded = readBybitAccountHistory(key);
    expect(loaded?.spot.rows).toHaveLength(1);
    expect(loaded?.spot.backfillComplete).toBe(true);
    expect(loaded?.spot.coveredFromMs).toBe(1_600_000_000_000);
  });

  it('returns null when app version mismatches', () => {
    const key = bybitHistoryCacheKey('mainnet', 'u1');
    writeBybitAccountHistory(key, emptyAccountHistory());
    const raw = JSON.parse(localStorage.getItem(STORAGE_BYBIT_HISTORY)!);
    raw.appVersion = 'old-version';
    localStorage.setItem(STORAGE_BYBIT_HISTORY, JSON.stringify(raw));

    expect(readBybitAccountHistory(key)).toBeNull();
    expect(APP_VERSION).toBeTruthy();
  });

  it('incrementalStartMs applies overlap', () => {
    const checked = 10_000_000_000;
    expect(incrementalStartMs(checked, checked + 10_000)).toBe(
      checked - HISTORY_FETCH_OVERLAP_MS,
    );
  });
});
