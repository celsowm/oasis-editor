import type {
  EditorBlockNode,
  EditorLayoutBlock,
  EditorLayoutPage,
  EditorLayoutParagraph,
  EditorNamedStyle,
  EditorPageSettings,
  EditorTextBoxData,
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
  projectParagraphLayoutWithExclusions,
  shouldCollapseContextualSpacing,
} from "./paragraphPagination.js";
import {
  estimateTableBlockHeight,
  getRepeatableHeaderRowCount,
  getTableHeaderRowCount,
  getTableRowGroups,
  getTableSegmentHeight,
} from "./tablePagination.js";

const TEXT_BOX_AUTOFIT_SAFETY_PX = 2;

function estimateTextBoxAutoFitHeight(
  textBox: EditorTextBoxData,
  styles: Record<string, EditorNamedStyle> | undefined,
  measurer: ITextMeasurer,
  pageIndex: number | undefined,
  totalPages: number | undefined,
  defaultTabStop: number | undefined,
): number {
  if (!textBox.body?.autoFit) {
    return textBox.height;
  }

  const padding = {
    left: textBox.body?.paddingLeft ?? 0,
    top: textBox.body?.paddingTop ?? 0,
    right: textBox.body?.paddingRight ?? 0,
    bottom: textBox.body?.paddingBottom ?? 0,
  };

  const innerWidth = Math.max(
    1,
    textBox.width - padding.left - padding.right,
  );

  const contentHeight = textBox.blocks.reduce((sum, block) => {
    if (block.type === "paragraph") {
      const layout = projectParagraphLayout(
        block,
        pageIndex,
        totalPages,
        styles,
        innerWidth,
        measurer,
        defaultTabStop,
      );

      return sum + getProjectedParagraphBlockHeight(block, layout, styles);
    }

    if (block.type === "table") {
      return (
        sum +
        estimateTableBlockHeight(
          block,
          styles,
          innerWidth,
          measurer,
          defaultTabStop,
        )
      );
    }

    return sum;
  }, 0);

  return Math.max(
    1,
    Math.ceil(
      contentHeight +
        padding.top +
        padding.bottom +
        TEXT_BOX_AUTOFIT_SAFETY_PX,
    ),
  );
}

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
  measurer?: ITextMeasurer;
  reservedHeightByPageIndex?: Map<number, number>;
  defaultTabStop?: number;
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
    measurer = domTextMeasurer,
    reservedHeightByPageIndex,
    defaultTabStop,
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
      const projectedParagraphLayout = projectParagraphLayoutWithExclusions(
        sourceBlock,
        pageSettings,
        contentWidth,
        measurer,
        pageIndex,
        totalPages,
        styles,
        defaultTabStop,
        (textBox) =>
          estimateTextBoxAutoFitHeight(
            textBox,
            styles,
            measurer,
            pageIndex,
            totalPages,
            defaultTabStop,
          ),
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
      let collapseWithPrevious = false;
      let contextualAdjustedPreviousBlock: EditorLayoutBlock | undefined;
      let contextualAdjustedAmount = 0;
      let paragraphTotalHeight =
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
              measurer,
              {
                allowSpacingBefore: !shouldCollapseContextualSpacing(
                  sourceBlock,
                  nextBlock,
                  styles,
                ),
              },
              defaultTabStop,
            ))
          : nextBlock
            ? (measuredHeights?.[nextBlock.id] ??
              estimateTableBlockHeight(
                nextBlock,
                styles,
                contentWidth,
                measurer,
                defaultTabStop,
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

      const previousBlock = currentBlocks.at(-1);
      const previousParagraph =
        previousBlock?.blockType === "paragraph" &&
        previousBlock.sourceBlock?.type === "paragraph"
          ? previousBlock.sourceBlock
          : undefined;
      collapseWithPrevious =
        currentBlocks.length > 0 &&
        shouldCollapseContextualSpacing(previousParagraph, sourceBlock, styles);
      if (collapseWithPrevious && previousBlock && previousParagraph) {
        const previousStyle = getEffectiveParagraphStyle(
          previousParagraph,
          styles,
        );
        const collapsedSpacingAfter = previousStyle.spacingAfter ?? 0;
        if (collapsedSpacingAfter > 0) {
          previousBlock.estimatedHeight = Math.max(
            0,
            previousBlock.estimatedHeight - collapsedSpacingAfter,
          );
          currentHeight = Math.max(0, currentHeight - collapsedSpacingAfter);
          contextualAdjustedPreviousBlock = previousBlock;
          contextualAdjustedAmount = collapsedSpacingAfter;
        }
        paragraphTotalHeight =
          measuredHeights?.[sourceBlock.id] ??
          getProjectedParagraphBlockHeight(
            sourceBlock,
            paragraphLayout,
            styles,
            false,
          );
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
        const rawMeasuredHeight = getParagraphMeasuredHeight(
          measuredHeights,
          sourceBlock.id,
          segmentId,
          true,
          paragraphTotalHeight,
        );
        const hasMeasuredHeight =
          measuredHeights?.[segmentId] !== undefined ||
          measuredHeights?.[sourceBlock.id] !== undefined;
        const measuredHeight = collapseWithPrevious && hasMeasuredHeight
          ? Math.max(
              0,
              rawMeasuredHeight - (paragraphStyle.spacingBefore ?? 0),
            )
          : rawMeasuredHeight;
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
            !collapseWithPrevious,
          );
          const candidateFitHeight = getParagraphSegmentFitHeight(
            sourceBlock,
            candidateHeight,
            lineEndIndex === paragraphLayout.lines.length - 1,
            styles,
          );
          const tolerance = 1.5;
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
          if (contextualAdjustedPreviousBlock && contextualAdjustedAmount > 0) {
            contextualAdjustedPreviousBlock.estimatedHeight +=
              contextualAdjustedAmount;
            currentHeight += contextualAdjustedAmount;
            contextualAdjustedPreviousBlock = undefined;
            contextualAdjustedAmount = 0;
          }
          collapseWithPrevious = false;
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
            !collapseWithPrevious,
          );
        }

        if (lineEndIndex < paragraphLayout.lines.length) {
          const widowOrphanAdjusted = applyWidowOrphanControl(
            sourceBlock,
            paragraphLayout.lines,
            startLineIndex,
            lineEndIndex,
            styles,
            !collapseWithPrevious,
            true,
            currentBlocks.length > 0,
          );
          lineEndIndex = widowOrphanAdjusted.endLineIndexExclusive;
          segmentHeight = widowOrphanAdjusted.height;

          if (lineEndIndex === startLineIndex) {
            // Orphan control pulled the paragraph's lone first line back; move
            // the whole paragraph to the next page.
            if (
              contextualAdjustedPreviousBlock &&
              contextualAdjustedAmount > 0
            ) {
              contextualAdjustedPreviousBlock.estimatedHeight +=
                contextualAdjustedAmount;
              currentHeight += contextualAdjustedAmount;
              contextualAdjustedPreviousBlock = undefined;
              contextualAdjustedAmount = 0;
            }
            collapseWithPrevious = false;
            flushPage();
            continue;
          }
        }

        const segmentLayout = createParagraphSegmentLayout(
          paragraphLayout,
          startLineIndex,
          lineEndIndex,
        );
        const segmentId = `${sourceBlock.id}:segment:${segmentIndex}`;
        const isWholeParagraphSegment =
          startLineIndex === 0 && lineEndIndex === paragraphLayout.lines.length;
        const rawMeasuredHeight = getParagraphMeasuredHeight(
          measuredHeights,
          sourceBlock.id,
          segmentId,
          isWholeParagraphSegment,
          segmentHeight,
        );
        const hasMeasuredHeight =
          measuredHeights?.[segmentId] !== undefined ||
          (isWholeParagraphSegment &&
            measuredHeights?.[sourceBlock.id] !== undefined);
        const measuredHeight =
          collapseWithPrevious && startLineIndex === 0 && hasMeasuredHeight
            ? Math.max(
                0,
                rawMeasuredHeight - (paragraphStyle.spacingBefore ?? 0),
              )
            : rawMeasuredHeight;
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
      estimateTableBlockHeight(
        sourceBlock,
        styles,
        contentWidth,
        measurer,
        defaultTabStop,
      );
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
