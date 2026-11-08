/**
 * Find-and-replace authoring commands (WordCraft's `edit.find` /
 * `edit.replace` / `edit.replaceAll`).
 *
 * This module is the single source of truth for how the plain-text search
 * engine walks a document and how a replacement is materialised onto the
 * document model. The interactive find/replace dialog drives its match list
 * off {@link findMatchesInDocument} and, for "replace all", off
 * {@link replaceAllInDocument} so the command surface and the dialog stay in
 * sync.
 */
import type {
  EditorDocument,
  EditorPosition,
  EditorState,
} from "@/core/model.js";
import {
  getDocumentParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { setSelection } from "./selection.js";
import { insertTextAtSelection } from "./textEditing.js";

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
 * Searches a document for the given term and returns all matches, in document
 * order. The term is matched literally (regex metacharacters are escaped);
 * `matchCase` and `wholeWord` narrow the search.
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

/**
 * Replace every occurrence of `searchTerm` with `replaceTerm` across the whole
 * document, in a single state transition. Matches are applied from the end of
 * the document backwards so earlier offsets remain valid as text is inserted.
 * Returns the same state when there is nothing to replace.
 */
export function replaceAllInDocument(
  state: EditorState,
  searchTerm: string,
  replaceTerm: string,
  options: FindOptions = {},
): EditorState {
  const currentMatches = findMatchesInDocument(
    state.document,
    searchTerm,
    options,
  );
  if (currentMatches.length === 0) return state;

  let working = state;
  for (let i = currentMatches.length - 1; i >= 0; i -= 1) {
    const match = currentMatches[i]!;
    working = setSelection(working, {
      anchor: match.anchor,
      focus: match.focus,
    });
    working = insertTextAtSelection(working, replaceTerm);
  }
  return working;
}
