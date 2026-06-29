import type { EditorState, EditorTextRun } from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import {
  expandLinkRangeInParagraph,
  sliceRuns,
} from "@/core/document/paragraphRuns.js";
import { setTextStyleValue } from "./text.js";
import { setSelection } from "./selection.js";

export function getLinkAtSelection(state: EditorState): string | null {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);

  if (normalized.isCollapsed) {
    const paragraph = paragraphs[normalized.startIndex];
    if (!paragraph) {
      return null;
    }
    return (
      expandLinkRangeInParagraph(paragraph, normalized.startParagraphOffset)
        ?.href ?? null
    );
  }

  const touchedRuns = paragraphs
    .slice(normalized.startIndex, normalized.endIndex + 1)
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
    .filter((run): boolean => run.text.length > 0 && run.kind !== "image");

  if (touchedRuns.length === 0) {
    return null;
  }

  const href = touchedRuns[0]?.styles?.link;
  if (!href) {
    return null;
  }

  return touchedRuns.every((run): boolean => run.styles?.link === href)
    ? href
    : null;
}

export function setLinkAtSelection(
  state: EditorState,
  href: string | null,
): EditorState {
  const normalized = normalizeSelection(state);
  if (!normalized.isCollapsed) {
    return setTextStyleValue(state, "link", href);
  }

  const paragraphs = getParagraphs(state);
  const paragraph = paragraphs[normalized.startIndex];
  if (!paragraph) {
    return state;
  }

  const linkRange = expandLinkRangeInParagraph(
    paragraph,
    normalized.startParagraphOffset,
  );
  if (!linkRange) {
    return state;
  }

  const expandedSelection = {
    anchor: paragraphOffsetToPosition(paragraph, linkRange.startOffset),
    focus: paragraphOffsetToPosition(paragraph, linkRange.endOffset),
  };

  const expandedState = setSelection(state, expandedSelection);
  const next = setTextStyleValue(expandedState, "link", href);
  const nextParagraph = getParagraphs(next)[normalized.startIndex];
  if (!nextParagraph) {
    return next;
  }

  return {
    ...next,
    selection: {
      anchor: paragraphOffsetToPosition(nextParagraph, linkRange.startOffset),
      focus: paragraphOffsetToPosition(nextParagraph, linkRange.endOffset),
    },
  };
}
