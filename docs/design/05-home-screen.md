# Portwallet — Polished Home Screen

## Intent

First viewport answers: whose money view this is, where custody lives, how much I have, what I can do, what’s in the bag. Nothing else. The balance is the visual center.

## Layout

```
padding-top 40
┌ Portwallet (34 bold)          All ▾ ┐
│ Held by… (13 quaternary)            │
│                                     │  40 gap → balance presence
│ 15,875.42                           │  62 medium; decimal lighter
│ USD · ≈ 0.232 BTC                   │  13 quaternary — very quiet
│                                     │  48 gap
│  Send     Receive     Exchange      │  42px soft Wallet-like actions
│                                     │  48 gap
│ Assets (22 semibold)                │
│ ● BTC (44)          0.1550          │  Contacts-like rows
│   Bitcoin           10,605.10 USD   │
└─────────────────────────────────────┘
nav 72 — blended into page; inactive nearly disappears
```

## Motion

1. Asset rows stagger-fade ~35ms (max 5).
2. Filter menu: 140ms opacity + 4px translate.
3. Soft button press opacity.
4. Screen enter: 180ms fade + 6px rise.
