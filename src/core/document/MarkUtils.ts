import { MarkSet } from "./BlockTypes.js";

/**
 * Compares two MarkSet objects for equality.
 * Performs a shallow comparison as MarkSet only contains primitive values.
 */
export function areMarksEqual(a: MarkSet, b: MarkSet): boolean {
  if (a === b) return true;
  if (!a || !b) return a === b;

  const keysA = Object.keys(a) as (keyof MarkSet)[];
  const keysB = Object.keys(b) as (keyof MarkSet)[];

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}

export function applyPendingMarks(base: MarkSet, pending?: MarkSet | null): MarkSet {
  const next: MarkSet = { ...base };
  if (!pending) return next;

  for (const key of Object.keys(pending) as Array<keyof MarkSet>) {
    const value = pending[key];
    if (value === undefined) continue;

    if (value === false) {
      delete next[key];
    } else {
      (next as Record<keyof MarkSet, unknown>)[key] = value;
    }
  }

  return next;
}
