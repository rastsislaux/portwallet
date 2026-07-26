import type { CSSProperties, ReactNode, SVGProps } from 'react';
import type { ProviderType } from '../domain/types';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const STROKE = 1.75;

function BaseIcon({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </BaseIcon>
  );
}

export function IconActivity(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 12h4l2.5-7 3.5 14L16 12h5" />
    </BaseIcon>
  );
}

export function IconExchange(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M16 3h5v5" />
      <path d="M21 3 13 11" />
      <path d="M8 21H3v-5" />
      <path d="M3 21l8-8" />
    </BaseIcon>
  );
}

export function IconAccounts(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M3 10h18" />
    </BaseIcon>
  );
}

export function IconSend(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 19V5" />
      <path d="m7 10 5-5 5 5" />
    </BaseIcon>
  );
}

export function IconReceive(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="m7 14 5 5 5-5" />
    </BaseIcon>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <BaseIcon {...props} size={props.size ?? 16}>
      <path d="m6 9 6 6 6-6" />
    </BaseIcon>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="m7 14 5 5 5-5" />
    </BaseIcon>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </BaseIcon>
  );
}

export function IconBack(props: IconProps) {
  return (
    <BaseIcon {...props} size={props.size ?? 18}>
      <path d="M15 5 8 12l7 7" />
    </BaseIcon>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </BaseIcon>
  );
}

const assetColors: Record<string, { bg: string; fg: string }> = {
  BTC: { bg: '#e0912a', fg: '#ffffff' },
  ETH: { bg: '#6578d0', fg: '#ffffff' },
  USDT: { bg: '#3a9a7a', fg: '#ffffff' },
  USDC: { bg: '#3a78b8', fg: '#ffffff' },
};

export function AssetIcon({
  symbol,
  size = 44,
}: {
  symbol: string;
  size?: number;
}) {
  const colors = assetColors[symbol] ?? { bg: '#171614', fg: '#ffffff' };
  const mark = size * 0.5;
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: colors.bg,
    color: colors.fg,
    display: 'inline-grid',
    placeItems: 'center',
    flexShrink: 0,
    filter: 'saturate(0.9)',
  };

  return (
    <span className="asset-icon" style={style} aria-hidden="true">
      {symbol === 'BTC' ? <BtcMark size={mark} /> : null}
      {symbol === 'ETH' ? <EthMark size={mark} /> : null}
      {symbol === 'USDT' ? <UsdtMark size={mark} /> : null}
      {symbol === 'USDC' ? <UsdcMark size={mark} /> : null}
      {!assetColors[symbol] ? (
        <span style={{ fontSize: size * 0.34, fontWeight: 600 }}>{symbol.slice(0, 1)}</span>
      ) : null}
    </span>
  );
}

function BtcMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14.4 11.3c.9-.4 1.5-1.1 1.3-2.2-.2-1.3-1.3-1.7-2.8-1.9V5.4h-1.3v1.7c-.3 0-.7 0-1.1.1V5.4H9v1.8c-.3 0-.5 0-.8.1H6.7l.2 1.5s1-.02 1 0c.5 0 .7.3.7.6v5.3c0 .2-.1.5-.5.5 0 0-1 0-1 0l-.3 1.6h1.6c.3 0 .6 0 .9.1v1.8h1.3v-1.7c.4 0 .7.1 1.1.1v1.6h1.3v-1.8c2.1-.2 3.6-.9 3.8-2.9.2-1.5-.5-2.3-1.6-2.7ZM11.3 8.5c.9 0 3.6-.3 3.6 1.4 0 1.6-2.7 1.4-3.6 1.4V8.5Zm0 6.5c1.1 0 4.3-.3 4.3 1.5 0 1.8-3.2 1.5-4.3 1.5v-3Z" />
    </svg>
  );
}

function EthMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.2 5.8 12.1 12 15.5l6.2-3.4L12 2.2Zm0 14.5-6.2-3.5L12 21.8l6.2-8.6L12 16.7Z" />
    </svg>
  );
}

function UsdtMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.1 17.8c-3.3 0-6-1.3-6-2.9 0-.4.2-.8.5-1.1C7.7 15.5 9.7 16.3 12.1 16.3s4.4-.8 5.5-2.5c.3.3.5.7.5 1.1 0 1.6-2.7 2.9-6 2.9ZM7.4 8.4V7h9.4v1.4h-3.4v2.1c2.8.2 4.9 1 4.9 2.5s-2.1 2.4-4.9 2.6v3.1h-1.6v-3.1c-2.8-.2-4.9-1.1-4.9-2.6s2.1-2.3 4.9-2.5V8.4H7.4Zm4.7 5.7c2.5 0 4.5-.7 4.5-1.6s-2-1.6-4.5-1.6-4.5.7-4.5 1.6 2 1.6 4.5 1.6Z" />
    </svg>
  );
}

function UsdcMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.2c-4.9 0-8.8 3.9-8.8 8.8S7.1 20.8 12 20.8s8.8-3.9 8.8-8.8S16.9 3.2 12 3.2Zm.1 14.7v1.3h-1.4v-1.3c-1.8-.2-3.2-.9-4.1-2l1.1-1.1c.7.9 1.8 1.5 3 1.6v-3.1c-2.1-.5-3.2-1.4-3.2-3 0-1.7 1.3-2.8 3.2-3.1V5.8h1.4v1.4c1.5.2 2.7.8 3.5 1.8l-1.1 1c-.6-.7-1.4-1.1-2.4-1.3v2.9c2.1.5 3.3 1.4 3.3 3.1 0 1.8-1.3 3-3.3 3.2Zm-1.4-7.5c-.8.2-1.3.6-1.3 1.3 0 .7.5 1.1 1.3 1.3V10.4Zm2.8 5.3c.8-.2 1.4-.7 1.4-1.4 0-.8-.6-1.2-1.4-1.4v2.8Z" />
    </svg>
  );
}

const providerMeta: Record<
  ProviderType,
  { label: string; bg: string; fg: string; mark: string }
> = {
  bybit: { label: 'Bybit', bg: '#e2a030', fg: '#171614', mark: 'B' },
  binance: { label: 'Binance', bg: '#ddb13a', fg: '#171614', mark: '◆' },
  non_custodial: { label: 'Wallet', bg: '#171614', fg: '#fbfaf7', mark: 'W' },
  mock: { label: 'Mock', bg: '#6a675f', fg: '#fbfaf7', mark: 'M' },
};

export function ProviderIcon({
  type,
  size = 44,
}: {
  type: ProviderType;
  size?: number;
}) {
  const meta = providerMeta[type] ?? providerMeta.mock;
  const markSize = size * 0.42;
  return (
    <span
      className="provider-icon"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: meta.bg,
        color: meta.fg,
        display: 'inline-grid',
        placeItems: 'center',
        fontSize: size * 0.36,
        fontWeight: 600,
        letterSpacing: '-0.02em',
        flexShrink: 0,
        filter: 'saturate(0.9)',
      }}
      aria-hidden="true"
    >
      {type === 'binance' ? (
        <svg width={markSize} height={markSize} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3.2 14.8 6 12 8.8 9.2 6 12 3.2Zm0 5.6L16.4 13 12 17.4 7.6 13 12 8.8Zm5.6-2L20.4 9.6 18.2 11.8l-2.2-2.2 1.6-1.6ZM6.4 6.8 8.6 9 6.4 11.2 3.6 8.4 6.4 6.8Zm0 7.6L8.6 16.6 6.4 18.8 3.6 16 6.4 14.4Zm11.2 0L20.4 16 18.2 18.2l-2.2-2.2 1.6-1.6ZM12 15.6l2.8 2.8L12 21.2l-2.8-2.8L12 15.6Z" />
        </svg>
      ) : (
        meta.mark
      )}
    </span>
  );
}
