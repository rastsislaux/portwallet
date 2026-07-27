import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_PWA_INSTALL_HIDDEN,
  isIosDevice,
  isStandaloneDisplay,
  readPwaInstallHidden,
  writePwaInstallHidden,
} from './installStorage';

describe('installStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads and writes hide status', () => {
    expect(readPwaInstallHidden()).toBe(false);

    writePwaInstallHidden(true);
    expect(localStorage.getItem(STORAGE_PWA_INSTALL_HIDDEN)).toBe('true');
    expect(readPwaInstallHidden()).toBe(true);

    writePwaInstallHidden(false);
    expect(localStorage.getItem(STORAGE_PWA_INSTALL_HIDDEN)).toBeNull();
    expect(readPwaInstallHidden()).toBe(false);
  });

  it('treats missing or non-true values as not hidden', () => {
    localStorage.setItem(STORAGE_PWA_INSTALL_HIDDEN, 'false');
    expect(readPwaInstallHidden()).toBe(false);
  });

  it('detects standalone display mode', () => {
    const matchMedia = vi.fn((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('matchMedia', matchMedia);

    expect(isStandaloneDisplay()).toBe(true);
  });

  it('detects iOS Safari standalone via navigator.standalone', () => {
    const matchMedia = vi.fn(() => ({
      matches: false,
      media: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('matchMedia', matchMedia);
    Object.defineProperty(window.navigator, 'standalone', {
      configurable: true,
      value: true,
    });

    expect(isStandaloneDisplay()).toBe(true);
  });

  it('detects iOS devices from user agent', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      value: 'iPhone',
    });
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    });

    expect(isIosDevice()).toBe(true);
  });
});
