import type { EditorTableNode, TableCellBlockPosition } from "@/core/model.js";
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
  const { contentWidth, measurer, styles, defaultTabStop, measuredHeights } =
    params;

  const tableHeight =
    measuredHeights?.[sourceBlock.id] ??
    estimateTableBlockHeight(
      sourceBlock,
      styles,
      contentWidth,
      measurer,
      defaultTabStop,
    );
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
  let segmentIndex = 0;
  let currentCellBlockPositions: TableCellBlockPosition[] | undefined;

  while (groupStartIndex < rowGroups.length) {
    const startRowIndex = rowGroups[groupStartIndex]!.startRowIndex;
    const repeatedHeaderRowCount = startRowIndex > 0 ? headerRowCount : 0;
    const remainingHeight = track.currentMaxHeight - track.height;

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
      const targetRow =
        sourceBlock.rows[rowGroups[groupEndIndex]!.startRowIndex]!;
      const isSplitCandidate = isSingleRowGroup && canSplitTableRow(targetRow);

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

    if (groupEndIndex === groupStartIndex && track.blocks.length > 0) {
      track.flush();
      continue;
    }

    if (groupEndIndex === groupStartIndex) {
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
        let ends = starts.map((start, cellIdx) =>
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
    const measuredSegmentHeight = measuredHeights?.[segmentId] ?? segmentHeight;

    const endRowIndex = rowGroups[groupEndIndex - 1]!.endRowIndexExclusive;

    track.blocks.push({
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
    track.height += measuredSegmentHeight;
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
      track.flush();
    }
  }
}
