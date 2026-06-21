import type { EditorLayoutPage } from "@/core/model.js";
import { getPageContentWidth } from "@/core/model.js";
import { domTextMeasurer } from "@/ui/textMeasurement.js";
import { getEffectiveParagraphStyle } from "./paragraphPagination.js";
import type { ProjectBlocksLayoutContext } from "./blocksPaginationTypes.js";
import { projectColumnedBlocksLayout } from "./columnFlow.js";
import { PaginationTrack, type TrackLayoutParams } from "./paginationTrack.js";
import { paginateParagraphBlock } from "./paragraphBlockPagination.js";
import { paginateTableBlock } from "./tableBlockPagination.js";

export type { ProjectBlocksLayoutContext } from "./blocksPaginationTypes.js";

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
    return projectColumnedBlocksLayout(
      context,
      columns.count,
      projectColumnTrackLayout,
    );
  }
  return projectColumnTrackLayout(context);
}

/**
 * Lays blocks into a vertical sequence of "tracks", each at most
 * `maxPageHeight` tall and `contentWidthOverride` (or full content) wide. In
 * single-column mode one track == one physical page; in multi-column mode each
 * track is one column and {@link projectColumnedBlocksLayout} groups them.
 *
 * This is just the driver: it owns the block loop and the page-break-before
 * check, delegating each block to {@link paginateParagraphBlock} or
 * {@link paginateTableBlock} against a shared {@link PaginationTrack} cursor.
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
  const contentWidth =
    contentWidthOverride ?? getPageContentWidth(pageSettings);

  const track = new PaginationTrack(
    pageOffset,
    maxPageHeight,
    reservedHeightByPageIndex,
    pageSettings,
    existingPages,
  );

  const params: TrackLayoutParams = {
    pageSettings,
    contentWidth,
    measurer,
    styles,
    totalPages,
    defaultTabStop,
    measuredHeights,
    measuredParagraphLayouts,
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const sourceBlock = blocks[index]!;
    const nextBlock = blocks[index + 1];

    if (
      track.blocks.length > 0 &&
      (sourceBlock.type === "paragraph"
        ? getEffectiveParagraphStyle(sourceBlock, styles).pageBreakBefore
        : sourceBlock.style?.pageBreakBefore)
    ) {
      track.flush();
    }

    if (sourceBlock.type === "paragraph") {
      paginateParagraphBlock(track, params, sourceBlock, nextBlock, index);
      continue;
    }

    paginateTableBlock(track, params, sourceBlock, index);
  }

  return track.finalize();
}
