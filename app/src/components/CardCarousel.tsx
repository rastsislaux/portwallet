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

export function CardCarousel({
  cards,
  selectedCardId,
  accountNickname,
  onSelect,
}: CardCarouselProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const ignoreScrollSelect = useRef(false);

  const cardIdsKey = useMemo(() => cards.map((c) => c.id).join('|'), [cards]);
  const selectedIndex = Math.max(
    0,
    cards.findIndex((c) => c.id === selectedCardId),
  );

  const scrollToIndex = useCallback(
    (index: number, smooth: boolean) => {
      const card = cards[index];
      if (!card) return;
      const node = itemRefs.current.get(card.id);
      if (!node) return;
      ignoreScrollSelect.current = true;
      node.scrollIntoView({
        behavior: smooth ? 'smooth' : 'instant',
        inline: 'center',
        block: 'nearest',
      });
      window.setTimeout(
        () => {
          ignoreScrollSelect.current = false;
        },
        smooth ? 420 : 50,
      );
    },
    [cards],
  );

  useEffect(() => {
    if (!selectedCardId || cards.length === 0) return;
    scrollToIndex(selectedIndex, false);
  }, [cardIdsKey, scrollToIndex, selectedCardId, selectedIndex, cards.length]);

  useEffect(() => {
    if (!selectedCardId) return;
    const rail = railRef.current;
    const item = itemRefs.current.get(selectedCardId);
    if (!rail || !item) return;
    const railCenter = rail.scrollLeft + rail.clientWidth / 2;
    const itemCenter = item.offsetLeft + item.offsetWidth / 2;
    if (Math.abs(railCenter - itemCenter) > item.offsetWidth * 0.35) {
      scrollToIndex(selectedIndex, true);
    }
  }, [selectedCardId, selectedIndex, scrollToIndex]);

  const onScroll = useCallback(() => {
    if (ignoreScrollSelect.current) return;
    const rail = railRef.current;
    if (!rail || cards.length === 0) return;
    const center = rail.scrollLeft + rail.clientWidth / 2;
    let bestId = cards[0].id;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const card of cards) {
      const node = itemRefs.current.get(card.id);
      if (!node) continue;
      const mid = node.offsetLeft + node.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = card.id;
      }
    }
    if (bestId !== selectedCardId) onSelect(bestId);
  }, [cards, onSelect, selectedCardId]);

  function go(delta: number) {
    const next = Math.min(cards.length - 1, Math.max(0, selectedIndex + delta));
    const card = cards[next];
    if (!card) return;
    onSelect(card.id);
    scrollToIndex(next, true);
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
        onScroll={onScroll}
        onKeyDown={onRailKeyDown}
      >
        {cards.map((card) => (
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
              onSelect={() => onSelect(card.id)}
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
            {cards.map((card, index) => (
              <button
                key={card.id}
                type="button"
                role="tab"
                aria-label={`Show card ${index + 1} of ${cards.length}`}
                aria-selected={card.id === selectedCardId}
                className={`card-carousel__dot${card.id === selectedCardId ? ' is-active' : ''}`}
                onClick={() => {
                  onSelect(card.id);
                  scrollToIndex(index, true);
                }}
              />
            ))}
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
