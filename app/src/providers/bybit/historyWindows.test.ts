import { describe, expect, it } from 'vitest';
import {
  dedupeByKey,
  fetchAcrossTimeWindows,
  fetchAllCursorPages,
  iterateTimeWindows,
  SPOT_EXEC_WINDOW_MS,
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
