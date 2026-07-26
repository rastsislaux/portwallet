import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { getPlaceholderStyle } from './cryptoIconPlaceholder';
import {
  buildCryptoIconIdentityKey,
  buildIconCandidates,
  cacheSuccessfulResolution,
  getCachedResolution,
  markIconUrlFailed,
  normalizeCryptoSymbol,
} from './cryptoIconResolver';
import type { CryptoIconCandidate, CryptoIconProps } from './cryptoIconTypes';

function buildAltText(symbol: string, name: string | undefined, alt: string | undefined): string {
  if (alt !== undefined) return alt;
  if (name?.trim()) return `${name.trim()} icon`;
  const trimmed = symbol.trim();
  return trimmed ? `${trimmed} icon` : 'Cryptocurrency icon';
}

function nextUsableIndex(
  from: number,
  candidates: CryptoIconCandidate[],
  rejected: Set<string>,
): number {
  let index = from;
  while (index < candidates.length) {
    const candidate = candidates[index];
    if (candidate && !rejected.has(candidate.url)) {
      return index;
    }
    index += 1;
  }
  return candidates.length;
}

export function CryptoIcon({
  symbol,
  name,
  network,
  contractAddress,
  chainId,
  providerAssetId,
  iconUrl,
  size = 40,
  className,
  alt,
  decorative = false,
}: CryptoIconProps) {
  const normalized = normalizeCryptoSymbol(symbol);
  const identityKey = useMemo(
    () =>
      buildCryptoIconIdentityKey({
        symbol,
        network,
        contractAddress,
        chainId,
        providerAssetId,
      }),
    [symbol, network, contractAddress, chainId, providerAssetId],
  );

  const candidates = useMemo(
    () => buildIconCandidates({ symbol, iconUrl }),
    [symbol, iconUrl],
  );

  const rejectedRef = useRef<Set<string>>(new Set());
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [imageVisible, setImageVisible] = useState(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    rejectedRef.current = new Set();
    setLoadedUrl(null);
    setImageVisible(false);
    setGeneration((g) => g + 1);

    const cached = getCachedResolution(identityKey);
    if (cached?.kind === 'placeholder') {
      setCandidateIndex(candidates.length);
      return;
    }
    if (cached) {
      const index = candidates.findIndex((c) => c.url === cached.url);
      setCandidateIndex(index >= 0 ? index : 0);
      setLoadedUrl(cached.url);
      setImageVisible(true);
      return;
    }

    setCandidateIndex(nextUsableIndex(0, candidates, rejectedRef.current));
  }, [identityKey, candidates]);

  const activeCandidate: CryptoIconCandidate | undefined = candidates[candidateIndex];
  const resolvedUrl = loadedUrl ?? activeCandidate?.url;
  const usePlaceholder = !resolvedUrl || candidateIndex >= candidates.length;
  const placeholder = useMemo(() => getPlaceholderStyle(normalized), [normalized]);

  const frameStyle: CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: '50%',
    overflow: 'hidden',
  };

  const altText = decorative ? '' : buildAltText(symbol, name, alt);
  const classNames = ['asset-icon', 'crypto-icon', className].filter(Boolean).join(' ');

  const failAndAdvance = (failedUrl: string) => {
    if (rejectedRef.current.has(failedUrl)) return;
    rejectedRef.current.add(failedUrl);
    markIconUrlFailed(failedUrl);
    setLoadedUrl(null);
    setImageVisible(false);

    const next = nextUsableIndex(candidateIndex + 1, candidates, rejectedRef.current);
    if (next >= candidates.length) {
      cacheSuccessfulResolution(identityKey, { kind: 'placeholder' });
    }
    setCandidateIndex(next);
  };

  if (usePlaceholder) {
    return (
      <span
        className={classNames}
        style={{
          ...frameStyle,
          display: 'inline-grid',
          placeItems: 'center',
          background: placeholder.background,
          color: placeholder.color,
          fontSize: Math.max(10, size * 0.34),
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          userSelect: 'none',
        }}
        aria-hidden={decorative ? true : undefined}
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : altText}
      >
        {placeholder.initials}
      </span>
    );
  }

  const localKind =
    activeCandidate?.kind === 'local' || activeCandidate?.kind === 'local-alias';

  return (
    <span
      className={classNames}
      style={{
        ...frameStyle,
        position: 'relative',
        display: 'inline-grid',
        placeItems: 'center',
        background: imageVisible ? 'transparent' : 'var(--bg-fill)',
      }}
      aria-hidden={decorative ? true : undefined}
    >
      {!imageVisible ? (
        <span
          className={localKind ? 'crypto-icon__skeleton' : 'crypto-icon__fallback'}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: localKind ? 'var(--bg-fill-strong)' : placeholder.background,
            color: placeholder.color,
            display: 'grid',
            placeItems: 'center',
            fontSize: Math.max(10, size * 0.34),
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
          aria-hidden="true"
        >
          {localKind ? null : placeholder.initials}
        </span>
      ) : null}
      <img
        key={`${generation}:${resolvedUrl}`}
        src={resolvedUrl}
        alt={altText}
        width={size}
        height={size}
        draggable={false}
        loading="lazy"
        decoding="async"
        onLoad={() => {
          if (!activeCandidate || activeCandidate.url !== resolvedUrl) return;
          setLoadedUrl(resolvedUrl);
          setImageVisible(true);
          cacheSuccessfulResolution(identityKey, {
            kind: activeCandidate.kind,
            url: resolvedUrl,
          });
        }}
        onError={() => failAndAdvance(resolvedUrl)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: imageVisible ? 1 : 0,
          position: 'relative',
        }}
      />
    </span>
  );
}
