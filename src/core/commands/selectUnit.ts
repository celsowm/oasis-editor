/**
 * Selection-unit commands (WordCraft's `select.word` / `select.sentence` /
 * `select.paragraph`): expand the current selection to a whole word, sentence
 * or paragraph(s).
 *
 * These are selection-only operations — they never mutate the document, so
 * they are applied via `applyState` (no undo) and always act on the flattened
 * paragraph stream of the active editing zone, mirroring `selectAll`.
 */
import type {
  EditorParagraphNode,
  EditorPosition,
  EditorState,
} from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphText,
  getParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { comparePositions } from "@/core/selection.js";
import { getFocusParagraph } from "@/core/selection/rangeEditing.js";
import { findMatchesInDocument } from "./findReplace.js";
import { setSelection } from "./selection.js";

/** True when a character is part of a word (letter or digit, Unicode). */
function isWordChar(char: string): boolean {
  return /\p{L}|\p{N}/u.test(char);
}

/** True when a character ends a sentence (Unicode-aware terminator). */
function isSentenceTerminator(char: string): boolean {
  return char === "." || char === "!" || char === "?";
}

/**
 * Expand the selection to whole paragraphs: the anchor moves to the start of
 * the first selected paragraph and the focus to the end of the last one. A
 * collapsed caret selects its whole paragraph.
 */
export function selectParagraph(state: EditorState): EditorState {
  const paragraphs = getParagraphs(state);
  const normalized = normalizeSelection(state);
  const start = paragraphs[normalized.startIndex];
  const end = paragraphs[normalized.endIndex];
  if (!start || !end) return state;
  return setSelection(state, {
    anchor: paragraphOffsetToPosition(start, 0),
    focus: paragraphOffsetToPosition(end, getParagraphLength(end)),
  });
}

/**
 * Expand the selection to the word around the focus position (Unicode
 * letters/digits). A word is a maximal run of word characters; surrounding
 * punctuation is treated as boundary.
 */
export function selectWord(state: EditorState): EditorState {
  const { paragraph, offset } = getFocusParagraph(state);
  const text = getParagraphText(paragraph);
  let lo = offset;
  let hi = offset;
  while (lo > 0 && isWordChar(text[lo - 1]!)) lo -= 1;
  while (hi < text.length && isWordChar(text[hi]!)) hi += 1;
  return setSelection(state, {
    anchor: paragraphOffsetToPosition(paragraph, lo),
    focus: paragraphOffsetToPosition(paragraph, hi),
  });
}

/**
 * Expand the selection to the sentence around the focus position, within the
 * current paragraph. The sentence runs from just after the previous `.`/`!`/`?`
 * (or paragraph start) up to and including the next terminator (or paragraph
 * end). Sentence/word boundaries reset at paragraph breaks, matching the case
 * transform in `textCase.ts`.
 */
export function selectSentence(state: EditorState): EditorState {
  const { paragraph, offset } = getFocusParagraph(state);
  const text = getParagraphText(paragraph);
  let lo = offset;
  while (lo > 0 && !isSentenceTerminator(text[lo - 1]!)) lo -= 1;
  // Skip whitespace following the previous terminator so the selection starts
  // at the sentence's first word, not its leading space.
  while (lo < text.length && /\s/u.test(text[lo]!)) lo += 1;
  let hi = offset;
  while (hi < text.length && !isSentenceTerminator(text[hi]!)) hi += 1;
  if (hi < text.length) hi += 1; // include the closing terminator
  return setSelection(state, {
    anchor: paragraphOffsetToPosition(paragraph, lo),
    focus: paragraphOffsetToPosition(paragraph, Math.min(hi, text.length)),
  });
}

/**
 * Collapse the selection to one of its ends (`select.collapse`). When `end`
 * is true the caret moves to the focus end; otherwise to the anchor end. The
 * resulting selection is a single collapsed caret (no document mutation, so
 * it's applied via `applyState` with no undo).
 */
export function selectCollapse(state: EditorState, end = false): EditorState {
  const anchor = state.selection.anchor;
  const focus = state.selection.focus;
  const paragraphs = getParagraphs(state);
  const cmp = comparePositions(paragraphs, anchor, focus);
  const first = cmp <= 0 ? anchor : focus;
  const last = cmp <= 0 ? focus : anchor;
  const target = end ? last : first;
  return setSelection(state, {
    anchor: target,
    focus: target,
  });
}

/**
 * Select the Nth occurrence of `text` in the document (`WordCraft select.text`:
 * Word's "Select Text" navigation). Literal, case-insensitive matching; the
 * `occurrence` count is 1-based (default 1). A no-op (same state) when the
 * term is empty or the occurrence isn't found. Selection-only — never mutates
 * the document, so it's applied via `applyState` with no undo.
 */
export function selectTextOccurrence(
  state: EditorState,
  text: string,
  occurrence = 1,
): EditorState {
  const match = findMatchesInDocument(state.document, text)[
    Math.max(1, occurrence) - 1
  ];
  if (!match) return state;
  return setSelection(state, {
    anchor: match.anchor,
    focus: match.focus,
  });
}

/**
 * Select an arbitrary range (`select.range`): sets the selection to the given
 * anchor/focus positions, clamped to valid offsets. Selection-only — never
 * mutates the document, so it's applied via `applyState` with no undo.
 */
export function selectRange(
  state: EditorState,
  anchor: EditorPosition,
  focus: EditorPosition,
): EditorState {
  return setSelection(state, { anchor, focus });
}

export type { EditorParagraphNode };
