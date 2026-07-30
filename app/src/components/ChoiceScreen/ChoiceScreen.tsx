import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CryptoIcon, IconBack, IconCheck, IconSearch, IconX } from '../icons';
import type { ChoiceOption } from './types';

type ChoiceScreenProps = {
  title: string;
  options: ChoiceOption[];
  value: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

function matchesQuery(option: ChoiceOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    option.title.toLowerCase().includes(q) ||
    (option.subtitle?.toLowerCase().includes(q) ?? false) ||
    option.id.toLowerCase().includes(q)
  );
}

export function ChoiceScreen({
  title,
  options,
  value,
  searchPlaceholder = 'Search',
  emptyMessage = 'No matches',
  onSelect,
  onClose,
}: ChoiceScreenProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const filtered = useMemo(
    () => options.filter((option) => matchesQuery(option, query)),
    [options, query],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: 0 });
  }, [query]);

  return createPortal(
    <div className="choice-screen" role="dialog" aria-modal="true" aria-label={title}>
      <div className="choice-screen__column">
        <div className="choice-screen__header">
          <button type="button" className="back-link" onClick={onClose}>
            <IconBack size={20} />
            Back
          </button>
          <h1 className="screen-title">{title}</h1>
          <label className="choice-screen__search">
            <IconSearch size={18} className="choice-screen__search-icon" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              aria-label={searchPlaceholder}
            />
            {query ? (
              <button
                type="button"
                className="choice-screen__clear"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              >
                <IconX size={16} />
              </button>
            ) : null}
          </label>
        </div>

        <div ref={listRef} className="choice-screen__list" role="listbox" aria-label={title}>
          {filtered.map((option) => {
            const selected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                className="choice-row"
                data-selected={selected ? 'true' : 'false'}
                onClick={() => {
                  onSelect(option.id);
                  onClose();
                }}
              >
                {option.iconSymbol ? (
                  <span className="choice-row__icon">
                    <CryptoIcon symbol={option.iconSymbol} size={40} decorative />
                  </span>
                ) : null}
                <span className="choice-row__text">
                  <span className="choice-row__title">{option.title}</span>
                  {option.subtitle ? (
                    <span className="choice-row__subtitle">{option.subtitle}</span>
                  ) : null}
                </span>
                {selected ? (
                  <span className="choice-row__check">
                    <IconCheck size={18} />
                  </span>
                ) : (
                  <span className="choice-row__check" aria-hidden="true" />
                )}
              </button>
            );
          })}
          {filtered.length === 0 ? (
            <div className="choice-screen__empty">{emptyMessage}</div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
