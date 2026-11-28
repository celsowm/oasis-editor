import type { EditorDocument } from "@/core/model.js";
import { getDocumentSections, getParagraphLength } from "@/core/model.js";

/** Unique, unambiguous main-story bookmark by author-facing name. */
export function findNamedBookmark(document: EditorDocument, name: string) {
  const registry = document.bookmarks;
  if (!registry) return undefined;
  const matches = Object.values(registry.items).filter((b) => b.name === name);
  return matches.length === 1 ? matches[0] : undefined;
}

/** Whether a marker offset lies inside a bookmark's exclusive-end range.
 * `undefined` means the bookmark is missing, ambiguous or malformed. */
export function isOffsetInBookmarkScope(
  document: EditorDocument,
  name: string,
  paragraphId: string,
  offset: number,
): boolean | undefined {
  const bookmark = findNamedBookmark(document, name);
  if (
    !bookmark?.start ||
    !bookmark.end ||
    bookmark.colFirst !== undefined ||
    bookmark.colLast !== undefined
  )
    return undefined;
  const sections = getDocumentSections(document);
  const order = new Map<string, number>();
  let ordinal = 0;
  for (const section of sections) {
    for (const block of section.blocks) {
      if (block.type !== "paragraph") return undefined;
      order.set(block.id, ordinal++);
    }
  }
  const first = order.get(bookmark.start.paragraphId),
    last = order.get(bookmark.end.paragraphId);
  const target = order.get(paragraphId);
  if (
    first === undefined ||
    last === undefined ||
    target === undefined ||
    first > last
  )
    return undefined;
  const allBlocks = sections.flatMap((s) => s.blocks);
  const firstParagraph = allBlocks.find(
    (b) => b.id === bookmark.start!.paragraphId,
  );
  const lastParagraph = allBlocks.find(
    (b) => b.id === bookmark.end!.paragraphId,
  );
  const targetParagraph = allBlocks.find((b) => b.id === paragraphId);
  if (
    firstParagraph?.type !== "paragraph" ||
    lastParagraph?.type !== "paragraph" ||
    targetParagraph?.type !== "paragraph"
  )
    return undefined;
  if (
    !Number.isSafeInteger(bookmark.start.offset) ||
    bookmark.start.offset < 0 ||
    bookmark.start.offset > getParagraphLength(firstParagraph) ||
    !Number.isSafeInteger(bookmark.end.offset) ||
    bookmark.end.offset < 0 ||
    bookmark.end.offset > getParagraphLength(lastParagraph) ||
    (first === last && bookmark.start.offset >= bookmark.end.offset)
  )
    return undefined;
  if (target < first || target > last) return false;
  if (target === first && offset < bookmark.start.offset) return false;
  if (target === last && offset >= bookmark.end.offset) return false;
  // Interior paragraphs use an inclusive end boundary: a zero-width marker
  // after the last character belongs to the range.
  if (target !== last && offset > getParagraphLength(targetParagraph))
    return false;
  return true;
}
