import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@since_v1_pins';

export async function loadPinnedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

export async function togglePin(id: string, current: Set<string>): Promise<Set<string>> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {}
  return next;
}
