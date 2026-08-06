import {
  findParagraphTablePathLocation,
  getActiveSectionIndex,
  resolveTablePath,
  type EditorBlockNode,
  type EditorEditingZone,
  type EditorState,
  type EditorTableNode,
  type TablePathSegment,
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

interface ResolvedGuardTable {
  table: EditorTableNode;
  rowIndex: number;
  cellIndex: number;
}

function resolveTableForPath(
  current: EditorState,
  deps: TableOpsGuardsDeps,
  zone: EditorEditingZone,
  tablePath: readonly TablePathSegment[],
): EditorTableNode | null {
  const blocks = deps.getTargetBlocks(current, zone);
  const resolved = resolveTablePath(blocks, tablePath);
  return resolved?.[resolved.length - 1]?.table ?? null;
}

function resolveActiveGuardTable(
  current: EditorState,
  deps: TableOpsGuardsDeps,
): ResolvedGuardTable | null {
  const location = findParagraphTablePathLocation(
    current.document,
    current.selection.focus.paragraphId,
    getActiveSectionIndex(current),
  );
  const innermost = location?.tablePath[location.tablePath.length - 1];
  if (!location || !innermost) return null;
  const table = resolveTableForPath(
    current,
    deps,
    location.zone,
    location.tablePath,
  );
  return table
    ? {
        table,
        rowIndex: innermost.rowIndex,
        cellIndex: innermost.cellIndex,
      }
    : null;
}

export function createTableOpsGuards(
  deps: TableOpsGuardsDeps,
): ReturnType<typeof createTableOpsGuardsImpl> {
  return createTableOpsGuardsImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createTableOpsGuardsImpl(deps: TableOpsGuardsDeps) {
  const canMergeSelectedTableCells = (current: EditorState): boolean => {
    const range = deps.resolveHorizontalTableCellRange(current);
    return Boolean(range && range.endCellIndex > range.startCellIndex);
  };

  const canSplitSelectedTableCell = (current: EditorState): boolean => {
    const target = resolveActiveGuardTable(current, deps);
    if (!target) return false;
    const cell = target.table.rows[target.rowIndex]?.cells[target.cellIndex];
    return Boolean((cell?.colSpan ?? 1) > 1);
  };

  const canMergeSelectedTableRows = (current: EditorState): boolean => {
    const range = deps.resolveVerticalTableCellRange(current);
    if (!range) {
      return false;
    }

    const tableBlock = resolveTableForPath(
      current,
      deps,
      range.zone,
      range.tablePath,
    );
    if (!tableBlock) return false;

    for (
      let rowIndex = range.startRowIndex;
      rowIndex <= range.endRowIndex;
      rowIndex += 1
    ) {
      const cell = tableBlock.rows[rowIndex]?.cells[range.cellIndex];
      if (
        !cell ||
        cell.vMerge === "continue" ||
        cell.blocks.length !== 1 ||
        cell.blocks[0]?.type !== "paragraph"
      ) {
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
    const target = resolveActiveGuardTable(current, deps);
    if (!target) return false;
    const cell = target.table.rows[target.rowIndex]?.cells[target.cellIndex];
    return Boolean((cell?.rowSpan ?? 1) > 1 && cell?.vMerge === "restart");
  };

  const canSplitSelectedTable = (current: EditorState): boolean => {
    return (
      canSplitSelectedTableCell(current) ||
      canSplitSelectedTableCellVertically(current)
    );
  };

  const canEditSelectedTableRow = (current: EditorState): boolean => {
    return resolveActiveGuardTable(current, deps) !== null;
  };

  const canEditSelectedTableColumn = (current: EditorState): boolean => {
    const target = resolveActiveGuardTable(current, deps);
    return Boolean(target && getTableVisualWidth(target.table) > 1);
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
