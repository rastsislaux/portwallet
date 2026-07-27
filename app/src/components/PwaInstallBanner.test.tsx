import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaInstallBanner } from '../components/PwaInstallBanner';
import { STORAGE_PWA_INSTALL_HIDDEN } from '../pwa/installStorage';
import { PwaInstallProvider, usePwaInstall } from '../state/PwaInstallContext';

function SettingsInstallProbe() {
  const { showInstallInSettings, promptInstall, showInstallButtonAgain } = usePwaInstall();
  if (!showInstallInSettings) return null;
  return (
    <div>
      <button type="button" onClick={() => void promptInstall()}>
        Settings Install
      </button>
      <button type="button" onClick={showInstallButtonAgain}>
        Show again
      </button>
    </div>
  );
}

function renderInstallUi() {
  return render(
    <PwaInstallProvider>
      <PwaInstallBanner />
      <SettingsInstallProbe />
    </PwaInstallProvider>,
  );
}

describe('PwaInstallBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows install button when not running as PWA', () => {
    renderInstallUi();
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Settings Install' })).not.toBeInTheDocument();
  });

  it('hides the button and persists hide status', async () => {
    const user = userEvent.setup();
    renderInstallUi();

    await user.click(screen.getByRole('button', { name: 'Hide install button' }));

    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_PWA_INSTALL_HIDDEN)).toBe('true');
    expect(screen.getByRole('button', { name: 'Settings Install' })).toBeInTheDocument();
  });

  it('restores the home button from settings', async () => {
    localStorage.setItem(STORAGE_PWA_INSTALL_HIDDEN, 'true');
    const user = userEvent.setup();
    renderInstallUi();

    expect(screen.getByRole('button', { name: 'Settings Install' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show again' }));

    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_PWA_INSTALL_HIDDEN)).toBeNull();
  });

  it('does not show install UI when already standalone', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    renderInstallUi();

    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Settings Install' })).not.toBeInTheDocument();
  });
});
