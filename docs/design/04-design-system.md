# Portwallet — Design System

## Principles

Calm, trustworthy, precise, understated. Whitespace and typography over cards. One restrained accent. Tabular numerals for money. Refinement, not decoration.

## Typography

- Family: **IBM Plex Sans** (tabular figures via `font-variant-numeric: tabular-nums`)
- Body: 15px / 22px
- Metadata: 13px / 18px
- Caption: 12px
- Screen title: 28px / 34px, weight 600, tight tracking
- Section title: 15px / 20px, weight 600 (sentence case, not uppercase)
- Main balance: 44px, weight 500, tabular, tight tracking (−0.04em)
- Row primary: 15px semibold
- Row secondary: 13px regular, muted

## Spacing (4px base)

`4, 8, 12, 16, 24, 32, 48, 64`

- Screen padding: 24px mobile · 36px desktop (≥880px)
- Section gap: 32px
- List row padding: 14–16px 0
- Control height: 48px (touch)

## Radii & borders

- Control / button / input radius: **14px**
- Sheet radius: **24px**
- Account card radius: 18px (Accounts only — wallet-pass recognition)
- Border: 1px solid `var(--border)`
- Shadows: extremely subtle (`--shadow-xs`, `--shadow-sm`) — primary buttons, sheets, account cards only

## Color tokens

Warm-white neutral field. One ink-green accent for primary actions. Semantic colors muted.

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#F7F7F5` | App background (flat, no gradient) |
| `--bg-elevated` | `#FFFFFF` | Sheets, inputs, nav |
| `--bg-muted` | `#EFEEE9` | Segmented track |
| `--bg-subtle` | `#F2F1ED` | Soft action buttons, address field |
| `--ink` | `#111111` | Primary text |
| `--ink-secondary` | `#5F5E59` | Secondary text |
| `--ink-tertiary` | `#8E8D87` | Meta, placeholders |
| `--border` | `#E5E3DC` | Separators, input borders |
| `--border-strong` | `#C9C6BD` | Focused controls |
| `--accent` | `#1F6B4A` | Primary CTA, focus ring, nav indicator |
| `--accent-contrast` | `#F7FAF8` | Text on accent |
| `--accent-soft` | `#E8F2EC` | Selected filter item |
| `--success` | `#2D6A4F` | Completed status |
| `--success-soft` | `#E9F3EE` | Completed tint |
| `--danger` | `#9B3A3A` | Destructive / failed |
| `--danger-soft` | `#F6ECEC` | Failed tint |
| `--warning` | `#9A6B1F` | Pending / irreversible notice |
| `--warning-soft` | `#F7F0E4` | Pending tint |
| `--overlay` | `rgba(17,17,17,0.32)` | Modal scrim |

No gradients. No glass. No neon.

## Icons

- Navigation: monochrome line icons (20px)
- Assets: official-style circular crypto marks (BTC, ETH, USDT, USDC)
- Providers: restrained venue marks (Bybit, Binance, wallet)
- Action buttons may include a quiet line icon

## Components (reusable)

| Component | Notes |
|-----------|--------|
| `AppShell` | Padding, max-width 480px, bottom nav with icons |
| `BrandHeader` | Wordmark + account filter |
| `CustodyStrip` | Always-on custody summary |
| `PortfolioTotal` | Large balance + secondary approx |
| `ActionRow` | 3 equal soft buttons (Send / Receive / Exchange) |
| `AssetRow` | Icon, symbol, name, qty, fiat — spacing over heavy rules |
| `AccountCard` | Provider icon, nickname, custody, connected state |
| `SegmentedControl` | Quiet segments |
| `Amount` | Tabular numeral primitive |
| `Field` | Label + input / select, 14px radius, 48px height |
| `PrimaryButton` / secondary / soft / danger | 48px, 14px radius |
| `Sheet` | 24px radius |
| `ReviewSummary` | Fee + you-receive block |
| `StatusBadge` | pending / failed / completed — muted semantic tints |
| `EmptyState` | One sentence + one CTA |
| `TxRow` | Type, provider, network, amount, status |
| `ConversionHero` | From → To visual center on Exchange |

## Provider abstraction (UI layer)

```ts
interface CryptoProvider {
  readonly type: ProviderType;
  readonly custody: CustodyKind; // 'custodial' | 'non-custodial'
  connect(config): Promise<WalletAccount>;
  listBalances(accountId): Promise<AssetBalance[]>;
  getTransactions(accountId, filter): Promise<Transaction[]>;
  prepareSend(request): Promise<SendPreview>;
  submitSend(previewId): Promise<OperationResult>;
  getReceiveAddress(accountId, asset, network): Promise<ReceiveAddress>;
  prepareExchange(request): Promise<ExchangeQuote>;
  submitExchange(quoteId): Promise<OperationResult>;
}
```

## Accessibility

- Body contrast ≥ 4.5:1 on `--bg`
- Focus visible: 2px `--accent` ring / soft green halo on fields
- Touch targets ≥ 44px (controls 48px)
- Status not by color alone (text label required)
