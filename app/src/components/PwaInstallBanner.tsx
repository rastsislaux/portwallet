import { IconDownload, IconX } from './icons';
import { usePwaInstall } from '../state/PwaInstallContext';

export function PwaInstallBanner() {
  const {
    showInstallButton,
    installHint,
    promptInstall,
    hideInstallButton,
  } = usePwaInstall();

  if (!showInstallButton) return null;

  return (
    <div className="pwa-install" role="region" aria-label="Install app">
      <div className="pwa-install__body">
        <div className="pwa-install__copy">
          <div className="pwa-install__title">Install Portwallet</div>
          <p className="pwa-install__meta">
            {installHint ?? 'Add to your home screen for quick access'}
          </p>
        </div>
        <div className="pwa-install__actions">
          <button
            type="button"
            className="btn btn--soft pwa-install__cta"
            onClick={() => {
              void promptInstall();
            }}
          >
            <IconDownload size={16} strokeWidth={2.25} />
            Install
          </button>
          <button
            type="button"
            className="icon-button pwa-install__hide"
            aria-label="Hide install button"
            title="Hide"
            onClick={hideInstallButton}
          >
            <IconX size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
