import type { ProviderPermissionSnapshot } from '../../domain/types';

export type BybitApiKeyInfo = {
  readOnly: number;
  permissions: Record<string, string[] | undefined>;
  uta: number;
  isMaster: boolean;
  note?: string;
  userID?: number;
};

export function parseBybitPermissions(info: BybitApiKeyInfo): ProviderPermissionSnapshot {
  const wallet = info.permissions.Wallet ?? [];
  const exchange = info.permissions.Exchange ?? [];
  const earn = info.permissions.Earn ?? [];
  const bitCard = info.permissions.BitCard ?? [];

  const readOnly = info.readOnly === 1;

  return {
    readOnly,
    canWithdraw: !readOnly && wallet.includes('Withdraw'),
    canTransfer: !readOnly && wallet.includes('AccountTransfer'),
    canExchange: !readOnly && exchange.includes('ExchangeHistory'),
    canEarnRead: earn.includes('Earn'),
    canCard: bitCard.includes('BitCard'),
    canDepositRead: true,
    uta: info.uta === 1,
    isMaster: info.isMaster,
  };
}

export class PermissionDeniedError extends Error {
  constructor(action: string, detail?: string) {
    super(
      detail ??
        `This API key cannot ${action}. Update key permissions in Bybit, then reconnect.`,
    );
    this.name = 'PermissionDeniedError';
  }
}

export function assertCan(
  permissions: ProviderPermissionSnapshot | undefined,
  action: 'withdraw' | 'transfer' | 'exchange' | 'earnRead' | 'card' | 'write',
): void {
  if (!permissions) {
    throw new PermissionDeniedError(action, 'API key permissions are unknown. Reconnect the account.');
  }

  if (action === 'write' && permissions.readOnly) {
    throw new PermissionDeniedError('write', 'This API key is read-only.');
  }

  switch (action) {
    case 'withdraw':
      if (!permissions.canWithdraw) {
        throw new PermissionDeniedError(
          'withdraw',
          'Withdrawal requires Wallet → Withdraw permission (and a non-read-only key).',
        );
      }
      break;
    case 'transfer':
      if (!permissions.canTransfer) {
        throw new PermissionDeniedError(
          'transfer',
          'Internal transfers require Wallet → AccountTransfer permission.',
        );
      }
      break;
    case 'exchange':
      if (!permissions.canExchange) {
        throw new PermissionDeniedError(
          'exchange',
          'Convert/exchange requires Exchange → ExchangeHistory permission.',
        );
      }
      break;
    case 'earnRead':
      if (!permissions.canEarnRead) {
        throw new PermissionDeniedError(
          'read Earn',
          'Earn balances require Earn permission on the API key.',
        );
      }
      break;
    case 'card':
      if (!permissions.canCard) {
        throw new PermissionDeniedError(
          'access Bybit Card',
          'Bybit Card requires a separate read-only API key with only BitCard permission.',
        );
      }
      break;
    default:
      break;
  }
}
