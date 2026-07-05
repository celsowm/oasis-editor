import {
  getParagraphText,
  resolveEffectiveParagraphStyle,
  type EditorEditingZone,
  type EditorLayoutBlock,
  type EditorLayoutPage,
  type EditorParagraphNode,
  type EditorState,
} from "@/core/model.js";
import { buildSegmentTable } from "@/core/tableLayout.js";
import { resolveFloatingTableRect } from "@/layoutProjection/floatingObjects.js";
import {
  buildCanvasTableLayout,
  resolveCanvasTableWidth,
  type CanvasTableCellLayoutEntry,
} from "./CanvasTableLayout.js";
import { resolveTextBoxRenderHeight } from "./textBoxRenderHeight.js";
import {
  layoutStackedGlyphs,
  projectRotatedSlot,
  type VerticalRenderMode,
} from "./verticalText.js";
import {
  collectFloatingImagesFromLines,
  collectFloatingTextBoxesFromLines,
} from "./canvasFloatingReaders.js";
import {
  collectInlineImagesFromLines,
  collectInlineTextBoxesFromLines,
} from "./canvasInlineReaders.js";
import { toSnapshotLines } from "./canvasSnapshotLines.js";
import type {
  CanvasLayoutSnapshot,
  CanvasSnapshotFloatingImage,
  CanvasSnapshotFloatingTable,
  CanvasSnapshotFloatingTextBox,
  CanvasSnapshotInlineImage,
  CanvasSnapshotInlineTextBox,
  CanvasSnapshotLine,
  CanvasSnapshotParagraph,
  CanvasSnapshotSlot,
} from "./canvasSnapshotTypes.js";

interface PageRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Stable references shared by the per-block walkers: the document state, the
 * current layout page and its unscaled screen rect, the paragraph-index map,
 * and the mutable accumulator arrays the walkers push into.
 */
export interface SnapshotWalkContext {
  state: EditorState;
  page: EditorLayoutPage;
  pageRect: PageRect;
  paragraphIndexById: Map<string, number>;
  snapshotParagraphs: CanvasSnapshotParagraph[];
  inlineImages: CanvasSnapshotInlineImage[];
  floatingImages: CanvasSnapshotFloatingImage[];
  inlineTextBoxes: CanvasSnapshotInlineTextBox[];
  floatingTextBoxes: CanvasSnapshotFloatingTextBox[];
  floatingTables: CanvasSnapshotFloatingTable[];
  unsupportedRegions: CanvasLayoutSnapshot["unsupportedRegions"];
}

interface BlockWalkArgs {
  zone: EditorEditingZone;
  block: EditorLayoutBlock;
  blockContentLeft: number;
  blockContentWidth: number;
  cursorY: number;
  startTop: number;
  blockFootnoteId: string | undefined;
}

/**
 * Build absolute-coordinate snapshot lines for a vertical-flow table-cell
 * paragraph, so click-to-caret and selection land on the painted glyph. Rotated
 * cells reuse the horizontal line layout under the same affine transform the
 * painter applies; stacked cells synthesize one slot per upright glyph via the
 * shared `layoutStackedGlyphs`. Returns a single synthesized line whose
 * bounding box covers all slots, so the generic line-band hit test passes.
 */
function buildVerticalCellSnapshotLines(options: {
  paragraph: EditorParagraphNode;
  paragraphLines: Array<{
    startOffset: number;
    endOffset: number;
    top: number;
    height: number;
    slots: Array<{ offset: number; left: number; top: number; height: number }>;
  }>;
  paragraphHeight: number;
  textLength: number;
  cell: CanvasTableCellLayoutEntry;
  verticalMode: VerticalRenderMode;
  state: EditorState;
  carry: { stackColumnRight: number; rotatedCursorY: number };
}): CanvasSnapshotLine[] {
  const box = {
    x: options.cell.contentLeft,
    y: options.cell.contentTop,
    width: options.cell.contentWidth,
    height: options.cell.contentHeight,
  };
  const slots: CanvasSnapshotSlot[] = [];

  if (options.verticalMode === "stack") {
    const { glyphs, endColumnRight } = layoutStackedGlyphs(
      options.paragraph,
      options.state,
      box,
      options.carry.stackColumnRight,
    );
    for (const glyph of glyphs) {
      slots.push({
        offset: glyph.offset,
        left: glyph.centerX,
        top: glyph.top,
        height: glyph.height,
      });
    }
    const last = glyphs[glyphs.length - 1];
    slots.push({
      offset: options.textLength,
      left: last ? last.centerX : box.x + box.width,
      top: last ? last.top + last.height : box.y,
      height: last ? last.height : 16,
    });
    options.carry.stackColumnRight = endColumnRight;
  } else {
    const mode = options.verticalMode as "rotate-cw" | "rotate-ccw";
    for (const line of options.paragraphLines) {
      let lastAdvance = 8;
      for (let i = 0; i < line.slots.length; i += 1) {
        const slot = line.slots[i]!;
        const next = line.slots[i + 1];
        const advance = next ? Math.max(1, next.left - slot.left) : lastAdvance;
        lastAdvance = advance;
        const projected = projectRotatedSlot(
          box,
          mode,
          slot.left,
          options.carry.rotatedCursorY + slot.top,
          advance,
          slot.height,
        );
        slots.push({
          offset: slot.offset,
          left: projected.left,
          top: projected.top,
          height: projected.height,
        });
      }
    }
    options.carry.rotatedCursorY += options.paragraphHeight;
  }

  if (slots.length === 0) {
    slots.push({
      offset: 0,
      left: box.x + box.width,
      top: box.y,
      height: 16,
    });
  }

  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const slot of slots) {
    top = Math.min(top, slot.top);
    bottom = Math.max(bottom, slot.top + slot.height);
  }

  return [
    {
      startOffset: 0,
      endOffset: options.textLength,
      top,
      height: Math.max(1, bottom - top),
      slots,
    },
  ];
}

/** Walks a paragraph layout block, appending its snapshot geometry + objects. */
export function collectSnapshotParagraph(
  ctx: SnapshotWalkContext,
  args: BlockWalkArgs,
): void {
  const {
    state,
    page,
    pageRect,
    paragraphIndexById,
    snapshotParagraphs,
    inlineImages,
    floatingImages,
    inlineTextBoxes,
    floatingTextBoxes,
  } = ctx;
  const {
    zone,
    block,
    blockContentLeft,
    blockContentWidth,
    cursorY,
    startTop,
    blockFootnoteId,
  } = args;
  if (block.sourceBlock.type !== "paragraph" || !block.layout) return;

  const paragraphNode = block.sourceBlock;
  const paragraphId = paragraphNode.id;
  const paragraphIndex = paragraphIndexById.get(paragraphId) ?? 0;
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraphNode.style,
    state.document.styles,
  );
  const spacingBefore =
    block.layout.startOffset === 0 ? (paragraphStyle.spacingBefore ?? 0) : 0;
  const lineTopOffset = cursorY + spacingBefore;
  snapshotParagraphs.push({
    paragraph: paragraphNode,
    paragraphId,
    paragraphIndex,
    zone,
    footnoteId: blockFootnoteId,
    pageIndex: page.index,
    startOffset: block.layout.startOffset ?? 0,
    endOffset: block.layout.endOffset ?? getParagraphText(paragraphNode).length,
    textLength: getParagraphText(paragraphNode).length,
    left: blockContentLeft,
    top: cursorY,
    width: blockContentWidth,
    height: Math.max(0, block.estimatedHeight),
    lines: toSnapshotLines(block.layout.lines, blockContentLeft, lineTopOffset),
  });
  inlineImages.push(
    ...collectInlineImagesFromLines({
      lines: block.layout.lines,
      paragraphId,
      paragraphIndex,
      zone,
      footnoteId: blockFootnoteId,
      pageIndex: page.index,
      lineTopOffset,
      lineLeftOffset: blockContentLeft,
    }),
  );
  floatingImages.push(
    ...collectFloatingImagesFromLines({
      lines: block.layout.lines,
      paragraphId,
      paragraphIndex,
      zone,
      footnoteId: blockFootnoteId,
      pageIndex: page.index,
      pageLeft: pageRect.left,
      pageTop: pageRect.top,
      contentLeft: blockContentLeft,
      contentTop: startTop,
      paragraphTop: lineTopOffset,
      lineTopOffset,
      lineLeftOffset: blockContentLeft,
    }),
  );
  inlineTextBoxes.push(
    ...collectInlineTextBoxesFromLines({
      lines: block.layout.lines,
      paragraphId,
      paragraphIndex,
      zone,
      footnoteId: blockFootnoteId,
      pageIndex: page.index,
      lineTopOffset,
      lineLeftOffset: blockContentLeft,
      resolveHeight: (textBox): number =>
        resolveTextBoxRenderHeight(textBox, state, page.index),
    }),
  );
  floatingTextBoxes.push(
    ...collectFloatingTextBoxesFromLines({
      lines: block.layout.lines,
      paragraphId,
      paragraphIndex,
      zone,
      footnoteId: blockFootnoteId,
      pageIndex: page.index,
      pageLeft: pageRect.left,
      pageTop: pageRect.top,
      contentLeft: blockContentLeft,
      contentTop: startTop,
      contentWidth: blockContentWidth,
      paragraphTop: lineTopOffset,
      lineTopOffset,
      lineLeftOffset: blockContentLeft,
      resolveHeight: (textBox): number =>
        resolveTextBoxRenderHeight(textBox, state, page.index),
    }),
  );
}

/** Walks a table layout block, appending its cell geometry + nested objects. */
export function collectSnapshotTable(
  ctx: SnapshotWalkContext,
  args: BlockWalkArgs,
): void {
  const {
    state,
    page,
    pageRect,
    paragraphIndexById,
    snapshotParagraphs,
    inlineImages,
    floatingImages,
    inlineTextBoxes,
    floatingTextBoxes,
    floatingTables,
    unsupportedRegions,
  } = ctx;
  const {
    zone,
    block,
    blockContentLeft,
    blockContentWidth,
    cursorY,
    startTop,
    blockFootnoteId,
  } = args;
  if (block.sourceBlock.type !== "table") return;

  const floating = block.sourceBlock.style?.floating;
  const floatingRect = floating
    ? resolveFloatingTableRect({
        floating,
        pageSettings: page.pageSettings,
        contentLeft: blockContentLeft - pageRect.left,
        contentTop: startTop - pageRect.top,
        contentWidth: blockContentWidth,
        anchorTop: cursorY - pageRect.top,
        width: resolveCanvasTableWidth(block.sourceBlock, blockContentWidth),
        height: block.floatingTableHeight ?? 1,
        pageIndex: page.index,
      })
    : undefined;
  if (floatingRect) {
    floatingRect.y += block.floatingTableOffsetY ?? 0;
  }
  if (floatingRect) {
    floatingTables.push({
      tableId: block.sourceBlock.id,
      zone,
      footnoteId: blockFootnoteId,
      pageIndex: page.index,
      left: pageRect.left + floatingRect.x,
      top: pageRect.top + floatingRect.y,
      width: floatingRect.width,
      height: floatingRect.height,
    });
  }
  const segmentTable = block.tableSegment
    ? buildSegmentTable(block.sourceBlock, block.tableSegment)
    : block.sourceBlock;
  const tableLayout = buildCanvasTableLayout({
    table: segmentTable,
    state,
    pageIndex: page.index,
    originX: floatingRect ? pageRect.left + floatingRect.x : blockContentLeft,
    originY: floatingRect ? pageRect.top + floatingRect.y : cursorY,
    contentWidth: blockContentWidth,
    estimatedHeight: block.floatingTableHeight ?? block.estimatedHeight,
  });
  for (const reason of tableLayout.unsupported) {
    unsupportedRegions.push({
      pageIndex: page.index,
      zone,
      footnoteId: blockFootnoteId,
      left: tableLayout.left,
      top: tableLayout.top,
      width: tableLayout.width,
      height: tableLayout.height,
      reason,
    });
  }
  // As linhas de cada segmento são re-indexadas a partir de 0 dentro do
  // segmento (ver buildSegmentTable). Traduzimos o índice local de volta
  // para o índice global da linha no documento, para que hit-testing de
  // resize e geometria de seleção casem com a tabela completa.
  const segment = block.tableSegment;
  const repeatedHeaderCount =
    segment && segment.startRowIndex > 0 ? segment.repeatedHeaderRowCount : 0;
  const toDocumentRowIndex = (localRowIndex: number): number => {
    if (!segment) return localRowIndex;
    if (localRowIndex < repeatedHeaderCount) return localRowIndex;
    return segment.startRowIndex + (localRowIndex - repeatedHeaderCount);
  };
  for (const cell of tableLayout.cells) {
    const isVerticalCell = cell.verticalMode !== "horizontal";
    // Carry shared across the cell's paragraphs: stacked columns and
    // rotated paragraphs both advance along the cell's long axis.
    const verticalCarry = {
      stackColumnRight: cell.contentLeft + cell.contentWidth,
      rotatedCursorY: 0,
    };
    for (const paragraphLayout of cell.paragraphs) {
      const paragraphId = paragraphLayout.paragraph.id;
      const paragraphIndex = paragraphIndexById.get(paragraphId) ?? 0;
      const textLength = getParagraphText(paragraphLayout.paragraph).length;
      const lines: CanvasSnapshotLine[] = isVerticalCell
        ? buildVerticalCellSnapshotLines({
            paragraph: paragraphLayout.paragraph,
            paragraphLines: paragraphLayout.lines,
            paragraphHeight: paragraphLayout.height,
            textLength,
            cell,
            verticalMode: cell.verticalMode,
            state,
            carry: verticalCarry,
          })
        : toSnapshotLines(
            paragraphLayout.lines,
            paragraphLayout.originX,
            paragraphLayout.originY,
          );
      snapshotParagraphs.push({
        paragraph: paragraphLayout.paragraph,
        paragraphId,
        paragraphIndex,
        zone,
        footnoteId: blockFootnoteId,
        pageIndex: page.index,
        startOffset: 0,
        endOffset: textLength,
        textLength,
        left: paragraphLayout.originX,
        top: paragraphLayout.originY,
        width: paragraphLayout.width,
        height: paragraphLayout.height,
        lines,
        verticalMode: isVerticalCell ? cell.verticalMode : undefined,
        tableCell: {
          tableId: cell.tableId,
          rowIndex: toDocumentRowIndex(cell.rowIndex),
          cellIndex: cell.cellIndex,
          left: cell.left,
          top: cell.top,
          width: cell.width,
          height: cell.height,
          anchorPosition: cell.anchorPosition,
          revisionId: cell.revision?.id,
        },
      });
      inlineImages.push(
        ...collectInlineImagesFromLines({
          lines: paragraphLayout.lines,
          paragraphId,
          paragraphIndex,
          zone,
          footnoteId: blockFootnoteId,
          pageIndex: page.index,
          lineTopOffset: paragraphLayout.originY,
          lineLeftOffset: paragraphLayout.originX,
        }),
      );
      floatingImages.push(
        ...collectFloatingImagesFromLines({
          lines: paragraphLayout.lines,
          paragraphId,
          paragraphIndex,
          zone,
          footnoteId: blockFootnoteId,
          pageIndex: page.index,
          pageLeft: pageRect.left,
          pageTop: pageRect.top,
          contentLeft: paragraphLayout.originX,
          contentTop: paragraphLayout.originY,
          paragraphTop: paragraphLayout.originY,
          lineTopOffset: paragraphLayout.originY,
          lineLeftOffset: paragraphLayout.originX,
        }),
      );
      inlineTextBoxes.push(
        ...collectInlineTextBoxesFromLines({
          lines: paragraphLayout.lines,
          paragraphId,
          paragraphIndex,
          zone,
          footnoteId: blockFootnoteId,
          pageIndex: page.index,
          lineTopOffset: paragraphLayout.originY,
          lineLeftOffset: paragraphLayout.originX,
          resolveHeight: (textBox): number =>
            resolveTextBoxRenderHeight(textBox, state, page.index),
        }),
      );
      floatingTextBoxes.push(
        ...collectFloatingTextBoxesFromLines({
          lines: paragraphLayout.lines,
          paragraphId,
          paragraphIndex,
          zone,
          footnoteId: blockFootnoteId,
          pageIndex: page.index,
          pageLeft: pageRect.left,
          pageTop: pageRect.top,
          contentLeft: paragraphLayout.originX,
          contentTop: paragraphLayout.originY,
          contentWidth: paragraphLayout.width,
          paragraphTop: paragraphLayout.originY,
          lineTopOffset: paragraphLayout.originY,
          lineLeftOffset: paragraphLayout.originX,
          resolveHeight: (textBox): number =>
            resolveTextBoxRenderHeight(textBox, state, page.index),
        }),
      );
    }
  }
}
