export const STORAGE_PWA_INSTALL_HIDDEN = 'portwallet.pwaInstall.hidden';

export function readPwaInstallHidden(): boolean {
  try {
    return localStorage.getItem(STORAGE_PWA_INSTALL_HIDDEN) === 'true';
  } catch {
    return false;
  }
}

export function writePwaInstallHidden(hidden: boolean): void {
  try {
    if (hidden) {
      localStorage.setItem(STORAGE_PWA_INSTALL_HIDDEN, 'true');
    } else {
      localStorage.removeItem(STORAGE_PWA_INSTALL_HIDDEN);
    }
  } catch {
    /* ignore */
  }
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    nav.standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs =
    window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}
