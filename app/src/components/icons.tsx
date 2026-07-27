import type { ComponentType } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowDownUp,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Home,
  RefreshCw,
  Repeat2,
  Settings,
  WalletCards,
  type LucideProps,
} from 'lucide-react';
import type { ProviderType } from '../domain/types';
export { CryptoIcon } from './CryptoIcon';

type IconProps = LucideProps & {
  size?: number;
};

const defaultStroke = 1.75;

function withDefaults(Icon: ComponentType<LucideProps>) {
  return function Wrapped({ size = 20, strokeWidth = defaultStroke, ...props }: IconProps) {
    return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" {...props} />;
  };
}

export const IconHome = withDefaults(Home);
export const IconActivity = withDefaults(Activity);
export const IconCards = withDefaults(CreditCard);
export const IconExchange = withDefaults(Repeat2);
export const IconAccounts = withDefaults(WalletCards);
export const IconSettings = withDefaults(Settings);
export const IconRefresh = withDefaults(RefreshCw);
export const IconSend = withDefaults(ArrowUpRight);
export const IconReceive = withDefaults(ArrowDown);
export const IconChevronDown = withDefaults(ChevronDown);
export const IconArrowDown = withDefaults(ArrowDown);
export const IconSwap = withDefaults(ArrowDownUp);
export const IconCopy = withDefaults(Copy);
export const IconBack = withDefaults(ArrowLeft);
export const IconCheck = withDefaults(Check);

const providerMeta: Record<
  ProviderType,
  { label: string; bg: string; fg: string; mark: string }
> = {
  bybit: { label: 'Bybit', bg: '#F7A600', fg: '#111111', mark: 'B' },
  binance: { label: 'Binance', bg: '#F0B90B', fg: '#111111', mark: '◆' },
  non_custodial: { label: 'Wallet', bg: '#111111', fg: '#FFFFFF', mark: 'W' },
  mock: { label: 'Mock', bg: '#8E8E93', fg: '#FFFFFF', mark: 'M' },
};

export function ProviderIcon({
  type,
  size = 36,
}: {
  type: ProviderType;
  size?: number;
}) {
  const meta = providerMeta[type] ?? providerMeta.mock;
  const markSize = size * 0.44;

  return (
    <span
      className="provider-icon"
      style={{
        width: size,
        height: size,
        background: meta.bg,
        color: meta.fg,
        fontSize: size * 0.38,
      }}
      aria-hidden="true"
    >
      {type === 'binance' ? (
        <svg width={markSize} height={markSize} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3.2 14.8 6 12 8.8 9.2 6 12 3.2Zm0 5.6L16.4 13 12 17.4 7.6 13 12 8.8Zm5.6-2L20.4 9.6 18.2 11.8l-2.2-2.2 1.6-1.6ZM6.4 6.8 8.6 9 6.4 11.2 3.6 8.4 6.4 6.8Zm0 7.6L8.6 16.6 6.4 18.8 3.6 16 6.4 14.4Zm11.2 0L20.4 16 18.2 18.2l-2.2-2.2 1.6-1.6ZM12 15.6l2.8 2.8L12 21.2l-2.8-2.8L12 15.6Z" />
        </svg>
      ) : (
        <span style={{ fontSize: size * 0.42, fontWeight: 700, lineHeight: 1 }}>
          {meta.mark}
        </span>
      )}
    </span>
  );
}
