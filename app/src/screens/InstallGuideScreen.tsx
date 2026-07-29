import { Link } from 'react-router-dom';
import { IconBack, IconPlusSquare, IconShare } from '../components/icons';
import { usePwaInstall } from '../state/PwaInstallContext';

type InstallStep = {
  title: string;
  body: string;
  icon?: 'share' | 'plus';
};

const iosSteps: InstallStep[] = [
  {
    title: 'Open Share',
    body: "Tap the Share button in Safari's toolbar at the bottom of the screen.",
    icon: 'share',
  },
  {
    title: 'Add to Home Screen',
    body: 'Scroll the share sheet and tap Add to Home Screen.',
    icon: 'plus',
  },
  {
    title: 'Confirm',
    body: "Tap Add in the top-right corner. Portwallet will appear on your Home Screen.",
  },
];

const genericSteps: InstallStep[] = [
  {
    title: 'Open the browser menu',
    body: 'Tap the menu icon in your browser (often ⋮ or ⋯).',
  },
  {
    title: 'Install the app',
    body: 'Choose Install app or Add to Home Screen.',
  },
  {
    title: 'Confirm',
    body: 'Follow the prompts. Portwallet will open like an app from your home screen.',
  },
];

function StepIcon({ kind }: { kind: NonNullable<InstallStep['icon']> }) {
  if (kind === 'share') return <IconShare size={22} strokeWidth={1.75} />;
  return <IconPlusSquare size={22} strokeWidth={1.75} />;
}

export function InstallGuideScreen() {
  const { isIos } = usePwaInstall();
  const steps = isIos ? iosSteps : genericSteps;

  return (
    <section className="screen">
      <Link className="back-link" to="/">
        <IconBack size={20} />
        Home
      </Link>

      <header className="header-block">
        <h1 className="screen-title">Install Portwallet</h1>
        <p className="install-guide__lead">
          {isIos
            ? 'Add Portwallet to your Home Screen in Safari for quick access.'
            : 'Install Portwallet from your browser for quick access.'}
        </p>
      </header>

      <ol className="install-guide__steps">
        {steps.map((step, index) => (
          <li key={step.title} className="install-guide__step">
            <div className="install-guide__step-index" aria-hidden="true">
              {index + 1}
            </div>
            <div className="install-guide__step-body">
              <div className="install-guide__step-title-row">
                <div className="install-guide__step-title">{step.title}</div>
                {step.icon ? (
                  <span className="install-guide__step-icon" aria-hidden="true">
                    <StepIcon kind={step.icon} />
                  </span>
                ) : null}
              </div>
              <p className="install-guide__step-meta">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {isIos ? (
        <p className="install-guide__note">
          These steps work in Safari on iPhone and iPad. After installing, open
          Portwallet from your Home Screen icon.
        </p>
      ) : (
        <p className="install-guide__note">
          Menu labels vary by browser. Look for Install app, Install, or Add to
          Home Screen.
        </p>
      )}
    </section>
  );
}
