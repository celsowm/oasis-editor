/** Keep comment ranges valid as paragraph text and boundaries mutate. */
import type { EditorComments, EditorParagraphNode } from "@/core/model.js";
import { transformTextRangeRegistryAcrossParagraphEdit } from "./rangeAnchors.js";

export function transformCommentsAcrossParagraphEdit(
  comments: EditorComments,
  oldParagraphs: EditorParagraphNode[],
  newParagraphs: EditorParagraphNode[],
): EditorComments {
  return transformTextRangeRegistryAcrossParagraphEdit(
    comments,
    oldParagraphs,
    newParagraphs,
  );
}
