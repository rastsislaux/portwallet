import { getBybitServer } from './servers';
import type { BybitServerId } from '../../domain/types';

export class BybitApiError extends Error {
  readonly retCode: number;
  readonly retMsg: string;

  constructor(retCode: number, retMsg: string) {
    super(retMsg || `Bybit API error ${retCode}`);
    this.name = 'BybitApiError';
    this.retCode = retCode;
    this.retMsg = retMsg;
  }
}

type BybitEnvelope<T> = {
  retCode: number;
  retMsg: string;
  result: T;
  time?: number;
};

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

export class BybitRestClient {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly serverId: BybitServerId;
  private readonly recvWindow: string;

  constructor(
    apiKey: string,
    apiSecret: string,
    serverId: BybitServerId,
    recvWindow = '5000',
  ) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.serverId = serverId;
    this.recvWindow = recvWindow;
  }

  get baseUrl(): string {
    return getBybitServer(this.serverId).baseUrl;
  }

  async get<T>(
    path: string,
    params: Record<string, string | number | undefined> = {},
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

  async post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
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
      throw new BybitApiError(json.retCode, json.retMsg || 'Request failed');
    }

    return json.result;
  }
}
