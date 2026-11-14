/**
 * Command search ("Tell Me"): fuzzy subsequence matching over the executable
 * command surface (Ribbon and menubar entries). Pure and dependency-free so
 * the scoring can be unit-tested without the UI.
 */

export interface CommandSearchEntry {
  /** Stable id of the originating control (ribbon item or menu entry). */
  id: string;
  /** Human-readable, localized label. */
  label: string;
  /** Built-in command dispatched when the entry is chosen. */
  command: string;
  /** Optional payload for parameterized commands. */
  payload?: unknown;
  /** Office-style shortcut hint, e.g. "Ctrl+F". */
  shortcut?: string;
  /** Where the entry was surfaced from. */
  source: "ribbon" | "menubar";
}

export interface CommandSearchHit extends CommandSearchEntry {
  /** Higher is better; hits are returned sorted by score descending. */
  score: number;
}

const WORD_BOUNDARY = /[\s\-–—/_([{]/;

function isWordBoundary(text: string, index: number): boolean {
  if (index === 0) return true;
  return WORD_BOUNDARY.test(text[index - 1] ?? "");
}

/** Score the label or the command id against a normalized query. */
function scoreText(query: string, text: string): number | null {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return 0;
  const haystack = text.toLowerCase();

  // Exact match wins.
  if (haystack === q) return 1000;

  const index = haystack.indexOf(q);
  if (index >= 0) {
    let score = 400;
    if (index === 0) score += 400;
    else if (isWordBoundary(haystack, index)) score += 200;
    else score += 100;
    // Shorter targets are usually the intended result for the same match.
    score += Math.round((q.length / haystack.length) * 50);
    return score;
  }

  // Subsequence match with a gap penalty.
  let cursor = 0;
  let firstPosition = -1;
  let lastPosition = -1;
  let gaps = 0;
  for (const char of q) {
    const found = haystack.indexOf(char, cursor);
    if (found === -1) return null;
    if (firstPosition === -1) firstPosition = found;
    gaps += found - cursor;
    cursor = found + 1;
    lastPosition = found;
  }
  const span = lastPosition - firstPosition + 1;
  return Math.max(1, 120 - gaps - Math.abs(span - q.length) * 4);
}

/**
 * Score one entry against a normalized query; `null` means no match. The
 * localized label is matched first; the raw command id is a fallback with a
 * small penalty so English command names still resolve in other locales.
 */
export function scoreCommandSearchEntry(
  query: string,
  entry: CommandSearchEntry,
): number | null {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return 0;
  const labelScore = scoreText(q, entry.label);
  const commandScore = scoreText(q, entry.command);
  const best = Math.max(
    labelScore ?? Number.NEGATIVE_INFINITY,
    (commandScore ?? Number.NEGATIVE_INFINITY) - 50,
  );
  return Number.isFinite(best) ? best : null;
}

/**
 * Return the best `limit` hits for `query`, sorted by score (desc) and label
 * length (asc) as a stable tie-breaker. An empty query returns every entry
 * ordered alphabetically, so the palette opens with a usable surface.
 */
export function searchCommandEntries(
  query: string,
  entries: CommandSearchEntry[],
  limit = 24,
): CommandSearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return entries
      .map((entry): CommandSearchHit => ({ ...entry, score: 0 }))
      .sort((a, b): number => a.label.localeCompare(b.label))
      .slice(0, limit);
  }
  const hits: CommandSearchHit[] = [];
  for (const entry of entries) {
    const score = scoreCommandSearchEntry(q, entry);
    if (score !== null) hits.push({ ...entry, score });
  }
  hits.sort(
    (a, b): number => b.score - a.score || a.label.length - b.label.length,
  );
  return hits.slice(0, limit);
}
