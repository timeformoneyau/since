import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@since_v1_custom_categories';

export async function loadCustomCategories(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function saveCustomCategories(cats: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(cats));
}

export async function addCustomCategory(name: string): Promise<string[]> {
  const existing = await loadCustomCategories();
  const trimmed = name.trim();
  if (!trimmed || existing.includes(trimmed)) return existing;
  const updated = [...existing, trimmed];
  await saveCustomCategories(updated);
  return updated;
}
