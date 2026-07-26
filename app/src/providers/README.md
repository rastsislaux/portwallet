# Providers

- `CryptoProvider` — contract in `../domain/CryptoProvider.ts`
- `MockCryptoProvider` — UI prototype implementation (Bybit / Binance / non-custodial flavours via constructor)
- Future: `BybitCryptoProvider`, `BinanceCryptoProvider`, `NonCustodialCryptoProvider`

Each `connect()` call creates a distinct `WalletAccount`. The registry binds many accounts, including multiple of the same `ProviderType`.
