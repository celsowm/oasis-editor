import {
  getDocumentParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  type EditorDocument,
  type EditorPosition,
} from "../../core/model.js";

export interface FindReplaceMatch {
  anchor: EditorPosition;
  focus: EditorPosition;
  paragraphIndex: number;
}

export interface FindOptions {
  matchCase?: boolean;
  wholeWord?: boolean;
}

export function findMatchesInDocument(
  doc: EditorDocument,
  searchTerm: string,
  options: FindOptions = {}
): FindReplaceMatch[] {
  if (!searchTerm) return [];

  const matches: FindReplaceMatch[] = [];
  const paragraphs = getDocumentParagraphs(doc);
  const { matchCase = false, wholeWord = false } = options;

  const flags = matchCase ? "g" : "gi";
  let searchPattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape regex chars

  if (wholeWord) {
    searchPattern = `\\b${searchPattern}\\b`;
  }

  const regex = new RegExp(searchPattern, flags);

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const text = getParagraphText(paragraph);
    let match: RegExpExecArray | null;

    // Reset regex state for each paragraph
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const startOffset = match.index;
      const endOffset = match.index + match[0].length;

      matches.push({
        anchor: paragraphOffsetToPosition(paragraph, startOffset),
        focus: paragraphOffsetToPosition(paragraph, endOffset),
        paragraphIndex,
      });

      // Avoid infinite loop on empty matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  });

  return matches;
}
