import {
  findParagraphTablePathLocation,
  getActiveSectionIndex,
  getBlockParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  resolveTablePath,
  type EditorBlockNode,
  type EditorEditingZone,
  type EditorParagraphNode,
  type EditorState,
  type EditorTableCellNode,
  type TableLocation,
  type TablePathSegment,
} from "@/core/model.js";
import {
  buildTableCellLayout,
  type TableCellLayoutEntry,
} from "@/core/tableLayout.js";
import type { EditorLogger } from "@/utils/logger.js";

export interface HorizontalTableCellRange {
  blockIndex: number;
  tablePath: TablePathSegment[];
  rowIndex: number;
  startCellIndex: number;
  endCellIndex: number;
  zone: EditorEditingZone;
}

export interface VerticalTableCellRange {
  blockIndex: number;
  tablePath: TablePathSegment[];
  startRowIndex: number;
  endRowIndex: number;
  cellIndex: number;
  zone: EditorEditingZone;
}

export interface SelectedTableCells {
  blockIndex: number;
  tablePath: TablePathSegment[];
  cells: TableCellLayoutEntry[];
  zone: EditorEditingZone;
}

interface TableSelectionResolversDeps {
  getTargetBlocks: (
    state: EditorState,
    zone: EditorEditingZone,
  ) => EditorBlockNode[];
  logger?: EditorLogger;
}

type LocatedTableParagraph = TableLocation & { zone: EditorEditingZone };

function compareCellLocations(
  left: TableCellLayoutEntry,
  right: TableCellLayoutEntry,
): number {
  if (left.visualRowIndex !== right.visualRowIndex) {
    return left.visualRowIndex - right.visualRowIndex;
  }
  if (left.visualColumnIndex !== right.visualColumnIndex) {
    return left.visualColumnIndex - right.visualColumnIndex;
  }
  return 0;
}

function getCellParagraphs(cell: EditorTableCellNode): EditorParagraphNode[] {
  return cell.blocks.flatMap(getBlockParagraphs);
}

function normalizeInnermostLocation(
  location: LocatedTableParagraph,
): LocatedTableParagraph {
  const segment = location.tablePath[location.tablePath.length - 1];
  return segment
    ? {
        ...location,
        rowIndex: segment.rowIndex,
        cellIndex: segment.cellIndex,
      }
    : location;
}

/**
 * Two paragraph paths identify the same table when every ancestor table/cell
 * hop matches and the final table occupies the same block in the innermost
 * parent story. The final row/cell deliberately differs for multi-cell ranges.
 */
function pathsIdentifySameTable(
  left: readonly TablePathSegment[],
  right: readonly TablePathSegment[],
): boolean {
  if (left.length === 0 || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftSegment = left[index]!;
    const rightSegment = right[index]!;
    if (leftSegment.tableBlockIndex !== rightSegment.tableBlockIndex) {
      return false;
    }
    if (
      index < left.length - 1 &&
      (leftSegment.rowIndex !== rightSegment.rowIndex ||
        leftSegment.cellIndex !== rightSegment.cellIndex)
    ) {
      return false;
    }
  }
  return true;
}

function getSelectionTableContext(
  current: EditorState,
  deps: TableSelectionResolversDeps,
): ReturnType<typeof getSelectionTableContextImpl> {
  return getSelectionTableContextImpl(current, deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getSelectionTableContextImpl(
  current: EditorState,
  deps: TableSelectionResolversDeps,
) {
  const selection = current.selection;
  const activeSectionIndex = getActiveSectionIndex(current);
  const rawAnchorLocation = findParagraphTablePathLocation(
    current.document,
    selection.anchor.paragraphId,
    activeSectionIndex,
  );
  const rawFocusLocation = findParagraphTablePathLocation(
    current.document,
    selection.focus.paragraphId,
    activeSectionIndex,
  );

  if (
    !rawAnchorLocation ||
    !rawFocusLocation ||
    rawAnchorLocation.zone !== rawFocusLocation.zone ||
    !pathsIdentifySameTable(
      rawAnchorLocation.tablePath,
      rawFocusLocation.tablePath,
    )
  ) {
    return null;
  }

  const blocks = deps.getTargetBlocks(current, rawAnchorLocation.zone);
  const anchorPath = resolveTablePath(blocks, rawAnchorLocation.tablePath);
  const focusPath = resolveTablePath(blocks, rawFocusLocation.tablePath);
  const anchorTarget = anchorPath?.[anchorPath.length - 1];
  const focusTarget = focusPath?.[focusPath.length - 1];
  if (!anchorTarget || !focusTarget || anchorTarget.table !== focusTarget.table) {
    return null;
  }

  const anchorLocation = normalizeInnermostLocation(rawAnchorLocation);
  const focusLocation = normalizeInnermostLocation(rawFocusLocation);
  const tableBlock = anchorTarget.table;
  const tableLayout = buildTableCellLayout(tableBlock);
  const anchorCell = tableLayout.find(
    (entry): boolean =>
      entry.rowIndex === anchorLocation.rowIndex &&
      entry.cellIndex === anchorLocation.cellIndex,
  );
  const focusCell = tableLayout.find(
    (entry): boolean =>
      entry.rowIndex === focusLocation.rowIndex &&
      entry.cellIndex === focusLocation.cellIndex,
  );
  if (!anchorCell || !focusCell) {
    return null;
  }

  return {
    anchorLocation,
    focusLocation,
    anchorCell,
    focusCell,
    tableBlock,
    tableLayout,
  };
}

export function createTableSelectionResolvers(
  deps: TableSelectionResolversDeps,
): ReturnType<typeof createTableSelectionResolversImpl> {
  return createTableSelectionResolversImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createTableSelectionResolversImpl(deps: TableSelectionResolversDeps) {
  const resolveTableCellRangeSelection = (
    current: EditorState,
  ): EditorState["selection"] | null => {
    const selection = current.selection;
    const context = getSelectionTableContext(current, deps);
    if (
      !context ||
      (context.anchorLocation.rowIndex === context.focusLocation.rowIndex &&
        context.anchorLocation.cellIndex === context.focusLocation.cellIndex)
    ) {
      deps.logger?.debug(
        `resolveTableCellRangeSelection: no expansion (anchor=${selection.anchor.paragraphId} focus=${selection.focus.paragraphId})`,
      );
      return null;
    }

    const rangeStartRow = Math.min(
      context.anchorLocation.rowIndex,
      context.focusLocation.rowIndex,
    );
    const rangeEndRow = Math.max(
      context.anchorLocation.rowIndex,
      context.focusLocation.rowIndex,
    );
    const rangeStartCell = Math.min(
      context.anchorLocation.cellIndex,
      context.focusLocation.cellIndex,
    );
    const rangeEndCell = Math.max(
      context.anchorLocation.cellIndex,
      context.focusLocation.cellIndex,
    );
    deps.logger?.info(
      `resolveTableCellRangeSelection: expanding r${context.anchorLocation.rowIndex}:c${context.anchorLocation.cellIndex}->r${context.focusLocation.rowIndex}:c${context.focusLocation.cellIndex} (anchor=${selection.anchor.paragraphId} focus=${selection.focus.paragraphId}) range=[rows ${rangeStartRow}..${rangeEndRow}, cells ${rangeStartCell}..${rangeEndCell}]`,
    );

    const startLocation =
      compareCellLocations(context.anchorCell, context.focusCell) <= 0
        ? context.anchorLocation
        : context.focusLocation;
    const endLocation =
      compareCellLocations(context.anchorCell, context.focusCell) <= 0
        ? context.focusLocation
        : context.anchorLocation;

    const startCell =
      context.tableBlock.rows[startLocation.rowIndex]?.cells[
        startLocation.cellIndex
      ];
    const endCell =
      context.tableBlock.rows[endLocation.rowIndex]?.cells[
        endLocation.cellIndex
      ];
    const startParagraph = startCell ? getCellParagraphs(startCell)[0] : undefined;
    const endParagraphs = endCell ? getCellParagraphs(endCell) : [];
    const endParagraph = endParagraphs[endParagraphs.length - 1];
    if (!startParagraph || !endParagraph) {
      return null;
    }

    return {
      anchor: paragraphOffsetToPosition(startParagraph, 0),
      focus: paragraphOffsetToPosition(
        endParagraph,
        getParagraphText(endParagraph).length,
      ),
    };
  };

  const resolveSelectedTableCells = (
    current: EditorState,
  ): SelectedTableCells | null => {
    const context = getSelectionTableContext(current, deps);
    if (!context) {
      return null;
    }

    const startRow = Math.min(
      context.anchorCell.visualRowIndex,
      context.focusCell.visualRowIndex,
    );
    const endRow = Math.max(
      context.anchorCell.visualRowIndex + context.anchorCell.rowSpan - 1,
      context.focusCell.visualRowIndex + context.focusCell.rowSpan - 1,
    );
    const startCol = Math.min(
      context.anchorCell.visualColumnIndex,
      context.focusCell.visualColumnIndex,
    );
    const endCol = Math.max(
      context.anchorCell.visualColumnIndex + context.anchorCell.colSpan - 1,
      context.focusCell.visualColumnIndex + context.focusCell.colSpan - 1,
    );

    const cells = context.tableLayout.filter((entry): boolean => {
      return (
        entry.visualRowIndex <= endRow &&
        entry.visualRowIndex + entry.rowSpan - 1 >= startRow &&
        entry.visualColumnIndex <= endCol &&
        entry.visualColumnIndex + entry.colSpan - 1 >= startCol
      );
    });

    return {
      blockIndex: context.anchorLocation.blockIndex,
      tablePath: context.anchorLocation.tablePath.map((segment) => ({
        ...segment,
      })),
      cells,
      zone: context.anchorLocation.zone,
    };
  };

  const resolveHorizontalTableCellRange = (
    current: EditorState,
  ): HorizontalTableCellRange | null => {
    const context = getSelectionTableContext(current, deps);
    if (
      !context ||
      context.anchorCell.visualRowIndex !== context.focusCell.visualRowIndex
    ) {
      return null;
    }

    const comparison = compareCellLocations(
      context.anchorCell,
      context.focusCell,
    );
    if (comparison === 0) {
      return null;
    }

    const startLocation =
      comparison <= 0 ? context.anchorLocation : context.focusLocation;
    const endLocation =
      comparison <= 0 ? context.focusLocation : context.anchorLocation;

    return {
      blockIndex: context.anchorLocation.blockIndex,
      tablePath: context.anchorLocation.tablePath.map((segment) => ({
        ...segment,
      })),
      rowIndex: startLocation.rowIndex,
      startCellIndex: startLocation.cellIndex,
      endCellIndex: endLocation.cellIndex,
      zone: context.anchorLocation.zone,
    };
  };

  const resolveVerticalTableCellRange = (
    current: EditorState,
  ): VerticalTableCellRange | null => {
    const context = getSelectionTableContext(current, deps);
    if (
      !context ||
      context.anchorLocation.cellIndex !== context.focusLocation.cellIndex
    ) {
      return null;
    }

    const startRowIndex = Math.min(
      context.anchorCell.visualRowIndex,
      context.focusCell.visualRowIndex,
    );
    const endRowIndex = Math.max(
      context.anchorCell.visualRowIndex,
      context.focusCell.visualRowIndex,
    );
    if (startRowIndex === endRowIndex) {
      return null;
    }

    return {
      blockIndex: context.anchorLocation.blockIndex,
      tablePath: context.anchorLocation.tablePath.map((segment) => ({
        ...segment,
      })),
      startRowIndex,
      endRowIndex,
      cellIndex: context.anchorLocation.cellIndex,
      zone: context.anchorLocation.zone,
    };
  };

  return {
    resolveTableCellRangeSelection,
    resolveSelectedTableCells,
    resolveHorizontalTableCellRange,
    resolveVerticalTableCellRange,
  };
}
