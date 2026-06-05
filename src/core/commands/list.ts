import type { EditorParagraphListStyle, EditorState } from "../model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
} from "../model.js";
import { createEditorParagraph } from "../editorState.js";
import { isSelectionCollapsed, normalizeSelection } from "../selection.js";
import {
  deleteSelectionRange,
  getFocusParagraph,
  buildParagraphFromRuns,
  sliceRuns,
  getStyleAtOffset,
  createParagraphFromRunsLike,
  cloneParagraphList,
  cloneParagraphs,
  cloneStateWithParagraphs,
  withSelection,
  cloneParagraph,
  clearParagraphList,
  preserveSelectionByParagraphOffsets,
  cloneParagraphWithListLevel,
  ParagraphListKind,
} from "./utils.js";

export function splitListItemAtSelection(state: EditorState): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const firstParagraph = buildParagraphFromRuns(
    paragraph,
    sliceRuns(paragraph, 0, offset),
    getStyleAtOffset(paragraph, offset),
  );
  const secondRuns = sliceRuns(
    paragraph,
    offset,
    getParagraphLength(paragraph),
  );
  const nextParagraph =
    secondRuns.length > 0
      ? createParagraphFromRunsLike(
          paragraph,
          secondRuns.map((run) => ({ text: run.text, styles: run.styles })),
        )
      : (() => {
          const emptyParagraph = createEditorParagraph("");
          emptyParagraph.style = paragraph.style
            ? { ...paragraph.style }
            : undefined;
          emptyParagraph.list = cloneParagraphList(paragraph.list);
          return emptyParagraph;
        })();
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    firstParagraph,
    nextParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, 0)),
  );
}

export function clearParagraphListAtSelection(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (
      paragraphIndex < normalized.startIndex ||
      paragraphIndex > normalized.endIndex
    ) {
      return cloneParagraph(paragraph);
    }

    return clearParagraphList(paragraph);
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function indentParagraphList(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (
      paragraphIndex < normalized.startIndex ||
      paragraphIndex > normalized.endIndex
    ) {
      return cloneParagraph(paragraph);
    }

    if (!paragraph.list) {
      return cloneParagraph(paragraph);
    }

    return cloneParagraphWithListLevel(
      paragraph,
      (paragraph.list.level ?? 0) + 1,
    );
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function outdentParagraphList(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (
      paragraphIndex < normalized.startIndex ||
      paragraphIndex > normalized.endIndex
    ) {
      return cloneParagraph(paragraph);
    }

    if (!paragraph.list) {
      return cloneParagraph(paragraph);
    }

    const currentLevel = paragraph.list.level ?? 0;
    if (currentLevel <= 0) {
      return clearParagraphList(paragraph);
    }

    return cloneParagraphWithListLevel(paragraph, currentLevel - 1);
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function toggleParagraphList(
  state: EditorState,
  kind: ParagraphListKind,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const startIndex = normalized.startIndex;
  const endIndex = normalized.endIndex;
  const targetedParagraphs = paragraphs.slice(startIndex, endIndex + 1);
  const shouldClear =
    targetedParagraphs.length > 0 &&
    targetedParagraphs.every((paragraph) => paragraph.list?.kind === kind);

  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < startIndex || paragraphIndex > endIndex) {
      return cloneParagraph(paragraph);
    }

    const nextParagraph = cloneParagraph(paragraph);
    if (shouldClear) {
      delete nextParagraph.list;
      return nextParagraph;
    }

    nextParagraph.list = {
      kind,
      level: paragraph.list?.level ?? 0,
      format: paragraph.list?.format,
      startAt: paragraph.list?.startAt,
    };
    return nextParagraph;
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function setParagraphListFormat(
  state: EditorState,
  format: EditorParagraphListStyle["format"] | null,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);

  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (
      paragraphIndex < normalized.startIndex ||
      paragraphIndex > normalized.endIndex
    ) {
      return cloneParagraph(paragraph);
    }

    if (!paragraph.list) {
      return cloneParagraph(paragraph);
    }

    return {
      ...cloneParagraph(paragraph),
      list: {
        ...paragraph.list,
        format: format || undefined,
      },
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function setParagraphListStartAt(
  state: EditorState,
  startAt: number | null,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);

  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (
      paragraphIndex < normalized.startIndex ||
      paragraphIndex > normalized.endIndex
    ) {
      return cloneParagraph(paragraph);
    }

    if (!paragraph.list) {
      return cloneParagraph(paragraph);
    }

    return {
      ...cloneParagraph(paragraph),
      list: {
        ...paragraph.list,
        startAt: startAt !== null ? startAt : undefined,
      },
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}
