import type { EditorState, EditorTextStyle, EditorParagraphNode, EditorTextRun } from "@/core/model.js";
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

  const shouldEnable = !touchedRuns.every((run): boolean => Boolean(run.styles?.[key]));
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex): EditorParagraphNode => {
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
  });

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
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex): EditorParagraphNode => {
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
  });

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
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex): EditorParagraphNode => {
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
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}
