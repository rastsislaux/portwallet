import type { BybitServerId } from '../../domain/types';

export type BybitServerOption = {
  id: BybitServerId;
  label: string;
  baseUrl: string;
};

export const BYBIT_SERVERS: BybitServerOption[] = [
  { id: 'mainnet', label: 'Mainnet', baseUrl: 'https://api.bybit.com' },
  { id: 'testnet', label: 'Testnet', baseUrl: 'https://api-testnet.bybit.com' },
  { id: 'mainnet_nl', label: 'Netherlands', baseUrl: 'https://api.bybit.nl' },
  { id: 'mainnet_eu', label: 'EEA (EU)', baseUrl: 'https://api.bybit.eu' },
  { id: 'mainnet_tr', label: 'Turkey', baseUrl: 'https://api.bybit.tr' },
  { id: 'mainnet_ae', label: 'UAE', baseUrl: 'https://api.bybit.ae' },
  { id: 'mainnet_kz', label: 'Kazakhstan', baseUrl: 'https://api.bybit.kz' },
  { id: 'mainnet_id', label: 'Indonesia', baseUrl: 'https://api.bybit.id' },
];

export function getBybitServer(id: BybitServerId): BybitServerOption {
  const found = BYBIT_SERVERS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown Bybit server: ${id}`);
  return found;
}

/** Website API Management page for creating keys (not the REST host). */
export function getBybitApiManagementUrl(serverId: BybitServerId): string {
  switch (serverId) {
    case 'testnet':
      return 'https://testnet.bybit.com/app/user/api-management';
    case 'mainnet_nl':
      return 'https://www.bybit.nl/app/user/api-management';
    case 'mainnet_eu':
      return 'https://www.bybit.eu/app/user/api-management';
    case 'mainnet_tr':
      return 'https://www.bybit.tr/app/user/api-management';
    case 'mainnet_ae':
      return 'https://www.bybit.ae/app/user/api-management';
    case 'mainnet_kz':
      return 'https://www.bybit.kz/app/user/api-management';
    case 'mainnet_id':
      return 'https://www.bybit.id/app/user/api-management';
    case 'mainnet':
    default:
      return 'https://www.bybit.com/app/user/api-management';
  }
}
