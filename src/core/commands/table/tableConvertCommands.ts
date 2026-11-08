import type {
  EditorParagraphNode,
  EditorState,
  EditorTableNode,
} from "@/core/model.js";
import { paragraphOffsetToPosition } from "@/core/model.js";
import { cloneParagraph } from "@/core/document/clone.js";
import { withSelection } from "@/core/selection/rangeEditing.js";
import {
  getActiveTableStory,
  readInnermostTableAtPath,
  replaceActiveTableWithBlocks,
  resolveActiveTableLocation,
} from "./tableCommandUtils.js";

/** True when the caret sits inside an editable table that can be converted. */
export function canConvertActiveTableToText(state: EditorState): boolean {
  return resolveActiveTableLocation(state) !== null;
}

/**
 * Word's "Convert Table to Text": replaces the active (innermost) table with
 * a run of body paragraphs, one per cell paragraph in document order, keeping
 * each cell's paragraph content. The caret lands at the start of the first
 * produced paragraph. A no-op when the caret is outside a table.
 */
export function convertActiveTableToText(state: EditorState): EditorState {
  const target = resolveActiveTableLocation(state);
  if (!target) return state;

  const story = getActiveTableStory(state);
  if (!story) return state;
  const table = readInnermostTableAtPath(story, target.loc.tablePath);
  if (!table) return state;

  const paragraphs = tableToParagraphs(table);
  if (paragraphs.length === 0) return state;

  const next = replaceActiveTableWithBlocks(state, paragraphs);
  if (next === state) return state;

  const first = paragraphs[0];
  return {
    ...next,
    selection: withSelection(paragraphOffsetToPosition(first, 0)),
  };
}

/** Flattens a table's cell paragraphs, in document order, as fresh clones. */
export function tableToParagraphs(
  table: EditorTableNode,
): EditorParagraphNode[] {
  const paragraphs: EditorParagraphNode[] = [];
  for (const row of table.rows) {
    for (const cell of row.cells) {
      for (const block of cell.blocks) {
        if (block.type === "paragraph") {
          paragraphs.push(cloneParagraph(block));
        }
      }
    }
  }
  return paragraphs;
}
