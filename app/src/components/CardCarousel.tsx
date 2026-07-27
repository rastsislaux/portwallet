import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PaymentCard } from './PaymentCard';
import type { ProviderCard } from '../domain/types';

type CardCarouselProps = {
  cards: ProviderCard[];
  selectedCardId: string | null;
  accountNickname: (card: ProviderCard) => string;
  onSelect: (cardId: string) => void;
};

function itemScrollLeft(rail: HTMLElement, node: HTMLElement): number {
  const railRect = rail.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  return nodeRect.left - railRect.left + rail.scrollLeft;
}

export function CardCarousel({
  cards,
  selectedCardId,
  accountNickname,
  onSelect,
}: CardCarouselProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const ignoreScrollSelect = useRef(false);
  const ignoreTimer = useRef<number | null>(null);
  const settleTimer = useRef<number | null>(null);

  const cardIdsKey = useMemo(() => cards.map((c) => c.id).join('|'), [cards]);
  const selectedIndex = Math.max(
    0,
    cards.findIndex((c) => c.id === selectedCardId),
  );

  const nearestIndex = useCallback(() => {
    const rail = railRef.current;
    if (!rail || cards.length === 0) return 0;
    const center = rail.scrollLeft + rail.clientWidth / 2;
    let bestIndex = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const node = itemRefs.current.get(card.id);
      if (!node) return;
      const mid = itemScrollLeft(rail, node) + node.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = index;
      }
    });
    return bestIndex;
  }, [cards]);

  const scrollToIndex = useCallback(
    (index: number, smooth: boolean) => {
      const rail = railRef.current;
      const card = cards[index];
      if (!rail || !card) return;
      const node = itemRefs.current.get(card.id);
      if (!node) return;

      const itemLeft = itemScrollLeft(rail, node);
      const target = Math.max(
        0,
        Math.min(
          rail.scrollWidth - rail.clientWidth,
          itemLeft - (rail.clientWidth - node.offsetWidth) / 2,
        ),
      );

      ignoreScrollSelect.current = true;
      if (ignoreTimer.current !== null) {
        window.clearTimeout(ignoreTimer.current);
      }

      rail.scrollTo({
        left: target,
        behavior: smooth ? 'smooth' : 'auto',
      });

      ignoreTimer.current = window.setTimeout(
        () => {
          if (Math.abs(rail.scrollLeft - target) > 2) {
            rail.scrollLeft = target;
          }
          ignoreScrollSelect.current = false;
          ignoreTimer.current = null;
        },
        smooth ? 500 : 50,
      );
    },
    [cards],
  );

  useEffect(() => {
    if (!selectedCardId || cards.length === 0) return;
    scrollToIndex(selectedIndex, false);
  }, [cardIdsKey]);

  useEffect(() => {
    return () => {
      if (ignoreTimer.current !== null) {
        window.clearTimeout(ignoreTimer.current);
      }
      if (settleTimer.current !== null) {
        window.clearTimeout(settleTimer.current);
      }
    };
  }, []);

  const selectByIndex = useCallback(
    (index: number, smooth: boolean) => {
      const card = cards[index];
      if (!card) return;
      onSelect(card.id);
      scrollToIndex(index, smooth);
    },
    [cards, onSelect, scrollToIndex],
  );

  const syncSelectionFromScroll = useCallback(() => {
    if (ignoreScrollSelect.current || cards.length === 0) return;
    const index = nearestIndex();
    const id = cards[index]?.id;
    if (id && id !== selectedCardId) onSelect(id);
  }, [cards, nearestIndex, onSelect, selectedCardId]);

  const settleToNearest = useCallback(() => {
    if (ignoreScrollSelect.current || cards.length === 0) return;
    const index = nearestIndex();
    const card = cards[index];
    if (!card) return;

    const rail = railRef.current;
    const node = itemRefs.current.get(card.id);
    if (!rail || !node) {
      if (card.id !== selectedCardId) onSelect(card.id);
      return;
    }

    const itemLeft = itemScrollLeft(rail, node);
    const target = Math.max(
      0,
      Math.min(
        rail.scrollWidth - rail.clientWidth,
        itemLeft - (rail.clientWidth - node.offsetWidth) / 2,
      ),
    );
    const offSnap = Math.abs(rail.scrollLeft - target) > 4;

    if (card.id !== selectedCardId || offSnap) {
      selectByIndex(index, true);
    }
  }, [cards, nearestIndex, onSelect, selectByIndex, selectedCardId]);

  const onRailScroll = useCallback(() => {
    syncSelectionFromScroll();
    if (settleTimer.current !== null) {
      window.clearTimeout(settleTimer.current);
    }
    settleTimer.current = window.setTimeout(() => {
      settleTimer.current = null;
      settleToNearest();
    }, 100);
  }, [settleToNearest, syncSelectionFromScroll]);

  function go(delta: number) {
    const next = Math.min(cards.length - 1, Math.max(0, selectedIndex + delta));
    if (next === selectedIndex) return;
    selectByIndex(next, true);
  }

  function onRailKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    }
  }

  if (cards.length === 0) return null;

  return (
    <div className="card-carousel">
      <div
        ref={railRef}
        className="card-rail"
        role="list"
        aria-label="Payment cards"
        tabIndex={cards.length > 1 ? 0 : undefined}
        onScroll={onRailScroll}
        onScrollEnd={settleToNearest}
        onKeyDown={onRailKeyDown}
      >
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="card-rail__item"
            role="listitem"
            ref={(node) => {
              if (node) itemRefs.current.set(card.id, node);
              else itemRefs.current.delete(card.id);
            }}
          >
            <PaymentCard
              card={card}
              accountNickname={accountNickname(card)}
              selected={card.id === selectedCardId}
              onSelect={() => selectByIndex(index, true)}
            />
          </div>
        ))}
      </div>

      {cards.length > 1 ? (
        <div className="card-carousel__controls">
          <button
            type="button"
            className="card-carousel__nav"
            aria-label="Previous card"
            disabled={selectedIndex <= 0}
            onClick={() => go(-1)}
          >
            <ChevronLeft size={18} strokeWidth={2.25} aria-hidden />
          </button>
          <div className="card-carousel__dots" role="tablist" aria-label="Card pages">
            {cards.map((card, index) => {
              const active = card.id === selectedCardId;
              return (
                <button
                  key={card.id}
                  type="button"
                  role="tab"
                  aria-label={`Show card ${index + 1} of ${cards.length}`}
                  aria-selected={active}
                  className={`card-carousel__dot${active ? ' is-active' : ''}`}
                  onClick={() => selectByIndex(index, true)}
                />
              );
            })}
          </div>
          <button
            type="button"
            className="card-carousel__nav"
            aria-label="Next card"
            disabled={selectedIndex >= cards.length - 1}
            onClick={() => go(1)}
          >
            <ChevronRight size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
