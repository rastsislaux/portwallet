/** Restrained palette aligned with Portwallet neutrals / status accents. */
const PLACEHOLDER_COLORS = [
  '#111111',
  '#48484A',
  '#636366',
  '#8E8E93',
  '#0071E3',
  '#30B0C7',
  '#34C759',
  '#FF9500',
  '#FF3B30',
  '#5AC8FA',
] as const;

export type CryptoIconPlaceholderStyle = {
  initials: string;
  background: string;
  color: string;
};

export function hashCryptoSymbol(normalizedSymbol: string): number {
  let hash = 5381;
  for (let i = 0; i < normalizedSymbol.length; i += 1) {
    hash = (hash * 33) ^ normalizedSymbol.charCodeAt(i);
  }
  return hash >>> 0;
}

export function getPlaceholderInitials(normalizedSymbol: string): string {
  const cleaned = normalizedSymbol.replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (!cleaned) return '?';
  if (cleaned.length === 1) return cleaned;
  return cleaned.slice(0, 2);
}

function relativeLuminance(hex: string): number {
  const raw = hex.replace('#', '');
  const r = Number.parseInt(raw.slice(0, 2), 16) / 255;
  const g = Number.parseInt(raw.slice(2, 4), 16) / 255;
  const b = Number.parseInt(raw.slice(4, 6), 16) / 255;
  const lin = [r, g, b].map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

export function getPlaceholderStyle(normalizedSymbol: string): CryptoIconPlaceholderStyle {
  const key = normalizedSymbol || '?';
  const background = PLACEHOLDER_COLORS[hashCryptoSymbol(key) % PLACEHOLDER_COLORS.length]!;
  const color = relativeLuminance(background) > 0.45 ? '#111111' : '#FFFFFF';
  return {
    initials: getPlaceholderInitials(key),
    background,
    color,
  };
}
