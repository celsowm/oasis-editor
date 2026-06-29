const STORAGE_KEY = "oasis-editor.recentShapes";
const MAX_RECENT = 12;

/**
 * Recently inserted shapes, most-recent first, persisted to `localStorage`.
 * All access is guarded so private mode / SSR / quota errors degrade to an
 * empty list rather than throwing.
 */
export function getRecentShapes(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

/** Record a freshly inserted shape, moving it to the front and de-duping. */
export function pushRecentShape(preset: string): string[] {
  const next = [
    preset,
    ...getRecentShapes().filter((p): boolean => p !== preset),
  ].slice(0, MAX_RECENT);
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Persistence is best-effort; ignore storage failures.
  }
  return next;
}
