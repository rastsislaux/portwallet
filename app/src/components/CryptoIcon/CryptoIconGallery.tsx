import { CryptoIcon } from './CryptoIcon';

const GALLERY_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'XRP', name: 'XRP' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'TRX', name: 'TRON' },
  { symbol: 'TON', name: 'Toncoin' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'POL', name: 'Polygon' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'LINK', name: 'Chainlink' },
  { symbol: 'LTC', name: 'Litecoin' },
  { symbol: 'BCH', name: 'Bitcoin Cash' },
  { symbol: 'ATOM', name: 'Cosmos' },
  { symbol: 'NEAR', name: 'NEAR' },
  { symbol: 'ARB', name: 'Arbitrum' },
  { symbol: 'APT', name: 'Aptos' },
  { symbol: 'OP', name: 'Optimism' },
  { symbol: 'SUI', name: 'Sui' },
  { symbol: 'INJ', name: 'Injective' },
  { symbol: 'UNI', name: 'Uniswap' },
  { symbol: 'AAVE', name: 'Aave' },
  { symbol: 'SHIB', name: 'Shiba Inu' },
  { symbol: 'PEPE', name: 'Pepe' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin' },
  { symbol: 'ZZZUNKNOWN', name: 'Unknown Token' },
] as const;

const SIZES = [20, 24, 32, 40, 48] as const;

/** Development-only gallery. Not linked from production navigation. */
export function CryptoIconGallery() {
  return (
    <section className="screen crypto-icon-gallery">
      <header className="header-block">
        <h1 className="screen-title">CryptoIcon gallery</h1>
        <p className="custody-strip">Development preview of icon resolution</p>
      </header>

      {SIZES.map((size) => (
        <div key={size} className="section-block">
          <div className="section-eyebrow">{size}px</div>
          <div className="crypto-icon-gallery__grid">
            {GALLERY_ASSETS.map((asset) => (
              <div key={`${size}-${asset.symbol}`} className="crypto-icon-gallery__item">
                <CryptoIcon
                  symbol={asset.symbol}
                  name={asset.name}
                  size={size}
                  decorative
                />
                <span>{asset.symbol}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
