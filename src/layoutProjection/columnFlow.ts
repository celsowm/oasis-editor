import type {
  EditorBlockNode,
  EditorLayoutBlock,
  EditorLayoutPage,
} from "@/core/model.js";
import { getPageContentWidth, getPageColumnRects } from "@/core/model.js";
import type { ProjectBlocksLayoutContext } from "./blocksPaginationTypes.js";

const MAX_COLUMN_BALANCE_ITERATIONS = 100;

/**
 * Multi-column (newspaper) flow. Lays blocks into single-column tracks, then
 * groups every `count` consecutive tracks side-by-side onto one physical page,
 * tagging each block with its `columnIndex`. The final page of the section is
 * balanced so its columns are near-equal height, matching Word.
 *
 * The single-column track layout is injected as `runTrackLayout` so this module
 * does not import back into blocksPagination (which dispatches to it) — keeping
 * the recursion acyclic (S2).
 */
export function projectColumnedBlocksLayout(
  context: ProjectBlocksLayoutContext,
  count: number,
  runTrackLayout: (context: ProjectBlocksLayoutContext) => EditorLayoutPage[],
): EditorLayoutPage[] {
  const {
    pageSettings,
    maxPageHeight,
    pageOffset = 0,
    existingPages = [],
  } = context;
  const colWidth =
    getPageColumnRects(pageSettings)[0]?.width ??
    getPageContentWidth(pageSettings);

  const runTracks = (
    blocks: EditorBlockNode[],
    trackHeight: number,
  ): EditorLayoutPage[] =>
    runTrackLayout({
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
    const prevTrack = trailingStart > 0 ? tracks[trailingStart - 1] : undefined;
    const prevLastBlock = prevTrack?.blocks[prevTrack.blocks.length - 1];
    const cleanBoundary =
      firstTrailingBlock != null &&
      (prevLastBlock == null ||
        prevLastBlock.globalIndex !== firstTrailingBlock.globalIndex);

    if (cleanBoundary) {
      const startIndex = firstTrailingBlock.globalIndex;
      const sourceSubset = context.blocks.slice(startIndex);
      const sumHeight = trailingTracks.reduce(
        (sum, track): number => sum + track.height,
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
    pageTracks.forEach((track, columnIndex): void => {
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
