import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatFiat, formatQty } from '../components/Amount';
import { CardCarousel } from '../components/CardCarousel';
import { CryptoIcon } from '../components/icons';
import { StatusBadge } from '../components/StatusBadge';
import type { CardOperation, ProviderCard } from '../domain/types';
import { useSettings } from '../state/SettingsContext';
import { useWallet } from '../state/WalletContext';

export function CardsScreen() {
  const {
    ready,
    accounts,
    cards,
    cardOperations,
    accountCardStatuses,
    fundingByAccountId,
    cardWarnings,
    refresh,
    isRefreshing,
  } = useWallet();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useEffect(() => {
    if (cards.length === 0) {
      setSelectedCardId(null);
      return;
    }
    if (!selectedCardId || !cards.some((c) => c.id === selectedCardId)) {
      setSelectedCardId(cards[0].id);
    }
  }, [cards, selectedCardId]);

  const selectedCard = useMemo(
    () => cards.find((c) => c.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  );

  const selectedOps = useMemo(() => {
    if (!selectedCard) return [];
    return cardOperations.filter((op) => op.cardId === selectedCard.id);
  }, [cardOperations, selectedCard]);

  const accountById = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, a]));
    return map;
  }, [accounts]);

  const unsupported = accountCardStatuses.filter((s) => !s.capability.supported);
  const supportedWithoutCards = accountCardStatuses.filter(
    (s) => s.capability.supported && s.cards.length === 0,
  );

  if (!ready) {
    return (
      <section className="screen">
        <header className="header-block">
          <h1 className="screen-title">Cards</h1>
        </header>
        <p className="loading-line">Loading cards…</p>
      </section>
    );
  }

  if (accounts.length === 0) {
    return (
      <section className="screen">
        <header className="header-block">
          <h1 className="screen-title">Cards</h1>
        </header>
        <div className="empty">
          <p>Connect an exchange account to see provider cards.</p>
          <Link className="btn btn--primary" to="/accounts">
            Add account
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="screen screen--cards">
      <header className="header-block header-block--row">
        <div>
          <h1 className="screen-title">Cards</h1>
          <p className="custody-strip">
            {cards.length === 0
              ? 'No cards on connected accounts'
              : `${cards.length} card${cards.length === 1 ? '' : 's'} across providers`}
            {isRefreshing ? ' · Updating…' : ''}
          </p>
        </div>
        <button
          type="button"
          className="btn btn--text"
          disabled={isRefreshing}
          onClick={() => {
            void refresh();
          }}
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {cardWarnings.length > 0 ? (
        <div className="notice notice--warning card-warning" role="status">
          <div className="card-warning__body">
            {cardWarnings.map((warning) => (
              <p key={warning.accountId}>{warning.message}</p>
            ))}
          </div>
          <button
            type="button"
            className="btn btn--text"
            onClick={() => {
              void refresh();
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      {cards.length > 0 ? (
        <CardCarousel
          cards={cards}
          selectedCardId={selectedCardId}
          accountNickname={(card) =>
            accountById.get(card.accountId)?.nickname ?? card.label
          }
          onSelect={setSelectedCardId}
        />
      ) : (
        <div className="empty empty--compact">
          <p>None of your connected accounts have issued cards yet.</p>
        </div>
      )}

      {selectedCard ? (
        <CardDetail
          card={selectedCard}
          accountNickname={
            accountById.get(selectedCard.accountId)?.nickname ?? selectedCard.label
          }
          funding={fundingByAccountId[selectedCard.accountId] ?? []}
          operations={selectedOps}
          activityDegraded={cardWarnings.some(
            (w) => w.accountId === selectedCard.accountId,
          )}
        />
      ) : null}

      {supportedWithoutCards.length > 0 || unsupported.length > 0 ? (
        <div className="section-block">
          <div className="section-label">Accounts</div>
          <div className="grouped-list">
            {supportedWithoutCards.map(({ account }) => (
              <div key={account.id} className="grouped-row">
                <div className="grouped-row__body">
                  <div className="grouped-row__title">{account.nickname}</div>
                  <div className="grouped-row__meta">
                    {account.venueLabel} supports cards · none issued for this account
                  </div>
                </div>
              </div>
            ))}
            {unsupported.map(({ account, capability }) => (
              <div key={account.id} className="grouped-row">
                <div className="grouped-row__body">
                  <div className="grouped-row__title">{account.nickname}</div>
                  <div className="grouped-row__meta">
                    {capability.unsupportedReason ??
                      `${account.venueLabel} does not support cards`}
                  </div>
                  {account.providerType === 'bybit' &&
                  account.product === 'FUND' &&
                  !account.permissions?.canCard ? (
                    <Link className="btn btn--text" to="/accounts">
                      Add Bybit Card key
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CardDetail({
  card,
  accountNickname,
  funding,
  operations,
  activityDegraded,
}: {
  card: ProviderCard;
  accountNickname: string;
  funding: ReturnType<typeof useWallet>['fundingByAccountId'][string];
  operations: CardOperation[];
  activityDegraded: boolean;
}) {
  const { formatFromUsd } = useSettings();
  const eligibleFunding = funding.filter((f) => f.cardEligible);

  return (
    <div className="section-block card-detail">
      <div className="card-balance-panel">
        <div className="card-balance-panel__label">Available to spend</div>
        <div className="card-balance-panel__value tabular">
          {formatFiat(card.balanceUsd)}
          <span className="card-balance-panel__currency"> {card.currency}</span>
        </div>
        <p className="card-balance-panel__source">
          {card.balanceSource === 'calculated'
            ? `Calculated from ${accountNickname} funding · ${card.fundingAssetSymbols.join(' + ') || 'eligible coins'}`
            : `Reported by ${accountNickname}`}
        </p>

        {card.balanceSource === 'calculated' && eligibleFunding.length > 0 ? (
          <div className="funding-breakdown">
            {eligibleFunding.map((asset) => (
              <div key={asset.symbol} className="funding-breakdown__row">
                <span className="funding-breakdown__asset">
                  <CryptoIcon symbol={asset.symbol} name={asset.name} size={24} decorative />
                  {asset.symbol}
                </span>
                <span className="tabular">
                  {formatQty(asset.quantity, asset.symbol === 'USDT' || asset.symbol === 'USDC' ? 2 : 8)} ·{' '}
                  {formatFromUsd(asset.fiatValueUsd)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="section-block">
        <div className="section-eyebrow">Recent card activity</div>
        {operations.length === 0 ? (
          <div className="empty empty--compact">
            <p>
              {activityDegraded
                ? 'Card activity could not be refreshed right now.'
                : 'No operations on this card yet.'}
            </p>
          </div>
        ) : (
          <div className="tx-list">
            {operations.map((op) => (
              <div key={op.id} className="tx-row">
                {op.assetSymbol ? (
                  <span className="tx-row__icon">
                    <CryptoIcon symbol={op.assetSymbol} size={32} decorative />
                  </span>
                ) : null}
                <span className="tx-row__title">
                  {labelCardKind(op.kind)}
                  {op.merchant ? ` · ${op.merchant}` : ''}
                </span>
                <span className="tx-row__amount tabular">
                  {signedFiat(op)}
                </span>
                <span className="tx-row__meta">
                  {op.providerLabel}
                  {op.assetSymbol ? ` · ${op.assetSymbol}` : ''}
                  {op.failureReason ? ` · ${op.failureReason}` : ''}
                </span>
                <span className="tx-row__status">
                  <StatusBadge status={op.status} />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function labelCardKind(kind: CardOperation['kind']): string {
  switch (kind) {
    case 'purchase':
      return 'Purchase';
    case 'refund':
      return 'Refund';
    case 'atm':
      return 'ATM';
    case 'fee':
      return 'Fee';
    case 'top_up':
      return 'Top up';
    default:
      return kind;
  }
}

function signedFiat(op: CardOperation): string {
  const amount = formatFiat(op.amountFiat);
  if (op.kind === 'refund' || op.kind === 'top_up') return `+${amount}`;
  return `−${amount}`;
}
