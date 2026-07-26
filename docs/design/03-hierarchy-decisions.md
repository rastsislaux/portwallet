# Portwallet — Hierarchy Decisions

## Screen reading order (Home)

1. **Brand** — “Portwallet” is the first signal; not an eyebrow above a louder headline.
2. **Custody disclosure** — immediately under brand so trust is established before numbers.
3. **Portfolio total** — single largest numeric element; answers “what do I have?” in under five seconds.
4. **Primary actions** — Send / Receive / Exchange as equal peers; no fake “featured” promo.
5. **Asset list** — operational scan: symbol, quantity, fiat. No sparklines, no 24h noise.

## Why this order

- Apple Wallet–like stack: identity → value → act → inventory.
- Linear-like restraint: separators and spacing carry structure instead of card chrome.
- Wise-like operations: fee and final amount appear before irreversible confirm.
- Stripe-like data: tabular numerals, quiet labels, precise rows.
- Phantom-like assets: flat list, high scan speed, minimal decoration.

## Multi-provider consequences

- Account filter sits at the top-right of Home — secondary to brand, but always reachable.
- Custody strip aggregates truthfully (“Held by Bybit · 2 accounts” / “Mixed custody”).
- Asset detail breaks down holdings per account when the same asset exists in more than one.
- Activity rows always name the provider instance.

## Density

Moderately dense: 4px base scale, list rows ~56–64px, screen padding 20/32. Enough air to stay calm; not sparse “hero marketing” emptiness.

## Motion

Only state transitions: tab change fade, sheet present, status badge settle, button press opacity. No ambient loops, no number slot-machine on load.
