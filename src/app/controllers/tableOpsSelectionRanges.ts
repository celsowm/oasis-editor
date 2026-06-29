import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getParagraphText,
  paragraphOffsetToPosition,
  type EditorBlockNode,
  type EditorEditingZone,
  type EditorState,
} from "@/core/model.js";
import {
  buildTableCellLayout,
  type TableCellLayoutEntry,
} from "@/core/tableLayout.js";
import type { EditorLogger } from "@/utils/logger.js";

export interface HorizontalTableCellRange {
  blockIndex: number;
  rowIndex: number;
  startCellIndex: number;
  endCellIndex: number;
  zone: EditorEditingZone;
}

export interface VerticalTableCellRange {
  blockIndex: number;
  startRowIndex: number;
  endRowIndex: number;
  cellIndex: number;
  zone: EditorEditingZone;
}

export interface SelectedTableCells {
  blockIndex: number;
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
  const anchorLocation = findParagraphTableLocation(
    current.document,
    selection.anchor.paragraphId,
    activeSectionIndex,
  );
  const focusLocation = findParagraphTableLocation(
    current.document,
    selection.focus.paragraphId,
    activeSectionIndex,
  );

  if (
    !anchorLocation ||
    !focusLocation ||
    anchorLocation.blockIndex !== focusLocation.blockIndex ||
    anchorLocation.zone !== focusLocation.zone
  ) {
    return null;
  }

  const blocks = deps.getTargetBlocks(current, anchorLocation.zone);
  const tableBlock = blocks[anchorLocation.blockIndex];
  if (!tableBlock || tableBlock.type !== "table") {
    return null;
  }

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

    const startParagraph =
      context.tableBlock.rows[startLocation.rowIndex]?.cells[
        startLocation.cellIndex
      ]?.blocks[0];
    const endCell =
      context.tableBlock.rows[endLocation.rowIndex]?.cells[
        endLocation.cellIndex
      ];
    const endParagraph = endCell?.blocks[endCell.blocks.length - 1];
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
