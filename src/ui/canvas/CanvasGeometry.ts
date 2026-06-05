/**
 * Canvas-native geometry helpers built on top of {@link CanvasLayoutSnapshot}.
 * They are pure functions over snapshot data and do not require DOM mirrors.
 */
import type { EditorPosition } from "../../core/model.js";
import type {
  CanvasLayoutSnapshot,
  CanvasSnapshotLine,
  CanvasSnapshotParagraph,
} from "./CanvasLayoutSnapshot.js";

export interface CanvasRectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface CanvasCharRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  height: number;
}

function rectFromBox(
  left: number,
  top: number,
  width: number,
  height: number,
): CanvasRectLike {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

export function getParagraphEntries(
  snapshot: CanvasLayoutSnapshot,
  paragraphId: string,
): CanvasSnapshotParagraph[] {
  return snapshot.paragraphsById.get(paragraphId) ?? [];
}

export function getParagraphRectFromSnapshot(
  snapshot: CanvasLayoutSnapshot,
  paragraphId: string,
  boundary: "start" | "end" = "start",
): CanvasRectLike | null {
  const entries = getParagraphEntries(snapshot, paragraphId);
  if (entries.length === 0) return null;
  const entry = boundary === "end" ? entries[entries.length - 1]! : entries[0]!;
  return rectFromBox(entry.left, entry.top, entry.width, entry.height);
}

function findEntryForOffset(
  entries: CanvasSnapshotParagraph[],
  offset: number,
): CanvasSnapshotParagraph | null {
  if (entries.length === 0) return null;
  for (const entry of entries) {
    if (offset >= entry.startOffset && offset <= entry.endOffset) {
      return entry;
    }
  }
  return entries[entries.length - 1] ?? null;
}

function findLineForOffset(
  entry: CanvasSnapshotParagraph,
  offset: number,
): CanvasSnapshotLine | null {
  if (entry.lines.length === 0) return null;
  for (const line of entry.lines) {
    if (offset >= line.startOffset && offset <= line.endOffset) {
      return line;
    }
  }
  return entry.lines[entry.lines.length - 1] ?? null;
}

export function getCaretRectFromSnapshot(
  snapshot: CanvasLayoutSnapshot,
  position: EditorPosition,
  paragraphOffset: number,
): CanvasRectLike | null {
  const entries = getParagraphEntries(snapshot, position.paragraphId);
  if (entries.length === 0) return null;
  const entry = findEntryForOffset(entries, paragraphOffset);
  if (!entry) return null;
  const line = findLineForOffset(entry, paragraphOffset);
  if (!line || line.slots.length === 0) {
    return rectFromBox(entry.left, entry.top, 1, Math.max(entry.height, 16));
  }
  const slot =
    line.slots.find((candidate) => candidate.offset === paragraphOffset) ??
    line.slots.reduce(
      (best, candidate) =>
        Math.abs(candidate.offset - paragraphOffset) <
        Math.abs(best.offset - paragraphOffset)
          ? candidate
          : best,
      line.slots[0]!,
    );
  return rectFromBox(slot.left, slot.top, 1, slot.height || line.height);
}

/**
 * Equivalent to the legacy `collectParagraphCharRects` but derived entirely
 * from the canvas snapshot. Returns one rect per visual character slot in
 * paragraph order (across page splits when a paragraph spans multiple pages).
 */
export function collectParagraphCharRectsFromSnapshot(
  snapshot: CanvasLayoutSnapshot,
  paragraphId: string,
): CanvasCharRect[] {
  const entries = getParagraphEntries(snapshot, paragraphId);
  const rects: CanvasCharRect[] = [];
  for (const entry of entries) {
    for (const line of entry.lines) {
      for (let i = 0; i < line.slots.length; i += 1) {
        const slot = line.slots[i]!;
        const next = line.slots[i + 1];
        const right = next ? next.left : slot.left + 8;
        rects.push({
          left: slot.left,
          right,
          top: slot.top,
          bottom: slot.top + slot.height,
          height: slot.height,
        });
      }
    }
  }
  return rects;
}

/**
 * Resolves the absolute viewport `y` for the first/last line of a paragraph
 * (used by Outline / DocumentShell scroll-to-paragraph).
 */
export function getParagraphScrollAnchor(
  snapshot: CanvasLayoutSnapshot,
  paragraphId: string,
): { left: number; top: number } | null {
  const rect = getParagraphRectFromSnapshot(snapshot, paragraphId, "start");
  if (!rect) return null;
  return { left: rect.left, top: rect.top };
}
