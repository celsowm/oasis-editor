import {
  resolveEffectiveTableCellFormatting,
  resolveEffectiveTableStyle,
  type EditorState,
  type EditorTableNode,
  EditorTableRowStyle,
} from "@/core/model.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import { estimateStackedColumnWidth } from "./verticalText.js";
import {
  resolveCanvasTableWidth,
  resolveTableLeftOffset,
  resolveTableCellSpacingPx,
  resolveBorder,
  resolveCellPadding,
} from "./table/tableCellGeometry.js";
import { prepareCells } from "./table/prepareCells.js";
import { resolveRowHeights } from "./table/resolveRowHeights.js";
import {
  assembleCellEntries,
  buildRowOffsets,
} from "./table/assembleCellEntries.js";

// Re-export public types so existing importers keep working without path changes.
export type {
  CanvasUnsupportedReason,
  CanvasTableBorderSpec,
  CanvasTableParagraphLayoutEntry,
  CanvasTableCellLayoutEntry,
  CanvasTableLayoutResult,
} from "./table/types.js";
export { resolveCanvasTableWidth } from "./table/tableCellGeometry.js";

export function buildCanvasTableLayout(options: {
  table: EditorTableNode;
  state: EditorState;
  pageIndex: number;
  originX: number;
  originY: number;
  contentWidth: number;
  estimatedHeight: number;
}) {
  const {
    table: sourceTable,
    state,
    pageIndex,
    originX,
    originY,
    contentWidth,
    estimatedHeight,
  } = options;

  const table: EditorTableNode = {
    ...sourceTable,
    style: resolveEffectiveTableStyle(sourceTable, state.document.styles),
  };
  const tableWidth = resolveCanvasTableWidth(table, contentWidth);
  const tableLeft =
    originX + resolveTableLeftOffset(table, tableWidth, contentWidth);
  const cellSpacingPx = resolveTableCellSpacingPx(table);
  const tableEntries = buildTableCellLayout(table);

  const visualColumnCount = Math.max(
    1,
    ...tableEntries.map(
      (entry): number => entry.visualColumnIndex + Math.max(1, entry.colSpan),
    ),
  );

  const columnsWidthBudget = Math.max(
    visualColumnCount,
    tableWidth - (visualColumnCount + 1) * cellSpacingPx,
  );

  // Resolve column widths from grid or uniform distribution, then grow stacked
  // columns to fit the widest upright-glyph column.
  let resolvedColumnWidths: number[] = [];
  if (table.gridCols && table.gridCols.length >= visualColumnCount) {
    const gridTotalWidth = table.gridCols.reduce((a, b): number => a + b, 0);
    const scale = gridTotalWidth > 0 ? columnsWidthBudget / gridTotalWidth : 1;
    resolvedColumnWidths = table.gridCols.map((w): number => w * scale);
  } else {
    const baseCellWidth = columnsWidthBudget / visualColumnCount;
    resolvedColumnWidths = Array(visualColumnCount).fill(baseCellWidth);
    for (const entry of tableEntries) {
      if (Math.max(1, entry.colSpan) !== 1) continue;
      const cell = table.rows[entry.rowIndex]?.cells[entry.cellIndex];
      if (!cell) continue;
      const direction =
        cell.style?.textDirection ??
        cell.blocks[0]?.style?.textDirection ??
        null;
      if (
        direction !== "tbRl" &&
        direction !== "btLr" &&
        direction !== "lrTbV" &&
        direction !== "tbRlV"
      )
        continue;
      let glyphWidth = 0;
      for (const block of cell.blocks) {
        if (block.type !== "paragraph") continue;
        glyphWidth = Math.max(
          glyphWidth,
          estimateStackedColumnWidth(block, state),
        );
      }
      if (glyphWidth <= 0) continue;
      const padding = resolveCellPadding(cell);
      const needed =
        glyphWidth +
        padding.left +
        padding.right +
        resolveBorder(cell.style?.borderLeft ?? cell.style?.borderStart).width +
        resolveBorder(cell.style?.borderRight ?? cell.style?.borderEnd).width;
      const col = entry.visualColumnIndex;
      if (needed > (resolvedColumnWidths[col] ?? 0)) {
        resolvedColumnWidths[col] = needed;
      }
    }
  }

  const columnOffsets: number[] = [cellSpacingPx];
  for (let i = 0; i < resolvedColumnWidths.length; i++) {
    columnOffsets[i + 1] =
      columnOffsets[i]! + resolvedColumnWidths[i]! + cellSpacingPx;
  }

  // Effective row styles used in all three passes.
  const effectiveRowStyles = table.rows.map(
    (row, rowIndex): EditorTableRowStyle | undefined => {
      const entry = tableEntries.find(
        (candidate): boolean => candidate.rowIndex === rowIndex,
      );
      return entry
        ? resolveEffectiveTableCellFormatting({
            table: sourceTable,
            rowIndex,
            cellIndex: entry.cellIndex,
            visualColumnIndex: entry.visualColumnIndex,
            columnCount: visualColumnCount,
            styles: state.document.styles,
          }).rowStyle
        : row.style;
    },
  );

  // Pass 1: resolve cell geometry and project paragraph layouts.
  const { prepared, unsupported } = prepareCells({
    table,
    sourceTable,
    tableEntries,
    columnOffsets,
    cellSpacingPx,
    visualColumnCount,
    effectiveRowStyles,
    state,
    pageIndex,
  });

  // Pass 2: compute row heights from content.
  const rowHeights = resolveRowHeights({
    prepared,
    table,
    effectiveRowStyles,
    estimatedHeight,
  });

  const rowOffsets = buildRowOffsets(rowHeights, cellSpacingPx);

  // Pass 3: assemble final positioned cell entries.
  const cells = assembleCellEntries({
    prepared,
    rowHeights,
    rowOffsets,
    columnOffsets,
    tableLeft,
    originY,
    cellSpacingPx,
    table,
  });

  return {
    tableId: table.id,
    left: tableLeft,
    top: originY,
    width: tableWidth,
    height:
      rowHeights.reduce((sum, current): number => sum + current, 0) +
      (rowHeights.length + 1) * cellSpacingPx,
    rowHeights,
    cells,
    unsupported: Array.from(new Set(unsupported)),
  };
}
