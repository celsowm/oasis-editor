import type {
  EditorBlockNode,
  EditorParagraphNode,
  EditorState,
  EditorTableNode,
  EditorTableStyle,
} from "@/core/model.js";
import { getBlockParagraphs, getParagraphs } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import {
  patchStyleValue,
  updateNestedTablesInBlocks,
  updateStateSections,
} from "./tableCommandUtils.js";

function collectLinearSelectedParagraphIds(state: EditorState): Set<string> {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const selectedParagraphIds = new Set<string>();
  for (let i = normalized.startIndex; i <= normalized.endIndex; i += 1) {
    selectedParagraphIds.add(paragraphs[i]!.id);
  }
  return selectedParagraphIds;
}

export function setTableStyleValue<K extends keyof EditorTableStyle>(
  state: EditorState,
  key: K,
  value: EditorTableStyle[K] | null,
): EditorState {
  const selectedParagraphIds = collectLinearSelectedParagraphIds(state);

  const updateTable = (table: EditorTableNode): EditorTableNode => ({
    ...table,
    style: patchStyleValue(table.style, key, value),
  });

  const updateBlocks = (blocks: EditorBlockNode[]): EditorBlockNode[] => {
    return blocks.map((block) => {
      if (block.type === "paragraph") return block;

      const paragraphsInTable = getBlockParagraphs(block);
      const isSelected = paragraphsInTable.some((paragraph) =>
        selectedParagraphIds.has(paragraph.id),
      );

      const updatedRows = block.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          blocks: updateBlocks(cell.blocks) as EditorParagraphNode[],
        })),
      }));

      const nextTable = { ...block, rows: updatedRows };
      return isSelected ? updateTable(nextTable) : nextTable;
    });
  };

  return updateStateSections(state, updateBlocks);
}

export function setActiveTableStyleValue<K extends keyof EditorTableStyle>(
  state: EditorState,
  tableId: string,
  key: K,
  value: EditorTableStyle[K] | null,
): EditorState {
  const updateTable = (table: EditorTableNode): EditorTableNode => {
    if (table.id !== tableId) return table;
    return {
      ...table,
      style: patchStyleValue(table.style, key, value),
    };
  };

  return updateStateSections(state, (blocks) =>
    updateNestedTablesInBlocks(blocks, updateTable),
  );
}
