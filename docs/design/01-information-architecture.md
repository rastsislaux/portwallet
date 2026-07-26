# Portwallet — Information Architecture

## Product framing

Portwallet is a **personal crypto wallet shell**. Execution and custody live behind pluggable providers (Bybit, Binance, non-custodial wallet, etc.). The UI never pretends custody differs from what the active provider actually is.

Users may connect **multiple providers**, including **several of the same type** (e.g. two Bybit accounts). Each connection is a distinct *wallet account* with its own label, custody disclosure, balances, and history.

## Mental model

```
Portwallet (app shell)
└── Wallet accounts[]          ← user-added providers (N of any type)
    ├── Provider instance      ← Bybit #1, Bybit #2, Binance, Local wallet…
    ├── Custody disclosure     ← custodial / non-custodial (truthful)
    ├── Assets[]
    ├── Operations (send / receive / exchange)
    └── Transactions[]
```

Aggregated home view sums across selected accounts (default: all). Per-account filter is always available.

## Primary navigation (mobile-first)

Bottom bar, four destinations + overflow for account management:

| Tab        | Purpose                                      |
|------------|----------------------------------------------|
| Home       | Portfolio value, actions, asset list         |
| Activity   | Transaction history + pending/failed         |
| Exchange   | Convert between assets                       |
| Accounts   | Manage providers, custody labels, add/remove |

Send / Receive are **actions**, not tabs. They open from Home (or asset detail) as focused flows.

## Screen map

### 1. Home
- Brand + optional account filter chip
- Custody summary strip (e.g. “Held by Bybit · 2 accounts”)
- Total portfolio value (selected accounts)
- Primary actions: Send · Receive · Exchange
- Asset list (searchable when > ~8 assets)
- Empty state → Add account

### 2. Asset detail
- Asset name, total qty, fiat value
- Breakdown by account/provider when multi-account holds the asset
- Actions: Send · Receive · Exchange
- Recent activity for this asset

### 3. Send
Steps: Asset → Amount → Destination → Review (fees + final amount) → Confirm → Result  
Destination types distinguished: internal transfer, exchange sub-account move, on-chain withdrawal (network named explicitly).

### 4. Receive
Asset → Account (if multi) → Network (explicit) → Address / QR + copy · warnings inline (not tooltip-only)

### 5. Exchange
From / To · Amount · Quote (rate, fee, you receive) · Review → Confirm → Result  
Advanced trading details behind progressive disclosure.

### 6. Activity
Unified timeline across selected accounts. Filters: All / Pending / Failed / Completed.  
Each row shows type (transfer / internal / withdrawal / exchange), status, provider, network when relevant.

### 7. Accounts
List of connected wallet accounts with custody badge, nickname, last sync.  
Add account → choose provider type → mock connect → nickname.  
Remove requires confirmation.

### 8. Operation result / problem states
Success, pending, failed — each states what happened, what to do next, and links to Activity.

## Object model (UI abstractions)

- `CryptoProvider` — capability interface for a custody/execution backend
- `WalletAccount` — a concrete connected instance (`providerId`, `instanceId`, nickname, custody kind)
- `AssetBalance`, `Quote`, `Transaction`, `Network` — shared domain types
- `MockCryptoProvider` — prototype implementation; future: `BybitCryptoProvider`, `BinanceCryptoProvider`, `NonCustodialCryptoProvider`

## What we deliberately omit

Trading terminals, order books, analytics dashboards, promotional banners, fake charts, nested settings mazes. Every surface answers: value, find asset, act, verify, or diagnose.
