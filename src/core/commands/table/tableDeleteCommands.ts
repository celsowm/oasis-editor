import type { EditorBlockNode, EditorState } from "@/core/model.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import { createEditorParagraph } from "@/core/editorState.js";
import { withSelection } from "@/core/selection/rangeEditing.js";
import {
  getActiveTableStory,
  replaceActiveTableWithBlocks,
  resolveActiveTableLocation,
} from "./tableCommandUtils.js";

/** True when the caret sits inside a table that can be deleted. */
export function canDeleteActiveTable(state: EditorState): boolean {
  return resolveActiveTableLocation(state) !== null;
}

/**
 * Word's "Delete Table": removes the active (innermost) table, splicing the
 * adjacent story back together. The caret lands in the paragraph that followed
 * the table (or preceded it when the table was last). When the table was the
 * only block in its story, it is replaced by a single empty paragraph. A no-op
 * when the caret is outside a table.
 */
export function deleteActiveTable(state: EditorState): EditorState {
  const target = resolveActiveTableLocation(state);
  if (!target) return state;
  const story = getActiveTableStory(state);
  if (!story) return state;

  const tableIndex = target.loc.tablePath[0]?.tableBlockIndex;
  if (tableIndex === undefined || story[tableIndex]?.type !== "table") {
    return state;
  }

  // A lone table would leave its story empty; keep a single empty paragraph so
  // the story remains editable.
  if (story.length === 1) {
    const empty = createEditorParagraph("");
    const next = replaceActiveTableWithBlocks(state, [empty]);
    if (next === state) return state;
    return {
      ...next,
      selection: withSelection(paragraphOffsetToPosition(empty, 0)),
    };
  }

  const caretParagraphId = adjacentParagraphId(story, tableIndex);
  const next = replaceActiveTableWithBlocks(state, []);
  if (next === state) return state;

  if (caretParagraphId) {
    const caretParagraph = getParagraphs(next).find(
      (paragraph) => paragraph.id === caretParagraphId,
    );
    if (caretParagraph) {
      return {
        ...next,
        selection: withSelection(paragraphOffsetToPosition(caretParagraph, 0)),
      };
    }
  }
  return next;
}

/** Id of the paragraph adjacent to `tableIndex`, preferring the one after. */
function adjacentParagraphId(
  blocks: readonly EditorBlockNode[],
  tableIndex: number,
): string | null {
  for (let index = tableIndex + 1; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block?.type === "paragraph") return block.id;
  }
  for (let index = tableIndex - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (block?.type === "paragraph") return block.id;
  }
  return null;
}
