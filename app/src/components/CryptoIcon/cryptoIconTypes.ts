export type CryptoIconSourceKind =
  | 'explicit'
  | 'local'
  | 'local-alias'
  | 'cdn-svg'
  | 'cdn-png'
  | 'provider'
  | 'placeholder';

export type CryptoIconCandidate = {
  kind: Exclude<CryptoIconSourceKind, 'placeholder'>;
  url: string;
};

export type CryptoIconIdentity = {
  symbol: string;
  network?: string;
  contractAddress?: string;
  chainId?: string | number;
  providerAssetId?: string;
};

export type CryptoIconProps = {
  symbol: string;
  name?: string;
  network?: string;
  contractAddress?: string;
  chainId?: string | number;
  providerAssetId?: string;
  iconUrl?: string;
  size?: number;
  className?: string;
  alt?: string;
  decorative?: boolean;
};

export type ResolvedCryptoIcon =
  | { kind: Exclude<CryptoIconSourceKind, 'placeholder'>; url: string }
  | { kind: 'placeholder' };
