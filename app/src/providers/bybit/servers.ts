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
