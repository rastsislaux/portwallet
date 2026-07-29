/** Bybit execution list: max span per request is 7 days. */
export const SPOT_EXEC_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/** Bybit documents ~2 years of execution history. */
export const SPOT_EXEC_LOOKBACK_MS = 730 * 24 * 60 * 60 * 1000;

/** Bybit on-chain deposit records: max span per request is 30 days. */
export const DEPOSIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const DEPOSIT_LOOKBACK_MS = 730 * 24 * 60 * 60 * 1000;

export type TimeWindow = {
  startTime: number;
  endTime: number;
};

/**
 * Yields [startTime, endTime] windows walking backward from `endMs`,
 * each at most `windowMs` wide, covering `lookbackMs` of history.
 */
export function* iterateTimeWindows(
  endMs: number,
  lookbackMs: number,
  windowMs: number,
): Generator<TimeWindow> {
  if (!(endMs > 0) || !(lookbackMs > 0) || !(windowMs > 0)) return;

  let end = endMs;
  const earliest = Math.max(0, endMs - lookbackMs);

  while (end > earliest) {
    const start = Math.max(earliest, end - windowMs);
    yield { startTime: start, endTime: end };
    if (start <= earliest) break;
    // Adjacent windows share the boundary ms; callers should dedupe by id.
    end = start;
  }
}

export type CursorPage<T> = {
  items: T[];
  nextPageCursor?: string;
};

/**
 * Fetch every page in a single time window via Bybit-style cursor pagination.
 */
export async function fetchAllCursorPages<T>(
  fetchPage: (cursor: string | undefined) => Promise<CursorPage<T>>,
  maxPages = 50,
): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const result = await fetchPage(cursor);
    out.push(...result.items);
    const next = result.nextPageCursor?.trim();
    if (!next) break;
    cursor = next;
  }
  return out;
}

/**
 * Walk backward over time windows and collect all rows (caller dedupes).
 */
export async function fetchAcrossTimeWindows<T>(
  fetchWindow: (window: TimeWindow) => Promise<T[]>,
  endMs: number,
  lookbackMs: number,
  windowMs: number,
): Promise<T[]> {
  const out: T[] = [];
  for (const window of iterateTimeWindows(endMs, lookbackMs, windowMs)) {
    const rows = await fetchWindow(window);
    out.push(...rows);
  }
  return out;
}

export function dedupeByKey<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export type SyncableHistoryStream<T> = {
  checkedAtMs: number;
  coveredFromMs: number;
  backfillComplete: boolean;
  rows: T[];
};

/**
 * Merge newly fetched rows into a history stream, then optionally continue
 * walking backward until `lookbackMs` is covered. Calls `onProgress` after
 * each window so callers can persist partial progress.
 */
export async function syncHistoryStream<T>(
  state: SyncableHistoryStream<T>,
  options: {
    now: number;
    lookbackMs: number;
    windowMs: number;
    /** Start of the forward incremental window (usually checkedAt − overlap). */
    forwardFromMs: number;
    fetchWindow: (window: TimeWindow) => Promise<T[]>;
    keyOf: (row: T) => string;
    onProgress?: (next: SyncableHistoryStream<T>) => void;
    /** Limit backward windows per call so UI can refresh with partial history. */
    maxBackfillWindows?: number;
  },
): Promise<SyncableHistoryStream<T>> {
  const {
    now,
    lookbackMs,
    windowMs,
    forwardFromMs,
    fetchWindow,
    keyOf,
    onProgress,
    maxBackfillWindows = Number.POSITIVE_INFINITY,
  } = options;

  let next: SyncableHistoryStream<T> = {
    checkedAtMs: state.checkedAtMs,
    coveredFromMs: state.coveredFromMs,
    backfillComplete: state.backfillComplete,
    rows: [...state.rows],
  };

  const merge = (rows: T[]) => {
    next = {
      ...next,
      rows: dedupeByKey([...rows, ...next.rows], keyOf),
    };
  };

  const forwardStart = Math.max(0, Math.min(forwardFromMs, now));
  if (forwardStart < now) {
    const recent = await fetchAcrossTimeWindows(
      fetchWindow,
      now,
      now - forwardStart,
      windowMs,
    );
    merge(recent);
  }
  next = { ...next, checkedAtMs: now };
  onProgress?.(next);

  const targetFrom = Math.max(0, now - lookbackMs);
  let windows = 0;
  while (
    !next.backfillComplete &&
    next.coveredFromMs > targetFrom &&
    windows < maxBackfillWindows
  ) {
    const endTime = next.coveredFromMs;
    const startTime = Math.max(targetFrom, endTime - windowMs);
    const rows = await fetchWindow({ startTime, endTime });
    merge(rows);
    next = {
      ...next,
      coveredFromMs: startTime,
      backfillComplete: startTime <= targetFrom,
    };
    onProgress?.(next);
    windows += 1;
    if (startTime <= targetFrom) break;
  }

  return next;
}
