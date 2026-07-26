# Portwallet

Client-only UI prototype for a personal crypto wallet shell. Execution and custody stay with pluggable providers (Bybit, Binance, non-custodial wallets). The app does **not** take custody.

## Design

See [`docs/design/`](docs/design/) for information architecture, monochrome wireframes, hierarchy decisions, design tokens, and the polished home-screen critique.

## Provider model

```ts
interface CryptoProvider { /* connect, balances, send, receive, exchange, history, cards */ }
class BybitCryptoProvider implements CryptoProvider { /* live Bybit V5 */ }
class MockCryptoProvider implements CryptoProvider { /* Binance / non-custodial prototype */ }
```

Users can add **multiple providers**, including **multiple accounts of the same type**.

### Bybit

Connect from **Accounts** with API key, secret, and server (mainnet, testnet, or regional). Keys stay in the browser session only. On connect, Portwallet reads key permissions and blocks withdraw / transfer / exchange / card actions the key cannot perform.

One Bybit connect creates separate accounts for Funding, UTA, and Earn (when permitted). Supports receive, internal transfer, on-chain withdraw, convert/exchange, and Bybit Card on the Funding account (spend balance from eligible funding coins). Earn is view-only.

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

Start with an empty portfolio, then connect a Bybit account from **Accounts**. Binance and non-custodial remain mock prototypes.

## Deploy

Pushes to `main` build the Vite app and publish it to GitHub Pages via [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

Site: https://rastsislaux.github.io/portwallet/

If Pages is not live yet, open **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**, then re-run the **Deploy GitHub Pages** workflow.
