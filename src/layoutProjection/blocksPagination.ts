import type {
  EditorBlockNode,
  EditorLayoutBlock,
  EditorLayoutPage,
  EditorLayoutParagraph,
  EditorNamedStyle,
  EditorPageSettings,
  EditorParagraphNode,
  EditorTableNode,
  EditorTableRowNode,
  EditorTextBoxData,
  TableCellBlockPosition,
} from "@/core/model.js";
import { getPageContentWidth, getPageColumnRects } from "@/core/model.js";
import type { ITextMeasurer } from "@/core/engine.js";
import { domTextMeasurer } from "@/ui/textMeasurement.js";
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
  estimateTableRowHeight,
  getRepeatableHeaderRowCount,
  getTableHeaderRowCount,
  getTableRowGroups,
  getTableSegmentHeight,
} from "./tablePagination.js";

const TEXT_BOX_AUTOFIT_SAFETY_PX = 2;

function normalizeCellStartPositions(
  row: EditorTableRowNode,
  starts: TableCellBlockPosition[] | undefined,
  legacyStarts: number[] | undefined,
): TableCellBlockPosition[] {
  return row.cells.map((_, cellIdx) => ({
    blockIndex:
      starts?.[cellIdx]?.blockIndex ?? legacyStarts?.[cellIdx] ?? 0,
    offset: starts?.[cellIdx]?.offset,
  }));
}

function positionsToBlockIndexes(
  positions: TableCellBlockPosition[] | undefined,
): number[] | undefined {
  return positions?.map((position) => position.blockIndex);
}

function hasPartialPositions(
  positions: TableCellBlockPosition[] | undefined,
): boolean {
  return positions?.some((position) => (position.offset ?? 0) > 0) ?? false;
}

function getParagraphTextLength(paragraph: EditorParagraphNode): number {
  return paragraph.runs.reduce((sum, run) => sum + run.text.length, 0);
}

function sliceParagraphForTableSegment(
  paragraph: EditorParagraphNode,
  startOffset: number,
  endOffset: number,
): EditorParagraphNode {
  let cursor = 0;
  const runs = paragraph.runs.flatMap((run) => {
    const runStart = cursor;
    const runEnd = runStart + run.text.length;
    cursor = runEnd;
    const sliceStart = Math.max(startOffset, runStart);
    const sliceEnd = Math.min(endOffset, runEnd);
    if (sliceEnd <= sliceStart) return [];
    return [
      {
        ...run,
        id: `${run.id}:slice:${sliceStart - runStart}:${sliceEnd - runStart}`,
        text: run.text.slice(sliceStart - runStart, sliceEnd - runStart),
      },
    ];
  });
  return {
    ...paragraph,
    runs: runs.length > 0 ? runs : [{ id: `${paragraph.id}:empty`, text: "" }],
  };
}

function sliceCellBlocksForTableSegment(
  blocks: EditorParagraphNode[],
  start: TableCellBlockPosition,
  end: TableCellBlockPosition,
): EditorParagraphNode[] {
  const result: EditorParagraphNode[] = [];
  const endExclusive =
    end.offset !== undefined ? end.blockIndex + 1 : end.blockIndex;
  for (let index = start.blockIndex; index < endExclusive; index += 1) {
    const paragraph = blocks[index];
    if (!paragraph) continue;
    const paragraphLength = getParagraphTextLength(paragraph);
    const startOffset =
      index === start.blockIndex ? (start.offset ?? 0) : 0;
    const endOffset =
      index === end.blockIndex
        ? (end.offset ?? paragraphLength)
        : paragraphLength;
    if (startOffset <= 0 && endOffset >= paragraphLength) {
      result.push(paragraph);
    } else if (endOffset > startOffset) {
      result.push(
        sliceParagraphForTableSegment(paragraph, startOffset, endOffset),
      );
    }
  }
  return result;
}

function buildRowSliceFromPositions(
  row: EditorTableRowNode,
  starts: TableCellBlockPosition[],
  ends: TableCellBlockPosition[],
): EditorTableRowNode {
  return {
    ...row,
    cells: row.cells.map((cell, cellIdx) => ({
      ...cell,
      blocks: sliceCellBlocksForTableSegment(
        cell.blocks,
        starts[cellIdx] ?? { blockIndex: 0 },
        ends[cellIdx] ?? { blockIndex: cell.blocks.length },
      ),
    })),
  };
}

function estimateSingleCellRowSliceHeight(
  row: EditorTableRowNode,
  cellIndex: number,
  start: TableCellBlockPosition,
  end: TableCellBlockPosition,
  styles: Record<string, EditorNamedStyle> | undefined,
  measurer: ITextMeasurer,
  defaultTabStop: number | undefined,
  contentWidth: number | undefined,
  table: EditorTableNode,
  rowIndex: number,
): number {
  const starts = row.cells.map((_, idx) =>
    idx === cellIndex ? start : { blockIndex: 0 },
  );
  const ends = row.cells.map((cell, idx) =>
    idx === cellIndex ? end : { blockIndex: 0 },
  );
  return estimateTableRowHeight(
    buildRowSliceFromPositions(row, starts, ends),
    styles,
    measurer,
    defaultTabStop,
    contentWidth,
    table,
    rowIndex,
  );
}

function findCellSplitEndPosition(
  row: EditorTableRowNode,
  cellIndex: number,
  start: TableCellBlockPosition,
  availableHeight: number,
  styles: Record<string, EditorNamedStyle> | undefined,
  measurer: ITextMeasurer,
  defaultTabStop: number | undefined,
  contentWidth: number | undefined,
  table: EditorTableNode,
  rowIndex: number,
): TableCellBlockPosition {
  const cell = row.cells[cellIndex];
  if (!cell) return start;
  const limit = cell.blocks.length;
  let best: TableCellBlockPosition = { blockIndex: start.blockIndex };

  for (
    let blockIndex = start.blockIndex + 1;
    blockIndex <= limit;
    blockIndex += 1
  ) {
    const end = { blockIndex };
    const height = estimateSingleCellRowSliceHeight(
      row,
      cellIndex,
      start,
      end,
      styles,
      measurer,
      defaultTabStop,
      contentWidth,
      table,
      rowIndex,
    );
    if (height <= availableHeight) {
      best = end;
    } else {
      break;
    }
  }

  if (best.blockIndex > start.blockIndex) {
    return best;
  }

  const paragraph = cell.blocks[start.blockIndex];
  if (!paragraph) return best;
  const paragraphLength = getParagraphTextLength(paragraph);
  const startOffset = start.offset ?? 0;
  const layout = projectParagraphLayout(
    paragraph,
    undefined,
    undefined,
    styles,
    contentWidth,
    measurer,
    defaultTabStop,
  );
  for (const line of layout.lines) {
    if (line.endOffset <= startOffset || line.endOffset >= paragraphLength) {
      continue;
    }
    const end = { blockIndex: start.blockIndex, offset: line.endOffset };
    const height = estimateSingleCellRowSliceHeight(
      row,
      cellIndex,
      start,
      end,
      styles,
      measurer,
      defaultTabStop,
      contentWidth,
      table,
      rowIndex,
    );
    if (height <= availableHeight) {
      best = end;
    } else {
      break;
    }
  }
  return best;
}

function canSplitTableRow(row: EditorTableRowNode | undefined): boolean {
  if (!row || row.isHeader || row.style?.cantSplit === true) {
    return false;
  }
  return row.cells.some((cell) => {
    if (cell.vMerge || (cell.rowSpan ?? 1) > 1) return false;
    if (cell.style?.textDirection) return false;
    return cell.blocks.some((paragraph) => {
      if (paragraph.style?.textDirection) return false;
      return getParagraphTextLength(paragraph) > 0;
    });
  });
}

function positionsProgressed(
  starts: TableCellBlockPosition[],
  ends: TableCellBlockPosition[],
): boolean {
  return ends.some((end, index) => {
    const start = starts[index] ?? { blockIndex: 0 };
    return (
      end.blockIndex > start.blockIndex ||
      (end.blockIndex === start.blockIndex &&
        (end.offset ?? 0) > (start.offset ?? 0))
    );
  });
}

function positionsFinishedRow(
  row: EditorTableRowNode,
  ends: TableCellBlockPosition[],
): boolean {
  return row.cells.every(
    (cell, cellIdx) => (ends[cellIdx]?.blockIndex ?? 0) >= cell.blocks.length,
  );
}

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

  const innerWidth = Math.max(1, textBox.width - padding.left - padding.right);

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
      contentHeight + padding.top + padding.bottom + TEXT_BOX_AUTOFIT_SAFETY_PX,
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
  /**
   * Overrides the line-wrapping width (default: full page content width). Used
   * by the multi-column flow to wrap at a single column's width.
   */
  contentWidthOverride?: number;
}

/**
 * Entry point used by section pagination. Dispatches to the multi-column flow
 * when the page declares `columns.count > 1`, otherwise runs the standard
 * single-column track layout.
 */
export function projectBlocksLayout(
  context: ProjectBlocksLayoutContext,
): EditorLayoutPage[] {
  const columns = context.pageSettings.columns;
  if (columns && columns.count > 1) {
    return projectColumnedBlocksLayout(context, columns.count);
  }
  return projectColumnTrackLayout(context);
}

/**
 * Lays blocks into a vertical sequence of "tracks", each at most
 * `maxPageHeight` tall and `contentWidthOverride` (or full content) wide. In
 * single-column mode one track == one physical page; in multi-column mode each
 * track is one column and {@link projectColumnedBlocksLayout} groups them.
 */
function projectColumnTrackLayout(
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
    contentWidthOverride,
  } = context;
  const contentWidth = contentWidthOverride ?? getPageContentWidth(pageSettings);
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
        const measuredHeight =
          collapseWithPrevious && hasMeasuredHeight
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
    const firstRow = sourceBlock.rows[0];
    const canSplitSingleRow = canSplitTableRow(firstRow);

    if (
      (!canSplitSingleRow && sourceBlock.rows.length <= 1) ||
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
    let currentCellBlockPositions: TableCellBlockPosition[] | undefined;

    while (groupStartIndex < rowGroups.length) {
      const startRowIndex = rowGroups[groupStartIndex]!.startRowIndex;
      const repeatedHeaderRowCount = startRowIndex > 0 ? headerRowCount : 0;
      const remainingHeight =
        getMaxHeightForPage(getCurrentPageIndex()) - currentHeight;

      let groupEndIndex = groupStartIndex;
      let segmentHeight = 0;
      let splitEnds: number[] | undefined;
      let splitEndPositions: TableCellBlockPosition[] | undefined;
      let isLastRowSplit = false;

      while (groupEndIndex < rowGroups.length) {
        const candidateEndRowIndex = rowGroups[groupEndIndex]!.endRowIndexExclusive;
        let candidateHeight = 0;

        if (groupEndIndex === groupStartIndex && currentCellBlockPositions) {
          const firstRow = sourceBlock.rows[startRowIndex]!;
          const starts = normalizeCellStartPositions(
            firstRow,
            currentCellBlockPositions,
            undefined,
          );
          const ends = firstRow.cells.map((cell) => ({
            blockIndex: cell.blocks.length,
          }));
          const slicedFirstRow = buildRowSliceFromPositions(
            firstRow,
            starts,
            ends,
          );
          candidateHeight = getTableSegmentHeight(
            {
              ...sourceBlock,
              rows: [slicedFirstRow],
            },
            0,
            1,
            repeatedHeaderRowCount,
            styles,
            contentWidth,
            measurer,
            defaultTabStop,
          );
        } else {
          candidateHeight = getTableSegmentHeight(
            sourceBlock,
            startRowIndex,
            candidateEndRowIndex,
            repeatedHeaderRowCount,
            styles,
            contentWidth,
            measurer,
            defaultTabStop,
          );
        }

        if (candidateHeight <= remainingHeight) {
          segmentHeight = candidateHeight;
          groupEndIndex += 1;
          continue;
        }

        const isSingleRowGroup =
          candidateEndRowIndex === rowGroups[groupEndIndex]!.startRowIndex + 1;
        const targetRow = sourceBlock.rows[rowGroups[groupEndIndex]!.startRowIndex]!;
        const isSplitCandidate =
          isSingleRowGroup && canSplitTableRow(targetRow);

        if (isSplitCandidate) {
          const precedingHeight =
            groupEndIndex > groupStartIndex
              ? getTableSegmentHeight(
                  sourceBlock,
                  startRowIndex,
                  rowGroups[groupEndIndex]!.startRowIndex,
                  repeatedHeaderRowCount,
                  styles,
                  contentWidth,
                  measurer,
                  defaultTabStop,
                )
              : 0;
          const availableForSplitRow = remainingHeight - precedingHeight;

          if (availableForSplitRow > 0) {
            const starts = normalizeCellStartPositions(
              targetRow,
              groupEndIndex === groupStartIndex
                ? currentCellBlockPositions
                : undefined,
              undefined,
            );
            const ends = targetRow.cells.map((_, cellIdx) =>
              findCellSplitEndPosition(
                targetRow,
                cellIdx,
                starts[cellIdx] ?? { blockIndex: 0 },
                availableForSplitRow,
                styles,
                measurer,
                defaultTabStop,
                contentWidth,
                sourceBlock,
                rowGroups[groupEndIndex]!.startRowIndex,
              ),
            );

            const canProgress = positionsProgressed(starts, ends);

            if (canProgress) {
              splitEnds = positionsToBlockIndexes(ends);
              isLastRowSplit = true;

              const slicedLastRow = buildRowSliceFromPositions(
                targetRow,
                starts,
                ends,
              );
              const segmentRows = [
                ...sourceBlock.rows.slice(
                  startRowIndex,
                  rowGroups[groupEndIndex]!.startRowIndex,
                ),
                slicedLastRow,
              ];
              segmentHeight = getTableSegmentHeight(
                { ...sourceBlock, rows: segmentRows },
                0,
                segmentRows.length,
                repeatedHeaderRowCount,
                styles,
                contentWidth,
                measurer,
                defaultTabStop,
              );
              splitEndPositions = ends;
              groupEndIndex += 1;
              break;
            }
          }
        }

        break;
      }

      if (groupEndIndex === groupStartIndex && currentBlocks.length > 0) {
        flushPage();
        continue;
      }

      if (groupEndIndex === groupStartIndex) {
        const targetRow = sourceBlock.rows[startRowIndex]!;
        const isSingleRowGroup =
          rowGroups[groupStartIndex]!.endRowIndexExclusive === startRowIndex + 1;
        const isSplitCandidate =
          isSingleRowGroup && canSplitTableRow(targetRow);

        if (isSplitCandidate) {
          const starts = normalizeCellStartPositions(
            targetRow,
            currentCellBlockPositions,
            undefined,
          );
          let ends = starts.map((start, cellIdx) =>
            findCellSplitEndPosition(
              targetRow,
              cellIdx,
              start,
              getMaxHeightForPage(getCurrentPageIndex()),
              styles,
              measurer,
              defaultTabStop,
              contentWidth,
              sourceBlock,
              startRowIndex,
            ),
          );
          if (!positionsProgressed(starts, ends)) {
            ends = starts.map((start, cellIdx) => ({
              blockIndex: Math.min(
                targetRow.cells[cellIdx]!.blocks.length,
                start.blockIndex + 1,
              ),
            }));
          }

          splitEnds = positionsToBlockIndexes(ends);
          splitEndPositions = ends;
          isLastRowSplit = true;

          const slicedLastRow = buildRowSliceFromPositions(
            targetRow,
            starts,
            ends,
          );
          segmentHeight = getTableSegmentHeight(
            { ...sourceBlock, rows: [slicedLastRow] },
            0,
            1,
            repeatedHeaderRowCount,
            styles,
            contentWidth,
            measurer,
            defaultTabStop,
          );
          groupEndIndex += 1;
        } else {
          groupEndIndex = rowGroups[groupStartIndex]!.endRowIndexExclusive;
          segmentHeight = getTableSegmentHeight(
            sourceBlock,
            startRowIndex,
            groupEndIndex,
            repeatedHeaderRowCount,
            styles,
            contentWidth,
            measurer,
            defaultTabStop,
          );
        }
      }

      const segmentId = `${sourceBlock.id}:segment:${segmentIndex}`;
      const measuredSegmentHeight =
        measuredHeights?.[segmentId] ?? segmentHeight;

      const endRowIndex = rowGroups[groupEndIndex - 1]!.endRowIndexExclusive;

      currentBlocks.push({
        blockId: segmentId,
        sourceBlockId: sourceBlock.id,
        blockType: sourceBlock.type,
        globalIndex: index,
        estimatedHeight: measuredSegmentHeight,
        tableSegment: {
          startRowIndex,
          endRowIndex,
          repeatedHeaderRowCount,
          startRowCellBlockStarts: positionsToBlockIndexes(
            currentCellBlockPositions,
          ),
          endRowCellBlockEnds: splitEnds,
          startRowCellBlockPositions: hasPartialPositions(
            currentCellBlockPositions,
          )
            ? currentCellBlockPositions
            : undefined,
          endRowCellBlockPositions: hasPartialPositions(splitEndPositions)
            ? splitEndPositions
            : undefined,
        },
        sourceBlock,
      });
      currentHeight += measuredSegmentHeight;
      segmentIndex += 1;

      if (isLastRowSplit) {
        const lastRowIndex = rowGroups[groupEndIndex - 1]!.startRowIndex;
        const lastRow = sourceBlock.rows[lastRowIndex]!;
        const ends =
          splitEndPositions ??
          splitEnds?.map((blockIndex) => ({ blockIndex })) ??
          [];
        const isFinished = positionsFinishedRow(lastRow, ends);
        if (isFinished) {
          currentCellBlockPositions = undefined;
          groupStartIndex = groupEndIndex;
        } else {
          currentCellBlockPositions = ends;
          groupStartIndex = groupEndIndex - 1;
        }
      } else {
        currentCellBlockPositions = undefined;
        groupStartIndex = groupEndIndex;
      }

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

const MAX_COLUMN_BALANCE_ITERATIONS = 100;

/**
 * Multi-column (newspaper) flow. Lays blocks into single-column tracks, then
 * groups every `count` consecutive tracks side-by-side onto one physical page,
 * tagging each block with its `columnIndex`. The final page of the section is
 * balanced so its columns are near-equal height, matching Word.
 */
function projectColumnedBlocksLayout(
  context: ProjectBlocksLayoutContext,
  count: number,
): EditorLayoutPage[] {
  const { pageSettings, maxPageHeight, pageOffset = 0, existingPages = [] } =
    context;
  const colWidth =
    getPageColumnRects(pageSettings)[0]?.width ??
    getPageContentWidth(pageSettings);

  const runTracks = (
    blocks: EditorBlockNode[],
    trackHeight: number,
  ): EditorLayoutPage[] =>
    projectColumnTrackLayout({
      ...context,
      blocks,
      maxPageHeight: trackHeight,
      contentWidthOverride: colWidth,
      pageOffset: 0,
      existingPages: [],
      reservedHeightByPageIndex: undefined,
    });

  // Pass 1: flow everything into full-height column tracks.
  let tracks = runTracks(context.blocks, maxPageHeight);

  // Balance the trailing physical page. Only when it starts at a clean block
  // boundary (no paragraph split spanning the page break) so re-flowing its
  // source blocks can't duplicate a partial paragraph.
  if (tracks.length > 1 || (tracks.length === 1 && count > 1)) {
    const trailingStart = Math.floor((tracks.length - 1) / count) * count;
    const trailingTracks = tracks.slice(trailingStart);
    const firstTrailingBlock = trailingTracks[0]?.blocks[0];
    const prevTrack =
      trailingStart > 0 ? tracks[trailingStart - 1] : undefined;
    const prevLastBlock = prevTrack?.blocks[prevTrack.blocks.length - 1];
    const cleanBoundary =
      firstTrailingBlock != null &&
      (prevLastBlock == null ||
        prevLastBlock.globalIndex !== firstTrailingBlock.globalIndex);

    if (cleanBoundary) {
      const startIndex = firstTrailingBlock.globalIndex;
      const sourceSubset = context.blocks.slice(startIndex);
      const sumHeight = trailingTracks.reduce(
        (sum, track) => sum + track.height,
        0,
      );
      let target = Math.max(24, Math.ceil(sumHeight / count));
      let balanced = runTracks(sourceSubset, target);
      for (
        let iteration = 0;
        balanced.length > count &&
        target < maxPageHeight &&
        iteration < MAX_COLUMN_BALANCE_ITERATIONS;
        iteration += 1
      ) {
        target = Math.min(maxPageHeight, Math.ceil(target * 1.05) + 4);
        balanced = runTracks(sourceSubset, target);
      }
      if (balanced.length <= count) {
        tracks = [...tracks.slice(0, trailingStart), ...balanced];
      }
    }
  }

  // Group tracks into physical pages, tagging column indices.
  const pages: EditorLayoutPage[] = [...existingPages];
  const startPageIndex =
    existingPages.length > 0
      ? existingPages[existingPages.length - 1]!.index + 1
      : pageOffset;
  const physicalPageCount = Math.ceil(tracks.length / count);
  for (let p = 0; p < physicalPageCount; p += 1) {
    const pageIndex = startPageIndex + p;
    const pageTracks = tracks.slice(p * count, p * count + count);
    const blocks: EditorLayoutBlock[] = [];
    let height = 0;
    pageTracks.forEach((track, columnIndex) => {
      for (const block of track.blocks) {
        block.columnIndex = columnIndex;
        blocks.push(block);
      }
      height = Math.max(height, track.height);
    });
    pages.push({
      id: `page:${pageIndex + 1}`,
      index: pageIndex,
      height,
      maxHeight: maxPageHeight,
      blocks,
      pageSettings,
    });
  }

  if (pages.length === 0) {
    pages.push({
      id: `page:${startPageIndex + 1}`,
      index: startPageIndex,
      height: 0,
      maxHeight: maxPageHeight,
      blocks: [],
      pageSettings,
    });
  }

  return pages;
}
