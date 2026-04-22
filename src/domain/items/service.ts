/**
 * Item Service — single entry point for all item mutations.
 *
 * Source of truth: Supabase (cloud).
 * Local AsyncStorage: read cache for offline / fast startup display.
 *
 * Write operations require connectivity and will throw on network failure.
 * Read operations fall back to local cache when offline.
 */

import { SinceItem, CompletionEvent } from '../../types';
import { CreateItemInput, UpdateItemInput, DerivedItem } from './types';
import { loadItems, saveItems } from './storage';
import { deriveItem } from './derive';
import { sortItems } from '../../utils/statusUtils';
import { todayString } from '../../utils/dateUtils';
import {
  cloudLoadItems,
  cloudUpsertItem,
  cloudUpsertMany,
  cloudDeleteItem,
} from './cloudStorage';
import {
  scheduleItemNotifications,
  rescheduleAllNotifications,
} from '../../notifications/scheduler';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * On first sign-in, upload any locally-stored items to the cloud.
 * Uses upsert so it's safe to call multiple times.
 */
export async function migrateLocalItemsToCloud(): Promise<void> {
  try {
    const local = await loadItems();
    if (local.length === 0) return;
    await cloudUpsertMany(local);
  } catch {
    // Silent — items stay local and will sync on next successful operation
  }
}

/** Fetch all items. Tries cloud first; falls back to local cache when offline. */
export async function getDerivedItems(): Promise<DerivedItem[]> {
  try {
    const items = await cloudLoadItems();
    await saveItems(items); // update cache
    return sortItems(items).map(deriveItem);
  } catch {
    const items = await loadItems();
    return sortItems(items).map(deriveItem);
  }
}

/** Fetch a single item by ID. Tries cloud first; falls back to local cache. */
export async function getDerivedItemById(itemId: string): Promise<DerivedItem | null> {
  try {
    const items = await cloudLoadItems();
    await saveItems(items);
    const item = items.find((i) => i.id === itemId);
    return item ? deriveItem(item) : null;
  } catch {
    const items = await loadItems();
    const item = items.find((i) => i.id === itemId);
    return item ? deriveItem(item) : null;
  }
}

/** Create a new item with an initial history entry. */
export async function createItem(input: CreateItemInput): Promise<DerivedItem> {
  const now = new Date().toISOString();
  const initialEvent: CompletionEvent = { id: generateId(), date: input.lastDoneDate };
  const item: SinceItem = {
    id: generateId(),
    name: input.name,
    category: input.category,
    lastDoneDate: input.lastDoneDate,
    history: [initialEvent],
    repeatValue: input.repeatValue,
    repeatUnit: input.repeatUnit,
    createdAt: now,
    updatedAt: now,
  };

  await cloudUpsertItem(item);

  // Update local cache
  const existing = await loadItems();
  await saveItems([...existing, item]);

  await scheduleItemNotifications(item);
  return deriveItem(item);
}

/**
 * Update metadata fields (name, category, repeat, lastDoneDate).
 * Does NOT add a history entry — use markItemDone for completions.
 */
export async function updateItem(itemId: string, updates: UpdateItemInput): Promise<DerivedItem> {
  const items = await loadItems();
  const existing = items.find((i) => i.id === itemId);
  if (!existing) throw new Error(`Item not found: ${itemId}`);

  const updated: SinceItem = {
    ...existing,
    ...updates,
    id: existing.id,
    history: existing.history,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await cloudUpsertItem(updated);
  await saveItems(items.map((i) => (i.id === itemId ? updated : i)));
  await scheduleItemNotifications(updated);
  return deriveItem(updated);
}

/**
 * Record a completion event. Prepends to history and updates lastDoneDate.
 * This is the only path that grows the history log.
 */
export async function markItemDone(itemId: string, doneDate?: string): Promise<DerivedItem> {
  const date = doneDate ?? todayString();
  const items = await loadItems();
  const existing = items.find((i) => i.id === itemId);
  if (!existing) throw new Error(`Item not found: ${itemId}`);

  const event: CompletionEvent = { id: generateId(), date };
  const updated: SinceItem = {
    ...existing,
    lastDoneDate: date,
    history: [event, ...existing.history],
    updatedAt: new Date().toISOString(),
  };

  await cloudUpsertItem(updated);
  await saveItems(items.map((i) => (i.id === itemId ? updated : i)));
  await scheduleItemNotifications(updated);
  return deriveItem(updated);
}

/**
 * Delete an item and recompute notifications for the remaining set.
 */
export async function deleteItem(itemId: string): Promise<void> {
  await cloudDeleteItem(itemId);
  const items = await loadItems();
  const remaining = items.filter((i) => i.id !== itemId);
  await saveItems(remaining);
  await rescheduleAllNotifications(remaining);
}
