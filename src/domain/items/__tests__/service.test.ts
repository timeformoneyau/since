import { SinceItem } from '../../../types';
import { saveItems, loadItems } from '../storage';
import { cloudUpsertItem, cloudDeleteItem } from '../cloudStorage';
import { scheduleItemNotifications, rescheduleAllNotifications } from '../../../notifications/scheduler';
import {
  createItem,
  markItemDone,
  undoMarkDone,
  canUndoDone,
  deleteItem,
  restoreItem,
  onItemsChanged,
} from '../service';

// In-memory local cache in place of AsyncStorage
jest.mock('../storage', () => {
  let store: unknown[] = [];
  return {
    loadItems: jest.fn(async () => store),
    saveItems: jest.fn(async (items: unknown[]) => { store = items; }),
  };
});
jest.mock('../cloudStorage', () => ({
  cloudLoadItems: jest.fn(),
  cloudUpsertItem: jest.fn(async () => {}),
  cloudUpsertMany: jest.fn(async () => {}),
  cloudDeleteItem: jest.fn(async () => {}),
}));
jest.mock('../../../notifications/scheduler', () => ({
  scheduleItemNotifications: jest.fn(async () => {}),
  rescheduleAllNotifications: jest.fn(async () => {}),
}));

function makeItem(overrides: Partial<SinceItem> = {}): SinceItem {
  return {
    id: 'item1',
    name: 'Car service',
    category: 'Auto',
    lastDoneDate: '2026-01-10',
    history: [{ id: 'e0', date: '2026-01-10' }],
    repeatValue: 6,
    repeatUnit: 'months',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(async () => {
  await saveItems([]);
  jest.clearAllMocks();
});

describe('optional repeat (tracked only)', () => {
  it('creates an item with no repeat and no status label', async () => {
    const created = await createItem({
      name: 'Haircut',
      category: 'Other',
      lastDoneDate: '2026-03-01',
      repeatValue: null,
      repeatUnit: null,
    });

    expect(created.repeatValue).toBeNull();
    expect(created.repeatUnit).toBeNull();
    expect(created.status.label).toBeNull();
    expect(created.status.nextDueDate).toBeNull();
    expect(created.history).toHaveLength(1);
    expect(cloudUpsertItem).toHaveBeenCalledWith(expect.objectContaining({ repeatValue: null }));
    expect(await loadItems()).toHaveLength(1);
  });
});

describe('undo done', () => {
  it('restores the previous lastDoneDate and history after marking done', async () => {
    const original = makeItem();
    await saveItems([original]);

    const done = await markItemDone('item1', '2026-04-01');
    expect(done.lastDoneDate).toBe('2026-04-01');
    expect(done.history).toHaveLength(2);

    const undone = await undoMarkDone('item1', done.history[0].id, original.lastDoneDate);
    expect(undone.lastDoneDate).toBe('2026-01-10');
    expect(undone.history).toEqual(original.history);
    expect(undone.repeatValue).toBe(6);
    expect(undone.repeatUnit).toBe('months');

    // Cloud, cache and reminders all see the restored state
    expect(cloudUpsertItem).toHaveBeenLastCalledWith(expect.objectContaining({ lastDoneDate: '2026-01-10' }));
    expect((await loadItems())[0]).toMatchObject({ lastDoneDate: '2026-01-10', history: original.history });
    expect(scheduleItemNotifications).toHaveBeenLastCalledWith(expect.objectContaining({ lastDoneDate: '2026-01-10' }));
  });

  it('restores the exact previous lastDoneDate even if it was edited away from history', async () => {
    // lastDoneDate edited on the Edit screen, so it no longer matches history[0]
    await saveItems([makeItem({ lastDoneDate: '2026-02-02' })]);
    const done = await markItemDone('item1', '2026-04-01');
    const undone = await undoMarkDone('item1', done.history[0].id, '2026-02-02');
    expect(undone.lastDoneDate).toBe('2026-02-02');
  });

  it('falls back to the newest remaining entry when no previous date is given', async () => {
    await saveItems([
      makeItem({
        lastDoneDate: '2026-04-01',
        history: [
          { id: 'e2', date: '2026-04-01' },
          { id: 'e1', date: '2026-02-15' },
          { id: 'e0', date: '2026-01-10' },
        ],
      }),
    ]);
    const undone = await undoMarkDone('item1', 'e2');
    expect(undone.lastDoneDate).toBe('2026-02-15');
    expect(undone.history.map((e) => e.id)).toEqual(['e1', 'e0']);
  });

  it('never removes the only (creation) entry', async () => {
    const original = makeItem();
    await saveItems([original]);
    expect(canUndoDone(original)).toBe(false);

    const result = await undoMarkDone('item1', 'e0');
    expect(result.history).toHaveLength(1);
    expect(result.lastDoneDate).toBe('2026-01-10');
    expect(cloudUpsertItem).not.toHaveBeenCalled();
  });

  it('is a no-op for an entry that is already gone (e.g. Undo tapped twice)', async () => {
    await saveItems([makeItem()]);
    const done = await markItemDone('item1', '2026-04-01');
    await undoMarkDone('item1', done.history[0].id, '2026-01-10');
    jest.clearAllMocks();

    const again = await undoMarkDone('item1', done.history[0].id, '2026-01-10');
    expect(again.history).toHaveLength(1);
    expect(cloudUpsertItem).not.toHaveBeenCalled();
  });

  it('notifies listeners so an open list can refresh', async () => {
    await saveItems([makeItem()]);
    const done = await markItemDone('item1', '2026-04-01');
    const listener = jest.fn();
    const unsubscribe = onItemsChanged(listener);
    await undoMarkDone('item1', done.history[0].id, '2026-01-10');
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('undo delete', () => {
  it('puts a deleted item back with the same id, history and repeat', async () => {
    const original = makeItem({
      history: [
        { id: 'e1', date: '2026-02-15' },
        { id: 'e0', date: '2026-01-10' },
      ],
      lastDoneDate: '2026-02-15',
    });
    const other = makeItem({ id: 'item2', name: 'Dentist' });
    await saveItems([original, other]);

    const removed = await deleteItem('item1');
    expect(removed).toEqual(original);
    expect(cloudDeleteItem).toHaveBeenCalledWith('item1');
    expect(await loadItems()).toHaveLength(1);

    const restored = await restoreItem(removed!);
    expect(restored).toMatchObject({
      id: 'item1',
      lastDoneDate: '2026-02-15',
      history: original.history,
      repeatValue: 6,
      repeatUnit: 'months',
    });
    const cached = await loadItems();
    expect(cached.map((i) => i.id).sort()).toEqual(['item1', 'item2']);
    expect(cloudUpsertItem).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'item1' }));
    expect(rescheduleAllNotifications).toHaveBeenLastCalledWith(cached);
  });
});
