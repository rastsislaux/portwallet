# Providers

- `CryptoProvider` — contract in `../domain/CryptoProvider.ts`
- `bybit/BybitCryptoProvider` — live Bybit V5 API (Funding, UTA, Earn read-only, convert, transfer, withdraw, receive, card)
- `MockCryptoProvider` — UI prototype for Binance / non-custodial (and leftover mock flavours)

Each `connect()` call creates a distinct `WalletAccount`. The registry binds many accounts, including multiple of the same `ProviderType`.

## Bybit

Connect with API key + secret + server (mainnet / testnet / regional). Credentials are persisted in browser local storage by the wallet layer and restored on reload.

One connect creates separate Portwallet accounts for Funding, UTA, and Earn when the key/wallet types allow them (shared credentials via `providerInstanceId`).

On connect, the provider calls `/v5/user/query-api` and blocks actions that the key cannot perform (`Withdraw`, `AccountTransfer`, `ExchangeHistory`, `Earn`, `BitCard`, read-only).

BitCard is typically not available on a read-write trading key. Pass optional `cardApiKey` / `cardApiSecret` (a read-only key with only Bybit Card permission), or attach them later via `attachCardCredentials`. Card endpoints use that client when present.

Earn accounts are view-only; stake/redeem is not available in the app. Bybit Card is attached to the Funding account.

## Cards

Optional payment-card surface per account:

- `getCardCapability` — venue may not support cards (e.g. non-custodial)
- `listCards` / `getCardOperations` — issued cards and spend history
- `listFundingBalances` — funding-account coins used when balance is calculated (Bybit sums eligible assets instead of exposing a card balance)

### Bybit card transaction query quirk

`POST /v5/card/transaction/query-asset-records` only accepts `type: "SIDE_QUERY_AUTH"`. Values such as `SIDE_QUERY_FINANCIAL` and `SIDE_QUERY_REFUND` are rejected as invalid parameters (despite appearing in older samples). Portwallet therefore queries only `SIDE_QUERY_AUTH`.

Responses are cached briefly on the connection so `listCards` and `getCardOperations` share one fetch. The REST client retries `retCode` `10006` (rate limit) using `X-Bapi-Limit-Reset-Timestamp` when present; unrecoverable failures keep prior card data and surface a warning on the Cards screen.
