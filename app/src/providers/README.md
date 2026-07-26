# Providers

- `CryptoProvider` — contract in `../domain/CryptoProvider.ts`
- `bybit/BybitCryptoProvider` — live Bybit V5 API (Funding, UTA, Earn read-only, convert, transfer, withdraw, receive, card)
- `MockCryptoProvider` — UI prototype for Binance / non-custodial (and leftover mock flavours)

Each `connect()` call creates a distinct `WalletAccount`. The registry binds many accounts, including multiple of the same `ProviderType`.

## Bybit

Connect with API key + secret + server (mainnet / testnet / regional). Credentials stay in session memory only.

One connect creates separate Portwallet accounts for Funding, UTA, and Earn when the key/wallet types allow them (shared credentials via `providerInstanceId`).

On connect, the provider calls `/v5/user/query-api` and blocks actions that the key cannot perform (`Withdraw`, `AccountTransfer`, `ExchangeHistory`, `Earn`, `BitCard`, read-only).

Earn accounts are view-only; stake/redeem is not available in the app. Bybit Card is attached to the Funding account.

## Cards

Optional payment-card surface per account:

- `getCardCapability` — venue may not support cards (e.g. non-custodial)
- `listCards` / `getCardOperations` — issued cards and spend history
- `listFundingBalances` — funding-account coins used when balance is calculated (Bybit sums eligible assets instead of exposing a card balance)
