// NOTE: The `notes` column requires a one-time Supabase migration:
//   ALTER TABLE items ADD COLUMN notes text;
// Run this in your Supabase project → SQL Editor before using the Notes feature.

import { supabase } from '../../lib/supabase';
import { SinceItem, CompletionEvent, RepeatUnit } from '../../types';

interface ItemRow {
  id: string;
  user_id: string;
  name: string;
  category: string;
  last_done_date: string;
  history: unknown;
  repeat_value: number | null;
  repeat_unit: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToItem(row: ItemRow): SinceItem {
  const history = Array.isArray(row.history)
    ? (row.history as CompletionEvent[])
    : [];
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    lastDoneDate: row.last_done_date,
    history,
    repeatValue: row.repeat_value,
    repeatUnit: row.repeat_unit as RepeatUnit | null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function currentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

function itemToRow(item: SinceItem, userId: string): Omit<ItemRow, never> {
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    category: item.category,
    last_done_date: item.lastDoneDate,
    history: item.history,
    repeat_value: item.repeatValue,
    repeat_unit: item.repeatUnit,
    notes: item.notes ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export async function cloudLoadItems(): Promise<SinceItem[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as ItemRow[]).map(rowToItem);
}

export async function cloudUpsertItem(item: SinceItem): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from('items').upsert(itemToRow(item, userId));
  if (error) throw error;
}

export async function cloudUpsertMany(items: SinceItem[]): Promise<void> {
  if (items.length === 0) return;
  const userId = await currentUserId();
  const rows = items.map((item) => itemToRow(item, userId));
  const { error } = await supabase.from('items').upsert(rows);
  if (error) throw error;
}

export async function cloudDeleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}
