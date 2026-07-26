/**
 * Icon-resolution aliases only.
 * Never rewrite asset identity, pricing, network behavior, or displayed tickers.
 */
export const CRYPTO_ICON_ALIASES: Record<string, string> = {
  xbt: 'btc',
  eth2: 'eth',
  bchabc: 'bch',
  bchsv: 'bsv',
  usdt20: 'usdt',
  usdttrc20: 'usdt',
  usdt_erc20: 'usdt',
  usdcerc20: 'usdc',
  // Polygon rebranded ticker → historical cryptocurrency-icons symbol.
  pol: 'matic',
  // Visual-only: reuse BTC artwork when a dedicated WBTC asset is unavailable.
  // The UI must still show WBTC as its own asset identity.
  wbtc: 'btc',
  // Visual-only: reuse ETH artwork when a dedicated WETH asset is unavailable.
  weth: 'eth',
};

export function resolveAliasSymbol(normalizedSymbol: string): string | undefined {
  return CRYPTO_ICON_ALIASES[normalizedSymbol];
}
