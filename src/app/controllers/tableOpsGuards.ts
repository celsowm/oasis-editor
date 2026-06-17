import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  type EditorBlockNode,
  type EditorEditingZone,
  type EditorState,
} from "@/core/model.js";
import { getTableVisualWidth } from "./tableOpsSelectionNavigation.js";
import type {
  HorizontalTableCellRange,
  VerticalTableCellRange,
} from "./tableOpsSelectionRanges.js";

interface TableOpsGuardsDeps {
  getTargetBlocks: (
    state: EditorState,
    zone: EditorEditingZone,
  ) => EditorBlockNode[];
  resolveHorizontalTableCellRange: (
    current: EditorState,
  ) => HorizontalTableCellRange | null;
  resolveVerticalTableCellRange: (
    current: EditorState,
  ) => VerticalTableCellRange | null;
}

export function createTableOpsGuards(deps: TableOpsGuardsDeps) {
  const canMergeSelectedTableCells = (current: EditorState): boolean => {
    const range = deps.resolveHorizontalTableCellRange(current);
    return Boolean(range && range.endCellIndex > range.startCellIndex);
  };

  const canSplitSelectedTableCell = (current: EditorState): boolean => {
    const location = findParagraphTableLocation(
      current.document,
      current.selection.focus.paragraphId,
      getActiveSectionIndex(current),
    );
    if (!location) {
      return false;
    }

    const blocks = deps.getTargetBlocks(current, location.zone);
    const block = blocks[location.blockIndex];
    if (!block || block.type !== "table") {
      return false;
    }

    const cell = block.rows[location.rowIndex]?.cells[location.cellIndex];
    return Boolean((cell?.colSpan ?? 1) > 1);
  };

  const canMergeSelectedTableRows = (current: EditorState): boolean => {
    const range = deps.resolveVerticalTableCellRange(current);
    if (!range) {
      return false;
    }

    const blocks = deps.getTargetBlocks(current, range.zone);
    const tableBlock = blocks[range.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return false;
    }

    for (
      let rowIndex = range.startRowIndex;
      rowIndex <= range.endRowIndex;
      rowIndex += 1
    ) {
      const cell = tableBlock.rows[rowIndex]?.cells[range.cellIndex];
      if (!cell || cell.vMerge === "continue" || cell.blocks.length !== 1) {
        return false;
      }
    }

    return true;
  };

  const canMergeSelectedTable = (current: EditorState): boolean => {
    return (
      canMergeSelectedTableCells(current) || canMergeSelectedTableRows(current)
    );
  };

  const canSplitSelectedTableCellVertically = (
    current: EditorState,
  ): boolean => {
    const location = findParagraphTableLocation(
      current.document,
      current.selection.focus.paragraphId,
      getActiveSectionIndex(current),
    );
    if (!location) {
      return false;
    }

    const blocks = deps.getTargetBlocks(current, location.zone);
    const block = blocks[location.blockIndex];
    if (!block || block.type !== "table") {
      return false;
    }

    const cell = block.rows[location.rowIndex]?.cells[location.cellIndex];
    return Boolean((cell?.rowSpan ?? 1) > 1 && cell?.vMerge === "restart");
  };

  const canSplitSelectedTable = (current: EditorState): boolean => {
    return (
      canSplitSelectedTableCell(current) ||
      canSplitSelectedTableCellVertically(current)
    );
  };

  const canEditSelectedTableRow = (current: EditorState): boolean => {
    const location = findParagraphTableLocation(
      current.document,
      current.selection.focus.paragraphId,
      getActiveSectionIndex(current),
    );
    if (!location) {
      return false;
    }

    const blocks = deps.getTargetBlocks(current, location.zone);
    const block = blocks[location.blockIndex];
    return Boolean(block && block.type === "table");
  };

  const canEditSelectedTableColumn = (current: EditorState): boolean => {
    const location = findParagraphTableLocation(
      current.document,
      current.selection.focus.paragraphId,
      getActiveSectionIndex(current),
    );
    if (!location) {
      return false;
    }

    const blocks = deps.getTargetBlocks(current, location.zone);
    const block = blocks[location.blockIndex];
    if (!block || block.type !== "table") {
      return false;
    }

    return getTableVisualWidth(block) > 1;
  };

  return {
    canMergeSelectedTableCells,
    canSplitSelectedTableCell,
    canMergeSelectedTableRows,
    canMergeSelectedTable,
    canSplitSelectedTableCellVertically,
    canSplitSelectedTable,
    canEditSelectedTableRow,
    canEditSelectedTableColumn,
  };
}
