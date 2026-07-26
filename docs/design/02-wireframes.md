# Portwallet — Monochrome Wireframes

Compositional references only (Apple Wallet hierarchy, Linear spacing, Wise flows, Stripe precision, Phantom asset list). Not clones.

Legend: `[ ]` control · `---` separator · `···` truncated · CAPS = primary label weight

---

## A. Home

```
┌──────────────────────────────────────┐
│ Portwallet              [All ▾]      │  brand left, account filter right
│ Held by Bybit · 2 accounts           │  custody disclosure (always visible)
│                                      │
│ 12,480.42 USD                        │  main balance — largest type
│ ≈ 0.18 BTC                           │  secondary total (metadata)
│                                      │
│ [ Send ]  [ Receive ]  [ Exchange ]  │  equal primary actions
│──────────────────────────────────────│
│ ASSETS                          ···  │
│ BTC          0.12000000    8,210.00  │  symbol · qty (tabular) · fiat
│ ETH          1.45000000    3,920.10  │
│ USDT       350.00000000      350.32  │
│──────────────────────────────────────│
│ ○ Home   ○ Activity   ○ Exchange     │
│ ○ Accounts                           │
└──────────────────────────────────────┘
```

Hierarchy: brand → custody truth → total → act → list.

---

## B. Asset detail

```
┌──────────────────────────────────────┐
│ ← Bitcoin                            │
│                                      │
│ 0.12000000 BTC                       │
│ 8,210.00 USD                         │
│                                      │
│ [ Send ]  [ Receive ]  [ Exchange ]  │
│──────────────────────────────────────│
│ HELD IN                              │
│ Personal Bybit          0.10000000   │
│ Cold-ish Bybit          0.02000000   │
│──────────────────────────────────────│
│ RECENT                               │
│ Received · Bybit          +0.0200    │
│ Sent · Withdrawal ETH    −0.0050     │
└──────────────────────────────────────┘
```

---

## C. Send — Review (critical screen)

```
┌──────────────────────────────────────┐
│ ← Review send                        │
│                                      │
│ You send                             │
│ 0.05000000 BTC                       │
│                                      │
│ To                                   │
│ bc1q…9k2a · Bitcoin                  │  network named explicitly
│ Withdrawal · on-chain                │  type distinguished inline
│                                      │
│──────────────────────────────────────│
│ Network fee           0.00001200 BTC │
│ You will receive      0.04998800 BTC │  fees + final before confirm
│ Arrives in ~20 min                   │  risk/timing not hidden
│──────────────────────────────────────│
│ This cannot be reversed once sent.   │  irreversible warning visible
│                                      │
│ [ Cancel ]           [ Confirm send ]│
└──────────────────────────────────────┘
```

---

## D. Receive

```
┌──────────────────────────────────────┐
│ ← Receive                            │
│                                      │
│ Asset     [ BTC ▾ ]                  │
│ Account   [ Personal Bybit ▾ ]       │
│ Network   [ Bitcoin ▾ ]              │  explicit network
│                                      │
│           ┌─────────┐                │
│           │  QR     │                │
│           └─────────┘                │
│ bc1q…9k2a              [ Copy ]      │
│──────────────────────────────────────│
│ Only send Bitcoin (BTC) on Bitcoin   │
│ network to this address. Other       │
│ assets or networks may be lost.      │
└──────────────────────────────────────┘
```

---

## E. Exchange — Quote

```
┌──────────────────────────────────────┐
│ Exchange                             │
│                                      │
│ From  [ BTC ▾ ]     0.01000000       │
│ To    [ USDT ▾ ]                     │
│──────────────────────────────────────│
│ Rate        1 BTC = 68,420.00 USDT   │
│ Fee                    2.05 USDT     │
│ You receive          682.15 USDT     │
│ Via Personal Bybit                   │
│──────────────────────────────────────│
│ ▸ Details (spread, min amount)       │  progressive disclosure
│                                      │
│ [ Review exchange ]                  │
└──────────────────────────────────────┘
```

---

## F. Activity

```
┌──────────────────────────────────────┐
│ Activity              [All ▾]        │
│ [ All | Pending | Failed | Done ]    │  text segmented, not pill soup
│──────────────────────────────────────│
│ Pending                              │
│ Exchange BTC→USDT · Bybit    …       │
│──────────────────────────────────────│
│ Today                                │
│ Withdrawal BTC · Bitcoin   −0.05     │
│ Failed · insufficient fee            │
│ Received USDT · Internal     +200    │
└──────────────────────────────────────┘
```

---

## G. Accounts

```
┌──────────────────────────────────────┐
│ Accounts                             │
│                                      │
│ Personal Bybit                       │
│ Custodial · Bybit · Connected        │
│──────────────────────────────────────│
│ Trading Bybit                        │
│ Custodial · Bybit · Connected        │  same type, second instance
│──────────────────────────────────────│
│ Ledger-style                         │
│ Non-custodial · Local · Connected    │
│──────────────────────────────────────│
│ [ + Add account ]                    │
└──────────────────────────────────────┘
```

Add account sheet: provider type → nickname → connect (mock) → disclosure of custody model before finish.
