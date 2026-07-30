import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assetChoiceOptions, networkChoiceOptions } from './buildOptions';
import { ChoiceScreen } from './ChoiceScreen';
import type { ChoiceOption } from './types';

const options: ChoiceOption[] = [
  { id: 'BTC', title: 'BTC', subtitle: 'Bitcoin', iconSymbol: 'BTC' },
  { id: 'ETH', title: 'ETH', subtitle: 'Ethereum', iconSymbol: 'ETH' },
  { id: 'USDT', title: 'USDT', subtitle: 'Tether', iconSymbol: 'USDT' },
];

afterEach(() => {
  cleanup();
});

describe('assetChoiceOptions', () => {
  it('dedupes symbols and prefers aggregated names', () => {
    const result = assetChoiceOptions(
      [
        {
          assetId: 'btc',
          symbol: 'BTC',
          name: 'Bitcoin',
          quantity: 1,
          fiatValueUsd: 1,
          accountId: 'a1',
        },
        {
          assetId: 'btc',
          symbol: 'BTC',
          name: 'Bitcoin',
          quantity: 2,
          fiatValueUsd: 2,
          accountId: 'a2',
        },
        {
          assetId: 'eth',
          symbol: 'ETH',
          name: 'Ether',
          quantity: 1,
          fiatValueUsd: 1,
          accountId: 'a1',
        },
      ],
      [
        {
          assetId: 'btc',
          symbol: 'BTC',
          name: 'Bitcoin',
          quantity: 3,
          fiatValueUsd: 3,
          accountIds: ['a1', 'a2'],
        },
      ],
    );

    expect(result).toEqual([
      {
        id: 'BTC',
        title: 'BTC',
        subtitle: 'Bitcoin',
        iconSymbol: 'BTC',
      },
      {
        id: 'ETH',
        title: 'ETH',
        subtitle: 'Ether',
        iconSymbol: 'ETH',
      },
    ]);
  });
});

describe('networkChoiceOptions', () => {
  it('maps networks with optional chain subtitle', () => {
    expect(
      networkChoiceOptions(
        [
          { id: 'USDT:ETH', name: 'Ethereum (ERC20)', chain: 'ETH' },
          { id: 'USDT:TRX', name: 'TRC20', chain: 'TRX' },
        ],
        'USDT',
      ),
    ).toEqual([
      {
        id: 'USDT:ETH',
        title: 'Ethereum (ERC20)',
        subtitle: 'ETH',
        iconSymbol: 'USDT',
      },
      {
        id: 'USDT:TRX',
        title: 'TRC20',
        subtitle: 'TRX',
        iconSymbol: 'USDT',
      },
    ]);
  });
});

describe('ChoiceScreen', () => {
  it('filters by search and selects an option', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <ChoiceScreen
        title="Select asset"
        options={options}
        value="BTC"
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Select asset' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /BTC/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.type(screen.getByRole('searchbox'), 'ethereum');
    const list = screen.getByRole('listbox');
    expect(within(list).getAllByRole('option')).toHaveLength(1);
    expect(within(list).getByRole('option', { name: /ETH/i })).toBeInTheDocument();

    await user.click(within(list).getByRole('option', { name: /ETH/i }));
    expect(onSelect).toHaveBeenCalledWith('ETH');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <ChoiceScreen
        title="Select network"
        options={options}
        value="BTC"
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
