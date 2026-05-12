import { SinceItem, CompletionEvent } from '../../types';

export const STORAGE_VERSION = 1;

interface StorageEnvelope {
  version: number;
  items: unknown[];
}

function isRawItem(x: unknown): x is Record<string, unknown> {
  if (!x || typeof x !== 'object') return false;
  const obj = x as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.lastDoneDate === 'string' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  );
}

/**
 * Add default fields introduced in later versions so old stored items
 * always satisfy the current SinceItem shape.
 */
function hydrate(raw: Record<string, unknown>): SinceItem {
  const item = raw as unknown as SinceItem;

  // history was added after v0 — seed from lastDoneDate so users see at least one entry
  if (!Array.isArray(item.history)) {
    const seed: CompletionEvent = {
      id: `${item.id}_seed`,
      date: item.lastDoneDate,
    };
    return { ...item, history: [seed] };
  }

  return item;
}

/**
 * Parse raw JSON from AsyncStorage into a validated, hydrated SinceItem array.
 *
 * Handles two formats:
 *   - Legacy: bare array (written before versioning)
 *   - Current: { version: number; items: SinceItem[] } envelope
 *
 * Items that fail validation are silently dropped rather than crashing.
 * Future schema migrations can be added here as version numbers increase.
 */
export function parseAndMigrate(raw: string): SinceItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  let candidates: unknown[];

  if (Array.isArray(parsed)) {
    // Legacy bare-array format (v0)
    candidates = parsed;
  } else if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'version' in parsed &&
    'items' in parsed
  ) {
    const envelope = parsed as StorageEnvelope;
    candidates = Array.isArray(envelope.items) ? envelope.items : [];
    // Add future migration steps here: if (envelope.version < 2) { ... }
  } else {
    return [];
  }

  return candidates.filter(isRawItem).map(hydrate);
}

export function toEnvelope(items: SinceItem[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, items });
}
