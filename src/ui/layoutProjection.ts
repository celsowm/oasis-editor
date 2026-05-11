import type {
  EditorBlockNode,
  EditorCaretSlot,
  EditorDocument,
  EditorLayoutBlock,
  EditorLayoutDocument,
  EditorLayoutFragment,
  EditorLayoutFragmentChar,
  EditorLayoutLine,
  EditorLayoutPage,
  EditorLayoutParagraph,
  EditorPageSettings,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorTableNode,
} from "../core/model.js";
import {
  getDocumentSections,
  getPageBodyBottom,
  getPageBodyTop,
  getPageContentWidth,
  getPageContentHeight,
  getParagraphText,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../core/model.js";
import { measureLinesFromRects, type CharRect } from "./caretGeometry.js";
import { composeMeasuredParagraphLines, resolveRenderedLineHeightPx } from "./textMeasurement.js";
import { perfTimer } from "../utils/performanceMetrics.js";

const DEFAULT_FONT_SIZE = 15;
const DEFAULT_LINE_HEIGHT = 1.15;
const DEFAULT_PAGE_HEIGHT = 920;
const POINT_TO_PX = 96 / 72;
const DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX = 28;
const MIN_TABLE_CELL_CONTENT_WIDTH_PX = 24;

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

export function projectParagraphLayout(
  paragraph: EditorParagraphNode,
  pageIndex?: number,
  totalPages?: number,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
): EditorLayoutParagraph {
  const cacheKey = `${pageIndex ?? ""}:${totalPages ?? ""}:${contentWidth ?? ""}`;
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
    const lineHeight = estimateParagraphLineHeight(paragraph, fontSize, styles);
    const lines = composeMeasuredParagraphLines({
      paragraph,
      fragments,
      styles,
      contentWidth,
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
): EditorLayoutParagraph {
  const projected = projectParagraphLayout(paragraph, undefined, undefined, styles);
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

function applyMeasuredLineGeometry(
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

function isMeasuredLayoutCurrent(
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

function getEffectiveParagraphStyle(
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
): number {
  const lineHeight = getEffectiveParagraphStyle(paragraph, styles).lineHeight ?? DEFAULT_LINE_HEIGHT;
  const effectiveTextStyle = resolveEffectiveTextStyleForParagraph(
    undefined,
    paragraph.style?.styleId,
    styles,
  );
  return resolveRenderedLineHeightPx(
    {
      ...effectiveTextStyle,
      fontSize: effectiveTextStyle.fontSize ?? fontSize,
    },
    lineHeight,
  );
}

function getParagraphSegmentHeight(
  paragraph: EditorParagraphNode,
  lines: EditorLayoutLine[],
  isFirstSegment: boolean,
  isLastSegment: boolean,
  styles: Record<string, EditorNamedStyle> | undefined,
): number {
  const lineHeights = lines.reduce((sum, line) => sum + line.height, 0);
  const paragraphStyle = getEffectiveParagraphStyle(paragraph, styles);
  const spacingBefore = isFirstSegment ? (paragraphStyle.spacingBefore ?? 0) : 0;
  const spacingAfter = isLastSegment ? (paragraphStyle.spacingAfter ?? 0) : 0;
  return spacingBefore + spacingAfter + lineHeights;
}

function getProjectedParagraphBlockHeight(
  paragraph: EditorParagraphNode,
  layout: EditorLayoutParagraph,
  styles: Record<string, EditorNamedStyle> | undefined,
): number {
  return getParagraphSegmentHeight(
    paragraph,
    layout.lines,
    true,
    true,
    styles,
  );
}

function getParagraphMeasuredHeight(
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

function getTableCellContentWidth(
  cell: EditorTableNode["rows"][number]["cells"][number],
  fallbackContentWidth?: number,
): number | undefined {
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

function estimateTableRowHeight(
  row: EditorTableNode["rows"][number],
  styles: Record<string, EditorNamedStyle> | undefined,
  contentWidth?: number,
): number {
  const cellHeights = row.cells
    .filter((cell) => cell.vMerge !== "continue")
    .map((cell) =>
      cell.blocks.reduce(
        (sum, paragraph) =>
          sum + estimateParagraphBlockHeight(paragraph, styles, getTableCellContentWidth(cell, contentWidth)),
        0,
      ),
    );

  return Math.max(...cellHeights, DEFAULT_FONT_SIZE * DEFAULT_LINE_HEIGHT) + 12;
}

function getTableHeaderRowCount(table: EditorTableNode): number {
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

function getTableRowGroups(table: EditorTableNode): Array<{ startRowIndex: number; endRowIndexExclusive: number }> {
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

function getRepeatableHeaderRowCount(
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

function getTableSegmentHeight(
  table: EditorTableNode,
  rowStartIndex: number,
  rowEndIndexExclusive: number,
  repeatedHeaderRowCount: number,
  styles: Record<string, EditorNamedStyle> | undefined,
  contentWidth?: number,
): number {
  const headerHeight =
    repeatedHeaderRowCount > 0
      ? table.rows
          .slice(0, repeatedHeaderRowCount)
          .reduce((sum, row) => sum + estimateTableRowHeight(row, styles, contentWidth), 0)
      : 0;
  const bodyHeight = table.rows
    .slice(rowStartIndex, rowEndIndexExclusive)
    .reduce((sum, row) => sum + estimateTableRowHeight(row, styles, contentWidth), 0);
  return headerHeight + bodyHeight + 16;
}

function createParagraphSegmentLayout(
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

function applyWidowOrphanControl(
  paragraph: EditorParagraphNode,
  lines: EditorLayoutLine[],
  startLineIndex: number,
  endLineIndexExclusive: number,
  styles: Record<string, EditorNamedStyle> | undefined,
): { endLineIndexExclusive: number; height: number } {
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
    ),
  };
}

export function estimateParagraphBlockHeight(
  paragraph: EditorParagraphNode,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
): number {
  const layout = projectParagraphLayout(paragraph, undefined, undefined, styles, contentWidth);
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
): number {
  return getTableSegmentHeight(table, 0, table.rows.length, 0, styles, contentWidth);
}

export function projectHeaderFooterBlocks(
  blocks: EditorBlockNode[],
  pageIndex?: number,
  totalPages?: number,
  measuredHeights?: Record<string, number>,
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
): EditorLayoutBlock[] {
  // Headers/Footers are projected as a single sequence of blocks, no pagination for now
  return blocks.map((block, index) => {
    if (block.type === "paragraph") {
      const layout = projectParagraphLayout(block, pageIndex, totalPages, styles, contentWidth);
      const estimatedHeight =
        measuredHeights?.[block.id] ?? getProjectedParagraphBlockHeight(block, layout, styles);
      return {
        blockId: block.id,
        sourceBlockId: block.id,
        blockType: block.type,
        paragraphId: block.id,
        globalIndex: index,
        estimatedHeight,
        layout,
        sourceBlock: block,
      };
    }
    return {
      blockId: block.id,
      sourceBlockId: block.id,
      blockType: block.type,
      globalIndex: index,
      estimatedHeight:
        measuredHeights?.[block.id] ?? estimateTableBlockHeight(block, styles, contentWidth),
      sourceBlock: block,
    };
  });
}

function getProjectedBlocksHeight(blocks: EditorLayoutBlock[] | undefined): number {
  if (!blocks || blocks.length === 0) {
    return 0;
  }
  return blocks.reduce((sum, block) => sum + block.estimatedHeight, 0);
}

function blockContainsNumPagesField(block: EditorBlockNode): boolean {
  if (block.type === "paragraph") {
    return block.runs.some((run) => run.field?.type === "NUMPAGES");
  }
  return block.rows.some((row) =>
    row.cells.some((cell) => cell.blocks.some(blockContainsNumPagesField)),
  );
}

function documentContainsNumPagesField(document: EditorDocument): boolean {
  return getDocumentSections(document).some((section) =>
    [...(section.header ?? []), ...section.blocks, ...(section.footer ?? [])].some(
      blockContainsNumPagesField,
    ),
  );
}

function resolveEffectiveVerticalMetrics(
  pageSettings: EditorPageSettings,
  headerBlocks: EditorLayoutBlock[] | undefined,
  footerBlocks: EditorLayoutBlock[] | undefined,
): { bodyTop: number; bodyBottom: number; contentHeight: number } {
  const staticBodyTop = getPageBodyTop(pageSettings);
  const staticBodyBottom = getPageBodyBottom(pageSettings);
  const headerHeight = getProjectedBlocksHeight(headerBlocks);
  const footerHeight = getProjectedBlocksHeight(footerBlocks);
  const headerOccupiedBottom =
    headerHeight > 0
      ? Math.min(pageSettings.height, pageSettings.margins.header + headerHeight)
      : 0;
  const footerOccupiedTop =
    footerHeight > 0
      ? Math.max(0, pageSettings.height - (pageSettings.margins.footer + footerHeight))
      : pageSettings.height;
  const bodyTop = Math.max(staticBodyTop, headerOccupiedBottom);
  const bodyBottom = Math.max(
    bodyTop,
    Math.min(staticBodyBottom, footerOccupiedTop),
  );
  return {
    bodyTop,
    bodyBottom,
    contentHeight: Math.max(24, Math.floor(bodyBottom - bodyTop)),
  };
}

export function projectBlocksLayout(
  blocks: EditorBlockNode[],
  pageSettings: EditorPageSettings,
  maxPageHeight: number,
  measuredHeights?: Record<string, number>,
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>,
  styles?: Record<string, EditorNamedStyle>,
  pageOffset = 0,
  totalPages?: number,
  existingPages: EditorLayoutPage[] = [],
): EditorLayoutPage[] {
  const contentWidth = getPageContentWidth(pageSettings);
  const pages: EditorLayoutPage[] = [...existingPages];
  let currentPage = pages[pages.length - 1];
  let currentBlocks: EditorLayoutBlock[] = currentPage ? [...currentPage.blocks] : [];
  let currentHeight = currentPage ? currentPage.height : 0;

  if (currentPage) {
    pages.pop(); // We will re-push it updated
  }

  const flushPage = () => {
    if (currentBlocks.length === 0 && pages.length > 0) {
      return;
    }

    const pageIndex = pageOffset + pages.length;
    pages.push({
      id: `page:${pageIndex + 1}`,
      index: pageIndex,
      height: currentHeight,
      maxHeight: maxPageHeight,
      blocks: currentBlocks,
      pageSettings,
    });
    currentBlocks = [];
    currentHeight = 0;
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const sourceBlock = blocks[index]!;
    const nextBlock = blocks[index + 1];

    if (sourceBlock.type === "paragraph" && sourceBlock.style?.pageBreakBefore && currentBlocks.length > 0) {
      flushPage();
    }

    if (sourceBlock.type === "paragraph") {
      const pageIndex = pageOffset + pages.length;
      const projectedParagraphLayout = projectParagraphLayout(
        sourceBlock,
        pageIndex,
        totalPages,
        styles,
        contentWidth,
      );
      const measuredParagraphLayout = measuredParagraphLayouts?.[sourceBlock.id];
      const paragraphLayout =
        measuredParagraphLayout && isMeasuredLayoutCurrent(projectedParagraphLayout, measuredParagraphLayout)
          ? applyMeasuredLineGeometry(projectedParagraphLayout, measuredParagraphLayout)
          : projectedParagraphLayout;
      const paragraphTotalHeight =
        measuredHeights?.[sourceBlock.id] ?? getProjectedParagraphBlockHeight(sourceBlock, paragraphLayout, styles);
      const nextBlockHeight =
        nextBlock?.type === "paragraph"
          ? measuredHeights?.[nextBlock.id] ?? estimateParagraphBlockHeight(nextBlock, styles, contentWidth)
          : nextBlock
            ? measuredHeights?.[nextBlock.id] ?? estimateTableBlockHeight(nextBlock, styles, contentWidth)
            : 0;
      if (
        sourceBlock.style?.keepWithNext &&
        currentBlocks.length > 0 &&
        currentHeight + paragraphTotalHeight + nextBlockHeight > maxPageHeight &&
        paragraphTotalHeight + nextBlockHeight <= maxPageHeight
      ) {
        flushPage();
      }

      let startLineIndex = 0;
      let segmentIndex = 0;
      while (startLineIndex < paragraphLayout.lines.length) {
        const remainingHeight = maxPageHeight - currentHeight;
        let lineEndIndex = startLineIndex;
        let segmentHeight = 0;

        while (lineEndIndex < paragraphLayout.lines.length) {
          const candidateLines = paragraphLayout.lines.slice(startLineIndex, lineEndIndex + 1);
          const candidateHeight = getParagraphSegmentHeight(
            sourceBlock,
            candidateLines,
            startLineIndex === 0,
            lineEndIndex === paragraphLayout.lines.length - 1,
            styles,
          );
          if (candidateHeight > remainingHeight && lineEndIndex === startLineIndex && currentBlocks.length > 0) {
            break;
          }
          if (candidateHeight > remainingHeight && lineEndIndex > startLineIndex) {
            break;
          }
          segmentHeight = candidateHeight;
          lineEndIndex += 1;
        }

        if (lineEndIndex === startLineIndex && currentBlocks.length > 0) {
          flushPage();
          continue;
        }

        if (lineEndIndex === startLineIndex) {
          lineEndIndex = Math.min(paragraphLayout.lines.length, startLineIndex + 1);
          segmentHeight = getParagraphSegmentHeight(
            sourceBlock,
            paragraphLayout.lines.slice(startLineIndex, lineEndIndex),
            startLineIndex === 0,
            lineEndIndex === paragraphLayout.lines.length,
            styles,
          );
        }

        if (lineEndIndex < paragraphLayout.lines.length) {
          const widowOrphanAdjusted = applyWidowOrphanControl(
            sourceBlock,
            paragraphLayout.lines,
            startLineIndex,
            lineEndIndex,
            styles,
          );
          lineEndIndex = widowOrphanAdjusted.endLineIndexExclusive;
          segmentHeight = widowOrphanAdjusted.height;
        }

        const segmentLayout = createParagraphSegmentLayout(paragraphLayout, startLineIndex, lineEndIndex);
        const segmentId = `${sourceBlock.id}:segment:${segmentIndex}`;
        const isWholeParagraphSegment =
          startLineIndex === 0 && lineEndIndex === paragraphLayout.lines.length;
        const measuredHeight = getParagraphMeasuredHeight(
          measuredHeights,
          sourceBlock.id,
          segmentId,
          isWholeParagraphSegment,
          segmentHeight,
        );
        currentBlocks.push({
          blockId: segmentId,
          sourceBlockId: sourceBlock.id,
          blockType: sourceBlock.type,
          paragraphId: sourceBlock.id,
          globalIndex: index,
          estimatedHeight: measuredHeight,
          layout: segmentLayout,
          sourceBlock,
        });
        currentHeight += measuredHeight;
        startLineIndex = lineEndIndex;
        segmentIndex += 1;

        if (startLineIndex < paragraphLayout.lines.length) {
          flushPage();
        }
      }
      continue;
    }

    const tableHeight =
      measuredHeights?.[sourceBlock.id] ?? estimateTableBlockHeight(sourceBlock, styles, contentWidth);
    if (sourceBlock.rows.length <= 1 || tableHeight <= maxPageHeight) {
      if (currentBlocks.length > 0 && currentHeight + tableHeight > maxPageHeight) {
        flushPage();
      }

      currentBlocks.push({
        blockId: sourceBlock.id,
        sourceBlockId: sourceBlock.id,
        blockType: sourceBlock.type,
        globalIndex: index,
        estimatedHeight: tableHeight,
        sourceBlock,
      });
      currentHeight += tableHeight;
      continue;
    }

    const rowGroups = getTableRowGroups(sourceBlock);
    const headerRowCount = getRepeatableHeaderRowCount(
      sourceBlock,
      getTableHeaderRowCount(sourceBlock),
      rowGroups,
    );
    let groupStartIndex = 0;
    let segmentIndex = 0;

    while (groupStartIndex < rowGroups.length) {
      const startRowIndex = rowGroups[groupStartIndex]!.startRowIndex;
      const repeatedHeaderRowCount = startRowIndex > 0 ? headerRowCount : 0;
      const remainingHeight = maxPageHeight - currentHeight;
      let groupEndIndex = groupStartIndex;
      let endRowIndex = startRowIndex;
      let segmentHeight = 0;

      while (groupEndIndex < rowGroups.length) {
        const candidateEnd = rowGroups[groupEndIndex]!.endRowIndexExclusive;
        const candidateHeight = getTableSegmentHeight(
          sourceBlock,
          startRowIndex,
          candidateEnd,
          repeatedHeaderRowCount,
          styles,
          contentWidth,
        );
        if (
          candidateHeight > remainingHeight &&
          groupEndIndex === groupStartIndex &&
          currentBlocks.length > 0
        ) {
          break;
        }
        if (candidateHeight > remainingHeight && groupEndIndex > groupStartIndex) {
          break;
        }
        segmentHeight = candidateHeight;
        endRowIndex = candidateEnd;
        groupEndIndex += 1;
      }

      if (groupEndIndex === groupStartIndex && currentBlocks.length > 0) {
        flushPage();
        continue;
      }

      if (groupEndIndex === groupStartIndex) {
        endRowIndex = rowGroups[groupStartIndex]!.endRowIndexExclusive;
        segmentHeight = getTableSegmentHeight(
          sourceBlock,
          startRowIndex,
          endRowIndex,
          repeatedHeaderRowCount,
          styles,
          contentWidth,
        );
      }

      const segmentId = `${sourceBlock.id}:segment:${segmentIndex}`;
      const measuredSegmentHeight = measuredHeights?.[segmentId] ?? segmentHeight;

      currentBlocks.push({
        blockId: segmentId,
        sourceBlockId: sourceBlock.id,
        blockType: sourceBlock.type,
        globalIndex: index,
        estimatedHeight: measuredSegmentHeight,
        tableSegment: {
          startRowIndex,
          endRowIndex: endRowIndex,
          repeatedHeaderRowCount,
        },
        sourceBlock,
      });
      currentHeight += measuredSegmentHeight;
      groupStartIndex = Math.max(groupStartIndex + 1, groupEndIndex);
      segmentIndex += 1;

      if (groupStartIndex < rowGroups.length) {
        flushPage();
      }
    }

    continue;
  }

  flushPage();

  if (pages.length === 0) {
    const pageIndex = pageOffset;
    pages.push({
      id: `page:${pageIndex + 1}`,
      index: pageIndex,
      height: 0,
      maxHeight: maxPageHeight,
      blocks: [],
      pageSettings,
    });
  }

  return pages;
}

export function projectDocumentLayout(
  blocksOrDocument: EditorBlockNode[] | EditorDocument,
  maxPageHeightOverride?: number,
  measuredHeights?: Record<string, number>,
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>,
): EditorLayoutDocument {
  if (Array.isArray(blocksOrDocument)) {
    // Legacy support for blocks only
    const pages = projectBlocksLayout(
      blocksOrDocument,
      {
        width: 816,
        height: 1056,
        orientation: "portrait",
        margins: { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 },
      },
      maxPageHeightOverride ?? DEFAULT_PAGE_HEIGHT,
      measuredHeights,
      measuredParagraphLayouts,
      undefined,
    );
    return { pages };
  }

  const document = blocksOrDocument;
  const sections = getDocumentSections(document);
  const needsTotalPages = documentContainsNumPagesField(document);
  
  const calculateTotalPages = () => {
    let currentTotal = 0;
    let activePages: EditorLayoutPage[] = [];
    for (const section of sections) {
      const contentWidth = getPageContentWidth(section.pageSettings);
      const headerBlocks = section.header
        ? projectHeaderFooterBlocks(
            section.header,
            undefined,
            undefined,
            measuredHeights,
            measuredParagraphLayouts,
            document.styles,
            contentWidth,
          )
        : undefined;
      const footerBlocks = section.footer
        ? projectHeaderFooterBlocks(
            section.footer,
            undefined,
            undefined,
            measuredHeights,
            measuredParagraphLayouts,
            document.styles,
            contentWidth,
          )
        : undefined;
      const metrics = resolveEffectiveVerticalMetrics(
        section.pageSettings,
        headerBlocks,
        footerBlocks,
      );
      const pageHeight = maxPageHeightOverride ?? metrics.contentHeight;
      const isContinuous = section.breakType === "continuous" && activePages.length > 0;
      
      const sectionPages = projectBlocksLayout(
        section.blocks,
        section.pageSettings,
        pageHeight,
        measuredHeights,
        measuredParagraphLayouts,
        undefined,
        isContinuous ? currentTotal - 1 : currentTotal,
        undefined,
        isContinuous ? [activePages[activePages.length - 1]] : []
      );

      if (isContinuous) {
        activePages.pop();
        activePages.push(...sectionPages);
        currentTotal = activePages.length;
      } else {
        activePages.push(...sectionPages);
        currentTotal = activePages.length;
      }
    }
    return currentTotal;
  };

  const totalPages = needsTotalPages ? calculateTotalPages() : undefined;
  const allPages: EditorLayoutPage[] = [];

  for (const section of sections) {
    const contentWidth = getPageContentWidth(section.pageSettings);
    const sectionHeaderBlocks = section.header
      ? projectHeaderFooterBlocks(
          section.header,
          undefined,
          totalPages,
          measuredHeights,
          measuredParagraphLayouts,
          document.styles,
          contentWidth,
        )
      : undefined;
    const sectionFooterBlocks = section.footer
      ? projectHeaderFooterBlocks(
          section.footer,
          undefined,
          totalPages,
          measuredHeights,
          measuredParagraphLayouts,
          document.styles,
          contentWidth,
        )
      : undefined;
    const sectionMetrics = resolveEffectiveVerticalMetrics(
      section.pageSettings,
      sectionHeaderBlocks,
      sectionFooterBlocks,
    );
    const pageHeight = maxPageHeightOverride ?? sectionMetrics.contentHeight;
    const isContinuous = section.breakType === "continuous" && allPages.length > 0;
    
    const sectionPages = projectBlocksLayout(
      section.blocks,
      section.pageSettings,
      pageHeight,
      measuredHeights,
      measuredParagraphLayouts,
      document.styles,
      isContinuous ? allPages.length - 1 : allPages.length,
      totalPages,
      isContinuous ? [allPages[allPages.length - 1]] : []
    );

    if (isContinuous) {
      allPages.pop();
    }

    for (const page of sectionPages) {
      const headerBlocks = section.header
        ? projectHeaderFooterBlocks(
            section.header,
            page.index,
            totalPages,
            measuredHeights,
            measuredParagraphLayouts,
            document.styles,
            getPageContentWidth(page.pageSettings),
          )
        : page.headerBlocks;
      const footerBlocks = section.footer
        ? projectHeaderFooterBlocks(
            section.footer,
            page.index,
            totalPages,
            measuredHeights,
            measuredParagraphLayouts,
            document.styles,
            getPageContentWidth(page.pageSettings),
          )
        : page.footerBlocks;

      const pageMetrics = resolveEffectiveVerticalMetrics(
        page.pageSettings,
        headerBlocks,
        footerBlocks,
      );
      page.headerBlocks = headerBlocks;
      page.footerBlocks = footerBlocks;
      page.bodyTop = pageMetrics.bodyTop;
      page.bodyBottom = pageMetrics.bodyBottom;
      page.maxHeight = maxPageHeightOverride ?? pageMetrics.contentHeight;
      allPages.push(page);
    }
  }

  return { pages: allPages };
}
