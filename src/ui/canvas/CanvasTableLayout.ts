import {
  paragraphOffsetToPosition,
  resolveEffectiveParagraphStyle,
  type EditorBorderStyle,
  type EditorParagraphNode,
  type EditorPosition,
  type EditorState,
  type EditorTableCellNode,
  type EditorTableNode,
  type EditorTextRun,
} from "../../core/model.js";
import { buildTableCellLayout } from "../../core/tableLayout.js";
import { projectParagraphLayout } from "../../layoutProjection/index.js";

const DEFAULT_TABLE_ROW_HEIGHT = 14;
const DEFAULT_CELL_PADDING_TOP_BOTTOM_PX = 0;
const DEFAULT_CELL_PADDING_LEFT_RIGHT_PX = 7.2; // ~5.4pt
const MIN_TABLE_CELL_CONTENT_WIDTH_PX = 24;
const MIN_TABLE_CELL_CONTENT_HEIGHT_PX = 1;
const POINT_TO_PX = 96 / 72;

function toPx(value: number): number {
  return value * POINT_TO_PX;
}

function parseDimensionToPx(value: number | string | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return toPx(value);
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed.endsWith("pt")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? toPx(parsed) : null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveTableWidth(
  table: EditorTableNode,
  contentWidth: number,
): number {
  const raw = table.style?.width;
  if (typeof raw === "number") return Math.max(24, raw);
  if (typeof raw === "string" && raw.trim().endsWith("%")) {
    const value = Number.parseFloat(raw.trim().slice(0, -1));
    if (Number.isFinite(value))
      return Math.max(24, contentWidth * (value / 100));
  }
  return contentWidth;
}

function resolveTableIndentLeft(table: EditorTableNode): number {
  const raw = table.style?.indentLeft;
  return typeof raw === "number" && Number.isFinite(raw)
    ? Math.max(0, toPx(raw))
    : 0;
}

export type CanvasUnsupportedReason =
  | "unsupported:v-span"
  | "unsupported:v-merge"
  | "unsupported:nested-table";

export interface CanvasTableBorderSpec {
  width: number;
  color: string;
  type: "solid" | "dashed" | "dotted" | "none";
}

export interface CanvasTableParagraphLayoutEntry {
  paragraph: EditorParagraphNode;
  lines: ReturnType<typeof projectParagraphLayout>["lines"];
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface CanvasTableCellLayoutEntry {
  tableId: string;
  rowIndex: number;
  cellIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  contentHeight: number;
  shading?: string;
  anchorPosition: EditorPosition;
  padding: { top: number; right: number; bottom: number; left: number };
  borders: {
    top: CanvasTableBorderSpec;
    right: CanvasTableBorderSpec;
    bottom: CanvasTableBorderSpec;
    left: CanvasTableBorderSpec;
  };
  paragraphs: CanvasTableParagraphLayoutEntry[];
}

export interface CanvasTableLayoutResult {
  tableId: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rowHeights: number[];
  cells: CanvasTableCellLayoutEntry[];
  unsupported: CanvasUnsupportedReason[];
}

function resolveDefaultBorder(): CanvasTableBorderSpec {
  return { width: 1, color: "#6f6f6f", type: "solid" };
}

function resolveBorder(
  border: EditorBorderStyle | undefined,
): CanvasTableBorderSpec {
  if (!border) return resolveDefaultBorder();
  const width = Math.max(
    0,
    Number.isFinite(border.width) ? toPx(border.width) : 1,
  );
  return {
    width,
    color: border.color ?? "#6f6f6f",
    type: border.type ?? "solid",
  };
}

function resolveCellPadding(cell: EditorTableCellNode): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const paddingValue = cell.style?.padding;
  if (typeof paddingValue === "number" && Number.isFinite(paddingValue)) {
    const resolved = Math.max(0, toPx(paddingValue));
    return { top: resolved, right: resolved, bottom: resolved, left: resolved };
  }

  const top =
    cell.style?.paddingTop !== undefined
      ? toPx(cell.style.paddingTop)
      : DEFAULT_CELL_PADDING_TOP_BOTTOM_PX;
  const right =
    cell.style?.paddingRight !== undefined
      ? toPx(cell.style.paddingRight)
      : DEFAULT_CELL_PADDING_LEFT_RIGHT_PX;
  const bottom =
    cell.style?.paddingBottom !== undefined
      ? toPx(cell.style.paddingBottom)
      : DEFAULT_CELL_PADDING_TOP_BOTTOM_PX;
  const left =
    cell.style?.paddingLeft !== undefined
      ? toPx(cell.style.paddingLeft)
      : DEFAULT_CELL_PADDING_LEFT_RIGHT_PX;

  return { top, right, bottom, left };
}

function hasNestedTable(_cell: EditorTableCellNode): boolean {
  return false;
}

/**
 * Returns a paragraph clone whose inline image runs have been scaled
 * down so they never exceed `maxImageWidthPx`. Aspect ratio is preserved.
 * If no image needs shrinking, returns the original paragraph reference.
 */
function fitImagesToCellWidth(
  paragraph: EditorParagraphNode,
  maxImageWidthPx: number,
): EditorParagraphNode {
  if (!Number.isFinite(maxImageWidthPx) || maxImageWidthPx <= 0) {
    return paragraph;
  }
  let changed = false;
  const runs: EditorTextRun[] = paragraph.runs.map((run) => {
    if (!run.image) return run;
    const { width: w, height: h } = run.image;
    if (w <= maxImageWidthPx) return run;
    const scale = maxImageWidthPx / w;
    changed = true;
    return {
      ...run,
      image: {
        ...run.image,
        width: Math.max(1, Math.floor(w * scale)),
        height: Math.max(1, Math.floor(h * scale)),
      },
    };
  });
  if (!changed) return paragraph;
  return { ...paragraph, runs };
}

function resolveVerticalContentOffset(
  cell: EditorTableCellNode,
  contentHeightPx: number,
  contentNaturalHeightPx: number,
): number {
  const available = Math.max(0, contentHeightPx - contentNaturalHeightPx);
  if (cell.style?.verticalAlign === "bottom") {
    return available;
  }
  if (cell.style?.verticalAlign === "middle") {
    return available / 2;
  }
  return 0;
}

export function buildCanvasTableLayout(options: {
  table: EditorTableNode;
  state: EditorState;
  pageIndex: number;
  layoutMode: "fast" | "wordParity";
  originX: number;
  originY: number;
  contentWidth: number;
  estimatedHeight: number;
}): CanvasTableLayoutResult {
  const {
    table,
    state,
    pageIndex,
    layoutMode,
    originX,
    originY,
    contentWidth,
    estimatedHeight,
  } = options;
  const tableWidth = resolveTableWidth(table, contentWidth);
  const tableLeft = originX + resolveTableIndentLeft(table);
  const tableEntries = buildTableCellLayout(table);
  const unsupported: CanvasUnsupportedReason[] = [];
  const visualColumnCount = Math.max(
    1,
    ...tableEntries.map(
      (entry) => entry.visualColumnIndex + Math.max(1, entry.colSpan),
    ),
  );

  let resolvedColumnWidths: number[] = [];
  if (table.gridCols && table.gridCols.length >= visualColumnCount) {
    const gridTotalWidth = table.gridCols.reduce((a, b) => a + b, 0);
    // If table has a specific width (e.g. 100%), scale the grid columns to fit
    const scale = gridTotalWidth > 0 ? tableWidth / gridTotalWidth : 1;
    resolvedColumnWidths = table.gridCols.map((w) => w * scale);
  } else {
    const baseCellWidth = tableWidth / visualColumnCount;
    resolvedColumnWidths = Array(visualColumnCount).fill(baseCellWidth);
  }

  const columnOffsets: number[] = [0];
  for (let i = 0; i < resolvedColumnWidths.length; i++) {
    columnOffsets[i + 1] = columnOffsets[i]! + resolvedColumnWidths[i]!;
  }

  // ---------------------------------------------------------------------------
  // Pass 1: resolve geometry per cell (size, padding, borders, content width)
  //          and project each cell's paragraphs so we know their actual heights.
  // ---------------------------------------------------------------------------
  interface PreparedCell {
    rowIndex: number;
    cellIndex: number;
    cell: EditorTableCellNode;
    visualCol: number;
    colSpan: number;
    rowSpan: number;
    width: number;
    padding: { top: number; right: number; bottom: number; left: number };
    borders: CanvasTableCellLayoutEntry["borders"];
    contentWidthPx: number;
    projectedParagraphs: Array<{
      paragraph: EditorParagraphNode;
      lines: ReturnType<typeof projectParagraphLayout>["lines"];
      height: number;
      spacingBefore: number;
    }>;
    contentNaturalHeightPx: number;
  }

  const cellEntriesByKey = new Map(
    tableEntries.map(
      (entry) => [`${entry.rowIndex}:${entry.cellIndex}`, entry] as const,
    ),
  );
  const prepared: PreparedCell[] = [];

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex]!;
    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
      const cell = row.cells[cellIndex]!;
      const entry = cellEntriesByKey.get(`${rowIndex}:${cellIndex}`);
      const rowSpan = Math.max(1, cell.rowSpan ?? 1);
      if (rowSpan > 1) {
        unsupported.push("unsupported:v-span");
      }
      if (cell.vMerge === "continue" || cell.vMerge === "restart") {
        unsupported.push("unsupported:v-merge");
      }
      if (hasNestedTable(cell)) {
        unsupported.push("unsupported:nested-table");
      }
      if (!entry) {
        continue;
      }

      const visualCol = entry.visualColumnIndex;
      const colSpan = Math.max(1, entry.colSpan);

      const width = Math.max(
        1,
        (columnOffsets[visualCol + colSpan] ?? tableWidth) -
          (columnOffsets[visualCol] ?? 0),
      );

      const padding = resolveCellPadding(cell);
      const borders = {
        top: resolveBorder(cell.style?.borderTop),
        right: resolveBorder(cell.style?.borderRight),
        bottom: resolveBorder(cell.style?.borderBottom),
        left: resolveBorder(cell.style?.borderLeft),
      };

      const contentWidthPx = Math.max(
        MIN_TABLE_CELL_CONTENT_WIDTH_PX,
        width -
          borders.left.width -
          borders.right.width -
          padding.left -
          padding.right,
      );

      // Project paragraphs at the actual cell content width, after shrinking
      // any oversized inline image so it never exceeds the cell width.
      const projectedParagraphs: PreparedCell["projectedParagraphs"] = [];
      let contentNaturalHeightPx = 0;
      for (const original of cell.blocks) {
        const paragraph = fitImagesToCellWidth(original, contentWidthPx);
        const projected = projectParagraphLayout(
          paragraph,
          pageIndex,
          undefined,
          state.document.styles,
          contentWidthPx,
          layoutMode,
        );
        const linesBottom =
          projected.lines.length > 0
            ? Math.max(...projected.lines.map((line) => line.top + line.height))
            : 1;
        const paragraphStyle = resolveEffectiveParagraphStyle(
          paragraph.style,
          state.document.styles,
        );
        const spacingBefore = paragraphStyle.spacingBefore ?? 0;
        const spacingAfter = paragraphStyle.spacingAfter ?? 0;
        const paragraphHeight = Math.max(
          1,
          spacingBefore + linesBottom + spacingAfter,
        );
        projectedParagraphs.push({
          paragraph,
          lines: projected.lines,
          height: paragraphHeight,
          spacingBefore,
        });
        contentNaturalHeightPx += paragraphHeight;
      }

      prepared.push({
        rowIndex,
        cellIndex,
        cell,
        visualCol,
        colSpan,
        rowSpan,
        width,
        padding,
        borders,
        contentWidthPx,
        projectedParagraphs,
        contentNaturalHeightPx,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Pass 2: compute each row's height from the actual content of its cells.
  //          We respect explicit row heights as a minimum. We also honor a
  //          minimum derived from the previous "evenly distributed" estimate
  //          so empty tables don't visually collapse compared to the
  //          previous behavior.
  // ---------------------------------------------------------------------------
  const rowCount = Math.max(1, table.rows.length);
  const explicitRowHeights = table.rows.map((row) => {
    const explicit = parseDimensionToPx(row.style?.height);
    return explicit !== null && explicit > 0 ? explicit : null;
  });
  const fallbackPerRow =
    estimatedHeight > 0 ? estimatedHeight / rowCount : DEFAULT_TABLE_ROW_HEIGHT;

  const rowHeights: number[] = [];
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    let measured = 0;
    for (const cellEntry of prepared) {
      if (cellEntry.rowIndex !== rowIndex) continue;
      // For row-spanning cells, only contribute to the first row they occupy
      // (we treat rowSpan>1 as unsupported elsewhere, but still avoid double
      // counting if it shows up).
      const needed =
        cellEntry.contentNaturalHeightPx +
        cellEntry.padding.top +
        cellEntry.padding.bottom +
        cellEntry.borders.top.width +
        cellEntry.borders.bottom.width;
      const distributed =
        cellEntry.rowSpan > 1 ? needed / cellEntry.rowSpan : needed;
      if (distributed > measured) measured = distributed;
    }

    const explicit = explicitRowHeights[rowIndex];
    const baseFloor =
      explicit !== null ? explicit : Math.max(1, fallbackPerRow * 0.25);
    rowHeights[rowIndex] = Math.max(baseFloor, measured, 1);
  }

  const rowOffsets: number[] = [];
  let cumulativeY = 0;
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    rowOffsets[rowIndex] = cumulativeY;
    cumulativeY += rowHeights[rowIndex] ?? DEFAULT_TABLE_ROW_HEIGHT;
  }

  // ---------------------------------------------------------------------------
  // Pass 3: assemble the public layout entries with final positions.
  // ---------------------------------------------------------------------------
  const cells: CanvasTableCellLayoutEntry[] = [];
  for (const cellEntry of prepared) {
    const {
      rowIndex,
      cellIndex,
      cell,
      visualCol,
      rowSpan,
      width,
      padding,
      borders,
      contentWidthPx,
    } = cellEntry;

    const left = tableLeft + (columnOffsets[visualCol] ?? 0);
    const top = originY + (rowOffsets[rowIndex] ?? 0);
    const height = Math.max(
      1,
      rowHeights
        .slice(rowIndex, rowIndex + rowSpan)
        .reduce((sum, current) => sum + current, 0),
    );

    const contentLeft = left + borders.left.width + padding.left;
    const contentTop = top + borders.top.width + padding.top;
    const contentHeightPx = Math.max(
      MIN_TABLE_CELL_CONTENT_HEIGHT_PX,
      height -
        borders.top.width -
        borders.bottom.width -
        padding.top -
        padding.bottom,
    );

    const firstParagraph = cell.blocks[0];
    const anchorPosition = firstParagraph
      ? paragraphOffsetToPosition(firstParagraph, 0)
      : paragraphOffsetToPosition(
          {
            id: `table:${table.id}:r${rowIndex}:c${cellIndex}:empty`,
            type: "paragraph",
            runs: [{ id: "run:empty", text: "" }],
          },
          0,
        );

    let paragraphCursorY = 0;
    const verticalContentOffset = resolveVerticalContentOffset(
      cell,
      contentHeightPx,
      cellEntry.contentNaturalHeightPx,
    );
    const paragraphs: CanvasTableParagraphLayoutEntry[] = [];
    for (const projected of cellEntry.projectedParagraphs) {
      paragraphs.push({
        paragraph: projected.paragraph,
        lines: projected.lines,
        originX: contentLeft,
        originY:
          contentTop +
          verticalContentOffset +
          paragraphCursorY +
          projected.spacingBefore,
        width: contentWidthPx,
        height: projected.height,
      });
      paragraphCursorY += projected.height;
    }

    cells.push({
      tableId: table.id,
      rowIndex,
      cellIndex,
      left,
      top,
      width,
      height,
      contentLeft,
      contentTop,
      contentWidth: contentWidthPx,
      contentHeight: contentHeightPx,
      shading: cell.style?.shading,
      anchorPosition,
      padding,
      borders,
      paragraphs,
    });
  }

  return {
    tableId: table.id,
    left: tableLeft,
    top: originY,
    width: tableWidth,
    height: rowHeights.reduce((sum, current) => sum + current, 0),
    rowHeights,
    cells,
    unsupported: Array.from(new Set(unsupported)),
  };
}
