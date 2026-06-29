import type {
  EditorParagraphNode,
  EditorPosition,
  EditorState,
  EditorTextRun,
  EditorTextStyle,
} from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
} from "@/core/model.js";
import { createEditorStyledRun } from "@/core/editorState.js";
import { isSelectionCollapsed, normalizeSelection } from "@/core/selection.js";
import {
  getStyleAtOffset,
  insertRunsAtOffset,
  sliceRuns,
  buildParagraphFromRuns,
  createParagraphFromRuns,
} from "@/core/document/paragraphRuns.js";
import { cloneRun, cloneParagraph } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import {
  deleteSelectionRange,
  getFocusParagraph,
  withSelection,
} from "@/core/selection/rangeEditing.js";

interface SelectionFragment {
  paragraphTemplate: EditorParagraphNode;
  runs: EditorTextRun[];
}

function cloneFragmentRuns(runs: EditorTextRun[]): EditorTextRun[] {
  return runs.map(cloneRun);
}

function getRunsLength(runs: EditorTextRun[]): number {
  return runs.reduce((total, run): number => total + run.text.length, 0);
}

function collectSelectionFragments(state: EditorState): SelectionFragment[] {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return [];
  }
  const paragraphs = getParagraphs(state);
  const fragments: SelectionFragment[] = [];
  for (
    let index = normalized.startIndex;
    index <= normalized.endIndex;
    index += 1
  ) {
    const paragraph = paragraphs[index]!;
    const startOffset =
      index === normalized.startIndex ? normalized.startParagraphOffset : 0;
    const endOffset =
      index === normalized.endIndex
        ? normalized.endParagraphOffset
        : getParagraphLength(paragraph);
    const runs = sliceRuns(paragraph, startOffset, endOffset);
    fragments.push({
      paragraphTemplate: cloneParagraph(paragraph),
      runs,
    });
  }
  return fragments;
}

function insertFragmentsAtPosition(
  state: EditorState,
  targetPosition: EditorPosition,
  fragments: SelectionFragment[],
): EditorState {
  if (fragments.length === 0) {
    return state;
  }
  const paragraphs = getParagraphs(state);
  const targetIndex = paragraphs.findIndex(
    (paragraph): boolean => paragraph.id === targetPosition.paragraphId,
  );
  if (targetIndex === -1) {
    return state;
  }
  const targetParagraph = paragraphs[targetIndex]!;
  const targetOffset = positionToParagraphOffset(
    targetParagraph,
    targetPosition,
  );
  const firstRuns = cloneFragmentRuns(fragments[0]!.runs);

  if (fragments.length === 1) {
    const nextTarget = insertRunsAtOffset(
      targetParagraph,
      targetOffset,
      firstRuns,
    );
    const nextParagraphs = paragraphs.map(
      (candidate, index): EditorParagraphNode =>
        index === targetIndex ? nextTarget : candidate,
    );
    const insertedLength = getRunsLength(firstRuns);
    const anchor = paragraphOffsetToPosition(nextTarget, targetOffset);
    const focus = paragraphOffsetToPosition(
      nextTarget,
      targetOffset + insertedLength,
    );
    return cloneStateWithParagraphs(state, nextParagraphs, {
      anchor,
      focus,
    });
  }

  const beforeRuns = sliceRuns(targetParagraph, 0, targetOffset);
  const afterRuns = sliceRuns(
    targetParagraph,
    targetOffset,
    getParagraphLength(targetParagraph),
  );
  const lastFragment = fragments[fragments.length - 1]!;
  const middleFragments = fragments.slice(1, -1);

  const firstInserted = buildParagraphFromRuns(
    cloneParagraph(fragments[0]!.paragraphTemplate),
    [...beforeRuns, ...firstRuns],
    getStyleAtOffset(targetParagraph, targetOffset),
  );
  const insertedMiddle = middleFragments.map(
    (fragment): EditorParagraphNode =>
      buildParagraphFromRuns(
        cloneParagraph(fragment.paragraphTemplate),
        cloneFragmentRuns(fragment.runs),
      ),
  );
  const lastInserted = buildParagraphFromRuns(
    cloneParagraph(lastFragment.paragraphTemplate),
    [...cloneFragmentRuns(lastFragment.runs), ...afterRuns],
    getStyleAtOffset(targetParagraph, targetOffset),
  );

  const nextParagraphs = [
    ...paragraphs.slice(0, targetIndex),
    firstInserted,
    ...insertedMiddle,
    lastInserted,
    ...paragraphs.slice(targetIndex + 1),
  ];
  const anchor = paragraphOffsetToPosition(
    firstInserted,
    getRunsLength(beforeRuns),
  );
  const focus = paragraphOffsetToPosition(
    lastInserted,
    getRunsLength(lastFragment.runs),
  );
  return cloneStateWithParagraphs(state, nextParagraphs, { anchor, focus });
}

function isTargetInsideSelection(
  state: EditorState,
  targetPosition: EditorPosition,
): boolean {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return false;
  }
  const paragraphs = getParagraphs(state);
  const targetIndex = paragraphs.findIndex(
    (paragraph): boolean => paragraph.id === targetPosition.paragraphId,
  );
  if (targetIndex === -1) {
    return false;
  }
  if (
    targetIndex < normalized.startIndex ||
    targetIndex > normalized.endIndex
  ) {
    return false;
  }
  const paragraph = paragraphs[targetIndex]!;
  const targetOffset = positionToParagraphOffset(paragraph, targetPosition);
  if (
    targetIndex === normalized.startIndex &&
    targetOffset < normalized.startParagraphOffset
  ) {
    return false;
  }
  if (
    targetIndex === normalized.endIndex &&
    targetOffset > normalized.endParagraphOffset
  ) {
    return false;
  }
  return true;
}

function mapTargetAfterDelete(
  state: EditorState,
  targetPosition: EditorPosition,
): EditorPosition {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const targetIndex = paragraphs.findIndex(
    (paragraph): boolean => paragraph.id === targetPosition.paragraphId,
  );
  if (targetIndex === -1) {
    return targetPosition;
  }
  const targetParagraph = paragraphs[targetIndex]!;
  const targetOffset = positionToParagraphOffset(
    targetParagraph,
    targetPosition,
  );

  if (normalized.startIndex === normalized.endIndex) {
    if (
      targetIndex !== normalized.startIndex ||
      targetOffset <= normalized.endParagraphOffset
    ) {
      return targetPosition;
    }
    const startParagraph = paragraphs[normalized.startIndex]!;
    return paragraphOffsetToPosition(
      startParagraph,
      targetOffset -
        (normalized.endParagraphOffset - normalized.startParagraphOffset),
    );
  }
  return targetPosition;
}

export function moveOrCopySelectionToPosition(
  state: EditorState,
  targetPosition: EditorPosition,
  options: { copy?: boolean } = {},
): EditorState {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }
  if (isTargetInsideSelection(state, targetPosition)) {
    return state;
  }
  const fragments = collectSelectionFragments(state);
  if (fragments.length === 0) {
    return state;
  }

  if (options.copy) {
    return insertFragmentsAtPosition(state, targetPosition, fragments);
  }

  const mappedTarget = mapTargetAfterDelete(state, targetPosition);
  const deleted = deleteSelectionRange(state);
  return insertFragmentsAtPosition(deleted, mappedTarget, fragments);
}

export function insertTextAtSelection(
  state: EditorState,
  text: string,
  styleOverride?: EditorTextStyle,
): EditorState {
  if (text.length === 0) {
    return state;
  }

  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const styles = styleOverride
    ? { ...styleOverride }
    : getStyleAtOffset(paragraph, offset);

  const insertedRun: EditorTextRun = {
    id: `run:${Math.random().toString(36).slice(2, 9)}`,
    text,
    styles,
    kind: "text",
  };

  if (collapsedState.trackChangesEnabled) {
    insertedRun.revision = {
      id: `rev:${Math.random().toString(36).slice(2, 9)}`,
      type: "insert",
      author: "User",
      date: Date.now(),
    };
  }

  const nextParagraph = insertRunsAtOffset(paragraph, offset, [insertedRun]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = paragraphs.map(
    (candidate, candidateIndex): EditorParagraphNode =>
      candidateIndex === index ? nextParagraph : candidate,
  );

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(
      paragraphOffsetToPosition(nextParagraph, offset + text.length),
    ),
  );
}

export function insertPlainTextAtSelection(
  state: EditorState,
  text: string,
  styleOverride?: EditorTextStyle,
): EditorState {
  if (text.length === 0) {
    return state;
  }

  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalizedText.includes("\n")) {
    return insertTextAtSelection(state, normalizedText, styleOverride);
  }

  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const lines = normalizedText.split("\n");
  const insertionStyles = styleOverride
    ? { ...styleOverride }
    : getStyleAtOffset(paragraph, offset);
  const beforeRuns = sliceRuns(paragraph, 0, offset);
  const firstParagraph = buildParagraphFromRuns(
    paragraph,
    [...beforeRuns, createEditorStyledRun(lines[0], insertionStyles)],
    insertionStyles,
  );
  const tailRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const middleParagraphs = lines
    .slice(1, -1)
    .map(
      (line): EditorParagraphNode =>
        createParagraphFromRuns([{ text: line, styles: insertionStyles }]),
    );
  const lastParagraph = createParagraphFromRuns([
    { text: lines[lines.length - 1], styles: insertionStyles },
    ...tailRuns.map(
      (run): { text: string; styles: EditorTextStyle | undefined } => ({
        text: run.text,
        styles: run.styles,
      }),
    ),
  ]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...paragraphs.slice(0, index),
    firstParagraph,
    ...middleParagraphs,
    lastParagraph,
    ...paragraphs.slice(index + 1),
  ];

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(
      paragraphOffsetToPosition(lastParagraph, lines[lines.length - 1].length),
    ),
  );
}
