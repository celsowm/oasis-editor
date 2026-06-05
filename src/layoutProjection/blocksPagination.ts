import type {
  EditorBlockNode,
  EditorLayoutBlock,
  EditorLayoutPage,
  EditorLayoutParagraph,
  EditorNamedStyle,
  EditorPageSettings,
} from "../core/model.js";
import { getPageContentWidth } from "../core/model.js";
import type { ITextMeasurer } from "../core/engine.js";
import { domTextMeasurer } from "../ui/textMeasurement.js";
import {
  applyMeasuredLineGeometry,
  applyWidowOrphanControl,
  createParagraphSegmentLayout,
  estimateParagraphBlockHeight,
  getEffectiveParagraphStyle,
  getParagraphMeasuredHeight,
  getParagraphSegmentFitHeight,
  getParagraphSegmentHeight,
  getProjectedParagraphBlockHeight,
  isMeasuredLayoutCurrent,
  projectParagraphLayout,
} from "./paragraphPagination.js";
import {
  estimateTableBlockHeight,
  getRepeatableHeaderRowCount,
  getTableHeaderRowCount,
  getTableRowGroups,
  getTableSegmentHeight,
} from "./tablePagination.js";

export interface ProjectBlocksLayoutContext {
  blocks: EditorBlockNode[];
  pageSettings: EditorPageSettings;
  maxPageHeight: number;
  measuredHeights?: Record<string, number>;
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>;
  styles?: Record<string, EditorNamedStyle>;
  pageOffset?: number;
  totalPages?: number;
  existingPages?: EditorLayoutPage[];
  layoutMode?: "fast" | "wordParity";
  measurer?: ITextMeasurer;
  reservedHeightByPageIndex?: Map<number, number>;
}

export function projectBlocksLayout(
  context: ProjectBlocksLayoutContext,
): EditorLayoutPage[] {
  const {
    blocks,
    pageSettings,
    maxPageHeight,
    measuredHeights,
    measuredParagraphLayouts,
    styles,
    pageOffset = 0,
    totalPages,
    existingPages = [],
    layoutMode = "fast",
    measurer = domTextMeasurer,
    reservedHeightByPageIndex,
  } = context;
  const contentWidth = getPageContentWidth(pageSettings);
  const pages: EditorLayoutPage[] = [...existingPages];
  const currentPage = pages[pages.length - 1];
  let currentBlocks: EditorLayoutBlock[] = currentPage
    ? [...currentPage.blocks]
    : [];
  let currentHeight = currentPage ? currentPage.height : 0;

  const getCurrentPageIndex = () => pageOffset + pages.length;
  const getMaxHeightForPage = (pageIndex: number) =>
    Math.max(
      24,
      maxPageHeight - (reservedHeightByPageIndex?.get(pageIndex) ?? 0),
    );

  if (currentPage) {
    pages.pop();
  }

  const flushPage = () => {
    if (currentBlocks.length === 0 && pages.length > 0) {
      return;
    }

    const pageIndex = getCurrentPageIndex();
    const currentMaxHeight = getMaxHeightForPage(pageIndex);
    pages.push({
      id: `page:${pageIndex + 1}`,
      index: pageIndex,
      height: currentHeight,
      maxHeight: currentMaxHeight,
      blocks: currentBlocks,
      pageSettings,
    });
    currentBlocks = [];
    currentHeight = 0;
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const sourceBlock = blocks[index]!;
    const nextBlock = blocks[index + 1];

    if (
      currentBlocks.length > 0 &&
      (sourceBlock.type === "paragraph"
        ? getEffectiveParagraphStyle(sourceBlock, styles).pageBreakBefore
        : sourceBlock.style?.pageBreakBefore)
    ) {
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
        layoutMode,
        measurer,
      );
      const measuredParagraphLayout =
        measuredParagraphLayouts?.[sourceBlock.id];
      const paragraphLayout =
        measuredParagraphLayout &&
        isMeasuredLayoutCurrent(
          projectedParagraphLayout,
          measuredParagraphLayout,
        )
          ? applyMeasuredLineGeometry(
              projectedParagraphLayout,
              measuredParagraphLayout,
            )
          : projectedParagraphLayout;
      const paragraphTotalHeight =
        measuredHeights?.[sourceBlock.id] ??
        getProjectedParagraphBlockHeight(sourceBlock, paragraphLayout, styles);
      const paragraphStyle = getEffectiveParagraphStyle(sourceBlock, styles);
      const nextBlockHeight =
        nextBlock?.type === "paragraph"
          ? (measuredHeights?.[nextBlock.id] ??
            estimateParagraphBlockHeight(
              nextBlock,
              styles,
              contentWidth,
              layoutMode,
            ))
          : nextBlock
            ? (measuredHeights?.[nextBlock.id] ??
              estimateTableBlockHeight(
                nextBlock,
                styles,
                contentWidth,
                layoutMode,
              ))
            : 0;
      if (
        paragraphStyle.keepWithNext &&
        currentBlocks.length > 0 &&
        currentHeight + paragraphTotalHeight + nextBlockHeight >
          getMaxHeightForPage(getCurrentPageIndex()) &&
        paragraphTotalHeight + nextBlockHeight <=
          getMaxHeightForPage(getCurrentPageIndex())
      ) {
        flushPage();
      }

      if (
        paragraphStyle.keepLinesTogether &&
        paragraphTotalHeight <= getMaxHeightForPage(getCurrentPageIndex())
      ) {
        if (
          currentBlocks.length > 0 &&
          currentHeight + paragraphTotalHeight >
            getMaxHeightForPage(getCurrentPageIndex())
        ) {
          flushPage();
        }
        const segmentId = `${sourceBlock.id}:segment:0`;
        const measuredHeight = getParagraphMeasuredHeight(
          measuredHeights,
          sourceBlock.id,
          segmentId,
          true,
          paragraphTotalHeight,
        );
        currentBlocks.push({
          blockId: segmentId,
          sourceBlockId: sourceBlock.id,
          blockType: sourceBlock.type,
          paragraphId: sourceBlock.id,
          globalIndex: index,
          estimatedHeight: measuredHeight,
          layout: paragraphLayout,
          sourceBlock,
        });
        currentHeight += measuredHeight;
        continue;
      }

      let startLineIndex = 0;
      let segmentIndex = 0;
      while (startLineIndex < paragraphLayout.lines.length) {
        const remainingHeight =
          getMaxHeightForPage(getCurrentPageIndex()) - currentHeight;
        let lineEndIndex = startLineIndex;
        let segmentHeight = 0;

        while (lineEndIndex < paragraphLayout.lines.length) {
          const candidateLines = paragraphLayout.lines.slice(
            startLineIndex,
            lineEndIndex + 1,
          );
          const candidateHeight = getParagraphSegmentHeight(
            sourceBlock,
            candidateLines,
            startLineIndex === 0,
            lineEndIndex === paragraphLayout.lines.length - 1,
            styles,
          );
          const candidateFitHeight = getParagraphSegmentFitHeight(
            sourceBlock,
            candidateHeight,
            lineEndIndex === paragraphLayout.lines.length - 1,
            styles,
            layoutMode,
          );
          const tolerance = layoutMode === "wordParity" ? 1.5 : 0;
          if (
            candidateFitHeight > remainingHeight + tolerance &&
            lineEndIndex === startLineIndex &&
            currentBlocks.length > 0
          ) {
            break;
          }
          if (
            candidateFitHeight > remainingHeight + tolerance &&
            lineEndIndex > startLineIndex
          ) {
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
          lineEndIndex = Math.min(
            paragraphLayout.lines.length,
            startLineIndex + 1,
          );
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

        const segmentLayout = createParagraphSegmentLayout(
          paragraphLayout,
          startLineIndex,
          lineEndIndex,
        );
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
      measuredHeights?.[sourceBlock.id] ??
      estimateTableBlockHeight(sourceBlock, styles, contentWidth, layoutMode);
    const maxHeightForCurrentPage = getMaxHeightForPage(getCurrentPageIndex());
    if (
      sourceBlock.rows.length <= 1 ||
      currentHeight + tableHeight <= maxHeightForCurrentPage
    ) {
      if (
        currentBlocks.length > 0 &&
        currentHeight + tableHeight > maxHeightForCurrentPage
      ) {
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
      const remainingHeight =
        getMaxHeightForPage(getCurrentPageIndex()) - currentHeight;
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
          layoutMode,
          contentWidth,
        );
        if (
          candidateHeight > remainingHeight &&
          groupEndIndex === groupStartIndex &&
          currentBlocks.length > 0
        ) {
          break;
        }
        if (
          candidateHeight > remainingHeight &&
          groupEndIndex > groupStartIndex
        ) {
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
          layoutMode,
          contentWidth,
        );
      }

      const segmentId = `${sourceBlock.id}:segment:${segmentIndex}`;
      const measuredSegmentHeight =
        measuredHeights?.[segmentId] ?? segmentHeight;

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
  }

  flushPage();

  if (pages.length === 0) {
    const pageIndex = pageOffset;
    const currentMaxHeight = getMaxHeightForPage(pageIndex);
    pages.push({
      id: `page:${pageIndex + 1}`,
      index: pageIndex,
      height: 0,
      maxHeight: currentMaxHeight,
      blocks: [],
      pageSettings,
    });
  }

  return pages;
}
