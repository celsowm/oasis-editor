import type {
  EditorBlockNode,
  EditorParagraphNode,
  EditorState,
  EditorTableCellNode,
  EditorTableNode,
  EditorTextRun,
} from "@/core/model.js";
import {
  createEditorNodeId,
  createEditorRun,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import { cloneRun } from "@/core/document/clone.js";
import { normalizeSelection } from "@/core/selection.js";
import { withSelection } from "@/core/selection/rangeEditing.js";
import {
  getActiveCaretStory,
  resolveActiveTableLocation,
  updateActiveCaretBlocks,
} from "./tableCommandUtils.js";

/**
 * True when the caret can be turned into a table: it must sit in an editable
 * story (main/header/footer/footnote) but NOT inside an existing table.
 */
export function canConvertActiveTextToTable(state: EditorState): boolean {
  if (resolveActiveTableLocation(state)) return false;
  return getActiveCaretStory(state) !== null;
}

/**
 * Word's "Convert Text to Table": splits the selected paragraphs on TAB into
 * cells (each paragraph becomes a row, every tab-separated segment a column),
 * splices the resulting table in place of the selection, and lands the caret in
 * the first cell. A no-op when the caret is inside a table or outside an
 * editable story.
 */
export function convertActiveTextToTable(state: EditorState): EditorState {
  if (resolveActiveTableLocation(state)) return state;
  const story = getActiveCaretStory(state);
  if (!story) return state;

  const paragraphs = getParagraphs(state);
  if (paragraphs.length === 0) return state;
  const normalized = normalizeSelection(state, paragraphs);
  const selected = paragraphs.slice(
    normalized.startIndex,
    normalized.endIndex + 1,
  );
  if (selected.length === 0) return state;

  const table = buildTableFromParagraphs(selected);
  const firstParagraphId = selected[0]!.id;
  const lastParagraphId = selected[selected.length - 1]!.id;

  let firstCellParagraph: EditorParagraphNode | null = null;
  let changed = false;
  const next = updateActiveCaretBlocks(state, (blocks) => {
    const { nextBlocks, cell } = spliceParagraphRangeWithTable(
      blocks,
      firstParagraphId,
      lastParagraphId,
      table,
    );
    if (nextBlocks && cell) {
      firstCellParagraph = cell;
      changed = true;
      return nextBlocks;
    }
    return blocks;
  });
  if (!changed || !firstCellParagraph) return state;

  return {
    ...next,
    selection: withSelection(paragraphOffsetToPosition(firstCellParagraph, 0)),
  };
}

/**
 * Replaces the contiguous run of top-level paragraph blocks between
 * `startParagraphId` and `endParagraphId` with `table`. Returns null when the
 * range cannot be represented as a pure paragraph run (e.g. it contains an
 * intermediate table), so the caller stays a no-op.
 */
function spliceParagraphRangeWithTable(
  blocks: EditorBlockNode[],
  startParagraphId: string,
  endParagraphId: string,
  table: EditorTableNode,
): { nextBlocks: EditorBlockNode[] | null; cell: EditorParagraphNode | null } {
  let startIndex = -1;
  let endIndex = -1;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.type !== "paragraph") continue;
    if (block.id === startParagraphId) startIndex = index;
    if (block.id === endParagraphId) endIndex = index;
  }
  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    return { nextBlocks: null, cell: null };
  }
  for (let index = startIndex; index <= endIndex; index += 1) {
    if (blocks[index]!.type !== "paragraph") {
      return { nextBlocks: null, cell: null };
    }
  }

  const firstCellParagraph = table.rows[0]?.cells[0]?.blocks.find(
    (block): block is EditorParagraphNode => block.type === "paragraph",
  );
  return {
    nextBlocks: [
      ...blocks.slice(0, startIndex),
      table,
      ...blocks.slice(endIndex + 1),
    ],
    cell: firstCellParagraph ?? null,
  };
}

/**
 * Builds a table from a list of source paragraphs. Each paragraph becomes one
 * row; tab-separated run segments become the row's cells. Rows shorter than the
 * widest row are padded with empty cells so the grid stays rectangular.
 */
export function buildTableFromParagraphs(
  paragraphs: EditorParagraphNode[],
): EditorTableNode {
  const rows = paragraphs.map(splitRunsOnTab);
  const columnCount = Math.max(1, ...rows.map((row) => row.length));

  const tableRows = rows.map((cells) =>
    createEditorTableRow(
      Array.from(
        { length: columnCount },
        (_, columnIndex): EditorTableCellNode => {
          const cellRuns = cells[columnIndex] ?? [];
          const cellParagraph: EditorParagraphNode = {
            id: createEditorNodeId("paragraph"),
            type: "paragraph",
            runs: cellRuns.length > 0 ? cellRuns : [createEditorRun("")],
          };
          return createEditorTableCell([cellParagraph]);
        },
      ),
    ),
  );
  return createEditorTable(tableRows);
}

/**
 * Splits a paragraph's runs on TAB into per-cell run arrays. Runs are cloned
 * per occurrence since a single source run may span both sides of a tab.
 */
function splitRunsOnTab(paragraph: EditorParagraphNode): EditorTextRun[][] {
  const cells: EditorTextRun[][] = [];
  let current: EditorTextRun[] = [];

  const endCell = (): void => {
    if (current.length > 0) cells.push(current);
    current = [];
  };

  for (const run of paragraph.runs) {
    const parts = run.text.split("\t");
    for (let index = 0; index < parts.length; index += 1) {
      if (index > 0) endCell();
      const part = parts[index]!;
      if (part.length > 0) {
        const clone = cloneRun(run);
        clone.id = `run:${Math.random().toString(36).slice(2, 9)}`;
        clone.text = part;
        current.push(clone);
      }
    }
  }
  if (current.length > 0) cells.push(current);
  return cells;
}
