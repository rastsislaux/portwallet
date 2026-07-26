import type { CryptoProvider } from '../domain/CryptoProvider';
import type { ProviderType } from '../domain/types';
import {
  createMockBinanceProvider,
  createMockBybitProvider,
  createMockNonCustodialProvider,
  MockCryptoProvider,
} from './MockCryptoProvider';

/**
 * Maps each WalletAccount to the CryptoProvider instance that owns it.
 * Multiple accounts may share a provider class but each connect() yields
 * a distinct account; we keep one provider object per venue factory slot
 * and allow many accounts on it.
 */
export class ProviderRegistry {
  private byAccountId = new Map<string, CryptoProvider>();
  private factories = new Map<ProviderType, CryptoProvider>();

  constructor() {
    this.factories.set('bybit', createMockBybitProvider());
    this.factories.set('binance', createMockBinanceProvider());
    this.factories.set('non_custodial', createMockNonCustodialProvider());
    this.factories.set('mock', new MockCryptoProvider('mock', 'Mock venue'));
  }

  getFactory(type: ProviderType): CryptoProvider {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`No provider registered for type: ${type}`);
    }
    return factory;
  }

  bindAccount(accountId: string, provider: CryptoProvider): void {
    this.byAccountId.set(accountId, provider);
  }

  unbindAccount(accountId: string): void {
    this.byAccountId.delete(accountId);
  }

  getForAccount(accountId: string): CryptoProvider {
    const provider = this.byAccountId.get(accountId);
    if (!provider) {
      throw new Error(`No provider bound for account: ${accountId}`);
    }
    return provider;
  }

  listAvailableTypes(): { type: ProviderType; label: string; custodyLabel: string }[] {
    return [
      { type: 'bybit', label: 'Bybit', custodyLabel: 'Custodial · exchange' },
      { type: 'binance', label: 'Binance', custodyLabel: 'Custodial · exchange' },
      {
        type: 'non_custodial',
        label: 'Non-custodial wallet',
        custodyLabel: 'Non-custodial · local',
      },
    ];
  }
}
