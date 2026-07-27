import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  isIosDevice,
  isStandaloneDisplay,
  readPwaInstallHidden,
  writePwaInstallHidden,
} from '../pwa/installStorage';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable' | 'manual';

type PwaInstallContextValue = {
  /** App is already running as an installed PWA. */
  isStandalone: boolean;
  /** User hid the in-app install button. */
  isHidden: boolean;
  /** Chromium deferred install prompt is available. */
  canPrompt: boolean;
  /** True on iOS where install uses Share → Add to Home Screen. */
  isIos: boolean;
  /** Show the main Install button (browser tab, not hidden). */
  showInstallButton: boolean;
  /** Show Install in Settings after the user hid the main button. */
  showInstallInSettings: boolean;
  /** Manual-install hint when native prompt is unavailable. */
  installHint: string | null;
  promptInstall: () => Promise<InstallOutcome>;
  hideInstallButton: () => void;
  showInstallButtonAgain: () => void;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function iosInstallHint(): string {
  return 'In Safari, tap Share, then Add to Home Screen.';
}

function genericInstallHint(): string {
  return 'Use your browser menu and choose Install app or Add to Home Screen.';
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneDisplay());
  const [isHidden, setIsHidden] = useState(() => readPwaInstallHidden());
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isIos] = useState(() => isIosDevice());
  const [installHint, setInstallHint] = useState<string | null>(null);

  useEffect(() => {
    const syncStandalone = () => {
      setIsStandalone(isStandaloneDisplay());
    };

    syncStandalone();

    const mediaQueries = [
      window.matchMedia('(display-mode: standalone)'),
      window.matchMedia('(display-mode: fullscreen)'),
      window.matchMedia('(display-mode: minimal-ui)'),
    ];

    for (const mq of mediaQueries) {
      mq.addEventListener('change', syncStandalone);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstallHint(null);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstallHint(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      for (const mq of mediaQueries) {
        mq.removeEventListener('change', syncStandalone);
      }
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const hideInstallButton = useCallback(() => {
    setIsHidden(true);
    writePwaInstallHidden(true);
    setInstallHint(null);
  }, []);

  const showInstallButtonAgain = useCallback(() => {
    setIsHidden(false);
    writePwaInstallHidden(false);
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        if (outcome === 'accepted') {
          setIsStandalone(true);
          setInstallHint(null);
        }
        return outcome;
      } catch {
        setDeferredPrompt(null);
        return 'unavailable';
      }
    }

    const hint = isIos ? iosInstallHint() : genericInstallHint();
    setInstallHint(hint);
    return 'manual';
  }, [deferredPrompt, isIos]);

  const showInstallButton = !isStandalone && !isHidden;
  const showInstallInSettings = !isStandalone && isHidden;
  const canPrompt = deferredPrompt != null;

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      isStandalone,
      isHidden,
      canPrompt,
      isIos,
      showInstallButton,
      showInstallInSettings,
      installHint,
      promptInstall,
      hideInstallButton,
      showInstallButtonAgain,
    }),
    [
      isStandalone,
      isHidden,
      canPrompt,
      isIos,
      showInstallButton,
      showInstallInSettings,
      installHint,
      promptInstall,
      hideInstallButton,
      showInstallButtonAgain,
    ],
  );

  return (
    <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>
  );
}

export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) throw new Error('usePwaInstall must be used within PwaInstallProvider');
  return ctx;
}
