# Portwallet — Polished Home Screen

## Intent

First viewport answers: whose money view this is, where custody lives, how much I have, what I can do, what’s in the bag. Nothing else.

## Layout (mobile 390 × 844 logical)

```
padding 20
┌ Portwallet                    All ▾ ┐  15/13 meta filter
│ Held by Bybit · 2 accounts          │  13px secondary, full width
│                                     │  24 gap
│ 12,480.42                           │  38px tabular
│ USD · ≈ 0.18 BTC                    │  13px tertiary
│                                     │  24 gap
│ ┌ Send ┐ ┌ Receive ┐ ┌ Exchange ┐   │  equal 10px radius, hairline
│─────────────────────────────────────│  16 gap then rule
│ Assets                              │  13px uppercase tracking slight
│ BTC                 0.12000000      │
│ Bitcoin             8,210.00 USD    │  two-line row, separator
│ ETH …                               │
└─────────────────────────────────────┘
bottom nav 64 — Home active (accent bar 2px, not filled neon pill)
```

Desktop: same column, max-width 480, horizontal padding 32, ambient wash full bleed behind the column.

## Motion (subtle)

1. Asset list rows stagger-fade 40ms on first paint (max 5 rows).
2. Account filter menu: 120ms opacity + 4px translate.
3. Action button: opacity 0.72 while pressed.

## Custody disclosure copy

- Single custodial provider type: `Held by Bybit · 2 accounts`
- Mixed: `Mixed custody · Bybit, Local wallet`
- Non-custodial only: `Non-custodial · 1 wallet`
Never “your keys” language for exchange accounts.

---

## Critique — generic AI patterns

| Risk | Present? | Fix |
|------|----------|-----|
| Purple/cyan gradient hero | No | Keep warm stone wash only |
| Glassmorphism / glow | No | — |
| Oversized rounded cards wrapping balance | Tempting | **Rejected** — balance sits on background; actions are flat bordered controls, not cards-in-cards |
| Stat strip (24h %, PnL, gas) | Tempting | **Rejected** — not daily-wallet-critical |
| Pill cluster filters | Mild risk on “All” | Keep as quiet text button with chevron |
| Floating badges on hero | No | — |
| Decorative crypto illustration | No | — |
| Inter/Roboto default | Avoided | IBM Plex Sans |
| Dashboard multi-column | Avoided | Single column |
| Accent overuse | Risk | Accent only on primary CTA fill (Exchange entry uses secondary on Home; Send is secondary outline; actually Home actions should be equal — all secondary outline, or one default). **Revision:** all three actions equal outline; accent reserved for Confirm in flows and active nav indicator |
| Brand too weak | Risk if title competes | Balance is large but brand remains first line; no separate marketing headline |

## Revision (applied)

1. Remove any “Portfolio” screen title competing with brand — brand *is* the title.
2. Equal-weight Send / Receive / Exchange (outline); accent reserved for irreversible confirms + nav indicator.
3. Asset rows: symbol left, qty top-right, fiat bottom-right; no mini charts.
4. Custody strip never collapses into an info icon.
5. Slightly tighten balance → actions gap from 32 → 24 for daily-use density.
6. Post-implementation polish: brand mark 17px (stronger first signal); solid nav surface (no translucent mix); asset quantities keep operational precision (BTC/ETH ≥4 dp, stables 2 dp).

Overall direction unchanged: calm neutral wallet, multi-account honest custody, operational list.
