import type { EditorState, EditorParagraphNode } from "@/core/model.js";
import { getParagraphLength, getParagraphs } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { sliceRuns } from "@/core/document/paragraphRuns.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import {
  mapRunsInRange,
  preserveSelectionByParagraphOffsets,
} from "@/core/selection/rangeEditing.js";

export type TextCaseMode =
  | "sentence"
  | "lower"
  | "upper"
  | "capitalize"
  | "toggle";

function isLetter(char: string): boolean {
  return /\p{L}/u.test(char);
}

/** lowercase everything, then uppercase the first letter of each sentence. */
function toSentenceCase(text: string): string {
  let result = "";
  let capitalizeNext = true;
  for (const char of text.toLowerCase()) {
    if (capitalizeNext && isLetter(char)) {
      result += char.toUpperCase();
      capitalizeNext = false;
    } else {
      result += char;
      if (char === "." || char === "!" || char === "?") {
        capitalizeNext = true;
      }
    }
  }
  return result;
}

/** Uppercase the first letter of every word, leaving the rest unchanged. */
function toCapitalizedWords(text: string): string {
  let result = "";
  let prevIsLetter = false;
  for (const char of text) {
    const letter = isLetter(char);
    result += letter && !prevIsLetter ? char.toUpperCase() : char;
    prevIsLetter = letter;
  }
  return result;
}

/** Swap the case of each cased character. */
function toToggledCase(text: string): string {
  let result = "";
  for (const char of text) {
    const upper = char.toUpperCase();
    const lower = char.toLowerCase();
    if (char === lower && char !== upper) {
      result += upper;
    } else if (char === upper && char !== lower) {
      result += lower;
    } else {
      result += char;
    }
  }
  return result;
}

function applyCaseTransform(text: string, mode: TextCaseMode): string {
  switch (mode) {
    case "lower":
      return text.toLowerCase();
    case "upper":
      return text.toUpperCase();
    case "capitalize":
      return toCapitalizedWords(text);
    case "toggle":
      return toToggledCase(text);
    case "sentence":
    default:
      return toSentenceCase(text);
  }
}

/**
 * Transforms the text of the selected runs in place. The transform must return
 * a string of the same length so per-run boundaries (and thus styles) are
 * preserved. The transform is applied to each paragraph's selected text
 * independently so sentence/word boundaries reset at paragraph breaks.
 */
export function transformSelectedText(
  state: EditorState,
  transform: (text: string) => string,
): EditorState {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map(
    (paragraph, paragraphIndex): EditorParagraphNode => {
      if (
        paragraphIndex < normalized.startIndex ||
        paragraphIndex > normalized.endIndex
      ) {
        return paragraph;
      }

      const startOffset =
        paragraphIndex === normalized.startIndex
          ? normalized.startParagraphOffset
          : 0;
      const endOffset =
        paragraphIndex === normalized.endIndex
          ? normalized.endParagraphOffset
          : getParagraphLength(paragraph);

      const selectedText = sliceRuns(paragraph, startOffset, endOffset)
        .map((run): string => run.text)
        .join("");
      const transformed = transform(selectedText);

      let cursor = 0;
      return mapRunsInRange(paragraph, startOffset, endOffset, (run) => {
        const length = run.text.length;
        const nextText = transformed.slice(cursor, cursor + length);
        cursor += length;
        return { ...run, text: nextText };
      });
    },
  );

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

/** Change the letter case of the selected text, preserving runs and styles. */
export function changeSelectedTextCase(
  state: EditorState,
  mode: TextCaseMode,
): EditorState {
  return transformSelectedText(state, (text): string =>
    applyCaseTransform(text, mode),
  );
}
