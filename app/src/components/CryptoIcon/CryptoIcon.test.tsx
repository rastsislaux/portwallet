import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { CryptoIcon } from './CryptoIcon';
import {
  getPlaceholderInitials,
  getPlaceholderStyle,
} from './cryptoIconPlaceholder';
import {
  buildCryptoIconIdentityKey,
  buildIconCandidates,
  getLocalIconUrl,
  hasIconUrlFailed,
  hasLocalIcon,
  isTrustedIconUrl,
  normalizeCryptoSymbol,
  resetCryptoIconCaches,
} from './cryptoIconResolver';

afterEach(() => {
  cleanup();
  resetCryptoIconCaches();
});

function renderIcon(props: ComponentProps<typeof CryptoIcon>) {
  return render(<CryptoIcon {...props} />);
}

function getIconImg(container: HTMLElement) {
  return container.querySelector('img');
}

describe('normalizeCryptoSymbol', () => {
  it('normalizes case-insensitively', () => {
    expect(normalizeCryptoSymbol('BTC')).toBe('btc');
    expect(normalizeCryptoSymbol('btc')).toBe('btc');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeCryptoSymbol(' BTC ')).toBe('btc');
  });
});

describe('local package resolution', () => {
  it.each(['BTC', 'ETH', 'USDT', 'SOL', 'ADA', 'XRP', 'LINK'] as const)(
    '%s resolves from the local package',
    (symbol) => {
      expect(hasLocalIcon(normalizeCryptoSymbol(symbol))).toBe(true);
      expect(getLocalIconUrl(normalizeCryptoSymbol(symbol))).toBeTruthy();

      const candidates = buildIconCandidates({ symbol });
      expect(candidates[0]?.kind).toBe('local');
      expect(candidates[0]?.url).toBe(getLocalIconUrl(normalizeCryptoSymbol(symbol)));

      const { container } = renderIcon({ symbol, size: 32 });
      const img = getIconImg(container);
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src')).toBe(getLocalIconUrl(normalizeCryptoSymbol(symbol)));
      fireEvent.load(img!);
      expect(img?.getAttribute('src')).toBe(getLocalIconUrl(normalizeCryptoSymbol(symbol)));
    },
  );

  it('ARB advances past missing local icon to a CDN candidate', () => {
    expect(hasLocalIcon('arb')).toBe(false);
    const candidates = buildIconCandidates({ symbol: 'ARB' });
    expect(candidates[0]?.kind).toBe('cdn-svg');
    expect(candidates[0]?.url).toContain('/arb.svg');
    expect(candidates[1]?.kind).toBe('cdn-png');
  });

  it('APT advances past missing local icon to a CDN candidate', () => {
    expect(hasLocalIcon('apt')).toBe(false);
    const candidates = buildIconCandidates({ symbol: 'APT' });
    expect(candidates[0]?.kind).toBe('cdn-svg');
    expect(candidates[0]?.url).toContain('/apt.svg');
  });

  it('XBT resolves through the BTC alias', () => {
    const candidates = buildIconCandidates({ symbol: 'XBT' });
    expect(candidates.some((c) => c.kind === 'local-alias')).toBe(true);
    expect(candidates.find((c) => c.kind === 'local-alias')?.url).toBe(getLocalIconUrl('btc'));
  });
});

describe('candidate progression', () => {
  it('includes CDN SVG then PNG after missing local icons', () => {
    const candidates = buildIconCandidates({ symbol: 'NOTAREALCOINXYZ' });
    expect(candidates.map((c) => c.kind)).toEqual(['cdn-svg', 'cdn-png']);
  });

  it('failed CDN SVG advances to CDN PNG, then placeholder', () => {
    const { container, rerender } = renderIcon({ symbol: 'NOTAREALCOINXYZ', size: 40 });
    let img = getIconImg(container);
    expect(img?.getAttribute('src')).toContain('.svg');

    fireEvent.error(img!);
    img = getIconImg(container);
    expect(img?.getAttribute('src')).toContain('.png');

    fireEvent.error(img!);
    expect(getIconImg(container)).toBeNull();
    expect(container.textContent).toBe('NO');

    // Stable across rerenders
    const first = container.firstElementChild?.getAttribute('style');
    rerender(<CryptoIcon symbol="NOTAREALCOINXYZ" size={40} />);
    expect(container.firstElementChild?.getAttribute('style')).toBe(first);
  });

  it('does not attempt a failed source more than once', () => {
    const { container } = renderIcon({ symbol: 'NOTAREALCOINXYZ' });
    const first = getIconImg(container)!;
    const firstUrl = first.getAttribute('src')!;
    fireEvent.error(first);
    expect(hasIconUrlFailed(firstUrl)).toBe(true);

    const second = getIconImg(container)!;
    const secondUrl = second.getAttribute('src')!;
    expect(secondUrl).not.toBe(firstUrl);
    fireEvent.error(second);

    // Placeholder — no further image attempts
    expect(getIconImg(container)).toBeNull();
    const again = buildIconCandidates({ symbol: 'NOTAREALCOINXYZ' });
    expect(again.every((c) => hasIconUrlFailed(c.url) || c.url !== firstUrl)).toBe(true);
    expect(again.some((c) => c.url === firstUrl)).toBe(false);
  });

  it('does not enter an infinite error loop', () => {
    const { container } = renderIcon({ symbol: 'LOOPCOINXYZ' });
    for (let i = 0; i < 10; i += 1) {
      const img = getIconImg(container);
      if (!img) break;
      fireEvent.error(img);
    }
    expect(getIconImg(container)).toBeNull();
    expect(container.textContent?.length).toBeGreaterThan(0);
    expect(container.textContent?.length).toBeLessThanOrEqual(2);
  });
});

describe('placeholder', () => {
  it('renders deterministic initials and stable colors', () => {
    expect(getPlaceholderInitials('arb')).toBe('AR');
    expect(getPlaceholderInitials('apt')).toBe('AP');
    expect(getPlaceholderInitials('unknown')).toBe('UN');
    expect(getPlaceholderInitials('')).toBe('?');

    const a = getPlaceholderStyle('zzztokenone');
    const b = getPlaceholderStyle('zzztokenone');
    const c = getPlaceholderStyle('zzztokentwo');
    expect(a).toEqual(b);
    expect(a.background).not.toBe(c.background);
  });

  it('keeps fixed dimensions during loading', () => {
    const { container } = renderIcon({ symbol: 'BTC', size: 40 });
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.style.width).toBe('40px');
    expect(frame.style.height).toBe('40px');
    const img = getIconImg(container)!;
    fireEvent.load(img);
    expect(frame.style.width).toBe('40px');
    expect(frame.style.height).toBe('40px');
  });
});

describe('security and identity', () => {
  it('rejects unsafe URL protocols', () => {
    expect(isTrustedIconUrl('javascript:alert(1)')).toBe(false);
    expect(isTrustedIconUrl('file:///etc/passwd')).toBe(false);
    expect(isTrustedIconUrl('data:image/svg+xml,<svg></svg>')).toBe(false);
    expect(isTrustedIconUrl('https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/btc.svg')).toBe(
      true,
    );

    const candidates = buildIconCandidates({
      symbol: 'BTC',
      iconUrl: 'javascript:alert(1)',
    });
    expect(candidates.every((c) => !c.url.startsWith('javascript:'))).toBe(true);
  });

  it('includes network or contract metadata in the cache key', () => {
    const byContract = buildCryptoIconIdentityKey({
      symbol: 'USDT',
      chainId: 1,
      contractAddress: '0xabc',
    });
    const byNetwork = buildCryptoIconIdentityKey({
      symbol: 'USDT',
      network: 'ethereum',
      contractAddress: '0xabc',
    });
    const bySymbol = buildCryptoIconIdentityKey({ symbol: 'USDT' });
    expect(byContract).toContain('chain:1');
    expect(byContract).toContain('contract:0xabc');
    expect(byNetwork).toContain('network:ethereum');
    expect(bySymbol).toBe('symbol:usdt');
    expect(byContract).not.toBe(bySymbol);
  });

  it('resets resolution state when the asset changes', () => {
    const { container, rerender } = renderIcon({ symbol: 'BTC', size: 32 });
    fireEvent.load(getIconImg(container)!);
    expect(getIconImg(container)?.getAttribute('src')).toBe(getLocalIconUrl('btc'));

    rerender(<CryptoIcon symbol="ETH" size={32} />);
    expect(getIconImg(container)?.getAttribute('src')).toBe(getLocalIconUrl('eth'));
  });

  it('wrapped token aliases do not modify the displayed ticker identity', () => {
    const { container } = render(
      <div>
        <span data-testid="ticker">WBTC</span>
        <CryptoIcon symbol="WBTC" name="Wrapped Bitcoin" size={32} decorative />
      </div>,
    );
    expect(screen.getByTestId('ticker')).toHaveTextContent('WBTC');
    // Local WBTC artwork is preferred when present; alias is icon-only fallback.
    expect(hasLocalIcon('wbtc')).toBe(true);
    expect(getIconImg(container)?.getAttribute('src')).toBe(getLocalIconUrl('wbtc'));
  });
});

describe('accessibility', () => {
  it('uses meaningful alternative text', () => {
    const { container } = renderIcon({ symbol: 'BTC', name: 'Bitcoin' });
    expect(getIconImg(container)?.getAttribute('alt')).toBe('Bitcoin icon');

    cleanup();
    const { container: bySymbol } = renderIcon({ symbol: 'USDT' });
    expect(getIconImg(bySymbol)?.getAttribute('alt')).toBe('USDT icon');
  });

  it('decorative mode does not duplicate screen-reader text', () => {
    const { container } = renderIcon({ symbol: 'ETH', name: 'Ethereum', decorative: true });
    const root = container.firstElementChild;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(getIconImg(container)?.getAttribute('alt')).toBe('');
  });
});

describe('broken image UI', () => {
  it('never leaves a broken img without advancing', () => {
    const { container } = renderIcon({ symbol: 'MISSINGCOINXYZ' });
    fireEvent.error(getIconImg(container)!);
    fireEvent.error(getIconImg(container)!);
    expect(getIconImg(container)).toBeNull();
    expect(container.querySelector('.crypto-icon, .asset-icon')).not.toBeNull();
  });
});
