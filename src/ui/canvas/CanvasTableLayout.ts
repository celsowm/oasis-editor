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
  type EditorRevisionMetadata,
  resolveEffectiveTableCellFormatting,
  resolveEffectiveTableStyle,
} from "@/core/model.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import { projectParagraphLayout } from "@/layoutProjection/index.js";
import { resolveCachedTableCellParagraph } from "@/layoutProjection/tableCellParagraphCache.js";
import { shouldCollapseContextualSpacing } from "@/layoutProjection/paragraphPagination.js";
import {
  PX_PER_POINT as POINT_TO_PX,
  DEFAULT_FONT_SIZE_PX,
} from "@/core/units.js";
import {
  estimateStackedColumnWidth,
  estimateStackedParagraphHeight,
  resolveVerticalMode,
  type VerticalRenderMode,
} from "./verticalText.js";

const NO_WRAP_WIDTH_PX = 100000;

/** Effective vertical text direction of a cell: explicit cell direction, else
 * the direction of its first paragraph. */
function resolveCellVerticalMode(
  cell: EditorTableCellNode,
): VerticalRenderMode {
  const direction =
    cell.style?.textDirection ?? cell.blocks[0]?.style?.textDirection ?? null;
  return resolveVerticalMode(direction);
}

const DEFAULT_TABLE_ROW_HEIGHT = 14;
const DEFAULT_CELL_PADDING_TOP_BOTTOM_PX = 0;
const DEFAULT_CELL_PADDING_LEFT_RIGHT_PX = 7.2; // ~5.4pt
const MIN_TABLE_CELL_CONTENT_WIDTH_PX = 24;
const MIN_TABLE_CELL_CONTENT_HEIGHT_PX = 1;

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

export function resolveCanvasTableWidth(
  table: EditorTableNode,
  contentWidth: number,
): number {
  const raw = table.style?.width;
  if (typeof raw === "number") return Math.max(24, toPx(raw));
  if (typeof raw === "string" && raw.trim().endsWith("%")) {
    const value = Number.parseFloat(raw.trim().slice(0, -1));
    if (Number.isFinite(value))
      return Math.max(24, contentWidth * (value / 100));
  }
  return contentWidth;
}

function resolveTableIndentLeft(table: EditorTableNode): number {
  const raw = table.style?.indentLeft;
  return typeof raw === "number" && Number.isFinite(raw) ? toPx(raw) : 0;
}

/**
 * `w:tblCellSpacing` resolved to pixels. Word separates adjacent cells (and the
 * outer cells from the table edge) by this much, with the table background
 * showing through the gaps. Returns 0 when unset, which makes the spacing-aware
 * geometry below collapse to the original gap-free layout.
 */
function resolveTableCellSpacingPx(table: EditorTableNode): number {
  const px = parseDimensionToPx(table.style?.cellSpacing);
  return px !== null && px > 0 ? px : 0;
}

/** Horizontal extent of a single laid-out line, from its first to last caret. */
function lineNaturalWidth(
  line: ReturnType<typeof projectParagraphLayout>["lines"][number],
): number {
  if (line.slots.length < 2) return 0;
  return line.slots[line.slots.length - 1]!.left - line.slots[0]!.left;
}

/**
 * Folds a `characterScale` (percent) into every run of `paragraph`, multiplying
 * any scale a run already carries. Used to compress/expand `w:tcFitText` cell
 * text horizontally so a single line fills the cell's content width.
 */
function applyFitTextScale(
  paragraph: EditorParagraphNode,
  scalePercent: number,
): EditorParagraphNode {
  return {
    ...paragraph,
    runs: paragraph.runs.map((run) => {
      const existing = run.styles?.characterScale;
      const combined =
        typeof existing === "number" && existing > 0
          ? (existing * scalePercent) / 100
          : scalePercent;
      return { ...run, styles: { ...run.styles, characterScale: combined } };
    }),
  };
}

/**
 * Horizontal offset of the table's left edge from the content origin, honoring
 * `w:jc` (`table.style.align`). Centering/right-alignment only shifts the table
 * when it is narrower than the available content width; a full-width table has
 * no slack to move into. `left` (the default) keeps the table at the leading
 * indent.
 */
function resolveTableLeftOffset(
  table: EditorTableNode,
  tableWidth: number,
  contentWidth: number,
): number {
  const align = table.style?.align;
  if (align === "center" || align === "right") {
    const slack = Math.max(0, contentWidth - tableWidth);
    return align === "center" ? slack / 2 : slack;
  }
  return resolveTableIndentLeft(table);
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
    topLeftToBottomRight?: CanvasTableBorderSpec;
    topRightToBottomLeft?: CanvasTableBorderSpec;
  };
  paragraphs: CanvasTableParagraphLayoutEntry[];
  /** Vertical text flow inside this cell (`horizontal` when not rotated). */
  verticalMode: VerticalRenderMode;
  revision?: EditorRevisionMetadata & {
    type: "insert" | "delete" | "merge" | "property";
  };
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
      : cell.style?.paddingEnd !== undefined
        ? toPx(cell.style.paddingEnd)
        : DEFAULT_CELL_PADDING_LEFT_RIGHT_PX;
  const bottom =
    cell.style?.paddingBottom !== undefined
      ? toPx(cell.style.paddingBottom)
      : DEFAULT_CELL_PADDING_TOP_BOTTOM_PX;
  const left =
    cell.style?.paddingLeft !== undefined
      ? toPx(cell.style.paddingLeft)
      : cell.style?.paddingStart !== undefined
        ? toPx(cell.style.paddingStart)
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
    if (run.kind !== "image") return run;
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
  originX: number;
  originY: number;
  contentWidth: number;
  estimatedHeight: number;
}): CanvasTableLayoutResult {
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
  const unsupported: CanvasUnsupportedReason[] = [];
  const visualColumnCount = Math.max(
    1,
    ...tableEntries.map(
      (entry) => entry.visualColumnIndex + Math.max(1, entry.colSpan),
    ),
  );

  // Cell spacing is carved out of the table width: the gaps before/between/after
  // the columns consume `(columns + 1) * spacing`, so the columns themselves are
  // scaled to fit the remaining budget. With spacing 0 this equals `tableWidth`.
  const columnsWidthBudget = Math.max(
    visualColumnCount,
    tableWidth - (visualColumnCount + 1) * cellSpacingPx,
  );

  let resolvedColumnWidths: number[] = [];
  if (table.gridCols && table.gridCols.length >= visualColumnCount) {
    const gridTotalWidth = table.gridCols.reduce((a, b) => a + b, 0);
    // If table has a specific width (e.g. 100%), scale the grid columns to fit
    const scale = gridTotalWidth > 0 ? columnsWidthBudget / gridTotalWidth : 1;
    resolvedColumnWidths = table.gridCols.map((w) => w * scale);
  } else {
    const baseCellWidth = columnsWidthBudget / visualColumnCount;
    resolvedColumnWidths = Array(visualColumnCount).fill(baseCellWidth);
    // Without an explicit grid, grow any column that holds a stacked (upright)
    // cell so a single vertical column of glyphs is not clipped. Rotated cells
    // flow along the row height and are handled by the row-height pass instead.
    for (const entry of tableEntries) {
      if (Math.max(1, entry.colSpan) !== 1) continue;
      const cell = table.rows[entry.rowIndex]?.cells[entry.cellIndex];
      if (!cell || resolveCellVerticalMode(cell) !== "stack") continue;
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

  // Column boundaries include the inter-cell gaps: each entry is the left edge
  // of a cell box, so a cell's width is `columnOffsets[end] - columnOffsets[start]
  // - cellSpacingPx` (the trailing gap is excluded below). Leading entry is the
  // outer gap. With spacing 0 this is the original gap-free offset table.
  const columnOffsets: number[] = [cellSpacingPx];
  for (let i = 0; i < resolvedColumnWidths.length; i++) {
    columnOffsets[i + 1] =
      columnOffsets[i]! + resolvedColumnWidths[i]! + cellSpacingPx;
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
      spacingAfter: number;
    }>;
    contentNaturalHeightPx: number;
    verticalMode: VerticalRenderMode;
  }

  const cellEntriesByKey = new Map(
    tableEntries.map(
      (entry) => [`${entry.rowIndex}:${entry.cellIndex}`, entry] as const,
    ),
  );
  const effectiveRowStyles = table.rows.map((row, rowIndex) => {
    const entry = tableEntries.find(
      (candidate) => candidate.rowIndex === rowIndex,
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
  });
  const prepared: PreparedCell[] = [];

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex]!;
    if (effectiveRowStyles[rowIndex]?.hidden) {
      continue;
    }
    // `w:del` in `w:trPr`: row was deleted in tracked changes; final/accepted
    // view omits it just like a hidden row.
    if (effectiveRowStyles[rowIndex]?.revision?.type === "delete") {
      continue;
    }
    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
      const sourceCell = row.cells[cellIndex]!;
      // `w:cellDel` in `w:tcPr`: cell was deleted in tracked changes; the
      // adjacent cell's gridSpan already covers this column in the final doc.
      if (sourceCell.style?.revision?.type === "delete") {
        continue;
      }
      const entry = cellEntriesByKey.get(`${rowIndex}:${cellIndex}`);
      if (!entry) {
        continue;
      }
      const formatting = resolveEffectiveTableCellFormatting({
        table: sourceTable,
        rowIndex,
        cellIndex,
        visualColumnIndex: entry.visualColumnIndex,
        columnCount: visualColumnCount,
        styles: state.document.styles,
      });
      const cell: EditorTableCellNode = {
        ...sourceCell,
        style: formatting.cellStyle,
        blocks: sourceCell.blocks.map((paragraph) =>
          resolveCachedTableCellParagraph(
            paragraph,
            formatting,
            state.document.styles,
          ),
        ),
      };
      const effectiveRow = formatting.rowStyle;
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
      const visualCol = entry.visualColumnIndex;
      const colSpan = Math.max(1, entry.colSpan);

      const width = Math.max(
        1,
        (columnOffsets[visualCol + colSpan] ?? tableWidth) -
          (columnOffsets[visualCol] ?? 0) -
          cellSpacingPx,
      );

      const padding = resolveCellPadding(cell);
      const logicalLeft = table.style?.bidiVisual
        ? cell.style?.borderEnd
        : cell.style?.borderStart;
      const logicalRight = table.style?.bidiVisual
        ? cell.style?.borderStart
        : cell.style?.borderEnd;
      const borders = {
        top: resolveBorder(cell.style?.borderTop),
        right: resolveBorder(cell.style?.borderRight ?? logicalRight),
        bottom: resolveBorder(cell.style?.borderBottom),
        left: resolveBorder(cell.style?.borderLeft ?? logicalLeft),
        ...(cell.style?.borderTopLeftToBottomRight
          ? {
              topLeftToBottomRight: resolveBorder(
                cell.style.borderTopLeftToBottomRight,
              ),
            }
          : {}),
        ...(cell.style?.borderTopRightToBottomLeft
          ? {
              topRightToBottomLeft: resolveBorder(
                cell.style.borderTopRightToBottomLeft,
              ),
            }
          : {}),
      };

      const contentWidthPx = Math.max(
        MIN_TABLE_CELL_CONTENT_WIDTH_PX,
        width -
          borders.left.width -
          borders.right.width -
          padding.left -
          padding.right,
      );

      const verticalMode = resolveCellVerticalMode(cell);
      const isRotated =
        verticalMode === "rotate-cw" || verticalMode === "rotate-ccw";
      const isStacked = verticalMode === "stack";
      // `w:tcFitText`: horizontally compress/expand the cell's text onto a single
      // line so it exactly fills the content width (handled per paragraph below).
      const isFitText = !!cell.style?.fitText && !isRotated && !isStacked;

      // For rotated cells, text flows along the cell's vertical (long) axis, so
      // wrap against the available content height rather than the column width.
      // Cells carry explicit row heights in real documents; fall back to no-wrap
      // when the height is auto so the flow axis is driven by content length.
      const explicitRowHeightPx = parseDimensionToPx(effectiveRow.height);
      const hasExplicitRowHeight = explicitRowHeightPx !== null && explicitRowHeightPx > 0;
      const wrapWidth =
        isRotated || cell.style?.noWrap
          ? isRotated && hasExplicitRowHeight
            ? Math.max(
                MIN_TABLE_CELL_CONTENT_WIDTH_PX,
                explicitRowHeightPx -
                  borders.top.width -
                  borders.bottom.width -
                  padding.top -
                  padding.bottom,
              )
            : NO_WRAP_WIDTH_PX
          : contentWidthPx;

      // Project paragraphs at the resolved flow width, after shrinking any
      // oversized inline image so it never exceeds the cell width.
      const projectedParagraphs: PreparedCell["projectedParagraphs"] = [];
      let contentNaturalHeightPx = 0;
      for (const original of cell.blocks) {
        let paragraph = fitImagesToCellWidth(original, contentWidthPx);

        // `w:tcFitText`: project the paragraph at an unbounded width to measure
        // its natural single-line extent, then fold a `characterScale` into each
        // run so the text exactly fills the cell content width when re-projected.
        if (isFitText) {
          const noWrapProjected = projectParagraphLayout(
            paragraph,
            pageIndex,
            undefined,
            state.document.styles,
            NO_WRAP_WIDTH_PX,
            undefined,
            state.document.settings?.defaultTabStop,
          );
          const naturalWidth =
            noWrapProjected.lines.length > 0
              ? lineNaturalWidth(noWrapProjected.lines[0]!)
              : 0;
          if (naturalWidth > 0 && contentWidthPx > 0) {
            const scalePercent = Math.max(
              1,
              Math.min(600, (contentWidthPx / naturalWidth) * 100),
            );
            paragraph = applyFitTextScale(paragraph, scalePercent);
          }
        }

        const paragraphStyle = resolveEffectiveParagraphStyle(
          paragraph.style,
          state.document.styles,
        );
        const spacingBefore = paragraphStyle.spacingBefore ?? 0;
        const spacingAfter = paragraphStyle.spacingAfter ?? 0;

        if (isStacked) {
          // Stacked glyphs are painted directly (not via the line layout). When
          // the row carries an explicit height, stacked text wraps into extra
          // columns within it, so we only contribute a single line (avoids
          // collapse without overriding the imported height). When the row is
          // auto, grow it to the full stack length so the column is not clipped.
          const stackLength = estimateStackedParagraphHeight(paragraph, state);
          projectedParagraphs.push({
            paragraph,
            lines: [],
            height: stackLength,
            spacingBefore,
            spacingAfter,
          });
          const paragraphStyleSize =
            paragraph.runs[0]?.styles?.fontSize ?? DEFAULT_FONT_SIZE_PX;
          contentNaturalHeightPx = Math.max(
            contentNaturalHeightPx,
            hasExplicitRowHeight ? paragraphStyleSize * 1.25 : stackLength,
          );
          continue;
        }

        const projected = projectParagraphLayout(
          paragraph,
          pageIndex,
          undefined,
          state.document.styles,
          wrapWidth,
          undefined,
          state.document.settings?.defaultTabStop,
        );
        const linesBottom =
          projected.lines.length > 0
            ? Math.max(...projected.lines.map((line) => line.top + line.height))
            : 1;
        let effectiveSpacingBefore = spacingBefore;
        if (!isRotated && projectedParagraphs.length > 0) {
          const previous = projectedParagraphs[projectedParagraphs.length - 1]!;
          // w:allowSpaceOfSameStyleInTable: contextual spacing suppresses spacing
          // between adjacent same-style paragraphs inside cells when enabled.
          if (
            state.document.settings?.allowSpaceOfSameStyleInTable &&
            shouldCollapseContextualSpacing(
              previous.paragraph,
              paragraph,
              state.document.styles,
            )
          ) {
            const removedAfter = previous.spacingAfter;
            previous.height = Math.max(1, previous.height - removedAfter);
            previous.spacingAfter = 0;
            contentNaturalHeightPx = Math.max(
              0,
              contentNaturalHeightPx - removedAfter,
            );
            effectiveSpacingBefore = 0;
          } else {
            const collapsed = Math.min(previous.spacingAfter, spacingBefore);
            if (collapsed > 0) {
              if (previous.spacingAfter >= spacingBefore) {
                effectiveSpacingBefore = 0;
              } else {
                const previousHeight = previous.height;
                previous.height = Math.max(1, previous.height - collapsed);
                contentNaturalHeightPx = Math.max(
                  0,
                  contentNaturalHeightPx - (previousHeight - previous.height),
                );
              }
            }
          }
        }
        const paragraphHeight = Math.max(
          1,
          effectiveSpacingBefore + linesBottom + spacingAfter,
        );
        projectedParagraphs.push({
          paragraph,
          lines: projected.lines,
          height: paragraphHeight,
          spacingBefore: effectiveSpacingBefore,
          spacingAfter,
        });
        if (isRotated) {
          // Rotated columns sit side by side; the cell's vertical extent equals
          // the text's flow length once rotated. With an explicit row height the
          // text wraps to fit, so we contribute only the line thickness. When the
          // row is auto (no-wrap projection), grow it to the longest line's flow
          // length so the rotated text is not clipped.
          const lineThickness =
            projected.lines.length > 0
              ? Math.max(...projected.lines.map((line) => line.height))
              : paragraphHeight;
          const flowLength = projected.lines.length
            ? Math.max(
                ...projected.lines.map((line) => {
                  const last = line.slots[line.slots.length - 1];
                  return last ? last.left : 0;
                }),
              )
            : paragraphHeight;
          contentNaturalHeightPx = Math.max(
            contentNaturalHeightPx,
            hasExplicitRowHeight
              ? lineThickness
              : Math.max(lineThickness, flowLength),
          );
        } else {
          contentNaturalHeightPx += paragraphHeight;
        }
      }

      // `w:hideMark`: when the cell contains only empty paragraphs (no visible
      // text, images, or other inline content), the trailing paragraph mark is
      // hidden and the cell contributes zero height to the row minimum.
      if (cell.style?.hideMark) {
        const allEmpty = cell.blocks.every((para) =>
          para.runs.every(
            (run) =>
              (run.kind === "text" || run.kind === undefined) &&
              (!run.text || run.text.length === 0),
          ),
        );
        if (allEmpty) {
          contentNaturalHeightPx = 0;
        }
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
        verticalMode,
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
    const rowIndex = table.rows.indexOf(row);
    const effective = effectiveRowStyles[rowIndex];
    if (effective?.hidden || effective?.revision?.type === "delete") {
      return 0;
    }
    const explicit = parseDimensionToPx(effective?.height);
    return explicit !== null && explicit > 0 ? explicit : null;
  });
  const fallbackPerRow =
    estimatedHeight > 0 ? estimatedHeight / rowCount : DEFAULT_TABLE_ROW_HEIGHT;

  const rowHeights: number[] = [];
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    if (
      effectiveRowStyles[rowIndex]?.hidden ||
      effectiveRowStyles[rowIndex]?.revision?.type === "delete"
    ) {
      rowHeights[rowIndex] = 0;
      continue;
    }
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

  // Vertical cell spacing mirrors the horizontal gaps: a leading gap, one gap
  // between rows, and a trailing gap (added to the total height below). With
  // spacing 0 the offsets are unchanged.
  const rowOffsets: number[] = [];
  let cumulativeY = cellSpacingPx;
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    rowOffsets[rowIndex] = cumulativeY;
    cumulativeY +=
      (rowHeights[rowIndex] ?? DEFAULT_TABLE_ROW_HEIGHT) + cellSpacingPx;
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
    // A row-spanning cell also covers the inter-row gaps it crosses.
    const height = Math.max(
      1,
      rowHeights
        .slice(rowIndex, rowIndex + rowSpan)
        .reduce((sum, current) => sum + current, 0) +
        (rowSpan - 1) * cellSpacingPx,
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
            runs: [{ id: "run:empty", text: "", kind: "text" as const }],
          },
          0,
        );

    let paragraphCursorY = 0;
    // Vertical-flow cells are painted via a rotation/stack transform that owns
    // its own anchoring; the horizontal vertical-align offset does not apply.
    const verticalContentOffset =
      cellEntry.verticalMode === "horizontal"
        ? resolveVerticalContentOffset(
            cell,
            contentHeightPx,
            cellEntry.contentNaturalHeightPx,
          )
        : 0;
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
      verticalMode: cellEntry.verticalMode,
      revision:
        cell.style?.revision ??
        (cell.style?.propertyRevision
          ? { ...cell.style.propertyRevision, type: "property" as const }
          : undefined),
    });
  }

  return {
    tableId: table.id,
    left: tableLeft,
    top: originY,
    width: tableWidth,
    // Total height includes the leading/trailing/inter-row cell-spacing gaps.
    height:
      rowHeights.reduce((sum, current) => sum + current, 0) +
      (rowHeights.length + 1) * cellSpacingPx,
    rowHeights,
    cells,
    unsupported: Array.from(new Set(unsupported)),
  };
}
