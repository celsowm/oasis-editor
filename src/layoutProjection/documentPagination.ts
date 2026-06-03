import type {
  EditorBlockNode,
  EditorCaretSlot,
  EditorLayoutBlock,
  EditorLayoutFragment,
  EditorLayoutFragmentChar,
  EditorLayoutLine,
  EditorLayoutParagraph,
  EditorPageSettings,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorTableNode,
} from "../core/model.js";
import {
  getBlockParagraphs,
  getPageContentWidth,
  getPageContentHeight,
  getParagraphText,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../core/model.js";
import { measureLinesFromRects, type CharRect } from "../ui/caretGeometry.js";
import type { ITextMeasurer } from "../core/engine.js";
import { domTextMeasurer, resolveRenderedLineHeightPx } from "../ui/textMeasurement.js";
import { perfTimer } from "../utils/performanceMetrics.js";
import { resolveTableColumnWidthsPx } from "../ui/tableGeometry.js";
import { buildTableCellLayout } from "../core/tableLayout.js";
import { projectHeaderFooterBlocksWithDependencies } from "./headerFooterProjection.js";

const DEFAULT_FONT_SIZE = 15;
const DEFAULT_LINE_HEIGHT = 1.15;
const POINT_TO_PX = 96 / 72;
const DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX = 14.4; // 2 * 5.4pt (7.2px)
const MIN_TABLE_CELL_CONTENT_WIDTH_PX = 24;
const DEFAULT_TABLE_SEGMENT_VERTICAL_SPACING = 0;
const DEFAULT_TABLE_ROW_VERTICAL_SPACING = 0;
const FAST_IMPLICIT_DOC_GRID_RATIO = 0.86;
function sliceFragmentToRange(
  fragment: EditorLayoutFragment,
  startOffset: number,
  endOffset: number,
): EditorLayoutFragment | null {
  const start = Math.max(startOffset, fragment.startOffset);
  const end = Math.min(endOffset, fragment.endOffset);
  if (start >= end) {
    return null;
  }

  const chars = fragment.chars.filter(
    (char) => char.paragraphOffset >= start && char.paragraphOffset < end,
  );

  return {
    paragraphId: fragment.paragraphId,
    runId: fragment.runId,
    startOffset: start,
    endOffset: end,
    text: chars.map((char) => char.char).join(""),
    styles: fragment.styles ? { ...fragment.styles } : undefined,
    image: fragment.image ? { ...fragment.image } : undefined,
    revision: fragment.revision ? { ...fragment.revision } : undefined,
    chars,
  };
}

const paragraphLayoutCache = new WeakMap<EditorParagraphNode, Map<string, EditorLayoutParagraph>>();
const paragraphFieldDependenceCache = new WeakMap<
  EditorParagraphNode,
  { dependsOnPageIndex: boolean; dependsOnTotalPages: boolean }
>();

function getParagraphFieldDependence(paragraph: EditorParagraphNode): {
  dependsOnPageIndex: boolean;
  dependsOnTotalPages: boolean;
} {
  const cached = paragraphFieldDependenceCache.get(paragraph);
  if (cached) return cached;
  let dependsOnPageIndex = false;
  let dependsOnTotalPages = false;
  for (const run of paragraph.runs) {
    if (run.field?.type === "PAGE") dependsOnPageIndex = true;
    else if (run.field?.type === "NUMPAGES") dependsOnTotalPages = true;
    if (dependsOnPageIndex && dependsOnTotalPages) break;
  }
  const result = { dependsOnPageIndex, dependsOnTotalPages };
  paragraphFieldDependenceCache.set(paragraph, result);
  return result;
}

export function projectParagraphLayout(
  paragraph: EditorParagraphNode,
  pageIndex?: number,
  totalPages?: number,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
  layoutMode: "fast" | "wordParity" = "fast",
  measurer: ITextMeasurer = domTextMeasurer,
): EditorLayoutParagraph {
  // Only include pageIndex / totalPages in the cache key when this paragraph
  // actually contains a PAGE / NUMPAGES field. Otherwise the projection result
  // is independent of those values, and including them in the key forces a
  // cache miss every time pagination shifts (e.g. after a single-paragraph
  // alignment change near the top of the document re-flows downstream pages).
  const { dependsOnPageIndex, dependsOnTotalPages } = getParagraphFieldDependence(paragraph);
  const cacheKey = `${dependsOnPageIndex ? pageIndex ?? "" : ""}:${
    dependsOnTotalPages ? totalPages ?? "" : ""
  }:${contentWidth ?? ""}:${layoutMode}`;
  let cacheForParagraph = paragraphLayoutCache.get(paragraph);
  if (cacheForParagraph) {
    const cached = cacheForParagraph.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const result = perfTimer("layout:projectParagraphLayout", () => {
    let paragraphOffset = 0;
    const fragments: EditorLayoutFragment[] = paragraph.runs.map((run) => {
      let resolvedText = run.text;
      if (run.field) {
        if (run.field.type === "PAGE") {
          resolvedText = typeof pageIndex === "number" ? String(pageIndex + 1) : "1";
        } else if (run.field.type === "NUMPAGES") {
          resolvedText = typeof totalPages === "number" ? String(totalPages) : "1";
        }
      }

      const chars: EditorLayoutFragmentChar[] = Array.from(resolvedText).map((char, index) => ({
        char,
        paragraphOffset: paragraphOffset + index,
        runOffset: index,
      }));

      const fragment: EditorLayoutFragment = {
        paragraphId: paragraph.id,
        runId: run.id,
        startOffset: paragraphOffset,
        endOffset: paragraphOffset + resolvedText.length,
        text: resolvedText,
        styles: run.styles ? { ...run.styles } : undefined,
        image: run.image ? { ...run.image } : undefined,
        revision: run.revision ? { ...run.revision } : undefined,
        chars,
      };

      paragraphOffset += resolvedText.length;
      return fragment;
    });

    const fontSize = estimateParagraphFontSize(paragraph, styles);
    const lineHeight = estimateParagraphLineHeight(paragraph, fontSize, styles, layoutMode);
    const lines = measurer.composeMeasuredParagraphLines({
      paragraph,
      fragments,
      styles,
      contentWidth,
      layoutMode,
    }).map((line) => ({
      ...line,
      height: line.height || lineHeight,
      fragments: fragments
        .map((fragment) => sliceFragmentToRange(fragment, line.startOffset, line.endOffset))
        .filter((fragment): fragment is EditorLayoutFragment => fragment !== null),
    }));

    return {
      paragraphId: paragraph.id,
      text: fragments.map((f) => f.text).join(""),
      fragments,
      lines,
      startOffset: 0,
      endOffset: paragraphOffset,
      contentWidth,
    };
  }, 0);

  if (!cacheForParagraph) {
    cacheForParagraph = new Map();
    paragraphLayoutCache.set(paragraph, cacheForParagraph);
  }
  cacheForParagraph.set(cacheKey, result);

  return result;
}

export function measureParagraphLayoutFromRects(
  paragraph: EditorParagraphNode,
  charRects: CharRect[],
  styles?: Record<string, EditorNamedStyle>,
  layoutMode: "fast" | "wordParity" = "fast",
): EditorLayoutParagraph {
  const projected = projectParagraphLayout(paragraph, undefined, undefined, styles, undefined, layoutMode);
  const measuredLines = measureLinesFromRects(charRects);

  return {
    ...projected,
    lines: measuredLines.map((line) => {
      const slots: EditorCaretSlot[] = line.slots.map((slot) => ({
        paragraphId: paragraph.id,
        offset: slot.offset,
        left: slot.left,
        top: slot.top,
        height: slot.height,
      }));

      return {
        paragraphId: paragraph.id,
        index: line.index,
        startOffset: line.startOffset,
        endOffset: line.endOffset,
        top: line.top,
        height: line.height,
        slots,
        fragments: projected.fragments
          .map((fragment) => sliceFragmentToRange(fragment, line.startOffset, line.endOffset))
          .filter((fragment): fragment is EditorLayoutFragment => fragment !== null),
      };
    }),
    contentWidth: projected.contentWidth,
  };
}

export function applyMeasuredLineGeometry(
  projected: EditorLayoutParagraph,
  measured: EditorLayoutParagraph,
): EditorLayoutParagraph {
  return {
    ...projected,
    startOffset: measured.startOffset ?? projected.startOffset,
    endOffset: measured.endOffset ?? projected.endOffset,
    lines: measured.lines.map((line) => ({
      paragraphId: projected.paragraphId,
      index: line.index,
      startOffset: line.startOffset,
      endOffset: line.endOffset,
      top: line.top,
      height: line.height,
      slots: line.slots.map((slot) => ({
        paragraphId: projected.paragraphId,
        offset: slot.offset,
        left: slot.left,
        top: slot.top,
        height: slot.height,
      })),
      fragments: projected.fragments
        .map((fragment) => sliceFragmentToRange(fragment, line.startOffset, line.endOffset))
        .filter((fragment): fragment is EditorLayoutFragment => fragment !== null),
    })),
  };
}

export function isMeasuredLayoutCurrent(
  projected: EditorLayoutParagraph,
  measured: EditorLayoutParagraph,
): boolean {
  if (projected.paragraphId !== measured.paragraphId) {
    return false;
  }

  if (projected.text !== measured.text) {
    return false;
  }

  const projectedStart = projected.startOffset ?? 0;
  const measuredStart = measured.startOffset ?? 0;
  const projectedEnd = projected.endOffset ?? projected.text.length;
  const measuredEnd = measured.endOffset ?? measured.text.length;

  if (projectedStart !== measuredStart || projectedEnd !== measuredEnd) {
    return false;
  }

  if (projected.contentWidth !== measured.contentWidth) {
    return false;
  }

  return true;
}

export function resolveClosestOffsetInMeasuredLayout(
  layout: EditorLayoutParagraph,
  clientX: number,
  clientY: number,
): number {
  const slots = layout.lines.flatMap((line) => line.slots);
  if (slots.length === 0) {
    return 0;
  }

  let bestOffset = slots[0]!.offset;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const slot of slots) {
    const verticalDelta =
      clientY < slot.top ? slot.top - clientY : clientY > slot.top + slot.height ? clientY - (slot.top + slot.height) : 0;
    const horizontalDelta = Math.abs(clientX - slot.left);
    const score = verticalDelta * 1000 + horizontalDelta;

    if (score < bestScore) {
      bestScore = score;
      bestOffset = slot.offset;
    }
  }

  return bestOffset;
}

export function getEffectiveParagraphStyle(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
) {
  return resolveEffectiveParagraphStyle(paragraph.style, styles);
}

function estimateParagraphFontSize(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
): number {
  const runFontSizes = paragraph.runs
    .map((run) =>
      resolveEffectiveTextStyleForParagraph(
        run.styles,
        paragraph.style?.styleId,
        styles,
      ).fontSize,
    )
    .filter((fontSize): fontSize is number => typeof fontSize === "number" && Number.isFinite(fontSize));

  return runFontSizes.length > 0 ? Math.max(...runFontSizes) : DEFAULT_FONT_SIZE;
}

function estimateParagraphLineHeight(
  paragraph: EditorParagraphNode,
  fontSize: number,
  styles: Record<string, EditorNamedStyle> | undefined,
  layoutMode: "fast" | "wordParity",
): number {
  const paragraphStyle = getEffectiveParagraphStyle(paragraph, styles);
  const lineHeight = paragraphStyle.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const lineGridPitch = paragraphStyle.lineGridPitch;
  const snapToGrid = paragraphStyle.snapToGrid !== false;
  
  const effectiveTextStyle = resolveEffectiveTextStyleForParagraph(
    undefined,
    paragraph.style?.styleId,
    styles,
  );
  const renderedLineHeight = resolveRenderedLineHeightPx(
    {
      ...effectiveTextStyle,
      fontSize: effectiveTextStyle.fontSize ?? fontSize,
    },
    lineHeight,
  );

  if (lineGridPitch && lineGridPitch > 0 && snapToGrid) {
    if (paragraphStyle.lineGridType === "implicit") {
      const pitch =
        layoutMode === "wordParity" ? lineGridPitch : lineGridPitch * FAST_IMPLICIT_DOC_GRID_RATIO;
      return Math.max(renderedLineHeight, pitch);
    }
    return Math.ceil(renderedLineHeight / lineGridPitch) * lineGridPitch;
  }
  return renderedLineHeight;
}

export function getParagraphSegmentHeight(
  paragraph: EditorParagraphNode,
  lines: EditorLayoutLine[],
  isFirstSegment: boolean,
  isLastSegment: boolean,
  styles: Record<string, EditorNamedStyle> | undefined,
  allowSpacingBefore = true,
): number {
  const lineHeights = lines.reduce((sum, line) => sum + line.height, 0);
  const paragraphStyle = getEffectiveParagraphStyle(paragraph, styles);
  const spacingBefore = isFirstSegment && allowSpacingBefore ? (paragraphStyle.spacingBefore ?? 0) : 0;
  const spacingAfter = isLastSegment ? (paragraphStyle.spacingAfter ?? 0) : 0;
  return spacingBefore + spacingAfter + lineHeights;
}

export function getParagraphSegmentFitHeight(
  paragraph: EditorParagraphNode,
  segmentHeight: number,
  isLastSegment: boolean,
  styles: Record<string, EditorNamedStyle> | undefined,
  _layoutMode: "fast" | "wordParity",
): number {
  if (!isLastSegment) {
    return segmentHeight;
  }
  const paragraphStyle = getEffectiveParagraphStyle(paragraph, styles);
  return Math.max(0, segmentHeight - (paragraphStyle.spacingAfter ?? 0));
}

export function getProjectedParagraphBlockHeight(
  paragraph: EditorParagraphNode,
  layout: EditorLayoutParagraph,
  styles: Record<string, EditorNamedStyle> | undefined,
  allowSpacingBefore = true,
): number {
  return getParagraphSegmentHeight(
    paragraph,
    layout.lines,
    true,
    true,
    styles,
    allowSpacingBefore,
  );
}

export function getParagraphMeasuredHeight(
  measuredHeights: Record<string, number> | undefined,
  paragraphId: string,
  segmentId: string,
  isWholeParagraphSegment: boolean,
  fallbackHeight: number,
): number {
  return (
    measuredHeights?.[segmentId] ??
    (isWholeParagraphSegment ? measuredHeights?.[paragraphId] : undefined) ??
    fallbackHeight
  );
}

function getCellHorizontalChromePx(cell: EditorTableNode["rows"][number]["cells"][number]): number {
  const padLeft =
    cell.style?.padding !== undefined
      ? cell.style.padding * POINT_TO_PX
      : cell.style?.paddingLeft !== undefined
        ? cell.style.paddingLeft * POINT_TO_PX
        : DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX / 2;
  const padRight =
    cell.style?.padding !== undefined
      ? cell.style.padding * POINT_TO_PX
      : cell.style?.paddingRight !== undefined
        ? cell.style.paddingRight * POINT_TO_PX
        : DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX / 2;
  const borderLeft = cell.style?.borderLeft
    ? Math.max(0, cell.style.borderLeft.width * POINT_TO_PX)
    : 1;
  const borderRight = cell.style?.borderRight
    ? Math.max(0, cell.style.borderRight.width * POINT_TO_PX)
    : 1;
  return Math.max(0, padLeft + padRight + borderLeft + borderRight);
}

function getCellVerticalChromePx(cell: EditorTableNode["rows"][number]["cells"][number]): number {
  const padTop =
    cell.style?.padding !== undefined
      ? cell.style.padding * POINT_TO_PX
      : cell.style?.paddingTop !== undefined
        ? cell.style.paddingTop * POINT_TO_PX
        : 0;
  const padBottom =
    cell.style?.padding !== undefined
      ? cell.style.padding * POINT_TO_PX
      : cell.style?.paddingBottom !== undefined
        ? cell.style.paddingBottom * POINT_TO_PX
        : 0;
  const borderTop = cell.style?.borderTop
    ? Math.max(0, cell.style.borderTop.width * POINT_TO_PX)
    : 1;
  const borderBottom = cell.style?.borderBottom
    ? Math.max(0, cell.style.borderBottom.width * POINT_TO_PX)
    : 1;
  return Math.max(0, padTop + padBottom + borderTop + borderBottom);
}

function getTableCellContentWidth(
  cell: EditorTableNode["rows"][number]["cells"][number],
  fallbackContentWidth?: number,
  columnWidthPx?: number,
): number | undefined {
  if (typeof columnWidthPx === "number" && Number.isFinite(columnWidthPx) && columnWidthPx > 0) {
    return Math.max(
      MIN_TABLE_CELL_CONTENT_WIDTH_PX,
      columnWidthPx - getCellHorizontalChromePx(cell),
    );
  }
  if (typeof cell.style?.width !== "number") {
    return fallbackContentWidth;
  }

  const widthPx = cell.style.width * POINT_TO_PX;
  const horizontalPaddingPx =
    cell.style.padding !== undefined
      ? cell.style.padding * POINT_TO_PX * 2
      : DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX;

  return Math.max(MIN_TABLE_CELL_CONTENT_WIDTH_PX, widthPx - horizontalPaddingPx);
}

function parseTableRowHeightToPx(height: number | string | undefined): number | null {
  if (typeof height === "number" && Number.isFinite(height)) {
    return Math.max(0, height * POINT_TO_PX);
  }
  if (typeof height !== "string") {
    return null;
  }
  const trimmed = height.trim().toLowerCase();
  if (!trimmed || trimmed.includes("%")) {
    return null;
  }
  if (trimmed.endsWith("pt")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? Math.max(0, parsed * POINT_TO_PX) : null;
  }
  if (trimmed.endsWith("px")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? Math.max(0, parsed * POINT_TO_PX) : null;
}

interface TableColumnGeometry {
  columnWidths: number[];
  cellColumnWidth: Map<string, number>;
}

const tableColumnGeometryCache = new WeakMap<
  EditorTableNode,
  Map<number, TableColumnGeometry>
>();

function getCachedTableColumnGeometry(
  table: EditorTableNode,
  contentWidthPx: number,
): TableColumnGeometry {
  let perTable = tableColumnGeometryCache.get(table);
  if (!perTable) {
    perTable = new Map();
    tableColumnGeometryCache.set(table, perTable);
  }
  // Round to integer pixel so layout/estimator hit the same key without
  // floating point noise blowing the cache.
  const key = Math.round(contentWidthPx);
  let geometry = perTable.get(key);
  if (geometry) return geometry;

  const columnWidths = resolveTableColumnWidthsPx(table, contentWidthPx);
  const entries = buildTableCellLayout(table);
  const cellColumnWidth = new Map<string, number>();
  for (const entry of entries) {
    let total = 0;
    for (
      let i = entry.visualColumnIndex;
      i < Math.min(entry.visualColumnIndex + entry.colSpan, columnWidths.length);
      i += 1
    ) {
      total += columnWidths[i] ?? 0;
    }
    cellColumnWidth.set(`${entry.rowIndex}:${entry.cellIndex}`, total);
  }

  geometry = { columnWidths, cellColumnWidth };
  perTable.set(key, geometry);
  return geometry;
}

function estimateTableRowHeight(
  row: EditorTableNode["rows"][number],
  styles: Record<string, EditorNamedStyle> | undefined,
  layoutMode: "fast" | "wordParity",
  contentWidth?: number,
  table?: EditorTableNode,
  rowIndex?: number,
): number {
  const geometry =
    table && typeof contentWidth === "number"
      ? getCachedTableColumnGeometry(table, contentWidth)
      : null;

  const cellHeights = row.cells
    .map((cell, cellIndex) => {
      if (cell.vMerge === "continue") return 0;
      let columnWidthPx: number | undefined;
      if (geometry && typeof rowIndex === "number") {
        const total = geometry.cellColumnWidth.get(`${rowIndex}:${cellIndex}`);
        if (total !== undefined && total > 0) columnWidthPx = total;
      }
      const cellContentWidth = getTableCellContentWidth(cell, contentWidth, columnWidthPx);
      let blockHeights = 0;
      for (const paragraph of cell.blocks) {
        blockHeights += estimateParagraphBlockHeight(
          paragraph,
          styles,
          cellContentWidth,
          layoutMode,
        );
      }
      // Account for the (rare) case where an inline image is taller than what
      // text alone would imply: pick the max between text-driven height and
      // the largest inline image height encountered in any run.
      let largestImageHeight = 0;
      for (const paragraph of cell.blocks) {
        for (const run of paragraph.runs) {
          if (run.image && run.image.height > largestImageHeight) {
            // Mirror the visual fit-to-cell: an oversized image is scaled
            // down to the cell content width, so the contributing height
            // shrinks proportionally.
            const fitted =
              cellContentWidth !== undefined && run.image.width > cellContentWidth
                ? Math.floor(run.image.height * (cellContentWidth / run.image.width))
                : run.image.height;
            if (fitted > largestImageHeight) {
              largestImageHeight = fitted;
            }
          }
        }
      }
      return Math.max(blockHeights, largestImageHeight) + getCellVerticalChromePx(cell);
    });

  const contentHeight = Math.max(...cellHeights, DEFAULT_FONT_SIZE * DEFAULT_LINE_HEIGHT);
  const explicitHeight = parseTableRowHeightToPx(row.style?.height);
  return Math.max(contentHeight, explicitHeight ?? 0) + DEFAULT_TABLE_ROW_VERTICAL_SPACING;
}

export function getTableHeaderRowCount(table: EditorTableNode): number {
  let count = 0;
  for (const row of table.rows) {
    if (!row.isHeader) {
      break;
    }
    count += 1;
  }
  return count;
}

function getTableRowGroupEndExclusive(table: EditorTableNode, rowIndex: number): number {
  const row = table.rows[rowIndex];
  if (!row) {
    return rowIndex + 1;
  }

  let endExclusive = rowIndex + 1;
  for (const cell of row.cells) {
    const rowSpan = Math.max(1, cell.rowSpan ?? (cell.vMerge === "restart" ? 1 : 1));
    endExclusive = Math.max(endExclusive, rowIndex + rowSpan);
  }

  return Math.min(table.rows.length, endExclusive);
}

export function getTableRowGroups(table: EditorTableNode): Array<{ startRowIndex: number; endRowIndexExclusive: number }> {
  const groups: Array<{ startRowIndex: number; endRowIndexExclusive: number }> = [];
  let groupStart = 0;
  let groupEndExclusive = 0;

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    if (rowIndex >= groupEndExclusive) {
      groupStart = rowIndex;
      groupEndExclusive = rowIndex + 1;
    }

    groupEndExclusive = Math.max(groupEndExclusive, getTableRowGroupEndExclusive(table, rowIndex));
    if (rowIndex === groupEndExclusive - 1) {
      groups.push({
        startRowIndex: groupStart,
        endRowIndexExclusive: groupEndExclusive,
      });
    }
  }

  return groups;
}

export function getRepeatableHeaderRowCount(
  table: EditorTableNode,
  headerRowCount: number,
  rowGroups: Array<{ startRowIndex: number; endRowIndexExclusive: number }>,
): number {
  for (const group of rowGroups) {
    if (group.startRowIndex >= headerRowCount) {
      break;
    }
    if (group.endRowIndexExclusive > headerRowCount) {
      return 0;
    }
  }

  return headerRowCount;
}

export function getTableSegmentHeight(
  table: EditorTableNode,
  rowStartIndex: number,
  rowEndIndexExclusive: number,
  repeatedHeaderRowCount: number,
  styles: Record<string, EditorNamedStyle> | undefined,
  layoutMode: "fast" | "wordParity",
  contentWidth?: number,
  measurer: ITextMeasurer = domTextMeasurer,
): number {
  const headerHeight =
    repeatedHeaderRowCount > 0
      ? table.rows
          .slice(0, repeatedHeaderRowCount)
          .reduce(
            (sum, row, index) =>
              sum + estimateTableRowHeight(row, styles, layoutMode, contentWidth, table, index),
            0,
          )
      : 0;
  const bodyHeight = table.rows
    .slice(rowStartIndex, rowEndIndexExclusive)
    .reduce(
      (sum, row, indexOffset) =>
        sum +
        estimateTableRowHeight(
          row,
          styles,
          layoutMode,
          contentWidth,
          table,
          rowStartIndex + indexOffset,
        ),
      0,
    );
  return headerHeight + bodyHeight + DEFAULT_TABLE_SEGMENT_VERTICAL_SPACING;
}

export function createParagraphSegmentLayout(
  layout: EditorLayoutParagraph,
  startLineIndex: number,
  endLineIndexExclusive: number,
): EditorLayoutParagraph {
  const segmentLines = layout.lines.slice(startLineIndex, endLineIndexExclusive);
  const startOffset = segmentLines[0]?.startOffset ?? 0;
  const endOffset = segmentLines[segmentLines.length - 1]?.endOffset ?? startOffset;
  const topOffset = segmentLines[0]?.top ?? 0;

  return {
    paragraphId: layout.paragraphId,
    text: layout.text.slice(startOffset, endOffset),
    fragments: layout.fragments
      .map((fragment) => sliceFragmentToRange(fragment, startOffset, endOffset))
      .filter((fragment): fragment is EditorLayoutFragment => fragment !== null),
    lines: segmentLines.map((line, index) => ({
      ...line,
      index,
      top: line.top - topOffset,
      slots: line.slots.map((slot) => ({
        ...slot,
        top: slot.top - topOffset,
      })),
    })),
    startOffset,
    endOffset,
    contentWidth: layout.contentWidth,
  };
}

export function applyWidowOrphanControl(
  paragraph: EditorParagraphNode,
  lines: EditorLayoutLine[],
  startLineIndex: number,
  endLineIndexExclusive: number,
  styles: Record<string, EditorNamedStyle> | undefined,
  allowSpacingBefore = true,
): { endLineIndexExclusive: number; height: number } {
  const paragraphStyle = getEffectiveParagraphStyle(paragraph, styles);
  if (paragraphStyle.widowControl === false) {
    return {
      endLineIndexExclusive,
      height: getParagraphSegmentHeight(
        paragraph,
        lines.slice(startLineIndex, endLineIndexExclusive),
        startLineIndex === 0,
        endLineIndexExclusive === lines.length,
        styles,
        allowSpacingBefore,
      ),
    };
  }

  let adjustedEnd = endLineIndexExclusive;
  const segmentLineCount = adjustedEnd - startLineIndex;
  const remainingLineCount = lines.length - adjustedEnd;

  // Match Word's default widow/orphan behavior by avoiding a lone line
  // at the top of the next page when we can move one line down.
  if (remainingLineCount === 1 && segmentLineCount > 1) {
    adjustedEnd -= 1;
  }

  return {
    endLineIndexExclusive: adjustedEnd,
    height: getParagraphSegmentHeight(
      paragraph,
      lines.slice(startLineIndex, adjustedEnd),
      startLineIndex === 0,
      adjustedEnd === lines.length,
      styles,
      allowSpacingBefore,
    ),
  };
}

export function estimateParagraphBlockHeight(
  paragraph: EditorParagraphNode,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
  layoutMode: "fast" | "wordParity" = "fast",
  measurer: ITextMeasurer = domTextMeasurer,
): number {
  const layout = projectParagraphLayout(paragraph, undefined, undefined, styles, contentWidth, layoutMode, measurer);
  const lineHeightPx = layout.lines.reduce((sum, line) => sum + line.height, 0);
  const paragraphStyle = getEffectiveParagraphStyle(paragraph, styles);
  const spacingBefore = paragraphStyle.spacingBefore ?? 0;
  const spacingAfter = paragraphStyle.spacingAfter ?? 0;

  return spacingBefore + spacingAfter + lineHeightPx;
}

export function estimateTableBlockHeight(
  table: EditorTableNode,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
  layoutMode: "fast" | "wordParity" = "fast",
  measurer: ITextMeasurer = domTextMeasurer,
): number {
  return getTableSegmentHeight(table, 0, table.rows.length, 0, styles, layoutMode, contentWidth, measurer);
}

export function projectHeaderFooterBlocks(
  blocks: EditorBlockNode[],
  pageIndex?: number,
  totalPages?: number,
  measuredHeights?: Record<string, number>,
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
  layoutMode: "fast" | "wordParity" = "fast",
  measurer: ITextMeasurer = domTextMeasurer,
): EditorLayoutBlock[] {
  return projectHeaderFooterBlocksWithDependencies(
    blocks,
    {
      projectParagraphLayout,
      estimateTableBlockHeight,
      getProjectedParagraphBlockHeight,
    },
    pageIndex,
    totalPages,
    measuredHeights,
    measuredParagraphLayouts,
    styles,
    contentWidth,
    layoutMode,
    measurer,
  );
}
