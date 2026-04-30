import type {
  Editor2BlockNode,
  Editor2ParagraphListStyle,
  Editor2ParagraphStyle,
  Editor2ParagraphNode,
  Editor2Position,
  Editor2Selection,
  Editor2State,
  Editor2TextRun,
  Editor2TextStyle,
  Editor2ImageRunData,
} from "./model.js";
import {
  getBlockParagraphs,
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
  createEditor2Table,
  createEditor2TableCell,
  createEditor2TableRow,
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

type ValueTextStyleKey = "fontFamily" | "fontSize" | "color" | "highlight" | "link";
type ValueParagraphStyleKey =
  | "align"
  | "spacingBefore"
  | "spacingAfter"
  | "lineHeight"
  | "indentLeft"
  | "indentRight"
  | "indentFirstLine"
  | "pageBreakBefore"
  | "keepWithNext";
type ParagraphListKind = Editor2ParagraphListStyle["kind"];

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

function setValueStyle<K extends ValueTextStyleKey>(
  style: Editor2TextStyle | undefined,
  key: K,
  value: Editor2TextStyle[K] | null,
): Editor2TextStyle | undefined {
  const next = { ...(style ?? {}) } as Record<string, unknown>;

  if (value === null || value === undefined || value === "") {
    delete next[key];
  } else {
    next[key] = value;
  }

  return Object.keys(next).length > 0 ? (next as Editor2TextStyle) : undefined;
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
    list: paragraph.list ? { ...paragraph.list } : undefined,
  };
}

function setParagraphStyleValue<K extends ValueParagraphStyleKey>(
  style: Editor2ParagraphStyle | undefined,
  key: K,
  value: Editor2ParagraphStyle[K] | null,
): Editor2ParagraphStyle | undefined {
  const next = { ...(style ?? {}) } as Record<string, unknown>;

  if (value === null || value === undefined) {
    delete next[key];
  } else {
    next[key] = value;
  }

  return Object.keys(next).length > 0 ? (next as Editor2ParagraphStyle) : undefined;
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
    if (previous && !run.image && !previous.image && stylesEqual(previous.styles, run.styles)) {
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

function replaceParagraphsInBlocks(blocks: Editor2BlockNode[], newParagraphs: Editor2ParagraphNode[]): Editor2BlockNode[] {
  let index = 0;
  const processBlocks = (nodes: Editor2BlockNode[]): Editor2BlockNode[] => {
    return nodes.map(node => {
      if (node.type === "paragraph") {
        return newParagraphs[index++];
      }
      return {
        ...node,
        rows: node.rows.map(row => ({
          ...row,
          cells: row.cells.map(cell => ({
            ...cell,
            blocks: processBlocks(cell.blocks) as Editor2ParagraphNode[]
          }))
        }))
      };
    });
  };
  return processBlocks(blocks);
}

function cloneStateWithParagraphs(
  state: Editor2State,
  paragraphs: Editor2ParagraphNode[],
  selection: Editor2Selection,
): Editor2State {
  if (getParagraphs(state).length === paragraphs.length && state.document.blocks.some(b => b.type === "table")) {
    return {
      document: {
        ...state.document,
        blocks: replaceParagraphsInBlocks(state.document.blocks, paragraphs),
      },
      selection,
    };
  }

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

function getRunAtOffset(
  paragraph: Editor2ParagraphNode,
  offset: number,
): { run: Editor2TextRun; startOffset: number; endOffset: number } | null {
  let consumed = 0;
  for (let index = 0; index < paragraph.runs.length; index += 1) {
    const run = paragraph.runs[index]!;
    const startOffset = consumed;
    const endOffset = consumed + run.text.length;

    if (offset < endOffset) {
      return { run, startOffset, endOffset };
    }

    if (offset === endOffset) {
      if (run.text.length > 0) {
        return { run, startOffset, endOffset };
      }
      const nextRun = paragraph.runs[index + 1];
      if (nextRun) {
        return {
          run: nextRun,
          startOffset: endOffset,
          endOffset: endOffset + nextRun.text.length,
        };
      }
      return { run, startOffset, endOffset };
    }

    consumed = endOffset;
  }

  return null;
}

function expandLinkRangeInParagraph(
  paragraph: Editor2ParagraphNode,
  offset: number,
): { href: string; startOffset: number; endOffset: number } | null {
  const resolved = getRunAtOffset(paragraph, offset);
  const href = resolved?.run.styles?.link;
  if (!resolved || !href || resolved.run.image) {
    return null;
  }

  let startOffset = resolved.startOffset;
  let endOffset = resolved.endOffset;
  let consumed = 0;
  const runs = paragraph.runs;
  const runIndex = runs.findIndex((run) => run.id === resolved.run.id);
  if (runIndex === -1) {
    return null;
  }

  for (let index = 0; index < runIndex; index += 1) {
    consumed += runs[index]!.text.length;
  }

  startOffset = consumed;
  endOffset = consumed + resolved.run.text.length;

  for (let index = runIndex - 1; index >= 0; index -= 1) {
    const run = runs[index]!;
    if (run.image || run.styles?.link !== href) {
      break;
    }
    startOffset -= run.text.length;
  }

  for (let index = runIndex + 1; index < runs.length; index += 1) {
    const run = runs[index]!;
    if (run.image || run.styles?.link !== href) {
      break;
    }
    endOffset += run.text.length;
  }

  return { href, startOffset, endOffset };
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

function preserveSelectionByParagraphOffsets(
  paragraphs: Editor2ParagraphNode[],
  normalized: ReturnType<typeof normalizeSelection>,
): Editor2Selection {
  const startParagraph = paragraphs[normalized.startIndex]!;
  const endParagraph = paragraphs[normalized.endIndex]!;

  return {
    anchor: paragraphOffsetToPosition(startParagraph, normalized.startParagraphOffset),
    focus: paragraphOffsetToPosition(endParagraph, normalized.endParagraphOffset),
  };
}

function collapseToBoundary(state: Editor2State, direction: "start" | "end"): Editor2State {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  return {
    document: state.document,
    selection: withSelection(direction === "start" ? normalized.start : normalized.end),
  };
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
    document: state.document,
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

export function insertImageAtSelection(state: Editor2State, image: Editor2ImageRunData): Editor2State {
  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  
  const insertedRun = createEditor2StyledRun("\uFFFC", getStyleAtOffset(paragraph, offset), image);
  const nextParagraph = insertRunsAtOffset(paragraph, offset, [insertedRun]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
    candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
  );

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, offset + 1)),
  );
}

export function resizeSelectedImage(
  state: Editor2State,
  width: number,
  height: number,
): Editor2State {
  const normalized = normalizeSelection(state);
  if (
    normalized.isCollapsed ||
    normalized.startIndex !== normalized.endIndex ||
    normalized.endParagraphOffset - normalized.startParagraphOffset !== 1
  ) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const paragraph = paragraphs[normalized.startIndex];
  if (!paragraph) {
    return state;
  }

  let runStart = 0;
  let targetRun: Editor2TextRun | undefined;
  for (const run of paragraph.runs) {
    const startOffset = runStart;
    runStart += run.text.length;
    if (
      run.image &&
      run.text.length === 1 &&
      startOffset === normalized.startParagraphOffset
    ) {
      targetRun = run;
      break;
    }
  }

  if (!targetRun?.image) {
    return state;
  }

  const nextParagraphs = paragraphs.map((candidate, candidateIndex) => {
    if (candidateIndex !== normalized.startIndex) {
      return cloneParagraph(candidate);
    }

    return {
      ...cloneParagraph(candidate),
      runs: candidate.runs.map((run) =>
        run.id === targetRun.id && run.image
          ? {
              ...run,
              image: {
                ...run.image,
                width: Math.max(24, Math.round(width)),
                height: Math.max(24, Math.round(height)),
              },
            }
          : cloneRun(run),
      ),
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function moveSelectedImageToPosition(
  state: Editor2State,
  targetPosition: Editor2Position,
): Editor2State {
  const normalized = normalizeSelection(state);
  if (
    normalized.isCollapsed ||
    normalized.startIndex !== normalized.endIndex ||
    normalized.endParagraphOffset - normalized.startParagraphOffset !== 1
  ) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const sourceParagraph = paragraphs[normalized.startIndex];
  if (!sourceParagraph) {
    return state;
  }

  const sourceOffset = normalized.startParagraphOffset;
  let imageRun: Editor2TextRun | undefined;
  let consumed = 0;
  for (const run of sourceParagraph.runs) {
    const runStart = consumed;
    consumed += run.text.length;
    if (run.image && run.text.length === 1 && runStart === sourceOffset) {
      imageRun = run;
      break;
    }
  }

  if (!imageRun?.image) {
    return state;
  }

  const targetIndex = findParagraphIndex(paragraphs, targetPosition.paragraphId);
  if (targetIndex < 0) {
    return state;
  }

  const targetParagraph = paragraphs[targetIndex];
  const targetOffsetRaw = positionToParagraphOffset(targetParagraph, targetPosition);
  const adjustedTargetOffset =
    targetIndex === normalized.startIndex && targetOffsetRaw > sourceOffset
      ? targetOffsetRaw - 1
      : targetOffsetRaw;

  if (targetIndex === normalized.startIndex && adjustedTargetOffset === sourceOffset) {
    return state;
  }

  const removeImageFromParagraph = (paragraph: Editor2ParagraphNode): Editor2ParagraphNode =>
    buildParagraphFromRuns(paragraph, [
      ...sliceRuns(paragraph, 0, sourceOffset),
      ...sliceRuns(paragraph, sourceOffset + 1, getParagraphLength(paragraph)),
    ]);

  const insertImageIntoParagraph = (
    paragraph: Editor2ParagraphNode,
    offset: number,
  ): Editor2ParagraphNode =>
    insertRunsAtOffset(
      paragraph,
      Math.max(0, Math.min(offset, getParagraphLength(paragraph))),
      [createEditor2StyledRun("\uFFFC", getStyleAtOffset(paragraph, offset), imageRun.image)],
    );

  const nextParagraphs = paragraphs.map((paragraph, index) => {
    if (index === normalized.startIndex && index === targetIndex) {
      return insertImageIntoParagraph(removeImageFromParagraph(paragraph), adjustedTargetOffset);
    }

    if (index === normalized.startIndex) {
      return removeImageFromParagraph(paragraph);
    }

    if (index === targetIndex) {
      return insertImageIntoParagraph(paragraph, adjustedTargetOffset);
    }

    return cloneParagraphs([paragraph])[0]!;
  });

  const insertedParagraph = nextParagraphs[targetIndex];
  const insertedOffset = Math.max(0, Math.min(adjustedTargetOffset + 1, getParagraphLength(insertedParagraph)));

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(insertedParagraph, insertedOffset)),
  );
}

export function insertTableAtSelection(state: Editor2State, rows: number, cols: number): Editor2State {
  const tableRows = [];
  for (let r = 0; r < rows; r += 1) {
    const cells = [];
    for (let c = 0; c < cols; c += 1) {
      cells.push(createEditor2TableCell([createEditor2Paragraph("")]));
    }
    tableRows.push(createEditor2TableRow(cells));
  }
  const table = createEditor2Table(tableRows);

  const focus = clampPosition(state, state.selection.focus);
  const blocks = state.document.blocks;
  const blockIndex = blocks.findIndex(b => {
     if (b.id === focus.paragraphId) return true;
     if (b.type === "paragraph") return false;
     return getBlockParagraphs(b).some(p => p.id === focus.paragraphId);
  });
  
  if (blockIndex === -1) {
    return state;
  }
  
  const nextBlocks = [
    ...blocks.slice(0, blockIndex + 1),
    table,
    ...blocks.slice(blockIndex + 1)
  ];
  
  return {
    document: {
      ...state.document,
      blocks: nextBlocks
    },
    selection: withSelection(paragraphOffsetToPosition(table.rows[0]!.cells[0]!.blocks[0]!, 0))
  };
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
      document: state.document,
      selection: withSelection(paragraphOffsetToPosition(paragraph, offset - 1)),
    };
  }

  if (index === 0) {
    return state;
  }

  const previousParagraph = paragraphs[index - 1];
  return {
    document: state.document,
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
      document: state.document,
      selection: withSelection(paragraphOffsetToPosition(paragraph, offset + 1)),
    };
  }

  if (index >= paragraphs.length - 1) {
    return state;
  }

  const nextParagraph = paragraphs[index + 1];
  return {
    document: state.document,
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
    document: state.document,
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

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function setTextStyleValue<K extends ValueTextStyleKey>(
  state: Editor2State,
  key: K,
  value: Editor2TextStyle[K] | null,
): Editor2State {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const paragraphs = getParagraphs(state);
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
      styles: setValueStyle(run.styles, key, value),
    }));
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function getLinkAtSelection(state: Editor2State): string | null {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);

  if (normalized.isCollapsed) {
    const paragraph = paragraphs[normalized.startIndex];
    if (!paragraph) {
      return null;
    }
    return expandLinkRangeInParagraph(paragraph, normalized.startParagraphOffset)?.href ?? null;
  }

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
    .filter((run) => run.text.length > 0 && !run.image);

  if (touchedRuns.length === 0) {
    return null;
  }

  const href = touchedRuns[0]?.styles?.link;
  if (!href) {
    return null;
  }

  return touchedRuns.every((run) => run.styles?.link === href) ? href : null;
}

export function setLinkAtSelection(
  state: Editor2State,
  href: string | null,
): Editor2State {
  const normalized = normalizeSelection(state);
  if (!normalized.isCollapsed) {
    return setTextStyleValue(state, "link", href);
  }

  const paragraphs = getParagraphs(state);
  const paragraph = paragraphs[normalized.startIndex];
  if (!paragraph) {
    return state;
  }

  const linkRange = expandLinkRangeInParagraph(paragraph, normalized.startParagraphOffset);
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
    document: next.document,
    selection: {
      anchor: paragraphOffsetToPosition(nextParagraph, linkRange.startOffset),
      focus: paragraphOffsetToPosition(nextParagraph, linkRange.endOffset),
    },
  };
}

export function setParagraphStyle<K extends ValueParagraphStyleKey>(
  state: Editor2State,
  key: K,
  value: Editor2ParagraphStyle[K] | null,
): Editor2State {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const startIndex = normalized.startIndex;
  const endIndex = normalized.endIndex;

  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < startIndex || paragraphIndex > endIndex) {
      return cloneParagraph(paragraph);
    }

    return {
      ...cloneParagraph(paragraph),
      style: setParagraphStyleValue(paragraph.style, key, value),
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function toggleParagraphList(
  state: Editor2State,
  kind: ParagraphListKind,
): Editor2State {
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
      level: paragraph.list?.kind === kind ? paragraph.list.level ?? 0 : paragraph.list?.level ?? 0,
    };
    return nextParagraph;
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}
