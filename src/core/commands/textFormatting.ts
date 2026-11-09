import type {
  EditorBorderStyle,
  EditorState,
  EditorTextStyle,
  EditorParagraphNode,
  EditorTextRun,
} from "@/core/model.js";
import { getParagraphLength, getParagraphs } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import type {
  ToggleableTextStyleKey,
  ValueTextStyleKey,
} from "@/core/textStyle/textStyleKeys.js";
import {
  setBooleanStyle,
  setValueStyle,
} from "@/core/textStyle/textStyleMutations.js";
import { sliceRuns } from "@/core/document/paragraphRuns.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import {
  mapRunsInRange,
  preserveSelectionByParagraphOffsets,
} from "@/core/selection/rangeEditing.js";

export function toggleTextStyle(
  state: EditorState,
  key: ToggleableTextStyleKey,
): EditorState {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const touchedParagraphs = paragraphs.slice(
    normalized.startIndex,
    normalized.endIndex + 1,
  );

  const touchedRuns = touchedParagraphs
    .flatMap((paragraph, relativeIndex): EditorTextRun[] => {
      const paragraphIndex = normalized.startIndex + relativeIndex;
      const startOffset =
        paragraphIndex === normalized.startIndex
          ? normalized.startParagraphOffset
          : 0;
      const endOffset =
        paragraphIndex === normalized.endIndex
          ? normalized.endParagraphOffset
          : getParagraphLength(paragraph);
      return sliceRuns(paragraph, startOffset, endOffset);
    })
    .filter((run): boolean => run.text.length > 0);

  if (touchedRuns.length === 0) {
    return state;
  }

  const shouldEnable = !touchedRuns.every((run): boolean =>
    Boolean(run.styles?.[key]),
  );
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

      return mapRunsInRange(paragraph, startOffset, endOffset, (run) => ({
        ...run,
        styles: setBooleanStyle(run.styles, key, shouldEnable),
      }));
    },
  );

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

/**
 * Remove direct (local) text formatting from the selected runs, preserving the
 * text content, revisions, and links.
 */
export function clearSelectedTextFormatting(state: EditorState): EditorState {
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

      return mapRunsInRange(paragraph, startOffset, endOffset, (run) => {
        const link = run.styles?.link;
        const styles: EditorTextStyle =
          link != null && link !== "" ? { link } : {};
        return { ...run, styles };
      });
    },
  );

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function setTextStyleValue<K extends ValueTextStyleKey>(
  state: EditorState,
  key: K,
  value: EditorTextStyle[K] | null,
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

      return mapRunsInRange(paragraph, startOffset, endOffset, (run) => ({
        ...run,
        styles: setValueStyle(run.styles, key, value),
      }));
    },
  );

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

/**
 * Toggle a character border (WordCraft's `format.border`, Word's Character
 * Border in Home > Font) over the selection. Mirrors WordCraft: when no
 * run has a border, apply Word's default (black, solid, 0.5 pt); when every
 * run already has one, clear it. A no-op on a collapsed selection.
 */
export function toggleCharacterBorder(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const touchedParagraphs = paragraphs.slice(
    normalized.startIndex,
    normalized.endIndex + 1,
  );

  const touchedRuns = touchedParagraphs
    .flatMap((paragraph, relativeIndex): EditorTextRun[] => {
      const paragraphIndex = normalized.startIndex + relativeIndex;
      const startOffset =
        paragraphIndex === normalized.startIndex
          ? normalized.startParagraphOffset
          : 0;
      const endOffset =
        paragraphIndex === normalized.endIndex
          ? normalized.endParagraphOffset
          : getParagraphLength(paragraph);
      return sliceRuns(paragraph, startOffset, endOffset);
    })
    .filter((run): boolean => run.text.length > 0);

  if (touchedRuns.length === 0) {
    return state;
  }

  const shouldEnable = !touchedRuns.every((run): boolean =>
    Boolean(run.styles?.textBorder),
  );
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

      return mapRunsInRange(paragraph, startOffset, endOffset, (run) => ({
        ...run,
        styles: toggleTextBorderStyle(run.styles, shouldEnable),
      }));
    },
  );

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

/** Word's default single character border: black, solid, one half point. */
const DEFAULT_CHARACTER_BORDER: EditorBorderStyle = {
  width: 0.5,
  type: "solid",
  color: "#000000",
};

/** Set or clear the character border on a run's styles. */
function toggleTextBorderStyle(
  style: EditorTextStyle | undefined,
  enabled: boolean,
): EditorTextStyle | undefined {
  const next = { ...(style ?? {}) } as EditorTextStyle &
    Record<string, unknown>;
  if (enabled) {
    next.textBorder = DEFAULT_CHARACTER_BORDER;
  } else {
    delete next.textBorder;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}
