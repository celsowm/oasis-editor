import type {
  EditorBlockNode,
  EditorDocument,
  EditorLayoutBlock,
  EditorLayoutPage,
  EditorLayoutParagraph,
  EditorParagraphNode,
} from "@/core/model.js";
import {
  getBlockParagraphs,
  getPageBodyBottom,
  getPageBodyTop,
  getPageContentWidth,
  getParagraphText,
  getRunFootnoteReference,
} from "@/core/model.js";
import type { ITextMeasurer } from "@/core/engine.js";

export const FOOTNOTE_SEPARATOR_HEIGHT = 10;
export const FOOTNOTE_BLOCK_GAP = 2;
export const FOOTNOTE_MARKER_GUTTER_PX = 24;
export const MAX_FOOTNOTE_LAYOUT_ITERATIONS = 4;

export type HeaderFooterBlockProjector = (
  blocks: EditorBlockNode[],
  pageIndex?: number,
  totalPages?: number,
  measuredHeights?: Record<string, number>,
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>,
  styles?: EditorDocument["styles"],
  contentWidth?: number,
  measurer?: ITextMeasurer,
  defaultTabStop?: number,
) => EditorLayoutBlock[];

function getProjectedBlocksHeight(
  blocks: EditorLayoutBlock[] | undefined,
): number {
  if (!blocks || blocks.length === 0) {
    return 0;
  }
  return blocks.reduce((sum, block) => sum + block.estimatedHeight, 0);
}

function collectFootnoteReferencesFromBlock(
  block: EditorLayoutBlock,
): string[] {
  const result: string[] = [];
  const appendFromParagraph = (
    paragraph: EditorParagraphNode,
    startOffset: number,
    endOffset: number,
  ) => {
    let runStart = 0;
    for (const run of paragraph.runs) {
      const runEnd = runStart + run.text.length;
      const footnoteReference = getRunFootnoteReference(run);
      if (footnoteReference && runEnd > startOffset && runStart < endOffset) {
        result.push(footnoteReference.footnoteId);
      }
      runStart = runEnd;
    }
  };

  if (block.sourceBlock.type === "paragraph") {
    appendFromParagraph(
      block.sourceBlock,
      block.layout?.startOffset ?? 0,
      block.layout?.endOffset ?? getParagraphText(block.sourceBlock).length,
    );
    return result;
  }

  for (const paragraph of getBlockParagraphs(block.sourceBlock)) {
    appendFromParagraph(paragraph, 0, getParagraphText(paragraph).length);
  }
  return result;
}

export function collectPageFootnoteReferenceIds(
  page: EditorLayoutPage,
): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const block of page.blocks) {
    for (const footnoteId of collectFootnoteReferencesFromBlock(block)) {
      if (seen.has(footnoteId)) continue;
      seen.add(footnoteId);
      ids.push(footnoteId);
    }
  }
  return ids;
}

function projectFootnoteBlocksForPage(
  document: EditorDocument,
  footnoteReferenceIds: string[],
  page: EditorLayoutPage,
  totalPages: number | undefined,
  measuredHeights: Record<string, number> | undefined,
  measuredParagraphLayouts: Record<string, EditorLayoutParagraph> | undefined,
  measurer: ITextMeasurer,
  projectBlocks: HeaderFooterBlockProjector,
): EditorLayoutBlock[] {
  const contentWidth = Math.max(
    24,
    getPageContentWidth(page.pageSettings) - FOOTNOTE_MARKER_GUTTER_PX,
  );
  const blocks: EditorLayoutBlock[] = [];
  for (const footnoteId of footnoteReferenceIds) {
    const footnote = document.footnotes?.items?.[footnoteId];
    if (!footnote) continue;
    const projected = projectBlocks(
      footnote.blocks,
      page.index,
      totalPages,
      measuredHeights,
      measuredParagraphLayouts,
      document.styles,
      contentWidth,
      measurer,
      document.settings?.defaultTabStop,
    );
    for (const block of projected) {
      blocks.push({
        ...block,
        blockId: `${footnoteId}:${block.blockId}`,
      });
    }
  }
  return blocks;
}

export interface FootnotePaginationContext {
  document: EditorDocument;
  totalPages?: number;
  measuredHeights?: Record<string, number>;
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>;
  measurer: ITextMeasurer;
  projectBlocks: HeaderFooterBlockProjector;
}

export function buildFootnoteReservations(
  pages: EditorLayoutPage[],
  context: FootnotePaginationContext,
): Map<number, number> {
  const reservations = new Map<number, number>();
  for (const page of pages) {
    const footnoteReferenceIds = collectPageFootnoteReferenceIds(page);
    if (footnoteReferenceIds.length === 0) continue;
    const footnoteBlocks = projectFootnoteBlocksForPage(
      context.document,
      footnoteReferenceIds,
      page,
      context.totalPages,
      context.measuredHeights,
      context.measuredParagraphLayouts,
      context.measurer,
      context.projectBlocks,
    );
    if (footnoteBlocks.length === 0) continue;
    const blockGaps =
      Math.max(0, footnoteBlocks.length - 1) * FOOTNOTE_BLOCK_GAP;
    reservations.set(
      page.index,
      FOOTNOTE_SEPARATOR_HEIGHT +
        getProjectedBlocksHeight(footnoteBlocks) +
        blockGaps,
    );
  }
  return reservations;
}

export function reservationSignature(
  reservations: Map<number, number>,
): string {
  return [...reservations.entries()]
    .sort(([left], [right]) => left - right)
    .map(([pageIndex, height]) => `${pageIndex}:${Math.round(height)}`)
    .join("|");
}

export function applyFootnotesToPages(
  pages: EditorLayoutPage[],
  context: FootnotePaginationContext,
): EditorLayoutPage[] {
  return pages.map((page) => {
    const footnoteReferenceIds = collectPageFootnoteReferenceIds(page);
    if (footnoteReferenceIds.length === 0) {
      return {
        ...page,
        footnoteBlocks: undefined,
        footnoteReferenceIds: undefined,
        footnoteTop: undefined,
        footnoteSeparatorTop: undefined,
      };
    }
    const footnoteBlocks = projectFootnoteBlocksForPage(
      context.document,
      footnoteReferenceIds,
      page,
      context.totalPages,
      context.measuredHeights,
      context.measuredParagraphLayouts,
      context.measurer,
      context.projectBlocks,
    );
    const bodyBottom = page.bodyBottom ?? getPageBodyBottom(page.pageSettings);
    const footnoteSeparatorTop = Math.max(
      page.bodyTop ?? getPageBodyTop(page.pageSettings),
      bodyBottom,
    );
    const footnoteTop = footnoteSeparatorTop + FOOTNOTE_SEPARATOR_HEIGHT;
    return {
      ...page,
      footnoteBlocks,
      footnoteReferenceIds,
      footnoteSeparatorTop,
      footnoteTop,
      bodyBottom,
    };
  });
}
