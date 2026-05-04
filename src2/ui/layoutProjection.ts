import type {
  Editor2BlockNode,
  Editor2CaretSlot,
  Editor2Document,
  Editor2LayoutBlock,
  Editor2LayoutDocument,
  Editor2LayoutFragment,
  Editor2LayoutFragmentChar,
  Editor2LayoutLine,
  Editor2LayoutPage,
  Editor2LayoutParagraph,
  Editor2PageSettings,
  Editor2ParagraphNode,
  Editor2TableNode,
} from "../core/model.js";
import {
  getDocumentSections,
  getPageContentHeight,
  getParagraphText,
} from "../core/model.js";
import { measureLinesFromRects, type CharRect } from "./caretGeometry.js";

const DEFAULT_FONT_SIZE = 20;
const DEFAULT_LINE_HEIGHT = 1.6;
const DEFAULT_PAGE_HEIGHT = 920;
const DEFAULT_PARAGRAPH_GAP = 10;

function sliceFragmentToRange(
  fragment: Editor2LayoutFragment,
  startOffset: number,
  endOffset: number,
): Editor2LayoutFragment | null {
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

function buildEstimatedLineRanges(textLength: number, charsPerLine: number): Array<{ start: number; end: number }> {
  if (textLength <= 0) {
    return [{ start: 0, end: 0 }];
  }

  const ranges: Array<{ start: number; end: number }> = [];
  let start = 0;
  while (start < textLength) {
    const end = Math.min(textLength, start + charsPerLine);
    ranges.push({ start, end });
    start = end;
  }
  return ranges;
}

export function projectParagraphLayout(
  paragraph: Editor2ParagraphNode,
  pageIndex?: number,
  totalPages?: number,
): Editor2LayoutParagraph {
  let paragraphOffset = 0;
  const fragments: Editor2LayoutFragment[] = paragraph.runs.map((run) => {
    let resolvedText = run.text;
    if (run.field) {
      if (run.field.type === "PAGE") {
        resolvedText = typeof pageIndex === "number" ? String(pageIndex + 1) : "1";
      } else if (run.field.type === "NUMPAGES") {
        resolvedText = typeof totalPages === "number" ? String(totalPages) : "1";
      }
    }

    const chars: Editor2LayoutFragmentChar[] = Array.from(resolvedText).map((char, index) => ({
      char,
      paragraphOffset: paragraphOffset + index,
      runOffset: index,
    }));

    const fragment: Editor2LayoutFragment = {
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

  const fontSize = estimateParagraphFontSize(paragraph);
  const lineHeight = estimateParagraphLineHeight(paragraph, fontSize);
  const charsPerLine = estimateCharsPerLine(paragraph);
  const lineRanges = buildEstimatedLineRanges(paragraphOffset, charsPerLine);
  const lines: Editor2LayoutLine[] = lineRanges.map((range, index) => ({
    paragraphId: paragraph.id,
    index,
    startOffset: range.start,
    endOffset: range.end,
    top: index * lineHeight,
    height: lineHeight,
    slots: Array.from({ length: range.end - range.start + 1 }, (_, slotIndex) => ({
      paragraphId: paragraph.id,
      offset: range.start + slotIndex,
      left: 0,
      top: index * lineHeight,
      height: lineHeight,
    })),
    fragments: fragments
      .map((fragment) => sliceFragmentToRange(fragment, range.start, range.end))
      .filter((fragment): fragment is Editor2LayoutFragment => fragment !== null),
  }));

  return {
    paragraphId: paragraph.id,
    text: fragments.map((f) => f.text).join(""),
    fragments,
    lines,
    startOffset: 0,
    endOffset: paragraphOffset,
  };
}

export function measureParagraphLayoutFromRects(
  paragraph: Editor2ParagraphNode,
  charRects: CharRect[],
): Editor2LayoutParagraph {
  const projected = projectParagraphLayout(paragraph);
  const measuredLines = measureLinesFromRects(charRects);

  return {
    ...projected,
    lines: measuredLines.map((line) => {
      const slots: Editor2CaretSlot[] = line.slots.map((slot) => ({
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
          .filter((fragment): fragment is Editor2LayoutFragment => fragment !== null),
      };
    }),
  };
}

function applyMeasuredLineGeometry(
  projected: Editor2LayoutParagraph,
  measured: Editor2LayoutParagraph,
): Editor2LayoutParagraph {
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
        .filter((fragment): fragment is Editor2LayoutFragment => fragment !== null),
    })),
  };
}

function isMeasuredLayoutCurrent(
  projected: Editor2LayoutParagraph,
  measured: Editor2LayoutParagraph,
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

  return true;
}

export function resolveClosestOffsetInMeasuredLayout(
  layout: Editor2LayoutParagraph,
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

function estimateParagraphFontSize(paragraph: Editor2ParagraphNode): number {
  const runFontSizes = paragraph.runs
    .map((run) => run.styles?.fontSize)
    .filter((fontSize): fontSize is number => typeof fontSize === "number" && Number.isFinite(fontSize));

  return runFontSizes.length > 0 ? Math.max(...runFontSizes) : DEFAULT_FONT_SIZE;
}

function estimateParagraphLineHeight(paragraph: Editor2ParagraphNode, fontSize: number): number {
  return (paragraph.style?.lineHeight ?? DEFAULT_LINE_HEIGHT) * fontSize;
}

function estimateCharsPerLine(paragraph: Editor2ParagraphNode): number {
  const indentPenalty = Math.floor((paragraph.style?.indentLeft ?? 0) / 16);
  const firstLinePenalty = Math.floor(Math.abs(paragraph.style?.indentFirstLine ?? 0) / 16);
  const listPenalty = paragraph.list ? 4 : 0;
  return Math.max(12, 48 - indentPenalty - firstLinePenalty - listPenalty);
}

function getParagraphSegmentHeight(
  paragraph: Editor2ParagraphNode,
  lines: Editor2LayoutLine[],
  isFirstSegment: boolean,
  isLastSegment: boolean,
): number {
  const lineHeights = lines.reduce((sum, line) => sum + line.height, 0);
  const spacingBefore = isFirstSegment ? paragraph.style?.spacingBefore ?? 0 : 0;
  const spacingAfter = isLastSegment ? paragraph.style?.spacingAfter ?? 0 : 0;
  return spacingBefore + spacingAfter + lineHeights + DEFAULT_PARAGRAPH_GAP;
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

function estimateTableRowHeight(row: Editor2TableNode["rows"][number]): number {
  const cellHeights = row.cells
    .filter((cell) => cell.vMerge !== "continue")
    .map((cell) =>
      cell.blocks.reduce((sum, paragraph) => sum + estimateParagraphBlockHeight(paragraph), 0),
    );

  return Math.max(...cellHeights, DEFAULT_FONT_SIZE * DEFAULT_LINE_HEIGHT) + 12;
}

function getTableHeaderRowCount(table: Editor2TableNode): number {
  let count = 0;
  for (const row of table.rows) {
    if (!row.isHeader) {
      break;
    }
    count += 1;
  }
  return count;
}

function getTableRowGroupEndExclusive(table: Editor2TableNode, rowIndex: number): number {
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

function getTableRowGroups(table: Editor2TableNode): Array<{ startRowIndex: number; endRowIndexExclusive: number }> {
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
  table: Editor2TableNode,
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
  table: Editor2TableNode,
  rowStartIndex: number,
  rowEndIndexExclusive: number,
  repeatedHeaderRowCount: number,
): number {
  const headerHeight =
    repeatedHeaderRowCount > 0
      ? table.rows
          .slice(0, repeatedHeaderRowCount)
          .reduce((sum, row) => sum + estimateTableRowHeight(row), 0)
      : 0;
  const bodyHeight = table.rows
    .slice(rowStartIndex, rowEndIndexExclusive)
    .reduce((sum, row) => sum + estimateTableRowHeight(row), 0);
  return headerHeight + bodyHeight + 16;
}

function createParagraphSegmentLayout(
  layout: Editor2LayoutParagraph,
  startLineIndex: number,
  endLineIndexExclusive: number,
): Editor2LayoutParagraph {
  const segmentLines = layout.lines.slice(startLineIndex, endLineIndexExclusive);
  const startOffset = segmentLines[0]?.startOffset ?? 0;
  const endOffset = segmentLines[segmentLines.length - 1]?.endOffset ?? startOffset;
  const topOffset = segmentLines[0]?.top ?? 0;

  return {
    paragraphId: layout.paragraphId,
    text: layout.text.slice(startOffset, endOffset),
    fragments: layout.fragments
      .map((fragment) => sliceFragmentToRange(fragment, startOffset, endOffset))
      .filter((fragment): fragment is Editor2LayoutFragment => fragment !== null),
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
  };
}

export function estimateParagraphBlockHeight(paragraph: Editor2ParagraphNode): number {
  const textLength = Math.max(1, getParagraphText(paragraph).length);
  const fontSize = estimateParagraphFontSize(paragraph);
  const lineHeightPx = estimateParagraphLineHeight(paragraph, fontSize);
  const charsPerLine = estimateCharsPerLine(paragraph);
  const lineCount = Math.max(1, Math.ceil(textLength / charsPerLine));
  const spacingBefore = paragraph.style?.spacingBefore ?? 0;
  const spacingAfter = paragraph.style?.spacingAfter ?? 0;

  return spacingBefore + spacingAfter + lineCount * lineHeightPx + DEFAULT_PARAGRAPH_GAP;
}

export function estimateTableBlockHeight(table: Editor2TableNode): number {
  return getTableSegmentHeight(table, 0, table.rows.length, 0);
}

function projectHeaderFooterBlocks(
  blocks: Editor2BlockNode[],
  pageIndex?: number,
  totalPages?: number,
  measuredHeights?: Record<string, number>,
  measuredParagraphLayouts?: Record<string, Editor2LayoutParagraph>,
): Editor2LayoutBlock[] {
  // Headers/Footers are projected as a single sequence of blocks, no pagination for now
  return blocks.map((block, index) => {
    if (block.type === "paragraph") {
      const layout = projectParagraphLayout(block, pageIndex, totalPages);
      // We ignore measured layouts for headers/footers in the first pass for simplicity
      return {
        blockId: block.id,
        sourceBlockId: block.id,
        blockType: block.type,
        paragraphId: block.id,
        globalIndex: index,
        estimatedHeight: estimateParagraphBlockHeight(block),
        layout,
        sourceBlock: block,
      };
    }
    return {
      blockId: block.id,
      sourceBlockId: block.id,
      blockType: block.type,
      globalIndex: index,
      estimatedHeight: estimateTableBlockHeight(block),
      sourceBlock: block,
    };
  });
}

function projectBlocksLayout(
  blocks: Editor2BlockNode[],
  pageSettings: Editor2PageSettings,
  maxPageHeight: number,
  measuredHeights?: Record<string, number>,
  measuredParagraphLayouts?: Record<string, Editor2LayoutParagraph>,
  pageOffset = 0,
  totalPages?: number,
  existingPages: Editor2LayoutPage[] = [],
): Editor2LayoutPage[] {
  const pages: Editor2LayoutPage[] = [...existingPages];
  let currentPage = pages[pages.length - 1];
  let currentBlocks: Editor2LayoutBlock[] = currentPage ? [...currentPage.blocks] : [];
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
      const projectedParagraphLayout = projectParagraphLayout(sourceBlock, pageIndex, totalPages);
      const measuredParagraphLayout = measuredParagraphLayouts?.[sourceBlock.id];
      const paragraphLayout =
        measuredParagraphLayout && isMeasuredLayoutCurrent(projectedParagraphLayout, measuredParagraphLayout)
          ? applyMeasuredLineGeometry(projectedParagraphLayout, measuredParagraphLayout)
          : projectedParagraphLayout;
      const paragraphTotalHeight =
        measuredHeights?.[sourceBlock.id] ?? estimateParagraphBlockHeight(sourceBlock);
      const nextBlockHeight =
        nextBlock?.type === "paragraph"
          ? measuredHeights?.[nextBlock.id] ?? estimateParagraphBlockHeight(nextBlock)
          : nextBlock
            ? measuredHeights?.[nextBlock.id] ?? estimateTableBlockHeight(nextBlock)
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
          );
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

    const tableHeight = measuredHeights?.[sourceBlock.id] ?? estimateTableBlockHeight(sourceBlock);
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
  blocksOrDocument: Editor2BlockNode[] | Editor2Document,
  maxPageHeightOverride?: number,
  measuredHeights?: Record<string, number>,
  measuredParagraphLayouts?: Record<string, Editor2LayoutParagraph>,
): Editor2LayoutDocument {
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
    );
    return { pages };
  }

  const document = blocksOrDocument;
  const sections = getDocumentSections(document);
  
  const calculateTotalPages = () => {
    let currentTotal = 0;
    let activePages: Editor2LayoutPage[] = [];
    for (const section of sections) {
      const pageHeight = maxPageHeightOverride ?? getPageContentHeight(section.pageSettings);
      const isContinuous = section.breakType === "continuous" && activePages.length > 0;
      
      const sectionPages = projectBlocksLayout(
        section.blocks,
        section.pageSettings,
        pageHeight,
        measuredHeights,
        measuredParagraphLayouts,
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

  const totalPages = calculateTotalPages();
  const allPages: Editor2LayoutPage[] = [];

  for (const section of sections) {
    const pageHeight = maxPageHeightOverride ?? getPageContentHeight(section.pageSettings);
    const isContinuous = section.breakType === "continuous" && allPages.length > 0;
    
    const sectionPages = projectBlocksLayout(
      section.blocks,
      section.pageSettings,
      pageHeight,
      measuredHeights,
      measuredParagraphLayouts,
      isContinuous ? allPages.length - 1 : allPages.length,
      totalPages,
      isContinuous ? [allPages[allPages.length - 1]] : []
    );

    if (isContinuous) {
      allPages.pop();
    }

    for (const page of sectionPages) {
      const headerBlocks = section.header
        ? projectHeaderFooterBlocks(section.header, page.index, totalPages, measuredHeights, measuredParagraphLayouts)
        : page.headerBlocks;
      const footerBlocks = section.footer
        ? projectHeaderFooterBlocks(section.footer, page.index, totalPages, measuredHeights, measuredParagraphLayouts)
        : page.footerBlocks;

      page.headerBlocks = headerBlocks;
      page.footerBlocks = footerBlocks;
      allPages.push(page);
    }
  }

  return { pages: allPages };
}
