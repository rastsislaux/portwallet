# Portwallet — Design System

## Principles

Calm, trustworthy, compact, precise, operational. Whitespace and 1px separators over cards. One accent. Tabular numerals for money.

## Typography

- Family: **IBM Plex Sans** (single sans; excellent tabular figures via `font-variant-numeric: tabular-nums`)
- Body: 15px / 22px
- Metadata: 13px / 18px
- Screen title: 24px / 30px, weight 560
- Main balance: 38px / 44px, weight 500, tabular
- Row primary: 15px medium
- Row secondary: 13px regular, muted

## Spacing (4px base)

`4, 8, 12, 16, 24, 32, 48`

- Screen padding: 20px mobile · 32px desktop (≥880px)
- Section gap: 24px
- List row padding: 12px 0
- Control height: 44px (touch)

## Radii & borders

- Control radius: 10px
- Dialog / sheet radius: 16px
- Border: 1px solid `var(--border)`
- No multi-layer shadows; optional 1px hairline elevation only on sheets

## Color tokens

Restrained warm-neutral field with one ink-olive accent (not purple, not cyan neon).

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#F3F1EC` | App background |
| `--bg-elevated` | `#FAF9F6` | Sheets, inputs |
| `--bg-muted` | `#EAE7E0` | Pressed / segmented track |
| `--ink` | `#161616` | Primary text |
| `--ink-secondary` | `#5C5A54` | Secondary text |
| `--ink-tertiary` | `#8A877E` | Meta, placeholders |
| `--border` | `#D9D5CC` | Separators, input borders |
| `--border-strong` | `#B8B3A8` | Focused controls |
| `--accent` | `#2F5D4A` | Primary CTA, focus ring |
| `--accent-contrast` | `#F7F5F0` | Text on accent |
| `--accent-soft` | `#E4EDE8` | Selected segment |
| `--danger` | `#8B2E2E` | Destructive / failed |
| `--danger-soft` | `#F3E4E4` | Failed row tint |
| `--warning` | `#8A5A18` | Pending / irreversible notice |
| `--warning-soft` | `#F5EDDC` | Pending tint |
| `--success` | `#2F5D4A` | Completed (shares accent family) |
| `--overlay` | `rgba(22,22,22,0.36)` | Modal scrim |

Background atmosphere: soft vertical wash `#F7F5F0 → #EFEBE3` (no image collage, no glass).

## Components (reusable)

| Component | Notes |
|-----------|--------|
| `AppShell` | Padding, max-width 480px centered on desktop, bottom nav |
| `BrandHeader` | Wordmark + optional trailing control |
| `CustodyStrip` | Always-on custody summary |
| `PortfolioTotal` | Large balance + secondary approx |
| `ActionRow` | 3 equal text buttons (Send / Receive / Exchange) |
| `AssetRow` | Symbol, name, qty, fiat — separator below |
| `AccountRow` | Nickname, custody badge, provider type, status |
| `SegmentedControl` | Text segments, not pill clusters |
| `Amount` | Tabular numeral primitive |
| `Field` | Label + input / select, 10px radius |
| `PrimaryButton` / `SecondaryButton` / `DangerButton` | 44px |
| `Sheet` | 16px radius dialog/sheet |
| `ReviewSummary` | Fee + you-receive block |
| `StatusBadge` | pending / failed / completed — quiet text+tint |
| `EmptyState` | One sentence + one CTA |
| `TxRow` | Type, provider, network, amount, status |

## Provider abstraction (UI layer)

```ts
interface CryptoProvider {
  readonly type: ProviderType;
  readonly custody: CustodyKind; // 'custodial' | 'non-custodial'
  connect(config): Promise<WalletAccount>;
  listBalances(accountId): Promise<AssetBalance[]>;
  getTransactions(accountId, filter): Promise<Transaction[]>;
  prepareSend(request): Promise<SendPreview>; // includes fee + final
  submitSend(previewId): Promise<OperationResult>;
  getReceiveAddress(accountId, asset, network): Promise<ReceiveAddress>;
  prepareExchange(request): Promise<ExchangeQuote>;
  submitExchange(quoteId): Promise<OperationResult>;
}
```

Registry holds many `WalletAccount`s; each points at a provider instance. UI never assumes a single provider.

## Accessibility

- Body contrast ≥ 4.5:1 on `--bg`
- Focus visible: 2px `--accent` ring
- Touch targets ≥ 44px
- Status not by color alone (text label required)
