import type { EditorBlockNode, EditorState } from "@/core/model.js";
import {
  getActiveSectionIndex,
  getActiveZone,
  getBlockParagraphs,
  getDocumentSections,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import {
  createEditorParagraph,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import { clampPosition } from "@/core/selection.js";
import { withSelection } from "@/core/selection/rangeEditing.js";

export function insertTableAtSelection(
  state: EditorState,
  rows: number,
  cols: number,
): EditorState {
  const initialCellWidth = `${100 / Math.max(1, cols)}%`;
  const tableRows = [];
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const cells = [];
    for (let columnIndex = 0; columnIndex < cols; columnIndex += 1) {
      cells.push({
        ...createEditorTableCell([createEditorParagraph("")]),
        style: {
          width: initialCellWidth,
        },
      });
    }
    tableRows.push(createEditorTableRow(cells));
  }
  const table = {
    ...createEditorTable(tableRows),
    style: {
      width: "100%",
    },
  };

  const focus = clampPosition(state, state.selection.focus);
  const sections = getDocumentSections(state.document);
  const activeSectionIndex = getActiveSectionIndex(state);
  const zone = getActiveZone(state);

  const insertIntoBlocks = (
    blocks: EditorBlockNode[],
  ): { nextBlocks: EditorBlockNode[]; found: boolean } => {
    const blockIndex = blocks.findIndex((block) => {
      if (block.id === focus.paragraphId) return true;
      if (block.type === "paragraph") return false;
      return getBlockParagraphs(block).some(
        (paragraph) => paragraph.id === focus.paragraphId,
      );
    });

    if (blockIndex === -1) {
      return { nextBlocks: blocks, found: false };
    }

    return {
      nextBlocks: [
        ...blocks.slice(0, blockIndex + 1),
        table,
        ...blocks.slice(blockIndex + 1),
      ],
      found: true,
    };
  };

  const section = sections[activeSectionIndex];
  if (!section) return state;

  const nextSection = { ...section };
  let found = false;

  if (zone === "header") {
    const result = insertIntoBlocks(section.header ?? []);
    nextSection.header = result.nextBlocks;
    found = result.found;
  } else if (zone === "footer") {
    const result = insertIntoBlocks(section.footer ?? []);
    nextSection.footer = result.nextBlocks;
    found = result.found;
  } else {
    const result = insertIntoBlocks(section.blocks);
    nextSection.blocks = result.nextBlocks;
    found = result.found;
  }

  if (!found) return state;

  const nextSections = [...sections];
  nextSections[activeSectionIndex] = nextSection;

  return {
    ...state,
    document: {
      ...state.document,
      sections: nextSections,
    },
    selection: withSelection(
      paragraphOffsetToPosition(table.rows[0]!.cells[0]!.blocks[0]!, 0),
    ),
  };
}
