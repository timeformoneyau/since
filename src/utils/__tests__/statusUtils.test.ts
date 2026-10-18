import { SinceItem } from '../../types';
import { sortItems, computeItemStatus, secondaryLine } from '../statusUtils';
import { formatStorage } from '../dateUtils';
import { subDays } from 'date-fns';

function item(id: string, daysAgo: number, repeat: { value: number; unit: 'days' | 'months' } | null): SinceItem {
  const date = formatStorage(subDays(new Date(), daysAgo));
  return {
    id,
    name: id,
    category: 'Other',
    lastDoneDate: date,
    history: [{ id: `${id}_e`, date }],
    repeatValue: repeat?.value ?? null,
    repeatUnit: repeat?.unit ?? null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('tracked-only items', () => {
  it('have no status label and read "No repeat set"', () => {
    const status = computeItemStatus(item('haircut', 20, null));
    expect(status.label).toBeNull();
    expect(status.daysSince).toBe(20);
    expect(secondaryLine(status)).toBe('No repeat set');
  });

  it('sort after repeating items, longest-ago first', () => {
    const sorted = sortItems([
      item('tracked-recent', 3, null),
      item('all-good', 1, { value: 6, unit: 'months' }),
      item('tracked-old', 40, null),
      item('overdue', 40, { value: 7, unit: 'days' }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(['overdue', 'all-good', 'tracked-old', 'tracked-recent']);
  });
});
