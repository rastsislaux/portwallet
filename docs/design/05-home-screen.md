# Portwallet — Polished Home Screen

## Intent

First viewport answers: whose money view this is, where custody lives, how much I have, what I can do, what’s in the bag. Nothing else.

## Layout (mobile 390 × 844 logical)

```
padding 24
┌ Portwallet                    All ▾ ┐  20px brand / quiet filter
│ Held by Bybit · 2 accounts          │  13px secondary
│                                     │  32 gap
│ 12,480.42                           │  44px tabular, weight 500
│ USD · ≈ 0.18 BTC                    │  13px tertiary
│                                     │  32 gap
│ ┌ Send ┐ ┌ Receive ┐ ┌ Exchange ┐   │  soft equal actions + line icons
│                                     │
│ Assets                              │  15px semibold section
│ ● BTC               0.12000000      │  circular asset icon
│   Bitcoin           8,210.00 USD    │  calm two-line row
│ ● ETH …                             │
└─────────────────────────────────────┘
bottom nav 68 — icons + labels; 2px accent bar on active
```

Desktop: same column, max-width 480, horizontal padding 36, flat warm-white field.

## Motion (subtle)

1. Asset list rows stagger-fade ~35ms on first paint (max 5 rows).
2. Account filter menu: 140ms opacity + 4px translate.
3. Action button: slight opacity + 0.5px press.
4. Screen enter: 180ms fade + 6px rise.

## Custody disclosure copy

- Single custodial provider type: `Held by Bybit · 2 accounts`
- Mixed: `Mixed custody · Bybit, Local wallet`
- Non-custodial only: `Non-custodial · 1 wallet`
Never “your keys” language for exchange accounts.

---

## Critique — generic AI patterns

| Risk | Present? | Fix |
|------|----------|-----|
| Purple/cyan gradient hero | No | Flat warm white only |
| Glassmorphism / glow | No | — |
| Oversized rounded cards wrapping balance | Tempting | **Rejected** — balance sits on background |
| Stat strip / fake analytics | Tempting | **Rejected** |
| Pill cluster filters | Mild | Quiet text + chevron |
| Decorative crypto illustration | No | Official-style asset marks only in list |
| Inter/Roboto default | Avoided | IBM Plex Sans |
| Dashboard multi-column | Avoided | Single column |
| Accent overuse | Risk | Accent on primary confirms + nav indicator; home actions soft/neutral |
| Brand too weak | Risk | Brand 20px / 600 first; balance is numeric anchor, not a marketing headline |

## Revision (visual polish)

1. Balance enlarged to 44px; tighter tracking for luxury numerals.
2. Soft equal actions with restrained line icons.
3. Asset rows: circular crypto icons, more vertical air, quieter separators.
4. Section titles: stronger sentence-case weight (not uppercase tracking).
5. Flat background — no wash gradient.
6. Controls: 48px height, 14px radius, trustworthy primary green.

Overall direction unchanged: calm unified wallet, multi-account honest custody, operational list.
