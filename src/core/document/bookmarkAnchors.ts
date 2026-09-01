/** Keep bookmark ranges valid as paragraph text and boundaries mutate. */
import type { EditorBookmarks, EditorParagraphNode } from "@/core/model.js";
import { transformTextRangeRegistryAcrossParagraphEdit } from "./rangeAnchors.js";

export function transformBookmarksAcrossParagraphEdit(
  bookmarks: EditorBookmarks,
  oldParagraphs: EditorParagraphNode[],
  newParagraphs: EditorParagraphNode[],
): EditorBookmarks {
  return transformTextRangeRegistryAcrossParagraphEdit(
    bookmarks,
    oldParagraphs,
    newParagraphs,
  );
}
