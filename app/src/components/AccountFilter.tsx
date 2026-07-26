import { useEffect, useRef, useState } from 'react';
import { useWallet } from '../state/WalletContext';
import { IconChevronDown, ProviderIcon } from './icons';

export function AccountFilter() {
  const { accounts, filter, setFilter } = useWallet();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const label =
    filter === 'all'
      ? 'All'
      : (accounts.find((a) => a.id === filter)?.nickname ?? 'Account');

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onPointer);
    return () => window.removeEventListener('mousedown', onPointer);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="filter-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <IconChevronDown size={14} strokeWidth={2} />
      </button>
      {open ? (
        <div className="filter-menu" role="listbox">
          <button
            type="button"
            data-active={filter === 'all' ? 'true' : 'false'}
            onClick={() => {
              setFilter('all');
              setOpen(false);
            }}
          >
            All accounts
          </button>
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              data-active={filter === account.id ? 'true' : 'false'}
              onClick={() => {
                setFilter(account.id);
                setOpen(false);
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ProviderIcon type={account.providerType} size={28} />
                <span>
                  {account.nickname}
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', fontWeight: 400 }}>
                    {account.venueLabel}
                  </div>
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
