# Portwallet — Design System

## Principles

Calm, trustworthy, precise, understated. Whitespace and typography over cards. One restrained accent. Tabular numerals for money. Craft over decoration.

## Typography

| Role | Size | Weight | Notes |
|------|------|--------|-------|
| Screen title / brand | 34px / 40px | Bold (700) | Tight tracking |
| Section titles | 22px / 28px | Semibold (600) | Sentence case |
| Balance | 62px | Medium (500) | Decimal lighter (400) |
| Asset ticker | 20px / 26px | Semibold | |
| Asset name / body | 16px / 22–24px | Regular | |
| Metadata | 15px / 22px | Regular | |
| Captions | 13px / 18px | Regular | Currency labels, custody |

Family: **IBM Plex Sans** with `tabular-nums` for money.

## Spacing rhythm (8pt)

| Scale | Use |
|-------|-----|
| 40–48px | Large section gaps (balance → actions, actions → assets) |
| 24px | Medium gaps |
| 12–16px | Small gaps (icon → text, card padding) |
| 6–8px | Tiny gaps (title → subtitle, icon → label) |

Screen padding: 24px · top 40px (desktop 40/48).

## Radii scale

`8 · 12 · 16 · 18 · 20 · 24`

- Soft actions: 16px
- Inputs / primary controls: **18px**
- Account passes: 20px
- Sheets: **24px**

## Color

Warmer stone field. Darker muted green accent. Desaturated status colors. Nothing vibrant.

| Token | Value |
|-------|-------|
| `--bg` | `#F4F1EA` |
| `--bg-elevated` | `#FBFAF7` |
| `--bg-surface` | `#F7F4ED` |
| `--ink` | `#171614` |
| `--ink-secondary` | `#6A675F` |
| `--ink-tertiary` | `#9A968C` |
| `--ink-quaternary` | `#B5B1A6` |
| `--accent` | `#184F3A` |
| `--success` | `#3D6B55` |
| `--warning` | `#8F6A2E` |
| `--danger` | `#8F4545` |

No gradients. No glass. Inputs: no shadows — focus is a single accent border.

## Components

- **Primary actions (Home):** Apple Wallet–like soft controls, 42px, low contrast fill, larger icons as one optical unit with labels
- **Asset rows:** on-page list (no cards), 44px icons at ~90% saturation, Contacts-like spacing
- **Inputs:** 56px, 18px radius, custom chevron, generous padding
- **Conversion hero:** large coin marks + tickers; vertical air; purpose of Exchange
- **Account cards:** warm pass surfaces, tiny Connected badge, quiet Remove
- **Bottom nav:** page-blended background; inactive nearly disappears; active ink-dark
