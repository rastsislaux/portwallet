import { getBybitServer } from './servers';
import type { BybitServerId } from '../../domain/types';

/** Bybit `retCode` when the UID/endpoint rate limit is exceeded. */
export const BYBIT_RATE_LIMIT_CODE = 10006;

const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_BASE_DELAY_MS = 1000;
const MAX_BACKOFF_MS = 8_000;

export class BybitApiError extends Error {
  readonly retCode: number;
  readonly retMsg: string;
  /** Epoch ms from `X-Bapi-Limit-Reset-Timestamp` when present. */
  readonly limitResetTimestamp?: number;

  constructor(
    retCode: number,
    retMsg: string,
    limitResetTimestamp?: number,
  ) {
    super(retMsg || `Bybit API error ${retCode}`);
    this.name = 'BybitApiError';
    this.retCode = retCode;
    this.retMsg = retMsg;
    this.limitResetTimestamp = limitResetTimestamp;
  }

  get isRateLimit(): boolean {
    return this.retCode === BYBIT_RATE_LIMIT_CODE;
  }
}

type BybitEnvelope<T> = {
  retCode: number;
  retMsg: string;
  result: T;
  time?: number;
};

export function isBybitRateLimitError(err: unknown): err is BybitApiError {
  return err instanceof BybitApiError && err.isRateLimit;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}

/** Delay before retrying a rate-limited call, preferring Bybit's reset header. */
export function rateLimitDelayMs(
  error: BybitApiError,
  attempt: number,
  now = Date.now(),
): number {
  if (error.limitResetTimestamp && error.limitResetTimestamp > now) {
    const untilReset = error.limitResetTimestamp - now + 50;
    return Math.min(Math.max(untilReset, 200), MAX_BACKOFF_MS);
  }
  const expo = DEFAULT_BASE_DELAY_MS * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(expo + jitter, MAX_BACKOFF_MS);
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  return search.toString();
}

function readLimitReset(headers: Headers): number | undefined {
  const raw =
    headers.get('X-Bapi-Limit-Reset-Timestamp') ??
    headers.get('x-bapi-limit-reset-timestamp');
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function readLimitStatus(headers: Headers): number | undefined {
  const raw =
    headers.get('X-Bapi-Limit-Status') ?? headers.get('x-bapi-limit-status');
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export class BybitRestClient {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly serverId: BybitServerId;
  private readonly recvWindow: string;
  private readonly maxRetries: number;
  private readonly sleepFn: (ms: number) => Promise<void>;
  /** Earliest time we should send another request (rate-limit pacing). */
  private rateLimitedUntil = 0;

  constructor(
    apiKey: string,
    apiSecret: string,
    serverId: BybitServerId,
    recvWindow = '5000',
    maxRetries = DEFAULT_MAX_RETRIES,
    sleepFn: (ms: number) => Promise<void> = sleep,
  ) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.serverId = serverId;
    this.recvWindow = recvWindow;
    this.maxRetries = maxRetries;
    this.sleepFn = sleepFn;
  }

  get baseUrl(): string {
    return getBybitServer(this.serverId).baseUrl;
  }

  async get<T>(
    path: string,
    params: Record<string, string | number | undefined> = {},
  ): Promise<T> {
    return this.withRetry(() => this.rawGet<T>(path, params));
  }

  async post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
    return this.withRetry(() => this.rawPost<T>(path, body));
  }

  private async withRetry<T>(execute: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      await this.waitForRateLimitWindow();
      try {
        return await execute();
      } catch (err) {
        lastError = err;
        if (
          !(err instanceof BybitApiError) ||
          !err.isRateLimit ||
          attempt >= this.maxRetries
        ) {
          throw err;
        }
        const delay = rateLimitDelayMs(err, attempt);
        this.rateLimitedUntil = Math.max(
          this.rateLimitedUntil,
          Date.now() + delay,
        );
        await this.sleepFn(delay);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('Bybit request failed after retries');
  }

  private async waitForRateLimitWindow(): Promise<void> {
    const wait = this.rateLimitedUntil - Date.now();
    if (wait > 0) await this.sleepFn(wait);
  }

  private noteRateLimitHeaders(headers: Headers): void {
    const remaining = readLimitStatus(headers);
    const reset = readLimitReset(headers);
    if (
      remaining !== undefined &&
      remaining <= 1 &&
      reset !== undefined &&
      reset > Date.now()
    ) {
      this.rateLimitedUntil = Math.max(this.rateLimitedUntil, reset);
    }
  }

  private async rawGet<T>(
    path: string,
    params: Record<string, string | number | undefined>,
  ): Promise<T> {
    const query = toQuery(params);
    const timestamp = Date.now().toString();
    const preSign = `${timestamp}${this.apiKey}${this.recvWindow}${query}`;
    const sign = await hmacSha256Hex(this.apiSecret, preSign);
    const url = `${this.baseUrl}${path}${query ? `?${query}` : ''}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': this.apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': this.recvWindow,
        'X-BAPI-SIGN': sign,
      },
    });

    return this.parse<T>(res);
  }

  private async rawPost<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const timestamp = Date.now().toString();
    const bodyStr = JSON.stringify(body);
    const preSign = `${timestamp}${this.apiKey}${this.recvWindow}${bodyStr}`;
    const sign = await hmacSha256Hex(this.apiSecret, preSign);
    const url = `${this.baseUrl}${path}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BAPI-API-KEY': this.apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': this.recvWindow,
        'X-BAPI-SIGN': sign,
      },
      body: bodyStr,
    });

    return this.parse<T>(res);
  }

  private async parse<T>(res: Response): Promise<T> {
    this.noteRateLimitHeaders(res.headers);

    let json: BybitEnvelope<T>;
    try {
      json = (await res.json()) as BybitEnvelope<T>;
    } catch {
      throw new Error(`Bybit returned a non-JSON response (${res.status})`);
    }

    if (!res.ok && json?.retCode === undefined) {
      throw new Error(`Bybit HTTP ${res.status}`);
    }

    if (json.retCode !== 0) {
      throw new BybitApiError(
        json.retCode,
        json.retMsg || 'Request failed',
        json.retCode === BYBIT_RATE_LIMIT_CODE
          ? readLimitReset(res.headers)
          : undefined,
      );
    }

    return json.result;
  }
}
