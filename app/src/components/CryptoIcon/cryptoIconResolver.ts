import { resolveAliasSymbol } from './cryptoIconAliases';
import type {
  CryptoIconCandidate,
  CryptoIconIdentity,
  ResolvedCryptoIcon,
} from './cryptoIconTypes';

const CDN_SVG = (symbol: string) =>
  `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${symbol}.svg`;

const CDN_PNG = (symbol: string) =>
  `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${symbol}.png`;

const localSvgModules = import.meta.glob(
  '../../../node_modules/cryptocurrency-icons/svg/color/*.svg',
  {
    eager: true,
    import: 'default',
    query: '?url',
  },
) as Record<string, string>;

const localIconBySymbol = new Map<string, string>();

for (const [path, url] of Object.entries(localSvgModules)) {
  const file = path.split('/').pop() ?? '';
  const symbol = file.replace(/\.svg$/i, '').toLowerCase();
  if (symbol) {
    localIconBySymbol.set(symbol, url);
  }
}

const successCache = new Map<string, ResolvedCryptoIcon>();
const failedUrls = new Set<string>();

export function normalizeCryptoSymbol(symbol: string): string {
  return symbol.trim().toLowerCase();
}

/**
 * Pair parsing is separate from symbol normalization.
 * Only call when the value is known to be a trading pair.
 */
export function parseTradingPairBase(
  pair: string,
  quoteSymbols: readonly string[] = ['USDT', 'USDC', 'USD', 'BTC', 'ETH'],
): string {
  const trimmed = pair.trim();
  const separators = ['/', '-', '_'];
  for (const sep of separators) {
    if (trimmed.includes(sep)) {
      return trimmed.split(sep)[0]?.trim() || trimmed;
    }
  }

  const upper = trimmed.toUpperCase();
  for (const quote of quoteSymbols) {
    if (upper.endsWith(quote) && upper.length > quote.length) {
      return upper.slice(0, -quote.length);
    }
  }
  return trimmed;
}

export function buildCryptoIconIdentityKey(identity: CryptoIconIdentity): string {
  const symbol = normalizeCryptoSymbol(identity.symbol);
  const contract = identity.contractAddress?.trim().toLowerCase();
  const network = identity.network?.trim().toLowerCase();
  const chainId =
    identity.chainId === undefined || identity.chainId === null
      ? undefined
      : String(identity.chainId).trim().toLowerCase();
  const providerAssetId = identity.providerAssetId?.trim();

  if (chainId && contract) {
    return `chain:${chainId}:contract:${contract}`;
  }
  if (network && contract) {
    return `network:${network}:contract:${contract}`;
  }
  if (providerAssetId) {
    return `provider:${providerAssetId}`;
  }
  return `symbol:${symbol || '?'}`;
}

export function isTrustedIconUrl(url: string): boolean {
  const value = url.trim();
  if (!value) return false;

  if (value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) {
    return true;
  }

  // Vite-dev / bundled asset URLs (absolute path or same-origin asset).
  if (value.startsWith('blob:')) return false;

  let parsed: URL;
  try {
    parsed = new URL(value, 'https://portwallet.local');
  } catch {
    return false;
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol === 'javascript:' || protocol === 'file:' || protocol === 'data:') {
    return false;
  }

  if (protocol === 'https:') return true;

  // Allow relative/module asset URLs resolved against the app origin in tests/dev.
  if (
    protocol === 'http:' &&
    (parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === 'portwallet.local')
  ) {
    return true;
  }

  // Bundled assets often appear as root-relative paths after Vite processing.
  if (!value.includes('://') && !value.includes(':')) {
    return true;
  }

  return false;
}

export function getLocalIconUrl(normalizedSymbol: string): string | undefined {
  return localIconBySymbol.get(normalizedSymbol);
}

export function hasLocalIcon(normalizedSymbol: string): boolean {
  return localIconBySymbol.has(normalizedSymbol);
}

export function listLocalIconSymbols(): string[] {
  return [...localIconBySymbol.keys()].sort();
}

export function buildIconCandidates(input: {
  symbol: string;
  iconUrl?: string;
  providerIconUrl?: string;
}): CryptoIconCandidate[] {
  const normalized = normalizeCryptoSymbol(input.symbol);
  const alias = resolveAliasSymbol(normalized);
  const candidates: CryptoIconCandidate[] = [];
  const seen = new Set<string>();

  const push = (kind: CryptoIconCandidate['kind'], url: string | undefined) => {
    if (!url || seen.has(url) || failedUrls.has(url)) return;
    if (kind === 'explicit' || kind === 'provider') {
      if (!isTrustedIconUrl(url)) return;
    }
    seen.add(url);
    candidates.push({ kind, url });
  };

  push('explicit', input.iconUrl?.trim());

  const localDirect = getLocalIconUrl(normalized);
  push('local', localDirect);

  if (alias && alias !== normalized) {
    push('local-alias', getLocalIconUrl(alias));
  }

  const cdnSymbol = localDirect || !alias ? normalized : alias;
  if (cdnSymbol) {
    push('cdn-svg', CDN_SVG(cdnSymbol));
    push('cdn-png', CDN_PNG(cdnSymbol));
  }
  if (alias && alias !== cdnSymbol) {
    push('cdn-svg', CDN_SVG(alias));
    push('cdn-png', CDN_PNG(alias));
  }

  // Provider metadata URL is a late fallback when distinct from explicit iconUrl.
  if (
    input.providerIconUrl &&
    input.providerIconUrl.trim() &&
    input.providerIconUrl.trim() !== input.iconUrl?.trim()
  ) {
    push('provider', input.providerIconUrl.trim());
  }

  return candidates;
}

export function getCachedResolution(identityKey: string): ResolvedCryptoIcon | undefined {
  return successCache.get(identityKey);
}

export function cacheSuccessfulResolution(
  identityKey: string,
  resolution: ResolvedCryptoIcon,
): void {
  successCache.set(identityKey, resolution);
}

export function markIconUrlFailed(url: string): void {
  failedUrls.add(url);
}

export function hasIconUrlFailed(url: string): boolean {
  return failedUrls.has(url);
}

/** Test helper — clears session caches. */
export function resetCryptoIconCaches(): void {
  successCache.clear();
  failedUrls.clear();
}
