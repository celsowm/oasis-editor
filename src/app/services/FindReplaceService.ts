import {
  getDocumentParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  type EditorDocument,
  type EditorPosition,
} from "@/core/model.js";

/** Describes a single match found by the find service. */
export interface FindReplaceMatch {
  anchor: EditorPosition;
  focus: EditorPosition;
  paragraphIndex: number;
}

/** Options that control how find searches operate. */
export interface FindOptions {
  matchCase?: boolean;
  wholeWord?: boolean;
}

/**
 * Searches a document for the given term and returns all matches.
 * @param doc - The document to search.
 * @param searchTerm - The text to search for.
 * @param options - Search options (case sensitivity, whole word).
 * @returns An array of match descriptors.
 */
export function findMatchesInDocument(
  doc: EditorDocument,
  searchTerm: string,
  options: FindOptions = {},
): FindReplaceMatch[] {
  if (!searchTerm) return [];

  const matches: FindReplaceMatch[] = [];
  const paragraphs = getDocumentParagraphs(doc);
  const { matchCase = false, wholeWord = false } = options;

  const flags = matchCase ? "g" : "gi";
  let searchPattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (wholeWord) {
    searchPattern = `\\b${searchPattern}\\b`;
  }

  const regex = new RegExp(searchPattern, flags);

  paragraphs.forEach((paragraph, paragraphIndex): void => {
    const text = getParagraphText(paragraph);
    let match: RegExpExecArray | null;

    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const startOffset = match.index;
      const endOffset = match.index + match[0].length;

      matches.push({
        anchor: paragraphOffsetToPosition(paragraph, startOffset),
        focus: paragraphOffsetToPosition(paragraph, endOffset),
        paragraphIndex,
      });

      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  });

  return matches;
}
