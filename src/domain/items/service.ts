import { SinceItem, CompletionEvent, EventPhoto, ExtractedReceiptData } from '../../types';
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
import { uploadEventPhoto } from '../events/upload';
import { processEventEvidence } from '../events/enrichment';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function migrateLocalItemsToCloud(): Promise<void> {
  try {
    const local = await loadItems();
    if (local.length === 0) return;
    await cloudUpsertMany(local);
  } catch {
    // Silent — items stay local until next sync
  }
}

/** Load from local cache immediately (no network). Used for instant startup display. */
export async function getLocalDerivedItems(): Promise<DerivedItem[]> {
  const items = await loadItems();
  return sortItems(items).map(deriveItem);
}

/** Fetch from cloud, fall back to local cache. Updates local cache on success. */
export async function getDerivedItems(): Promise<DerivedItem[]> {
  try {
    const items = await cloudLoadItems();
    await saveItems(items);
    return sortItems(items).map(deriveItem);
  } catch {
    const items = await loadItems();
    return sortItems(items).map(deriveItem);
  }
}

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
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const existing = await loadItems();
  await saveItems([...existing, item]);
  try { await cloudUpsertItem(item); } catch {}

  await scheduleItemNotifications(item);
  return deriveItem(item);
}

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

  await saveItems(items.map((i) => (i.id === itemId ? updated : i)));
  try { await cloudUpsertItem(updated); } catch {}

  await scheduleItemNotifications(updated);
  return deriveItem(updated);
}

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

  await saveItems(items.map((i) => (i.id === itemId ? updated : i)));
  try { await cloudUpsertItem(updated); } catch {}

  await scheduleItemNotifications(updated);
  return deriveItem(updated);
}

export interface LogEventInput {
  date: string;
  notes?: string | null;
  photoUri?: string | null;
}

export async function logEvent(itemId: string, input: LogEventInput): Promise<DerivedItem> {
  const items = await loadItems();
  const existing = items.find((i) => i.id === itemId);
  if (!existing) throw new Error(`Item not found: ${itemId}`);

  const eventId = generateId();
  let photos: EventPhoto[] = [];
  let extractedData: ExtractedReceiptData | null = null;
  let hederaTxId: string | null = null;

  if (input.photoUri) {
    const storagePath = await uploadEventPhoto(input.photoUri, itemId, eventId);
    photos = [{ id: generateId(), storagePath, uploadedAt: new Date().toISOString() }];

    try {
      const result = await processEventEvidence({
        itemId,
        eventId,
        storagePath,
        eventDate: input.date,
        itemName: existing.name,
        category: existing.category,
      });
      extractedData = result.extractedData;
      hederaTxId = result.hederaTxId;
    } catch {
      // Enrichment failed — event still saves with the photo
    }
  }

  const event: CompletionEvent = {
    id: eventId,
    date: input.date,
    notes: input.notes ?? null,
    photos,
    extractedData,
    hederaTxId,
  };

  const updated: SinceItem = {
    ...existing,
    lastDoneDate: input.date,
    history: [event, ...existing.history],
    updatedAt: new Date().toISOString(),
  };

  await saveItems(items.map((i) => (i.id === itemId ? updated : i)));
  try { await cloudUpsertItem(updated); } catch {}

  await scheduleItemNotifications(updated);
  return deriveItem(updated);
}

export async function deleteItem(itemId: string): Promise<void> {
  const items = await loadItems();
  const remaining = items.filter((i) => i.id !== itemId);
  await saveItems(remaining);
  try { await cloudDeleteItem(itemId); } catch {}
  await rescheduleAllNotifications(remaining);
}
