import type { AggregatedAsset, AssetBalance, NetworkInfo } from '../../domain/types';
import type { ChoiceOption } from './types';

export function assetChoiceOptions(
  balances: AssetBalance[],
  assets?: AggregatedAsset[],
): ChoiceOption[] {
  const names = new Map<string, string>();
  if (assets) {
    for (const asset of assets) {
      names.set(asset.symbol, asset.name);
    }
  }
  for (const balance of balances) {
    if (!names.has(balance.symbol)) {
      names.set(balance.symbol, balance.name);
    }
  }

  return [...names.entries()]
    .map(([symbol, name]) => ({
      id: symbol,
      title: symbol,
      subtitle: name !== symbol ? name : undefined,
      iconSymbol: symbol,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function networkChoiceOptions(
  networks: Array<Pick<NetworkInfo, 'id' | 'name'> & { chain?: string }>,
  assetSymbol?: string,
): ChoiceOption[] {
  return networks.map((network) => ({
    id: network.id,
    title: network.name,
    subtitle: network.chain && network.chain !== network.name ? network.chain : undefined,
    iconSymbol: assetSymbol,
  }));
}
