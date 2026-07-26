# Providers

- `CryptoProvider` — contract in `../domain/CryptoProvider.ts`
- `MockCryptoProvider` — UI prototype implementation (Bybit / Binance / non-custodial flavours via constructor)
- Future: `BybitCryptoProvider`, `BinanceCryptoProvider`, `NonCustodialCryptoProvider`

Each `connect()` call creates a distinct `WalletAccount`. The registry binds many accounts, including multiple of the same `ProviderType`.

## Cards

Optional payment-card surface per account:

- `getCardCapability` — venue may not support cards (e.g. non-custodial)
- `listCards` / `getCardOperations` — issued cards and spend history
- `listFundingBalances` — funding-account coins used when balance is calculated (Bybit sums eligible assets instead of exposing a card balance)