import type { EditorLayoutBlock } from "@/core/model.js";
import type { PaginationTrack } from "./paginationTrack.js";

/**
 * Strategy interface for the generic "fit → push → flush" pagination engine.
 * Callers implement the domain-specific measurement and split decisions; the
 * engine owns the outer loop, segmentId generation, and track mutation.
 */
export interface PaginationSegmenter {
  /** True while there is more content left to place. */
  hasMore(): boolean;
  /**
   * Try to fit as much content as possible into `remaining` px on the current
   * page. Must advance the internal cursor on success so that `hasMore()`
   * reflects the new position. Returns `null` when nothing fits at all.
   */
  fit(segmentId: string, remaining: number): EditorLayoutBlock | null;
  /**
   * Force at least one content unit onto the current page regardless of height.
   * Called only when `fit` returned `null` and `track.blocks` is empty (i.e.
   * there is no prior content to push to a previous page first). Must advance
   * the internal cursor.
   */
  force?(segmentId: string): EditorLayoutBlock;
  /** Called just before `track.flush()` so the segmenter can undo side-effects. */
  onBeforeFlush?(): void;
  /**
   * Called just after the block has been pushed to `track.blocks` and
   * `track.height` has been updated.
   */
  onAfterPush?(block: EditorLayoutBlock, segmentIndex: number): void;
}

/**
 * Generic "fit segment → push layout block → advance cursor → flush" loop
 * shared by paragraph and table pagination. Both callers supply the
 * domain-specific fitting and split logic via {@link PaginationSegmenter}.
 *
 * Generates `${sourceId}:segment:N` as the `blockId` for each segment.
 */
export function paginateSegments(
  track: PaginationTrack,
  sourceId: string,
  segmenter: PaginationSegmenter,
): void {
  let segmentIndex = 0;
  while (segmenter.hasMore()) {
    const segmentId = `${sourceId}:segment:${segmentIndex}`;
    const remaining = track.currentMaxHeight - track.height;
    let block = segmenter.fit(segmentId, remaining);

    if (block === null && track.blocks.length > 0) {
      segmenter.onBeforeFlush?.();
      track.flush();
      continue;
    }
    if (block === null) {
      block = segmenter.force!(segmentId);
    }

    track.blocks.push(block);
    track.height += block.estimatedHeight;
    segmenter.onAfterPush?.(block, segmentIndex);
    segmentIndex += 1;

    if (segmenter.hasMore()) {
      track.flush();
    }
  }
}
