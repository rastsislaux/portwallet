import type {
  OperationStatus,
  Transaction,
  WalletProduct,
} from './types';

export type ExchangeLegInput = {
  idBase: string;
  accountId: string;
  providerLabel: string;
  product?: WalletProduct;
  status: OperationStatus;
  fromSymbol: string;
  fromQuantity: number;
  toSymbol: string;
  toQuantity: number;
  fiatValueUsd: number;
  createdAt: string;
};

/**
 * Split a from→to exchange into debit (out) and credit (in) legs,
 * matching Funding↔UTA internal transfer dual-entry display.
 */
export function exchangeLegs(input: ExchangeLegInput): Transaction[] {
  const fromSymbol = input.fromSymbol.toUpperCase();
  const toSymbol = input.toSymbol.toUpperCase();
  if (!fromSymbol || !toSymbol) return [];
  if (!(input.fromQuantity > 0) || !(input.toQuantity > 0)) return [];
  if (!input.idBase) return [];

  const shared = {
    accountId: input.accountId,
    kind: 'exchange' as const,
    status: input.status,
    fiatValueUsd: input.fiatValueUsd,
    createdAt: input.createdAt,
    providerLabel: input.providerLabel,
    product: input.product,
  };

  return [
    {
      ...shared,
      id: `${input.idBase}_out`,
      assetSymbol: fromSymbol,
      quantity: input.fromQuantity,
      counterAssetSymbol: toSymbol,
      counterQuantity: input.toQuantity,
      direction: 'out',
    },
    {
      ...shared,
      id: `${input.idBase}_in`,
      assetSymbol: toSymbol,
      quantity: input.toQuantity,
      counterAssetSymbol: fromSymbol,
      counterQuantity: input.fromQuantity,
      direction: 'in',
    },
  ];
}

/** Always `spent→received`, regardless of which leg is displayed. */
export function exchangeRouteLabel(tx: Transaction): string | null {
  if (tx.kind !== 'exchange' || !tx.counterAssetSymbol) return null;
  if (tx.direction === 'in') {
    return `Exchange ${tx.counterAssetSymbol}→${tx.assetSymbol}`;
  }
  return `Exchange ${tx.assetSymbol}→${tx.counterAssetSymbol}`;
}
