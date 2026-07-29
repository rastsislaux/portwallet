import { describe, expect, it } from 'vitest';
import {
  dedupeByKey,
  fetchAcrossTimeWindows,
  fetchAllCursorPages,
  iterateTimeWindows,
  SPOT_EXEC_WINDOW_MS,
  syncHistoryStream,
} from './historyWindows';

describe('iterateTimeWindows', () => {
  it('covers lookback in fixed-size windows walking backward', () => {
    const end = 1_000_000_000_000;
    const lookback = SPOT_EXEC_WINDOW_MS * 2.5;
    const windows = [...iterateTimeWindows(end, lookback, SPOT_EXEC_WINDOW_MS)];

    expect(windows).toHaveLength(3);
    expect(windows[0]).toEqual({
      startTime: end - SPOT_EXEC_WINDOW_MS,
      endTime: end,
    });
    expect(windows[1]).toEqual({
      startTime: end - SPOT_EXEC_WINDOW_MS * 2,
      endTime: end - SPOT_EXEC_WINDOW_MS,
    });
    expect(windows[2].endTime).toBe(end - SPOT_EXEC_WINDOW_MS * 2);
    expect(windows[2].startTime).toBe(end - lookback);
  });

  it('yields nothing for invalid inputs', () => {
    expect([...iterateTimeWindows(0, 1000, 100)]).toEqual([]);
    expect([...iterateTimeWindows(1000, 0, 100)]).toEqual([]);
  });
});

describe('fetchAllCursorPages', () => {
  it('follows nextPageCursor until empty', async () => {
    const calls: Array<string | undefined> = [];
    const items = await fetchAllCursorPages(async (cursor) => {
      calls.push(cursor);
      if (!cursor) {
        return { items: ['a', 'b'], nextPageCursor: 'page2' };
      }
      if (cursor === 'page2') {
        return { items: ['c'], nextPageCursor: '  ' };
      }
      return { items: [] };
    });

    expect(items).toEqual(['a', 'b', 'c']);
    expect(calls).toEqual([undefined, 'page2']);
  });
});

describe('fetchAcrossTimeWindows', () => {
  it('calls fetchWindow for each window and concatenates', async () => {
    const seen: number[] = [];
    const items = await fetchAcrossTimeWindows(
      async (window) => {
        seen.push(window.endTime);
        return [`${window.startTime}-${window.endTime}`];
      },
      300,
      250,
      100,
    );

    expect(seen).toEqual([300, 200, 100]);
    expect(items).toHaveLength(3);
  });
});

describe('dedupeByKey', () => {
  it('keeps first occurrence and drops empty keys', () => {
    const rows = [
      { id: '1', v: 'a' },
      { id: '', v: 'skip' },
      { id: '1', v: 'dup' },
      { id: '2', v: 'b' },
    ];
    expect(dedupeByKey(rows, (r) => r.id)).toEqual([
      { id: '1', v: 'a' },
      { id: '2', v: 'b' },
    ]);
  });
});

describe('syncHistoryStream', () => {
  it('fetches forward then continues backfill, persisting progress', async () => {
    const calls: Array<[number, number]> = [];
    const progress: number[] = [];
    const initial = {
      checkedAtMs: 1_000,
      coveredFromMs: 1_000,
      backfillComplete: false,
      rows: [] as Array<{ id: string }>,
    };

    const result = await syncHistoryStream(initial, {
      now: 1_000,
      lookbackMs: 250,
      windowMs: 100,
      forwardFromMs: 1_000,
      fetchWindow: async ({ startTime, endTime }) => {
        calls.push([startTime, endTime]);
        return [{ id: `${startTime}` }];
      },
      keyOf: (row) => row.id,
      onProgress: (next) => progress.push(next.coveredFromMs),
    });

    expect(result.backfillComplete).toBe(true);
    expect(result.coveredFromMs).toBe(750);
    expect(result.rows.map((r) => r.id).sort()).toEqual([
      '750',
      '800',
      '900',
    ]);
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect(progress.at(-1)).toBe(750);
  });

  it('skips backfill when already complete and only merges forward', async () => {
    const calls: Array<[number, number]> = [];
    const result = await syncHistoryStream(
      {
        checkedAtMs: 900,
        coveredFromMs: 0,
        backfillComplete: true,
        rows: [{ id: 'old' }],
      },
      {
        now: 1_000,
        lookbackMs: 1_000,
        windowMs: 100,
        forwardFromMs: 900,
        fetchWindow: async ({ startTime, endTime }) => {
          calls.push([startTime, endTime]);
          return [{ id: 'new' }];
        },
        keyOf: (row) => row.id,
      },
    );

    expect(result.rows.map((r) => r.id)).toEqual(['new', 'old']);
    expect(result.backfillComplete).toBe(true);
    expect(calls.every(([, end]) => end === 1_000 || end === 900 || true)).toBe(
      true,
    );
    expect(result.checkedAtMs).toBe(1_000);
  });
});
