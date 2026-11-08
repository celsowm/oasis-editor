import type {
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorState,
  EditorTextStyle,
} from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import {
  getStyleAtOffset,
  sliceRuns,
} from "@/core/document/paragraphRuns.js";
import {
  cloneParagraphStyle,
  cloneStyle,
  stylesEqual,
} from "@/core/textStyle/textStyleMutations.js";
import {
  mapRunsInRange,
  preserveSelectionByParagraphOffsets,
} from "@/core/selection/rangeEditing.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { resolveWordSelection } from "@/core/wordBoundaries.js";

/**
 * A value snapshot, never a reference to mutable document nodes.
 * Paragraph formatting is copied only from whole-paragraph selections or
 * a caret source, and applied only to fully selected target paragraphs.
 */
export interface FormatPainterSnapshot {
  text: EditorTextStyle | undefined;
  paragraph: EditorParagraphStyle | undefined;
  list: EditorParagraphListStyle | undefined;
  copyParagraph: boolean;
}

/** Semantic metadata is never painted, even if it lives inside run styles. */
function paintedTextStyle(style?: EditorTextStyle): EditorTextStyle | undefined {
  const copied = cloneStyle(style);
  if (!copied) return undefined;
  delete copied.link;
  delete copied.propertyRevision;
  return Object.keys(copied).length > 0 ? copied : undefined;
}

export function captureFormatPainter(
  state: EditorState,
): FormatPainterSnapshot | null {
  const paragraphs = getParagraphs(state);
  if (!paragraphs.length) return null;
  const range = normalizeSelection(state, paragraphs);
  const paragraph = paragraphs[range.startIndex];
  if (!paragraph) return null;

  const selectedRuns = range.isCollapsed
    ? []
    : sliceRuns(
        paragraph,
        range.startParagraphOffset,
        range.startIndex === range.endIndex
          ? range.endParagraphOffset
          : getParagraphLength(paragraph),
      );
  const firstText = selectedRuns.find((run) => run.kind === "text" && run.text.length > 0);
  const text = paintedTextStyle(
    firstText
      ? firstText.styles
      : getStyleAtOffset(paragraph, range.startParagraphOffset),
  );
  const copyParagraph =
    range.isCollapsed ||
    (range.startParagraphOffset === 0 &&
      (range.endIndex > range.startIndex ||
        range.endParagraphOffset === getParagraphLength(paragraph)));

  return {
    text,
    paragraph: copyParagraph ? cloneParagraphStyle(paragraph.style) : undefined,
    list: copyParagraph && paragraph.list ? { ...paragraph.list } : undefined,
    copyParagraph,
  };
}

/** Select the word underneath a mouse/touch click, or use the explicit range. */
export function resolveFormatPainterTarget(
  state: EditorState,
  expandCaretToWord: boolean,
): EditorState | null {
  const paragraphs = getParagraphs(state);
  if (paragraphs.length === 0) return null;
  const range = normalizeSelection(state, paragraphs);
  if (!range.isCollapsed) return state;
  if (!expandCaretToWord) return null;
  const paragraph = paragraphs[range.startIndex];
  if (!paragraph) return null;
  const word = resolveWordSelection(getParagraphText(paragraph), range.startParagraphOffset);
  if (word.end <= word.start) return null;
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, word.start),
      focus: paragraphOffsetToPosition(paragraph, word.end),
    },
  };
}

function hasWholeParagraph(
  paragraph: EditorParagraphNode,
  index: number,
  range: ReturnType<typeof normalizeSelection>,
): boolean {
  return (
    (index > range.startIndex || range.startParagraphOffset === 0) &&
    (index < range.endIndex || range.endParagraphOffset === getParagraphLength(paragraph))
  );
}

/**
 * Applies a captured formatting snapshot without touching run content,
 * hyperlinks, revision metadata or other structural anchors. Uses the regular
 * immutable paragraph replacement path for table/zone/document fidelity.
 */
export function applyCapturedFormatPainter(
  state: EditorState,
  captured: FormatPainterSnapshot,
): EditorState {
  const paragraphs = getParagraphs(state);
  if (!paragraphs.length) return state;
  const range = normalizeSelection(state, paragraphs);
  if (range.isCollapsed) return state;
  let changed = false;

  const nextParagraphs = paragraphs.map((paragraph, index): EditorParagraphNode => {
    if (index < range.startIndex || index > range.endIndex) return paragraph;
    const start = index === range.startIndex ? range.startParagraphOffset : 0;
    const end = index === range.endIndex
      ? range.endParagraphOffset : getParagraphLength(paragraph);
    const wholeParagraph = captured.copyParagraph && hasWholeParagraph(paragraph, index, range);

    const nextParagraphStyle = wholeParagraph
      ? cloneParagraphStyle(captured.paragraph)
      : paragraph.style;
    const nextList = wholeParagraph
      ? captured.list ? { ...captured.list } : undefined
      : paragraph.list;
    const paragraphChanged = wholeParagraph &&
      (JSON.stringify(nextParagraphStyle) !== JSON.stringify(paragraph.style) ||
        JSON.stringify(nextList) !== JSON.stringify(paragraph.list));
    const runsChanged = start < end && sliceRuns(paragraph, start, end).some((run) => {
      if (run.kind !== "text" || run.text.length === 0) return false;
      const nextStyle: EditorTextStyle = cloneStyle(captured.text) ?? {};
      if (run.styles?.link !== undefined) nextStyle.link = run.styles.link;
      if (run.styles?.propertyRevision !== undefined) {
        nextStyle.propertyRevision = run.styles.propertyRevision;
      }
      const value = Object.keys(nextStyle).length ? nextStyle : undefined;
      return !stylesEqual(run.styles, value);
    });
    if (!paragraphChanged && !runsChanged) return paragraph;
    changed = true;
    let next = runsChanged
      ? mapRunsInRange(paragraph, start, end, (run) => {
          if (run.kind !== "text") return run;
          const style: EditorTextStyle = cloneStyle(captured.text) ?? {};
          if (run.styles?.link !== undefined) style.link = run.styles.link;
          if (run.styles?.propertyRevision !== undefined) {
            style.propertyRevision = run.styles.propertyRevision;
          }
          return {
            ...run,
            styles: Object.keys(style).length ? style : undefined,
          };
        })
      : paragraph;
    if (wholeParagraph) {
      next = { ...next, style: nextParagraphStyle, list: nextList };
    }
    return next;
  });

  if (!changed) return state;
  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, range),
  );
}
