import type {
  EditorLayoutBlock,
  EditorLayoutDocument,
  EditorLayoutPage,
  EditorLayoutParagraph,
  TableCellBlockPosition,
} from "@/core/model.js";

/**
 * Returns true when two projected paragraph layouts produce visually identical
 * output (same text, same line breaks, same vertical metrics). Reusing the
 * previous object reference lets downstream consumers (canvas paint, DOM
 * reconciliation) short-circuit work via cheap identity comparisons.
 */
export function areLayoutParagraphsEquivalentForRender(
  previous: EditorLayoutParagraph | undefined,
  next: EditorLayoutParagraph | undefined,
): boolean {
  if (previous === next) {
    return true;
  }
  if (!previous || !next) {
    return false;
  }
  if (
    previous.text !== next.text ||
    previous.startOffset !== next.startOffset ||
    previous.endOffset !== next.endOffset ||
    previous.lines.length !== next.lines.length
  ) {
    return false;
  }
  return next.lines.every((line, index): boolean => {
    const previousLine = previous.lines[index];
    return (
      previousLine !== undefined &&
      previousLine.startOffset === line.startOffset &&
      previousLine.endOffset === line.endOffset &&
      previousLine.top === line.top &&
      previousLine.height === line.height
    );
  });
}

export function canReuseLayoutBlock(
  previous: EditorLayoutBlock | undefined,
  next: EditorLayoutBlock,
): previous is EditorLayoutBlock {
  return Boolean(
    previous &&
    previous.blockId === next.blockId &&
    previous.sourceBlock === next.sourceBlock &&
    previous.estimatedHeight === next.estimatedHeight &&
    previous.tableSegment?.startRowIndex === next.tableSegment?.startRowIndex &&
    previous.tableSegment?.endRowIndex === next.tableSegment?.endRowIndex &&
    previous.tableSegment?.repeatedHeaderRowCount ===
      next.tableSegment?.repeatedHeaderRowCount &&
    sameNumberArray(
      previous.tableSegment?.startRowCellBlockStarts,
      next.tableSegment?.startRowCellBlockStarts,
    ) &&
    sameNumberArray(
      previous.tableSegment?.endRowCellBlockEnds,
      next.tableSegment?.endRowCellBlockEnds,
    ) &&
    sameTableCellBlockPositions(
      previous.tableSegment?.startRowCellBlockPositions,
      next.tableSegment?.startRowCellBlockPositions,
    ) &&
    sameTableCellBlockPositions(
      previous.tableSegment?.endRowCellBlockPositions,
      next.tableSegment?.endRowCellBlockPositions,
    ) &&
    areLayoutParagraphsEquivalentForRender(previous.layout, next.layout),
  );
}

function sameNumberArray(
  left: number[] | undefined,
  right: number[] | undefined,
): boolean {
  if ((left?.length ?? 0) !== (right?.length ?? 0)) return false;
  return (right ?? []).every(
    (value, index): boolean => left?.[index] === value,
  );
}

function sameTableCellBlockPositions(
  left: TableCellBlockPosition[] | undefined,
  right: TableCellBlockPosition[] | undefined,
): boolean {
  if ((left?.length ?? 0) !== (right?.length ?? 0)) return false;
  return (right ?? []).every((value, index): boolean => {
    const previous = left?.[index];
    return (
      previous?.blockIndex === value.blockIndex &&
      previous?.offset === value.offset
    );
  });
}

export function canReuseLayoutPage(
  previous: EditorLayoutPage | undefined,
  next: EditorLayoutPage,
): previous is EditorLayoutPage {
  const samePageSettings = Boolean(
    previous &&
    previous.pageSettings.width === next.pageSettings.width &&
    previous.pageSettings.height === next.pageSettings.height &&
    previous.pageSettings.orientation === next.pageSettings.orientation &&
    previous.pageSettings.margins.top === next.pageSettings.margins.top &&
    previous.pageSettings.margins.right === next.pageSettings.margins.right &&
    previous.pageSettings.margins.bottom === next.pageSettings.margins.bottom &&
    previous.pageSettings.margins.left === next.pageSettings.margins.left &&
    previous.pageSettings.margins.header === next.pageSettings.margins.header &&
    previous.pageSettings.margins.footer === next.pageSettings.margins.footer &&
    previous.pageSettings.margins.gutter === next.pageSettings.margins.gutter,
  );
  if (
    !previous ||
    previous.id !== next.id ||
    previous.index !== next.index ||
    previous.height !== next.height ||
    previous.maxHeight !== next.maxHeight ||
    !samePageSettings ||
    previous.bodyTop !== next.bodyTop ||
    previous.bodyBottom !== next.bodyBottom ||
    previous.headerTop !== next.headerTop ||
    previous.footerTop !== next.footerTop ||
    previous.footnoteTop !== next.footnoteTop ||
    previous.footnoteSeparatorTop !== next.footnoteSeparatorTop
  ) {
    return false;
  }

  const sameBlocks = (
    left?: EditorLayoutBlock[],
    right?: EditorLayoutBlock[],
  ): boolean => {
    if ((left?.length ?? 0) !== (right?.length ?? 0)) {
      return false;
    }
    return (right ?? []).every(
      (block, index): boolean => left?.[index] === block,
    );
  };

  const sameFootnoteReferences = (
    left?: string[],
    right?: string[],
  ): boolean => {
    if ((left?.length ?? 0) !== (right?.length ?? 0)) {
      return false;
    }
    return (right ?? []).every(
      (footnoteId, index): boolean => left?.[index] === footnoteId,
    );
  };

  return (
    sameBlocks(previous.blocks, next.blocks) &&
    sameBlocks(previous.headerBlocks, next.headerBlocks) &&
    sameBlocks(previous.footerBlocks, next.footerBlocks) &&
    sameBlocks(previous.footnoteBlocks, next.footnoteBlocks) &&
    sameFootnoteReferences(
      previous.footnoteReferenceIds,
      next.footnoteReferenceIds,
    )
  );
}

/**
 * Creates a stateful function that preserves object identity for projected
 * layout pages/blocks when their contents are unchanged. Pages whose blocks
 * are all reused will themselves be reused, so reactive consumers can skip
 * work on a per-page basis.
 *
 * Usage:
 *
 *     const stabilize = createLayoutIdentityStabilizer();
 *     const stableLayout = stabilize(projectDocumentLayout(...));
 */
export function createLayoutIdentityStabilizer() {
  let reusableLayoutBlocks = new Map<string, EditorLayoutBlock>();
  let reusableLayoutPages = new Map<string, EditorLayoutPage>();

  return function stabilize(
    layout: EditorLayoutDocument,
  ): EditorLayoutDocument {
    const nextBlockCache = new Map<string, EditorLayoutBlock>();
    const stabilizeBlocks = (
      blocks: EditorLayoutBlock[] | undefined,
    ): EditorLayoutBlock[] | undefined =>
      blocks?.map((block): EditorLayoutBlock => {
        const previous = reusableLayoutBlocks.get(block.blockId);
        const stable = canReuseLayoutBlock(previous, block) ? previous : block;
        nextBlockCache.set(stable.blockId, stable);
        return stable;
      });

    const pages = layout.pages.map((page): EditorLayoutPage => {
      const nextPage: EditorLayoutPage = {
        ...page,
        blocks: stabilizeBlocks(page.blocks) ?? [],
        headerBlocks: stabilizeBlocks(page.headerBlocks),
        footerBlocks: stabilizeBlocks(page.footerBlocks),
        footnoteBlocks: stabilizeBlocks(page.footnoteBlocks),
      };
      const previous = reusableLayoutPages.get(nextPage.id);
      if (canReuseLayoutPage(previous, nextPage)) {
        return previous;
      }
      return nextPage;
    });

    reusableLayoutBlocks = nextBlockCache;
    reusableLayoutPages = new Map(
      pages.map((page): [string, EditorLayoutPage] => [page.id, page]),
    );
    return { pages };
  };
}
