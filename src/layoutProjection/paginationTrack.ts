import type {
  EditorLayoutBlock,
  EditorLayoutPage,
  EditorLayoutParagraph,
  EditorNamedStyle,
  EditorPageSettings,
} from "@/core/model.js";
import type { ITextMeasurer } from "@/core/engine.js";

/**
 * Resolved per-run inputs shared by the paragraph and table block handlers.
 * Extracted from projectColumnTrackLayout so each handler takes a small bag
 * instead of the full {@link ProjectBlocksLayoutContext} (S2).
 */
export interface TrackLayoutParams {
  pageSettings: EditorPageSettings;
  contentWidth: number;
  measurer: ITextMeasurer;
  styles?: Record<string, EditorNamedStyle>;
  totalPages?: number;
  defaultTabStop?: number;
  measuredHeights?: Record<string, number>;
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>;
}

/**
 * Mutable cursor for laying blocks into a vertical sequence of "tracks" (one
 * physical page in single-column mode, one column in multi-column mode). Owns
 * the accumulating page list, the current track's blocks/height, and the
 * page-index / max-height / flush bookkeeping the block handlers share.
 *
 * Extracted from blocksPagination.ts so the paragraph and table pagination
 * loops mutate a single explicit object rather than a web of closures (S2).
 */
export class PaginationTrack {
  readonly pages: EditorLayoutPage[];
  blocks: EditorLayoutBlock[];
  height: number;

  constructor(
    private readonly pageOffset: number,
    private readonly maxPageHeight: number,
    private readonly reservedHeightByPageIndex: Map<number, number> | undefined,
    private readonly pageSettings: EditorPageSettings,
    existingPages: EditorLayoutPage[],
  ) {
    this.pages = [...existingPages];
    const currentPage = this.pages[this.pages.length - 1];
    this.blocks = currentPage ? [...currentPage.blocks] : [];
    this.height = currentPage ? currentPage.height : 0;
    if (currentPage) {
      this.pages.pop();
    }
  }

  /** Index of the track currently being filled. */
  get pageIndex(): number {
    return this.pageOffset + this.pages.length;
  }

  /** Usable height of a given page, net of any reserved (e.g. footnote) space. */
  maxHeightForPage(pageIndex: number): number {
    return Math.max(
      24,
      this.maxPageHeight -
        (this.reservedHeightByPageIndex?.get(pageIndex) ?? 0),
    );
  }

  /** Usable height of the track currently being filled. */
  get currentMaxHeight(): number {
    return this.maxHeightForPage(this.pageIndex);
  }

  /** Seals the current track into a page and starts a fresh, empty track. */
  flush(): void {
    if (this.blocks.length === 0 && this.pages.length > 0) {
      return;
    }

    const pageIndex = this.pageIndex;
    this.pages.push({
      id: `page:${pageIndex + 1}`,
      index: pageIndex,
      height: this.height,
      maxHeight: this.maxHeightForPage(pageIndex),
      blocks: this.blocks,
      pageSettings: this.pageSettings,
    });
    this.blocks = [];
    this.height = 0;
  }

  /** Flushes the trailing track and guarantees at least one page exists. */
  finalize(): EditorLayoutPage[] {
    this.flush();

    if (this.pages.length === 0) {
      const pageIndex = this.pageOffset;
      this.pages.push({
        id: `page:${pageIndex + 1}`,
        index: pageIndex,
        height: 0,
        maxHeight: this.maxHeightForPage(pageIndex),
        blocks: [],
        pageSettings: this.pageSettings,
      });
    }

    return this.pages;
  }
}
