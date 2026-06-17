/**
 * Bookmark export: assigns deterministic DOCX `w:id` values to the document's
 * bookmarks and projects each bookmark's anchors into per-paragraph boundary
 * events that the paragraph serializer emits as `w:bookmarkStart` /
 * `w:bookmarkEnd`.
 */
import type { EditorDocument } from "@/core/model.js";
import { escapeXml } from "./xmlUtils.js";

export interface BookmarkBoundaryEvent {
  kind: "start" | "end";
  /** Character offset into the paragraph's flattened text. */
  offset: number;
  /** Stable emit order for boundaries that share an offset. */
  seq: number;
  /** Allocated DOCX `w:id`. */
  wId: number;
  name?: string;
  colFirst?: number;
  colLast?: number;
}

export type BookmarkEventsByParagraph = Map<string, BookmarkBoundaryEvent[]>;

/**
 * Allocate unique numeric `w:id`s (preferring each bookmark's imported hint)
 * and group start/end boundary events by paragraph id.
 */
export function buildBookmarkExportPlan(
  document: EditorDocument,
): BookmarkEventsByParagraph | undefined {
  const registry = document.bookmarks;
  if (!registry || registry.order.length === 0) {
    return undefined;
  }

  const assigned = new Map<string, number>();
  const used = new Set<number>();
  // First pass: honor a non-colliding imported id hint for stability.
  for (const id of registry.order) {
    const bm = registry.items[id];
    if (!bm) continue;
    const hint = bm.docxIdHint;
    if (hint !== undefined && hint >= 0 && !used.has(hint)) {
      assigned.set(id, hint);
      used.add(hint);
    }
  }
  // Second pass: allocate the next free id to the rest.
  let next = 0;
  for (const id of registry.order) {
    if (assigned.has(id)) continue;
    while (used.has(next)) next += 1;
    assigned.set(id, next);
    used.add(next);
    next += 1;
  }

  const byParagraph: BookmarkEventsByParagraph = new Map();
  const push = (paragraphId: string, event: BookmarkBoundaryEvent): void => {
    const list = byParagraph.get(paragraphId);
    if (list) {
      list.push(event);
    } else {
      byParagraph.set(paragraphId, [event]);
    }
  };

  for (const id of registry.order) {
    const bm = registry.items[id];
    if (!bm) continue;
    const wId = assigned.get(id)!;
    if (bm.start) {
      push(bm.start.paragraphId, {
        kind: "start",
        offset: bm.start.offset,
        seq: bm.start.seq ?? 0,
        wId,
        name: bm.name,
        ...(bm.colFirst !== undefined ? { colFirst: bm.colFirst } : {}),
        ...(bm.colLast !== undefined ? { colLast: bm.colLast } : {}),
      });
    }
    if (bm.end) {
      push(bm.end.paragraphId, {
        kind: "end",
        offset: bm.end.offset,
        seq: bm.end.seq ?? 0,
        wId,
      });
    }
  }

  return byParagraph;
}

export function serializeBookmarkEvent(event: BookmarkBoundaryEvent): string {
  if (event.kind === "end") {
    return `<w:bookmarkEnd w:id="${event.wId}"/>`;
  }
  const col =
    (event.colFirst !== undefined ? ` w:colFirst="${event.colFirst}"` : "") +
    (event.colLast !== undefined ? ` w:colLast="${event.colLast}"` : "");
  return `<w:bookmarkStart w:id="${event.wId}" w:name="${escapeXml(
    event.name ?? "",
  )}"${col}/>`;
}
