import type {
  EditorLayoutBlock,
  EditorTableNode,
  TableCellBlockPosition,
} from "@/core/model.js";
import {
  estimateTableBlockHeight,
  getRepeatableHeaderRowCount,
  getTableHeaderRowCount,
  getTableRowGroups,
  getTableSegmentHeight,
} from "./tablePagination.js";
import {
  buildRowSliceFromPositions,
  canSplitTableRow,
  findCellSplitEndPosition,
  hasPartialPositions,
  normalizeCellStartPositions,
  positionsFinishedRow,
  positionsProgressed,
  positionsToBlockIndexes,
} from "./tableRowSlicing.js";
import type { PaginationTrack, TrackLayoutParams } from "./paginationTrack.js";
import { resolveFloatingTableRect } from "./floatingObjects.js";
import { PX_PER_POINT } from "@/core/units.js";
import { getPageBodyTop } from "@/core/model.js";
import { paginateSegments } from "./paginationSegmentEngine.js";

function resolveFloatingTableWidth(
  table: EditorTableNode,
  contentWidth: number,
): number {
  const width = table.style?.width;
  if (typeof width === "number") return width * PX_PER_POINT;
  if (typeof width === "string" && width.endsWith("%")) {
    const percent = Number.parseFloat(width);
    if (Number.isFinite(percent)) return contentWidth * (percent / 100);
  }
  if (table.gridCols?.length) {
    return (
      table.gridCols.reduce((sum, value): number => sum + value, 0) *
      PX_PER_POINT
    );
  }
  return contentWidth;
}

/**
 * Lays a single table block into the track, splitting it across page breaks by
 * row groups and, where a row is splittable, by cell-block positions within a
 * row (with repeated header rows). Extracted from projectColumnTrackLayout.
 */
export function paginateTableBlock(
  track: PaginationTrack,
  params: TrackLayoutParams,
  sourceBlock: EditorTableNode,
  index: number,
): void {
  const {
    contentWidth,
    measurer,
    styles,
    defaultTabStop,
    measuredHeights,
    projectionContext,
  } = params;

  const tableHeight =
    measuredHeights?.[sourceBlock.id] ??
    estimateTableBlockHeight(
      sourceBlock,
      styles,
      contentWidth,
      measurer,
      defaultTabStop,
    );
  if (sourceBlock.style?.floating) {
    track.blocks.push({
      blockId: sourceBlock.id,
      sourceBlockId: sourceBlock.id,
      blockType: sourceBlock.type,
      globalIndex: index,
      estimatedHeight: 0,
      floatingTableHeight: tableHeight,
      sourceBlock,
    });
    const pageContentLeft =
      params.pageSettings.margins.left + params.pageSettings.margins.gutter;
    const pageContentTop = getPageBodyTop(params.pageSettings);
    const raw = resolveFloatingTableRect({
      floating: sourceBlock.style.floating,
      pageSettings: params.pageSettings,
      contentLeft: pageContentLeft,
      contentTop: pageContentTop,
      contentWidth,
      anchorTop: pageContentTop + track.height,
      width: resolveFloatingTableWidth(sourceBlock, contentWidth),
      height: tableHeight,
      pageIndex: track.pageIndex,
    });
    const exclusion = {
      x:
        raw.x -
        pageContentLeft -
        (sourceBlock.style.floating.distanceLeft ?? 0) * PX_PER_POINT,
      y:
        raw.y -
        pageContentTop -
        (sourceBlock.style.floating.distanceTop ?? 0) * PX_PER_POINT,
      width:
        raw.width +
        ((sourceBlock.style.floating.distanceLeft ?? 0) +
          (sourceBlock.style.floating.distanceRight ?? 0)) *
          PX_PER_POINT,
      height:
        raw.height +
        ((sourceBlock.style.floating.distanceTop ?? 0) +
          (sourceBlock.style.floating.distanceBottom ?? 0)) *
          PX_PER_POINT,
      wrap: "square",
      sourceRunId: `table:${sourceBlock.id}`,
    } as const;
    let collisionOffsetY = 0;
    if (sourceBlock.style.tblOverlap === "never") {
      for (const existing of track.floatingExclusions) {
        if (!existing.sourceRunId.startsWith("table:")) continue;
        const overlaps =
          exclusion.x < existing.x + existing.width &&
          exclusion.x + exclusion.width > existing.x &&
          exclusion.y + collisionOffsetY < existing.y + existing.height &&
          exclusion.y + collisionOffsetY + exclusion.height > existing.y;
        if (overlaps) {
          collisionOffsetY = Math.max(
            collisionOffsetY,
            existing.y + existing.height - exclusion.y,
          );
        }
      }
    }
    const layoutBlock = track.blocks.at(-1);
    if (layoutBlock && collisionOffsetY > 0) {
      layoutBlock.floatingTableOffsetY = collisionOffsetY;
    }
    track.floatingExclusions.push({
      ...exclusion,
      y: exclusion.y + collisionOffsetY,
    });
    return;
  }
  const maxHeightForCurrentPage = track.currentMaxHeight;
  const firstRow = sourceBlock.rows[0];
  const canSplitSingleRow = canSplitTableRow(firstRow);

  if (
    (!canSplitSingleRow && sourceBlock.rows.length <= 1) ||
    track.height + tableHeight <= maxHeightForCurrentPage
  ) {
    if (
      track.blocks.length > 0 &&
      track.height + tableHeight > maxHeightForCurrentPage
    ) {
      track.flush();
    }

    track.blocks.push({
      blockId: sourceBlock.id,
      sourceBlockId: sourceBlock.id,
      blockType: sourceBlock.type,
      globalIndex: index,
      estimatedHeight: tableHeight,
      sourceBlock,
    });
    track.height += tableHeight;
    return;
  }

  const rowGroups = getTableRowGroups(sourceBlock);
  const headerRowCount = getRepeatableHeaderRowCount(
    sourceBlock,
    getTableHeaderRowCount(sourceBlock),
    rowGroups,
  );
  let groupStartIndex = 0;
  let currentCellBlockPositions: TableCellBlockPosition[] | undefined;

  // Build a table segment layout block from the resolved group range / split info.
  const buildTableBlock = (
    segmentId: string,
    startRowIndex: number,
    groupEndIndex: number,
    repeatedHeaderRowCount: number,
    segmentHeight: number,
    splitEnds: number[] | undefined,
    splitEndPositions: TableCellBlockPosition[] | undefined,
    startCellPositions: TableCellBlockPosition[] | undefined,
  ): EditorLayoutBlock => {
    const endRowIndex = rowGroups[groupEndIndex - 1]!.endRowIndexExclusive;
    const measuredSegmentHeight = measuredHeights?.[segmentId] ?? segmentHeight;
    return {
      blockId: segmentId,
      sourceBlockId: sourceBlock.id,
      blockType: sourceBlock.type,
      globalIndex: index,
      estimatedHeight: measuredSegmentHeight,
      tableSegment: {
        startRowIndex,
        endRowIndex,
        repeatedHeaderRowCount,
        startRowCellBlockStarts: positionsToBlockIndexes(startCellPositions),
        endRowCellBlockEnds: splitEnds,
        startRowCellBlockPositions: hasPartialPositions(startCellPositions)
          ? startCellPositions
          : undefined,
        endRowCellBlockPositions: hasPartialPositions(splitEndPositions)
          ? splitEndPositions
          : undefined,
      },
      sourceBlock,
    };
  };

  // Advance groupStartIndex / currentCellBlockPositions after a segment is pushed.
  const advanceCursor = (
    groupEndIndex: number,
    isLastRowSplit: boolean,
    splitEnds: number[] | undefined,
    splitEndPositions: TableCellBlockPosition[] | undefined,
  ): void => {
    if (isLastRowSplit) {
      const lastRowIndex = rowGroups[groupEndIndex - 1]!.startRowIndex;
      const lastRow = sourceBlock.rows[lastRowIndex]!;
      const ends =
        splitEndPositions ??
        splitEnds?.map((blockIndex): { blockIndex: number } => ({
          blockIndex,
        })) ??
        [];
      if (positionsFinishedRow(lastRow, ends)) {
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
  };

  paginateSegments(track, sourceBlock.id, {
    hasMore: (): boolean => groupStartIndex < rowGroups.length,

    fit(segmentId, remaining): EditorLayoutBlock | null {
      const startRowIndex = rowGroups[groupStartIndex]!.startRowIndex;
      const repeatedHeaderRowCount = startRowIndex > 0 ? headerRowCount : 0;
      const startCellPositions = currentCellBlockPositions;

      let groupEndIndex = groupStartIndex;
      let segmentHeight = 0;
      let splitEnds: number[] | undefined;
      let splitEndPositions: TableCellBlockPosition[] | undefined;
      let isLastRowSplit = false;

      while (groupEndIndex < rowGroups.length) {
        const candidateEndRowIndex =
          rowGroups[groupEndIndex]!.endRowIndexExclusive;
        let candidateHeight = 0;

        if (groupEndIndex === groupStartIndex && currentCellBlockPositions) {
          const firstRow = sourceBlock.rows[startRowIndex]!;
          const starts = normalizeCellStartPositions(
            firstRow,
            currentCellBlockPositions,
            undefined,
          );
          const ends = firstRow.cells.map((cell): { blockIndex: number } => ({
            blockIndex: cell.blocks.length,
          }));
          const slicedFirstRow = buildRowSliceFromPositions(
            firstRow,
            starts,
            ends,
          );
          candidateHeight = getTableSegmentHeight(
            { ...sourceBlock, rows: [slicedFirstRow] },
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

        if (candidateHeight <= remaining) {
          segmentHeight = candidateHeight;
          groupEndIndex += 1;
          continue;
        }

        const isSingleRowGroup =
          candidateEndRowIndex === rowGroups[groupEndIndex]!.startRowIndex + 1;
        const targetRow =
          sourceBlock.rows[rowGroups[groupEndIndex]!.startRowIndex]!;
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
          const availableForSplitRow = remaining - precedingHeight;

          if (availableForSplitRow > 0) {
            const starts = normalizeCellStartPositions(
              targetRow,
              groupEndIndex === groupStartIndex
                ? currentCellBlockPositions
                : undefined,
              undefined,
            );
            const ends = targetRow.cells.map(
              (_, cellIdx): TableCellBlockPosition =>
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
                  projectionContext,
                ),
            );

            if (positionsProgressed(starts, ends)) {
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

      if (groupEndIndex === groupStartIndex) return null;

      const block = buildTableBlock(
        segmentId,
        startRowIndex,
        groupEndIndex,
        repeatedHeaderRowCount,
        segmentHeight,
        splitEnds,
        splitEndPositions,
        startCellPositions,
      );
      advanceCursor(
        groupEndIndex,
        isLastRowSplit,
        splitEnds,
        splitEndPositions,
      );
      return block;
    },

    force(segmentId): EditorLayoutBlock {
      const startRowIndex = rowGroups[groupStartIndex]!.startRowIndex;
      const repeatedHeaderRowCount = startRowIndex > 0 ? headerRowCount : 0;
      const startCellPositions = currentCellBlockPositions;

      let groupEndIndex = groupStartIndex;
      let segmentHeight = 0;
      let splitEnds: number[] | undefined;
      let splitEndPositions: TableCellBlockPosition[] | undefined;
      let isLastRowSplit = false;

      const targetRow = sourceBlock.rows[startRowIndex]!;
      const isSingleRowGroup =
        rowGroups[groupStartIndex]!.endRowIndexExclusive === startRowIndex + 1;
      const isSplitCandidate = isSingleRowGroup && canSplitTableRow(targetRow);

      if (isSplitCandidate) {
        const starts = normalizeCellStartPositions(
          targetRow,
          currentCellBlockPositions,
          undefined,
        );
        let ends = starts.map(
          (start, cellIdx): TableCellBlockPosition =>
            findCellSplitEndPosition(
              targetRow,
              cellIdx,
              start,
              track.currentMaxHeight,
              styles,
              measurer,
              defaultTabStop,
              contentWidth,
              sourceBlock,
              startRowIndex,
              projectionContext,
            ),
        );
        if (!positionsProgressed(starts, ends)) {
          ends = starts.map((start, cellIdx): { blockIndex: number } => ({
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

      const block = buildTableBlock(
        segmentId,
        startRowIndex,
        groupEndIndex,
        repeatedHeaderRowCount,
        segmentHeight,
        splitEnds,
        splitEndPositions,
        startCellPositions,
      );
      advanceCursor(
        groupEndIndex,
        isLastRowSplit,
        splitEnds,
        splitEndPositions,
      );
      return block;
    },
  });
}
