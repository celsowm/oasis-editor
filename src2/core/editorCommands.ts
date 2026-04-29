import type {
  Editor2ParagraphNode,
  Editor2Position,
  Editor2Selection,
  Editor2State,
  Editor2TextRun,
  Editor2TextStyle,
} from "./model.js";
import {
  getParagraphLength,
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
} from "./model.js";
import {
  createEditor2Document,
  createEditor2Paragraph,
  createEditor2ParagraphFromRuns,
  createEditor2StyledRun,
} from "./editorState.js";
import {
  clampPosition,
  createCollapsedSelection,
  findParagraphIndex,
  isSelectionCollapsed,
  normalizeSelection,
} from "./selection.js";

type ToggleableTextStyleKey =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "superscript"
  | "subscript";

function cloneStyle(style?: Editor2TextStyle): Editor2TextStyle | undefined {
  return style ? { ...style } : undefined;
}

function stylesEqual(left?: Editor2TextStyle, right?: Editor2TextStyle): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function setBooleanStyle(
  style: Editor2TextStyle | undefined,
  key: ToggleableTextStyleKey,
  enabled: boolean,
): Editor2TextStyle | undefined {
  const next = { ...(style ?? {}) } as Editor2TextStyle & Record<string, unknown>;

  if (enabled) {
    next[key] = true;
  } else {
    delete next[key];
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function cloneRun(run: Editor2TextRun): Editor2TextRun {
  return {
    ...run,
    styles: cloneStyle(run.styles),
  };
}

function cloneParagraph(paragraph: Editor2ParagraphNode): Editor2ParagraphNode {
  return {
    ...paragraph,
    runs: paragraph.runs.map(cloneRun),
    style: paragraph.style ? { ...paragraph.style } : undefined,
  };
}

function cloneParagraphs(paragraphs: Editor2ParagraphNode[]): Editor2ParagraphNode[] {
  return paragraphs.map(cloneParagraph);
}

function normalizeRuns(runs: Editor2TextRun[], fallbackStyles?: Editor2TextStyle): Editor2TextRun[] {
  const merged: Editor2TextRun[] = [];

  for (const run of runs) {
    if (run.text.length === 0) {
      continue;
    }

    const previous = merged[merged.length - 1];
    if (previous && stylesEqual(previous.styles, run.styles)) {
      previous.text += run.text;
      continue;
    }

    merged.push({
      ...run,
      styles: cloneStyle(run.styles),
    });
  }

  if (merged.length > 0) {
    return merged;
  }

  return [createEditor2StyledRun("", fallbackStyles)];
}

function buildParagraphFromRuns(
  paragraph: Editor2ParagraphNode,
  runs: Editor2TextRun[],
  fallbackStyles?: Editor2TextStyle,
): Editor2ParagraphNode {
  return {
    ...paragraph,
    runs: normalizeRuns(runs, fallbackStyles),
    style: paragraph.style ? { ...paragraph.style } : undefined,
  };
}

function createParagraphFromRuns(
  textRuns: Array<{ text: string; styles?: Editor2TextStyle }>,
): Editor2ParagraphNode {
  return createEditor2ParagraphFromRuns(textRuns);
}

function cloneStateWithParagraphs(
  state: Editor2State,
  paragraphs: Editor2ParagraphNode[],
  selection: Editor2Selection,
): Editor2State {
  return {
    document: createEditor2Document(paragraphs),
    selection,
  };
}

function withSelection(position: Editor2Position): Editor2Selection {
  return createCollapsedSelection(position);
}

function getFocusParagraph(state: Editor2State): {
  paragraph: Editor2ParagraphNode;
  index: number;
  offset: number;
} {
  const paragraphs = getParagraphs(state);
  const focus = clampPosition(state, state.selection.focus);
  const index = findParagraphIndex(paragraphs, focus.paragraphId);
  const paragraph = paragraphs[index];
  return {
    paragraph,
    index,
    offset: positionToParagraphOffset(paragraph, focus),
  };
}

function getStyleAtOffset(paragraph: Editor2ParagraphNode, offset: number): Editor2TextStyle | undefined {
  if (paragraph.runs.length === 0) {
    return undefined;
  }

  let consumed = 0;
  for (let index = 0; index < paragraph.runs.length; index += 1) {
    const run = paragraph.runs[index];
    const nextConsumed = consumed + run.text.length;

    if (offset < nextConsumed) {
      return cloneStyle(run.styles);
    }

    if (offset === nextConsumed) {
      if (run.text.length > 0) {
        return cloneStyle(run.styles);
      }
      const nextRun = paragraph.runs[index + 1];
      return cloneStyle(nextRun?.styles ?? run.styles);
    }

    consumed = nextConsumed;
  }

  return cloneStyle(paragraph.runs[paragraph.runs.length - 1]?.styles);
}

function sliceRuns(
  paragraph: Editor2ParagraphNode,
  startOffset: number,
  endOffset: number,
): Editor2TextRun[] {
  const start = Math.max(0, Math.min(startOffset, getParagraphLength(paragraph)));
  const end = Math.max(start, Math.min(endOffset, getParagraphLength(paragraph)));
  const pieces: Editor2TextRun[] = [];

  let consumed = 0;
  for (const run of paragraph.runs) {
    const runStart = consumed;
    const runEnd = consumed + run.text.length;
    const overlapStart = Math.max(start, runStart);
    const overlapEnd = Math.min(end, runEnd);

    if (overlapStart < overlapEnd) {
      pieces.push(
        createEditor2StyledRun(
          run.text.slice(overlapStart - runStart, overlapEnd - runStart),
          run.styles,
        ),
      );
    }

    consumed = runEnd;
  }

  return pieces;
}

function insertRunsAtOffset(
  paragraph: Editor2ParagraphNode,
  offset: number,
  textRuns: Editor2TextRun[],
): Editor2ParagraphNode {
  const beforeRuns = sliceRuns(paragraph, 0, offset);
  const afterRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const fallbackStyles = getStyleAtOffset(paragraph, offset);

  return buildParagraphFromRuns(
    paragraph,
    [
      ...beforeRuns,
      ...textRuns.map((run) => ({
        ...run,
        styles: cloneStyle(run.styles ?? fallbackStyles),
      })),
      ...afterRuns,
    ],
    fallbackStyles,
  );
}

function deleteSelectionRange(state: Editor2State): Editor2State {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const startParagraph = paragraphs[normalized.startIndex];
  const endParagraph = paragraphs[normalized.endIndex];
  const startOffset = positionToParagraphOffset(startParagraph, normalized.start);
  const endOffset = positionToParagraphOffset(endParagraph, normalized.end);
  const mergedParagraph = buildParagraphFromRuns(startParagraph, [
    ...sliceRuns(startParagraph, 0, startOffset),
    ...sliceRuns(endParagraph, endOffset, getParagraphLength(endParagraph)),
  ]);

  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, normalized.startIndex)),
    mergedParagraph,
    ...cloneParagraphs(paragraphs.slice(normalized.endIndex + 1)),
  ];

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(mergedParagraph, startOffset)),
  );
}

function mapRunsInRange(
  paragraph: Editor2ParagraphNode,
  startOffset: number,
  endOffset: number,
  mapper: (run: Editor2TextRun) => Editor2TextRun,
): Editor2ParagraphNode {
  return buildParagraphFromRuns(paragraph, [
    ...sliceRuns(paragraph, 0, startOffset),
    ...sliceRuns(paragraph, startOffset, endOffset).map(mapper),
    ...sliceRuns(paragraph, endOffset, getParagraphLength(paragraph)),
  ]);
}

function collapseToBoundary(state: Editor2State, direction: "start" | "end"): Editor2State {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const paragraphs = cloneParagraphs(getParagraphs(state));
  return cloneStateWithParagraphs(
    state,
    paragraphs,
    withSelection(direction === "start" ? normalized.start : normalized.end),
  );
}

export function getSelectedText(state: Editor2State): string {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return "";
  }

  const paragraphs = getParagraphs(state);
  if (normalized.startIndex === normalized.endIndex) {
    const paragraph = paragraphs[normalized.startIndex];
    const text = getParagraphText(paragraph);
    return text.slice(normalized.startParagraphOffset, normalized.endParagraphOffset);
  }

  const parts: string[] = [];
  const startParagraph = paragraphs[normalized.startIndex];
  const endParagraph = paragraphs[normalized.endIndex];

  parts.push(getParagraphText(startParagraph).slice(normalized.startParagraphOffset));
  for (let index = normalized.startIndex + 1; index < normalized.endIndex; index += 1) {
    parts.push(getParagraphText(paragraphs[index]));
  }
  parts.push(getParagraphText(endParagraph).slice(0, normalized.endParagraphOffset));

  return parts.join("\n");
}

export function setSelection(state: Editor2State, selection: Editor2Selection): Editor2State {
  return {
    document: {
      ...state.document,
      blocks: cloneParagraphs(getParagraphs(state)),
    },
    selection: {
      anchor: clampPosition(state, selection.anchor),
      focus: clampPosition(state, selection.focus),
    },
  };
}

export function insertTextAtSelection(state: Editor2State, text: string): Editor2State {
  if (text.length === 0) {
    return state;
  }

  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const insertedRun = createEditor2StyledRun(text, getStyleAtOffset(paragraph, offset));
  const nextParagraph = insertRunsAtOffset(paragraph, offset, [insertedRun]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
    candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
  );

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, offset + text.length)),
  );
}

export function insertPlainTextAtSelection(state: Editor2State, text: string): Editor2State {
  if (text.length === 0) {
    return state;
  }

  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalizedText.includes("\n")) {
    return insertTextAtSelection(state, normalizedText);
  }

  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const lines = normalizedText.split("\n");
  const insertionStyles = getStyleAtOffset(paragraph, offset);
  const beforeRuns = sliceRuns(paragraph, 0, offset);
  const firstParagraph = buildParagraphFromRuns(paragraph, [
    ...beforeRuns,
    createEditor2StyledRun(lines[0], insertionStyles),
  ], insertionStyles);
  const tailRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const middleParagraphs = lines
    .slice(1, -1)
    .map((line) => createParagraphFromRuns([{ text: line, styles: insertionStyles }]));
  const lastParagraph = createParagraphFromRuns([
    { text: lines[lines.length - 1], styles: insertionStyles },
    ...tailRuns.map((run) => ({ text: run.text, styles: run.styles })),
  ]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    firstParagraph,
    ...middleParagraphs,
    lastParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(lastParagraph, lines[lines.length - 1].length)),
  );
}

export function splitBlockAtSelection(state: Editor2State): Editor2State {
  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const firstParagraph = buildParagraphFromRuns(paragraph, sliceRuns(paragraph, 0, offset), getStyleAtOffset(paragraph, offset));
  const secondRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const nextParagraph =
    secondRuns.length > 0
      ? createParagraphFromRuns(secondRuns.map((run) => ({ text: run.text, styles: run.styles })))
      : createEditor2Paragraph("");
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

export function deleteBackward(state: Editor2State): Editor2State {
  if (!isSelectionCollapsed(state.selection)) {
    return deleteSelectionRange(state);
  }

  const { paragraph, index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);

  if (offset > 0) {
    const nextParagraph = buildParagraphFromRuns(
      paragraph,
      [
        ...sliceRuns(paragraph, 0, offset - 1),
        ...sliceRuns(paragraph, offset, getParagraphLength(paragraph)),
      ],
      getStyleAtOffset(paragraph, offset - 1),
    );
    const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
      candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
    );

    return cloneStateWithParagraphs(
      state,
      nextParagraphs,
      withSelection(paragraphOffsetToPosition(nextParagraph, offset - 1)),
    );
  }

  if (index === 0) {
    return state;
  }

  const previousParagraph = paragraphs[index - 1];
  const mergedParagraph = buildParagraphFromRuns(previousParagraph, [
    ...previousParagraph.runs.map(cloneRun),
    ...paragraph.runs.map(cloneRun),
  ]);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index - 1)),
    mergedParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(mergedParagraph, getParagraphLength(previousParagraph))),
  );
}

export function deleteForward(state: Editor2State): Editor2State {
  if (!isSelectionCollapsed(state.selection)) {
    return deleteSelectionRange(state);
  }

  const { paragraph, index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);

  if (offset < getParagraphLength(paragraph)) {
    const nextParagraph = buildParagraphFromRuns(
      paragraph,
      [
        ...sliceRuns(paragraph, 0, offset),
        ...sliceRuns(paragraph, offset + 1, getParagraphLength(paragraph)),
      ],
      getStyleAtOffset(paragraph, offset),
    );
    const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
      candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
    );

    return cloneStateWithParagraphs(
      state,
      nextParagraphs,
      withSelection(paragraphOffsetToPosition(nextParagraph, offset)),
    );
  }

  if (index >= paragraphs.length - 1) {
    return state;
  }

  const nextParagraph = paragraphs[index + 1];
  const mergedParagraph = buildParagraphFromRuns(paragraph, [
    ...paragraph.runs.map(cloneRun),
    ...nextParagraph.runs.map(cloneRun),
  ]);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    mergedParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 2)),
  ];

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(mergedParagraph, offset)),
  );
}

export function moveSelectionLeft(state: Editor2State): Editor2State {
  if (!isSelectionCollapsed(state.selection)) {
    return collapseToBoundary(state, "start");
  }

  const { paragraph, index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);
  if (offset > 0) {
    return {
      document: {
        ...state.document,
        blocks: cloneParagraphs(paragraphs),
      },
      selection: withSelection(paragraphOffsetToPosition(paragraph, offset - 1)),
    };
  }

  if (index === 0) {
    return state;
  }

  const previousParagraph = paragraphs[index - 1];
  return {
    document: {
      ...state.document,
      blocks: cloneParagraphs(paragraphs),
    },
    selection: withSelection(paragraphOffsetToPosition(previousParagraph, getParagraphLength(previousParagraph))),
  };
}

export function moveSelectionRight(state: Editor2State): Editor2State {
  if (!isSelectionCollapsed(state.selection)) {
    return collapseToBoundary(state, "end");
  }

  const { paragraph, index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);
  const paragraphLength = getParagraphLength(paragraph);
  if (offset < paragraphLength) {
    return {
      document: {
        ...state.document,
        blocks: cloneParagraphs(paragraphs),
      },
      selection: withSelection(paragraphOffsetToPosition(paragraph, offset + 1)),
    };
  }

  if (index >= paragraphs.length - 1) {
    return state;
  }

  const nextParagraph = paragraphs[index + 1];
  return {
    document: {
      ...state.document,
      blocks: cloneParagraphs(paragraphs),
    },
    selection: withSelection(paragraphOffsetToPosition(nextParagraph, 0)),
  };
}

function moveVertical(state: Editor2State, delta: -1 | 1): Editor2State {
  if (!isSelectionCollapsed(state.selection)) {
    return collapseToBoundary(state, delta < 0 ? "start" : "end");
  }

  const { index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);
  const nextIndex = index + delta;

  if (nextIndex < 0 || nextIndex >= paragraphs.length) {
    return state;
  }

  const nextParagraph = paragraphs[nextIndex];
  return {
    document: {
      ...state.document,
      blocks: cloneParagraphs(paragraphs),
    },
    selection: withSelection(
      paragraphOffsetToPosition(nextParagraph, Math.min(offset, getParagraphLength(nextParagraph))),
    ),
  };
}

export function moveSelectionUp(state: Editor2State): Editor2State {
  return moveVertical(state, -1);
}

export function moveSelectionDown(state: Editor2State): Editor2State {
  return moveVertical(state, 1);
}

function moveFocusHorizontally(state: Editor2State, delta: -1 | 1): Editor2State {
  const focus = clampPosition(state, state.selection.focus);
  const paragraphs = getParagraphs(state);
  const index = findParagraphIndex(paragraphs, focus.paragraphId);
  const paragraph = paragraphs[index];
  const paragraphOffset = positionToParagraphOffset(paragraph, focus);
  const paragraphLength = getParagraphLength(paragraph);

  if (delta < 0 && paragraphOffset > 0) {
    return setSelection(state, {
      anchor: state.selection.anchor,
      focus: paragraphOffsetToPosition(paragraph, paragraphOffset - 1),
    });
  }

  if (delta > 0 && paragraphOffset < paragraphLength) {
    return setSelection(state, {
      anchor: state.selection.anchor,
      focus: paragraphOffsetToPosition(paragraph, paragraphOffset + 1),
    });
  }

  if (delta < 0 && index > 0) {
    const previousParagraph = paragraphs[index - 1];
    return setSelection(state, {
      anchor: state.selection.anchor,
      focus: paragraphOffsetToPosition(previousParagraph, getParagraphLength(previousParagraph)),
    });
  }

  if (delta > 0 && index < paragraphs.length - 1) {
    const nextParagraph = paragraphs[index + 1];
    return setSelection(state, {
      anchor: state.selection.anchor,
      focus: paragraphOffsetToPosition(nextParagraph, 0),
    });
  }

  return state;
}

function moveFocusVertical(state: Editor2State, delta: -1 | 1): Editor2State {
  const focus = clampPosition(state, state.selection.focus);
  const paragraphs = getParagraphs(state);
  const index = findParagraphIndex(paragraphs, focus.paragraphId);
  const paragraph = paragraphs[index];
  const paragraphOffset = positionToParagraphOffset(paragraph, focus);
  const nextIndex = index + delta;

  if (nextIndex < 0 || nextIndex >= paragraphs.length) {
    return state;
  }

  const nextParagraph = paragraphs[nextIndex];
  return setSelection(state, {
    anchor: state.selection.anchor,
    focus: paragraphOffsetToPosition(nextParagraph, Math.min(paragraphOffset, getParagraphLength(nextParagraph))),
  });
}

export function extendSelectionLeft(state: Editor2State): Editor2State {
  return moveFocusHorizontally(state, -1);
}

export function extendSelectionRight(state: Editor2State): Editor2State {
  return moveFocusHorizontally(state, 1);
}

export function extendSelectionUp(state: Editor2State): Editor2State {
  return moveFocusVertical(state, -1);
}

export function extendSelectionDown(state: Editor2State): Editor2State {
  return moveFocusVertical(state, 1);
}

export function toggleTextStyle(
  state: Editor2State,
  key: ToggleableTextStyleKey,
): Editor2State {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const touchedRuns = paragraphs
    .slice(normalized.startIndex, normalized.endIndex + 1)
    .flatMap((paragraph, relativeIndex) => {
      const paragraphIndex = normalized.startIndex + relativeIndex;
      const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
      const endOffset =
        paragraphIndex === normalized.endIndex
          ? normalized.endParagraphOffset
          : getParagraphLength(paragraph);
      return sliceRuns(paragraph, startOffset, endOffset);
    })
    .filter((run) => run.text.length > 0);

  if (touchedRuns.length === 0) {
    return state;
  }

  const shouldEnable = !touchedRuns.every((run) => Boolean(run.styles?.[key]));
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < normalized.startIndex || paragraphIndex > normalized.endIndex) {
      return cloneParagraph(paragraph);
    }

    const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
    const endOffset =
      paragraphIndex === normalized.endIndex
        ? normalized.endParagraphOffset
        : getParagraphLength(paragraph);

    return mapRunsInRange(paragraph, startOffset, endOffset, (run) => ({
      ...run,
      styles: setBooleanStyle(run.styles, key, shouldEnable),
    }));
  });

  return cloneStateWithParagraphs(state, nextParagraphs, {
    anchor: normalized.start,
    focus: normalized.end,
  });
}
