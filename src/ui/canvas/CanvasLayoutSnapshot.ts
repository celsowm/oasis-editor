import {
  getDocumentParagraphs,
  getPageBodyBottom,
  getPageBodyTop,
  getPageContentWidth,
  getPageHeaderZoneTop,
  getParagraphText,
  resolveEffectiveParagraphStyle,
  type EditorEditingZone,
  type EditorLayoutParagraph,
  type EditorParagraphNode,
  type EditorPosition,
  type EditorState,
  type EditorTextBoxData,
} from "../../core/model.js";
import { buildSegmentTable } from "../../core/tableLayout.js";
import { projectDocumentLayout } from "../../layoutProjection/index.js";
import { FOOTNOTE_MARKER_GUTTER_PX } from "../../layoutProjection/index.js";
import {
  buildCanvasTableLayout,
  type CanvasTableCellLayoutEntry,
  type CanvasUnsupportedReason,
} from "./CanvasTableLayout.js";
import { resolveTextBoxRenderHeight } from "./textBoxRenderHeight.js";
import {
  layoutStackedGlyphs,
  projectRotatedSlot,
  type VerticalRenderMode,
} from "./verticalText.js";

type ResolveTextBoxRenderHeight = (textBox: EditorTextBoxData) => number;

export interface CanvasSnapshotSlot {
  offset: number;
  left: number;
  top: number;
  height: number;
}

export interface CanvasSnapshotLine {
  startOffset: number;
  endOffset: number;
  top: number;
  height: number;
  slots: CanvasSnapshotSlot[];
}

export interface CanvasSnapshotTableCellInfo {
  tableId: string;
  rowIndex: number;
  cellIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
  anchorPosition: EditorPosition;
}

export interface CanvasSnapshotParagraph {
  paragraph: EditorParagraphNode;
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  startOffset: number;
  endOffset: number;
  textLength: number;
  left: number;
  top: number;
  width: number;
  height: number;
  lines: CanvasSnapshotLine[];
  tableCell?: CanvasSnapshotTableCellInfo;
  /** Set when the paragraph is painted with a vertical-text transform. */
  verticalMode?: VerticalRenderMode;
}

export interface CanvasSnapshotInlineImage {
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  startOffset: number;
  endOffset: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CanvasSnapshotFloatingTextBox {
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  startOffset: number;
  endOffset: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CanvasSnapshotInlineTextBox {
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  startOffset: number;
  endOffset: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CanvasSnapshotPage {
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
  bodyTop: number;
  bodyBottom: number;
  footerTop?: number;
  footnoteTop?: number;
  footnoteSeparatorTop?: number;
}

export interface CanvasLayoutSnapshot {
  surfaceRect: DOMRect;
  pages: CanvasSnapshotPage[];
  paragraphs: CanvasSnapshotParagraph[];
  paragraphsById: Map<string, CanvasSnapshotParagraph[]>;
  inlineImages: CanvasSnapshotInlineImage[];
  inlineTextBoxes: CanvasSnapshotInlineTextBox[];
  floatingTextBoxes: CanvasSnapshotFloatingTextBox[];
  unsupportedRegions: Array<{
    pageIndex: number;
    zone: EditorEditingZone;
    footnoteId?: string;
    left: number;
    top: number;
    width: number;
    height: number;
    reason: CanvasUnsupportedReason;
  }>;
}

export interface BuildCanvasLayoutSnapshotOptions {
  surface: HTMLElement;
  state: EditorState;
  measuredBlockHeights?: Record<string, number>;
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>;
}

function getCanvasPageElements(surface: HTMLElement): HTMLElement[] {
  const pages = Array.from(
    surface.querySelectorAll<HTMLElement>(
      '[data-renderer="canvas"][data-page-index]',
    ),
  );
  return pages.sort((a, b) => {
    const left = Number(a.dataset.pageIndex ?? "0");
    const right = Number(b.dataset.pageIndex ?? "0");
    return left - right;
  });
}

function collectInlineImagesFromLines(options: {
  lines: Array<{
    top: number;
    height: number;
    slots: Array<{ offset: number; left: number; top: number; height: number }>;
    fragments: Array<{
      startOffset: number;
      endOffset: number;
      image?: { width: number; height: number };
    }>;
  }>;
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  lineTopOffset: number;
  lineLeftOffset: number;
}): CanvasSnapshotInlineImage[] {
  const inlineImages: CanvasSnapshotInlineImage[] = [];
  for (const line of options.lines) {
    for (const fragment of line.fragments) {
      if (!fragment.image) {
        continue;
      }
      const imageStartOffset = fragment.startOffset;
      const imageEndOffset =
        fragment.endOffset > imageStartOffset
          ? fragment.endOffset
          : imageStartOffset + 1;
      const slot =
        line.slots.find((candidate) => candidate.offset === imageStartOffset) ??
        line.slots.find((candidate) => candidate.offset >= imageStartOffset);
      if (!slot) {
        continue;
      }
      inlineImages.push({
        paragraphId: options.paragraphId,
        paragraphIndex: options.paragraphIndex,
        zone: options.zone,
        footnoteId: options.footnoteId,
        pageIndex: options.pageIndex,
        startOffset: imageStartOffset,
        endOffset: imageEndOffset,
        left: options.lineLeftOffset + slot.left,
        top:
          options.lineTopOffset +
          line.top +
          line.height -
          fragment.image.height,
        width: fragment.image.width,
        height: fragment.image.height,
      });
    }
  }
  return inlineImages;
}

function collectInlineTextBoxesFromLines(options: {
  lines: Array<{
    top: number;
    height: number;
    slots: Array<{ offset: number; left: number; top: number; height: number }>;
    fragments: Array<{
      startOffset: number;
      endOffset: number;
      textBox?: { width: number; height: number; floating?: unknown };
    }>;
  }>;
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  lineTopOffset: number;
  lineLeftOffset: number;
  resolveHeight: ResolveTextBoxRenderHeight;
}): CanvasSnapshotInlineTextBox[] {
  const inlineTextBoxes: CanvasSnapshotInlineTextBox[] = [];
  for (const line of options.lines) {
    for (const fragment of line.fragments) {
      // Floating text boxes are tracked separately; here we only collect
      // text boxes that flow inline (occupy a slot like an inline image).
      if (!fragment.textBox || fragment.textBox.floating) {
        continue;
      }
      const startOffset = fragment.startOffset;
      const endOffset =
        fragment.endOffset > startOffset ? fragment.endOffset : startOffset + 1;
      const slot =
        line.slots.find((candidate) => candidate.offset === startOffset) ??
        line.slots.find((candidate) => candidate.offset >= startOffset);
      if (!slot) {
        continue;
      }
      // Match the painter: an auto-fit box renders at its content height, not
      // its stored height, so the selection overlay must use the same value.
      const height = options.resolveHeight(
        fragment.textBox as unknown as EditorTextBoxData,
      );
      inlineTextBoxes.push({
        paragraphId: options.paragraphId,
        paragraphIndex: options.paragraphIndex,
        zone: options.zone,
        footnoteId: options.footnoteId,
        pageIndex: options.pageIndex,
        startOffset,
        endOffset,
        left: options.lineLeftOffset + slot.left,
        top: options.lineTopOffset + line.top + line.height - height,
        width: fragment.textBox.width,
        height,
      });
    }
  }
  return inlineTextBoxes;
}

function collectFloatingTextBoxesFromLines(options: {
  lines: Array<{
    top: number;
    height: number;
    slots: Array<{ offset: number; left: number; top: number; height: number }>;
    fragments: Array<{
      startOffset: number;
      endOffset: number;
      textBox?: {
        width: number;
        height: number;
        floating?: {
          positionH?: {
            relativeFrom?: string;
            offset?: number;
            align?: string;
          };
          positionV?: {
            relativeFrom?: string;
            offset?: number;
            align?: string;
          };
        };
      };
    }>;
  }>;
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  pageLeft: number;
  pageTop: number;
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  paragraphTop: number;
  lineTopOffset: number;
  lineLeftOffset: number;
  resolveHeight: ResolveTextBoxRenderHeight;
}): CanvasSnapshotFloatingTextBox[] {
  const result: CanvasSnapshotFloatingTextBox[] = [];

  const emuToPx = (value: number | undefined) =>
    value === undefined ? 0 : value / 9525;

  for (const line of options.lines) {
    for (const fragment of line.fragments) {
      const textBox = fragment.textBox;

      if (!textBox?.floating) {
        continue;
      }

      const slot =
        line.slots.find(
          (candidate) => candidate.offset === fragment.startOffset,
        ) ??
        line.slots.find(
          (candidate) => candidate.offset >= fragment.startOffset,
        );

      if (!slot) {
        continue;
      }

      const h = textBox.floating.positionH;
      const v = textBox.floating.positionV;

      const hBase =
        h?.relativeFrom === "page"
          ? options.pageLeft
          : h?.relativeFrom === "character"
            ? options.lineLeftOffset + slot.left
            : options.contentLeft;

      const vBase =
        v?.relativeFrom === "page"
          ? options.pageTop
          : v?.relativeFrom === "line"
            ? options.lineTopOffset + line.top
            : v?.relativeFrom === "margin"
              ? options.contentTop
              : options.paragraphTop;

      result.push({
        paragraphId: options.paragraphId,
        paragraphIndex: options.paragraphIndex,
        zone: options.zone,
        footnoteId: options.footnoteId,
        pageIndex: options.pageIndex,
        startOffset: fragment.startOffset,
        endOffset:
          fragment.endOffset > fragment.startOffset
            ? fragment.endOffset
            : fragment.startOffset + 1,
        left: hBase + emuToPx(h?.offset),
        top: vBase + emuToPx(v?.offset),
        width: textBox.width,
        // Match the painter's auto-fit height so the overlay tracks the box.
        height: options.resolveHeight(textBox as unknown as EditorTextBoxData),
      });
    }
  }

  return result;
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
        const advance = next
          ? Math.max(1, next.left - slot.left)
          : lastAdvance;
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

export function buildCanvasLayoutSnapshot(
  options: BuildCanvasLayoutSnapshotOptions,
): CanvasLayoutSnapshot | null {
  const { surface, state } = options;
  const documentLayout = projectDocumentLayout(
    state.document,
    undefined,
    options.measuredBlockHeights,
    options.measuredParagraphLayouts,
  );
  const canvasPages = getCanvasPageElements(surface);
  if (documentLayout.pages.length === 0 || canvasPages.length === 0) {
    return null;
  }

  const paragraphs = getDocumentParagraphs(state.document);
  const paragraphIndexById = new Map(
    paragraphs.map((paragraph, index) => [paragraph.id, index] as const),
  );
  const surfaceRect = surface.getBoundingClientRect();
  const snapshotPages: CanvasSnapshotPage[] = [];
  const snapshotParagraphs: CanvasSnapshotParagraph[] = [];
  const inlineImages: CanvasSnapshotInlineImage[] = [];
  const inlineTextBoxes: CanvasSnapshotInlineTextBox[] = [];
  const floatingTextBoxes: CanvasSnapshotFloatingTextBox[] = [];
  const unsupportedRegions: CanvasLayoutSnapshot["unsupportedRegions"] = [];

  for (const page of documentLayout.pages) {
    const pageElement =
      canvasPages.find(
        (candidate) =>
          Number(candidate.dataset.pageIndex ?? "-1") === page.index,
      ) ?? null;
    if (!pageElement) {
      continue;
    }

    const pageRect = pageElement.getBoundingClientRect();
    const bodyTop = page.bodyTop ?? getPageBodyTop(page.pageSettings);
    const bodyBottom = page.bodyBottom ?? getPageBodyBottom(page.pageSettings);
    const headerTop = page.headerTop ?? getPageHeaderZoneTop(page.pageSettings);
    const footerTop =
      page.footerTop ?? page.bodyBottom ?? getPageBodyBottom(page.pageSettings);
    const snapshotPage: CanvasSnapshotPage = {
      index: page.index,
      left: pageRect.left,
      top: pageRect.top,
      width: pageRect.width,
      height: pageRect.height,
      bodyTop,
      bodyBottom,
      footerTop,
      footnoteTop: page.footnoteTop,
      footnoteSeparatorTop: page.footnoteSeparatorTop,
    };
    snapshotPages.push(snapshotPage);

    const contentLeft =
      pageRect.left +
      page.pageSettings.margins.left +
      page.pageSettings.margins.gutter;
    const contentWidth = getPageContentWidth(page.pageSettings);

    const collectParagraphBlock = (
      zone: EditorEditingZone,
      blocks: typeof page.blocks,
      startTop: number,
      options: {
        footnoteId?: string;
        footnoteIdForBlock?: (
          block: (typeof page.blocks)[number],
        ) => string | undefined;
        contentLeft?: number;
        contentWidth?: number;
        blockGap?: number;
      } = {},
    ) => {
      let cursorY = startTop;
      const blockContentLeft = options.contentLeft ?? contentLeft;
      const blockContentWidth = options.contentWidth ?? contentWidth;
      for (const block of blocks) {
        const blockFootnoteId =
          options.footnoteIdForBlock?.(block) ?? options.footnoteId;
        if (block.sourceBlock.type === "paragraph" && block.layout) {
          const paragraphNode = block.sourceBlock;
          const paragraphId = paragraphNode.id;
          const paragraphIndex = paragraphIndexById.get(paragraphId) ?? 0;
          const paragraphStyle = resolveEffectiveParagraphStyle(
            paragraphNode.style,
            state.document.styles,
          );
          const spacingBefore =
            block.layout.startOffset === 0
              ? (paragraphStyle.spacingBefore ?? 0)
              : 0;
          const lineTopOffset = cursorY + spacingBefore;
          snapshotParagraphs.push({
            paragraph: paragraphNode,
            paragraphId,
            paragraphIndex,
            zone,
            footnoteId: blockFootnoteId,
            pageIndex: page.index,
            startOffset: block.layout.startOffset ?? 0,
            endOffset:
              block.layout.endOffset ?? getParagraphText(paragraphNode).length,
            textLength: getParagraphText(paragraphNode).length,
            left: blockContentLeft,
            top: cursorY,
            width: blockContentWidth,
            height: Math.max(0, block.estimatedHeight),
            lines: block.layout.lines.map((line) => ({
              startOffset: line.startOffset,
              endOffset: line.endOffset,
              top: lineTopOffset + line.top,
              height: line.height,
              slots: line.slots.map((slot) => ({
                offset: slot.offset,
                left: blockContentLeft + slot.left,
                top: lineTopOffset + slot.top,
                height: slot.height,
              })),
            })),
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
              resolveHeight: (textBox) =>
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
              resolveHeight: (textBox) =>
                resolveTextBoxRenderHeight(textBox, state, page.index),
            }),
          );
        } else if (block.sourceBlock.type === "table") {
          const segmentTable = block.tableSegment
            ? buildSegmentTable(block.sourceBlock, block.tableSegment)
            : block.sourceBlock;
          const tableLayout = buildCanvasTableLayout({
            table: segmentTable,
            state,
            pageIndex: page.index,
            originX: blockContentLeft,
            originY: cursorY,
            contentWidth: blockContentWidth,
            estimatedHeight: block.estimatedHeight,
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
            segment && segment.startRowIndex > 0
              ? segment.repeatedHeaderRowCount
              : 0;
          const toDocumentRowIndex = (localRowIndex: number): number => {
            if (!segment) return localRowIndex;
            if (localRowIndex < repeatedHeaderCount) return localRowIndex;
            return (
              segment.startRowIndex + (localRowIndex - repeatedHeaderCount)
            );
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
              const textLength = getParagraphText(
                paragraphLayout.paragraph,
              ).length;
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
                : paragraphLayout.lines.map((line) => ({
                    startOffset: line.startOffset,
                    endOffset: line.endOffset,
                    top: paragraphLayout.originY + line.top,
                    height: line.height,
                    slots: line.slots.map((slot) => ({
                      offset: slot.offset,
                      left: paragraphLayout.originX + slot.left,
                      top: paragraphLayout.originY + slot.top,
                      height: slot.height,
                    })),
                  }));
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
                  resolveHeight: (textBox) =>
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
                  resolveHeight: (textBox) =>
                    resolveTextBoxRenderHeight(textBox, state, page.index),
                }),
              );
            }
          }
        }
        cursorY += Math.max(0, block.estimatedHeight) + (options.blockGap ?? 0);
      }
    };

    collectParagraphBlock(
      "header",
      page.headerBlocks ?? [],
      pageRect.top + headerTop,
    );
    collectParagraphBlock("main", page.blocks, pageRect.top + bodyTop);
    if (page.footnoteBlocks && page.footnoteTop !== undefined) {
      const footnoteReferenceIds = page.footnoteReferenceIds ?? [];
      collectParagraphBlock(
        "footnote",
        page.footnoteBlocks,
        pageRect.top + page.footnoteTop,
        {
          footnoteIdForBlock: (block) =>
            footnoteReferenceIds.find((footnoteId) =>
              block.blockId.startsWith(`${footnoteId}:`),
            ),
          contentLeft: contentLeft + FOOTNOTE_MARKER_GUTTER_PX,
          contentWidth: Math.max(24, contentWidth - FOOTNOTE_MARKER_GUTTER_PX),
          blockGap: 2,
        },
      );
    }
    collectParagraphBlock(
      "footer",
      page.footerBlocks ?? [],
      pageRect.top + footerTop,
    );
  }

  const paragraphsById = new Map<string, CanvasSnapshotParagraph[]>();
  for (const paragraph of snapshotParagraphs) {
    const current = paragraphsById.get(paragraph.paragraphId) ?? [];
    current.push(paragraph);
    paragraphsById.set(paragraph.paragraphId, current);
  }
  for (const [paragraphId, entries] of paragraphsById.entries()) {
    entries.sort((left, right) => {
      if (left.pageIndex !== right.pageIndex)
        return left.pageIndex - right.pageIndex;
      if (left.startOffset !== right.startOffset)
        return left.startOffset - right.startOffset;
      return left.top - right.top;
    });
    paragraphsById.set(paragraphId, entries);
  }

  return {
    surfaceRect,
    pages: snapshotPages,
    paragraphs: snapshotParagraphs,
    paragraphsById,
    inlineImages,
    inlineTextBoxes,
    floatingTextBoxes,
    unsupportedRegions,
  };
}
