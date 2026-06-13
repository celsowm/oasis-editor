/**
 * Phase 2 of bookmark support: keep {@link EditorBookmarks} anchors valid as the
 * paragraph tree mutates under live editing (typing, deleting, splitting,
 * merging, pasting).
 *
 * Rather than instrument every editing command, we exploit the fact that every
 * paragraph mutation flows through a single chokepoint
 * (`cloneStateWithParagraphs`) which has both the *old* paragraph list and the
 * *new* one. We linearize a zone's paragraphs into one global character stream
 * (paragraph texts joined by a single sentinel char per break), diff the old and
 * new streams as a single contiguous edited region (common prefix + common
 * suffix), and remap every anchor's global offset accordingly. Mapping the
 * result back to `{ paragraphId, offset }` is purely positional, so paragraph
 * splits/merges (which change paragraph identity) fall out for free.
 *
 * This is exact for any single contiguous edit — which is what each editing
 * primitive produces — and degrades gracefully (treating the span between the
 * first and last divergence as one region) for the rare multi-region case.
 */
import type {
  EditorBookmarkAnchor,
  EditorBookmarks,
  EditorParagraphNode,
} from "../model.js";
import { getParagraphText } from "../model.js";

/** One paragraph's placement inside the linearized stream. */
interface ParaSpan {
  id: string;
  /** Global offset of this paragraph's first character. */
  base: number;
  /** Length of the paragraph's flattened text. */
  length: number;
}

interface Stream {
  text: string;
  spans: ParaSpan[];
  baseById: Map<string, number>;
}

/**
 * Build the linearized stream. Paragraphs are joined by a single `\n` sentinel
 * so that paragraph breaks are real characters in the diff — this is what makes
 * split/merge show up as an insertion/deletion of that sentinel.
 */
function buildStream(paragraphs: EditorParagraphNode[]): Stream {
  const spans: ParaSpan[] = [];
  const baseById = new Map<string, number>();
  const parts: string[] = [];
  let cursor = 0;
  for (const paragraph of paragraphs) {
    const text = getParagraphText(paragraph);
    spans.push({ id: paragraph.id, base: cursor, length: text.length });
    if (!baseById.has(paragraph.id)) {
      baseById.set(paragraph.id, cursor);
    }
    parts.push(text);
    cursor += text.length + 1; // +1 for the sentinel that follows
  }
  return { text: parts.join("\n"), spans, baseById };
}

function commonPrefixLength(a: string, b: string, max: number): number {
  let i = 0;
  while (i < max && a.charCodeAt(i) === b.charCodeAt(i)) {
    i += 1;
  }
  return i;
}

function commonSuffixLength(a: string, b: string, max: number): number {
  let i = 0;
  while (
    i < max &&
    a.charCodeAt(a.length - 1 - i) === b.charCodeAt(b.length - 1 - i)
  ) {
    i += 1;
  }
  return i;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Map a global offset from the old stream to the new stream given the diff
 * geometry. Offsets at or before the changed region are stable; offsets at or
 * after it shift by the length delta; offsets strictly inside a replaced region
 * collapse to its left edge (left affinity — typing at a bookmark start keeps
 * the new text inside, typing at a bookmark end keeps it outside).
 */
function mapGlobalOffset(
  offset: number,
  oldLength: number,
  newLength: number,
  prefix: number,
  suffix: number,
): number {
  if (offset <= prefix) {
    return offset;
  }
  if (offset >= oldLength - suffix) {
    return offset + (newLength - oldLength);
  }
  return prefix;
}

/** Resolve a global offset back to a paragraph id + local offset. */
function locate(
  globalOffset: number,
  spans: ParaSpan[],
): { paragraphId: string; offset: number } {
  for (const span of spans) {
    if (globalOffset <= span.base + span.length) {
      return {
        paragraphId: span.id,
        offset: Math.max(0, globalOffset - span.base),
      };
    }
  }
  const last = spans[spans.length - 1]!;
  return { paragraphId: last.id, offset: last.length };
}

/**
 * Remap every bookmark anchor that lives in `oldParagraphs` to its new position
 * in `newParagraphs`. Anchors whose paragraph is not part of this zone are left
 * untouched. Returns the same registry instance when nothing changed.
 */
export function transformBookmarksAcrossParagraphEdit(
  bookmarks: EditorBookmarks,
  oldParagraphs: EditorParagraphNode[],
  newParagraphs: EditorParagraphNode[],
): EditorBookmarks {
  const old = buildStream(oldParagraphs);

  // Fast path: does any anchor actually live in the edited zone?
  let relevant = false;
  for (const id of bookmarks.order) {
    const bm = bookmarks.items[id];
    if (!bm) continue;
    if (
      (bm.start && old.baseById.has(bm.start.paragraphId)) ||
      (bm.end && old.baseById.has(bm.end.paragraphId))
    ) {
      relevant = true;
      break;
    }
  }
  if (!relevant) {
    return bookmarks;
  }

  const next = buildStream(newParagraphs);
  if (old.text === next.text) {
    // Text and paragraph boundaries are identical; offsets are unchanged and
    // paragraph ids are preserved, so anchors are still valid as-is.
    return bookmarks;
  }

  const oldLength = old.text.length;
  const newLength = next.text.length;
  const limit = Math.min(oldLength, newLength);
  // Claim the common suffix first, then the prefix from what's left. This biases
  // the inferred edit as far left as possible, matching the editor convention
  // that deletions collapse to the selection start and typed text lands at the
  // cursor (left affinity) — it disambiguates edits around repeated characters.
  const suffix = commonSuffixLength(old.text, next.text, limit);
  const prefix = commonPrefixLength(old.text, next.text, limit - suffix);

  const remap = (anchor: EditorBookmarkAnchor): EditorBookmarkAnchor => {
    const base = old.baseById.get(anchor.paragraphId);
    if (base === undefined) {
      return anchor;
    }
    const globalOffset = base + clamp(anchor.offset, 0, oldLength - base);
    const mapped = clamp(
      mapGlobalOffset(globalOffset, oldLength, newLength, prefix, suffix),
      0,
      newLength,
    );
    const located = locate(mapped, next.spans);
    if (
      located.paragraphId === anchor.paragraphId &&
      located.offset === anchor.offset
    ) {
      return anchor;
    }
    return {
      ...anchor,
      paragraphId: located.paragraphId,
      offset: located.offset,
    };
  };

  let changed = false;
  const items = { ...bookmarks.items };
  for (const id of bookmarks.order) {
    const bm = bookmarks.items[id];
    if (!bm) continue;
    let updated = bm;
    if (bm.start && old.baseById.has(bm.start.paragraphId)) {
      const start = remap(bm.start);
      if (start !== bm.start) updated = { ...updated, start };
    }
    if (bm.end && old.baseById.has(bm.end.paragraphId)) {
      const end = remap(bm.end);
      if (end !== bm.end) updated = { ...updated, end };
    }
    if (updated !== bm) {
      items[id] = updated;
      changed = true;
    }
  }

  return changed ? { ...bookmarks, items } : bookmarks;
}
