import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BybitApiError,
  BybitRestClient,
  BYBIT_RATE_LIMIT_CODE,
  isBybitRateLimitError,
  rateLimitDelayMs,
} from './client';

describe('rateLimitDelayMs', () => {
  it('prefers the Bybit reset timestamp when it is in the future', () => {
    const now = 1_000_000;
    const error = new BybitApiError(
      BYBIT_RATE_LIMIT_CODE,
      'Too many visits.',
      now + 1500,
    );
    expect(rateLimitDelayMs(error, 0, now)).toBe(1550);
  });

  it('falls back to exponential backoff when no reset header is present', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const error = new BybitApiError(BYBIT_RATE_LIMIT_CODE, 'Too many visits.');
    expect(rateLimitDelayMs(error, 0, 0)).toBe(1000);
    expect(rateLimitDelayMs(error, 2, 0)).toBe(4000);
    vi.restoreAllMocks();
  });
});

describe('BybitApiError', () => {
  it('flags rate-limit errors', () => {
    const err = new BybitApiError(BYBIT_RATE_LIMIT_CODE, 'Too many visits.');
    expect(err.isRateLimit).toBe(true);
    expect(isBybitRateLimitError(err)).toBe(true);
    expect(isBybitRateLimitError(new BybitApiError(10001, 'bad params'))).toBe(
      false,
    );
  });
});

describe('BybitRestClient rate-limit retries', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('retries retCode 10006 then returns the successful result', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            retCode: BYBIT_RATE_LIMIT_CODE,
            retMsg: 'Too many visits. Exceeded the API Rate Limit.',
            result: {},
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Bapi-Limit-Reset-Timestamp': String(Date.now() + 500),
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            retCode: 0,
            retMsg: 'OK',
            result: { data: [{ pan4: '1234' }] },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const sleepFn = vi.fn(async () => undefined);
    const client = new BybitRestClient(
      'key',
      'secret',
      'mainnet',
      '5000',
      3,
      sleepFn,
    );
    const result = await client.post<{ data: Array<{ pan4: string }> }>(
      '/v5/card/transaction/query-asset-records',
      { type: 'SIDE_QUERY_AUTH' },
    );

    expect(result.data[0].pan4).toBe('1234');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalled();
  });

  it('throws after exhausting retries on persistent rate limits', async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      new Response(
        JSON.stringify({
          retCode: BYBIT_RATE_LIMIT_CODE,
          retMsg: 'Too many visits. Exceeded the API Rate Limit.',
          result: {},
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const sleepFn = vi.fn(async () => undefined);
    const client = new BybitRestClient(
      'key',
      'secret',
      'mainnet',
      '5000',
      2,
      sleepFn,
    );

    await expect(client.get('/v5/user/query-api')).rejects.toSatisfy(
      (err: unknown) => isBybitRateLimitError(err),
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleepFn).toHaveBeenCalled();
  });
});
