import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaInstallBanner } from '../components/PwaInstallBanner';
import { STORAGE_PWA_INSTALL_HIDDEN } from '../pwa/installStorage';
import { InstallGuideScreen } from '../screens/InstallGuideScreen';
import { PwaInstallProvider, usePwaInstall } from '../state/PwaInstallContext';

function SettingsInstallProbe() {
  const { showInstallInSettings, canPrompt, promptInstall, showInstallButtonAgain } =
    usePwaInstall();
  if (!showInstallInSettings) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (canPrompt) {
            void promptInstall();
            return;
          }
          window.history.pushState({}, '', '/install');
        }}
      >
        Settings Install
      </button>
      <button type="button" onClick={showInstallButtonAgain}>
        Show again
      </button>
    </div>
  );
}

function renderInstallUi(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <PwaInstallProvider>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <PwaInstallBanner />
                <SettingsInstallProbe />
              </>
            }
          />
          <Route path="/install" element={<InstallGuideScreen />} />
        </Routes>
      </PwaInstallProvider>
    </MemoryRouter>,
  );
}

describe('PwaInstallBanner', () => {
  const originalUserAgent = window.navigator.userAgent;

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    });
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
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    });
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

  it('opens the install guide when native prompt is unavailable', async () => {
    const user = userEvent.setup();
    renderInstallUi();

    await user.click(screen.getByRole('button', { name: 'Install' }));

    expect(screen.getByRole('heading', { name: 'Install Portwallet' })).toBeInTheDocument();
    expect(screen.getByText('Open the browser menu')).toBeInTheDocument();
  });

  it('shows iOS Safari steps on iPhone', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });

    const user = userEvent.setup();
    renderInstallUi();

    await user.click(screen.getByRole('button', { name: 'Install' }));

    expect(screen.getByRole('heading', { name: 'Install Portwallet' })).toBeInTheDocument();
    expect(screen.getByText('Open Share')).toBeInTheDocument();
    expect(screen.getByText('Add to Home Screen')).toBeInTheDocument();
    expect(
      screen.getByText(/These steps work in Safari on iPhone and iPad/),
    ).toBeInTheDocument();
  });
});
