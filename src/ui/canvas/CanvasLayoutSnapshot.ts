import {
  getDocumentParagraphs,
  getPageBodyBottom,
  getPageBodyTop,
  getPageContentWidth,
  getPageColumnRects,
  getPageHeaderZoneTop,
  getParagraphText,
  resolveEffectiveParagraphStyle,
  type EditorEditingZone,
  type EditorParagraphNode,
  type EditorState,
} from "@/core/model.js";
import { buildSegmentTable } from "@/core/tableLayout.js";
import { resolveFloatingTableRect } from "@/layoutProjection/floatingObjects.js";
import { FOOTNOTE_MARKER_GUTTER_PX } from "@/layoutProjection/index.js";
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

import type {
  CanvasSnapshotSlot,
  CanvasSnapshotLine,
  CanvasSnapshotParagraph,
  CanvasSnapshotInlineImage,
  CanvasSnapshotFloatingTextBox,
  CanvasSnapshotFloatingImage,
  CanvasSnapshotInlineTextBox,
  CanvasSnapshotFloatingTable,
  CanvasSnapshotPage,
  CanvasLayoutSnapshot,
  BuildCanvasLayoutSnapshotOptions,
} from "./canvasSnapshotTypes.js";
export type {
  ResolveTextBoxRenderHeight,
  CanvasSnapshotSlot,
  CanvasSnapshotLine,
  CanvasSnapshotTableCellInfo,
  CanvasSnapshotParagraph,
  CanvasSnapshotInlineImage,
  CanvasSnapshotFloatingTextBox,
  CanvasSnapshotFloatingImage,
  CanvasSnapshotInlineTextBox,
  CanvasSnapshotFloatingTable,
  CanvasSnapshotPage,
  CanvasLayoutSnapshot,
  BuildCanvasLayoutSnapshotOptions,
} from "./canvasSnapshotTypes.js";

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

/**
 * Coordinate contract ("screen-anchored local" space)
 * ----------------------------------------------------
 * The document layer (`.oasis-editor-editor-scroll-content`) is scaled with a
 * CSS `transform: scale(z)` and `transform-origin: top left`, so the layer's
 * local origin (0,0) maps to `surfaceRect.{left,top}` on screen and a child at
 * screen distance `d` from that origin sits at local `d / z`.
 *
 * Every coordinate in this snapshot is emitted as `surfaceRect.origin +
 * offsetLocal`, where `offsetLocal` is in unscaled (pre-transform) CSS px — the
 * same units the canvas draws in and the same units overlays use inside the
 * scaled layer. To achieve this we divide the only zoom-affected input (the page
 * element's `getBoundingClientRect`, which already reflects the transform) by
 * `z` relative to the surface origin; the model offsets added on top are already
 * unscaled. The result is invariant under zoom.
 *
 * Consumers:
 *  - Overlays (children of the scaled layer) use `value - surfaceRect` to get
 *    `offsetLocal` and let the transform do the visual scaling — no change.
 *  - Hit-testing receives screen-space pointer coords and converts them into
 *    this space at the single entry point (resolveCanvasSurfaceHitAtPoint).
 */
export function buildCanvasLayoutSnapshot(
  options: BuildCanvasLayoutSnapshotOptions,
): CanvasLayoutSnapshot | null {
  const { surface, state, documentLayout } = options;
  const zoomFactor =
    options.zoomFactor && options.zoomFactor > 0 ? options.zoomFactor : 1;
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
  const floatingImages: CanvasSnapshotFloatingImage[] = [];
  const inlineTextBoxes: CanvasSnapshotInlineTextBox[] = [];
  const floatingTextBoxes: CanvasSnapshotFloatingTextBox[] = [];
  const floatingTables: CanvasSnapshotFloatingTable[] = [];
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

    // The DOM rect already reflects the CSS `transform: scale(z)`. Re-express it
    // in unscaled local space anchored at the surface origin so the model offsets
    // added downstream (which are unscaled) compose correctly. At z=1 this is a
    // no-op; see the coordinate contract above.
    const rawPageRect = pageElement.getBoundingClientRect();
    const pageRect = {
      left:
        surfaceRect.left + (rawPageRect.left - surfaceRect.left) / zoomFactor,
      top: surfaceRect.top + (rawPageRect.top - surfaceRect.top) / zoomFactor,
      width: rawPageRect.width / zoomFactor,
      height: rawPageRect.height / zoomFactor,
    };
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
      let blockContentLeft = options.contentLeft ?? contentLeft;
      let blockContentWidth = options.contentWidth ?? contentWidth;
      // Multi-column body: each block carries its column index; when it changes
      // we restart the vertical cursor at the body top and shift X to that
      // column's rect. All downstream geometry (caret slots, hit-testing,
      // images, tables) is derived from blockContentLeft/Width, so columns work
      // through this single placement change.
      const columnRects = getPageColumnRects(page.pageSettings);
      let lastColumnIndex: number | undefined;
      for (const block of blocks) {
        if (
          block.columnIndex !== undefined &&
          block.columnIndex !== lastColumnIndex
        ) {
          lastColumnIndex = block.columnIndex;
          const rect = columnRects[block.columnIndex] ?? columnRects[0]!;
          blockContentLeft = pageRect.left + rect.left;
          blockContentWidth = rect.width;
          cursorY = startTop;
        }
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
          const floating = block.sourceBlock.style?.floating;
          const floatingRect = floating
            ? resolveFloatingTableRect({
                floating,
                pageSettings: page.pageSettings,
                contentLeft: blockContentLeft - pageRect.left,
                contentTop: startTop - pageRect.top,
                contentWidth: blockContentWidth,
                anchorTop: cursorY - pageRect.top,
                width: resolveCanvasTableWidth(
                  block.sourceBlock,
                  blockContentWidth,
                ),
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
            originX: floatingRect
              ? pageRect.left + floatingRect.x
              : blockContentLeft,
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
    floatingImages,
    inlineTextBoxes,
    floatingTextBoxes,
    floatingTables,
    unsupportedRegions,
  };
}
