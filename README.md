# Portwallet

Client-only UI prototype for a personal crypto wallet shell. Execution and custody stay with pluggable providers (Bybit, Binance, non-custodial wallets). The app does **not** take custody.

## Design

See [`docs/design/`](docs/design/) for information architecture, monochrome wireframes, hierarchy decisions, design tokens, and the polished home-screen critique.

## Provider model

```ts
interface CryptoProvider { /* connect, balances, send, receive, exchange, history */ }
class MockCryptoProvider implements CryptoProvider { /* prototype */ }
// Future: BybitCryptoProvider, BinanceCryptoProvider, NonCustodialCryptoProvider
```

Users can add **multiple providers**, including **multiple accounts of the same type**.

## Run

```bash
cd app
npm install
npm run dev
```

```bash
cd app
npm run build
```

Prototype boots with two mock Bybit accounts so multi-account aggregation is visible immediately. Add Binance or a non-custodial wallet from **Accounts**.
