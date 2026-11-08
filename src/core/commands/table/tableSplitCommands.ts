import type {
  EditorBlockNode,
  EditorParagraphNode,
  EditorState,
  EditorTableNode,
} from "@/core/model.js";
import { paragraphOffsetToPosition } from "@/core/model.js";
import {
  createEditorParagraph,
  createEditorTable,
} from "@/core/editorState.js";
import { withSelection } from "@/core/selection/rangeEditing.js";
import {
  getActiveTableStory,
  readInnermostTableAtPath,
  replaceActiveTableWithBlocks,
  resolveActiveTableLocation,
} from "./tableCommandUtils.js";

/**
 * True when the caret sits inside a table on a row that can be split: the
 * innermost table must have the caret row neither first (nothing above to
 * split off) nor last (nothing below).
 */
export function canSplitActiveTableAtRow(state: EditorState): boolean {
  const target = resolveActiveTableLocation(state);
  if (!target) return false;
  const story = getActiveTableStory(state);
  if (!story) return false;
  const table = readInnermostTableAtPath(story, target.loc.tablePath);
  if (!table) return false;
  const rowIndex = target.loc.rowIndex;
  return rowIndex > 0 && rowIndex < table.rows.length;
}

/**
 * Word's "Split Table": splits the active (innermost) table into two tables at
 * the caret row. The rows above the caret row remain in the first (original)
 * table; the caret row and everything below move into a new second table, with
 * an empty paragraph inserted between the two (mirroring Word's paragraph mark).
 * The caret lands in the first cell of the second table. A no-op when the caret
 * is outside a splittable table.
 */
export function splitActiveTableAtRow(state: EditorState): EditorState {
  const target = resolveActiveTableLocation(state);
  if (!target) return state;
  const story = getActiveTableStory(state);
  if (!story) return state;
  const table = readInnermostTableAtPath(story, target.loc.tablePath);
  if (!table) return state;
  const rowIndex = target.loc.rowIndex;
  if (rowIndex <= 0 || rowIndex >= table.rows.length) return state;

  const upperRows = table.rows.slice(0, rowIndex);
  const lowerRows = table.rows.slice(rowIndex);

  const upperTable: EditorTableNode = { ...table, rows: upperRows };
  const lowerTable = createEditorTable(lowerRows);

  const separator: EditorParagraphNode = createEditorParagraph("");
  const replacement: EditorBlockNode[] = [upperTable, separator, lowerTable];

  const next = replaceActiveTableWithBlocks(state, replacement);
  if (next === state) return state;

  const firstCellParagraph = lowerTable.rows[0]?.cells[0]?.blocks.find(
    (block): block is EditorParagraphNode => block.type === "paragraph",
  );
  if (!firstCellParagraph) return state;
  return {
    ...next,
    selection: withSelection(paragraphOffsetToPosition(firstCellParagraph, 0)),
  };
}
