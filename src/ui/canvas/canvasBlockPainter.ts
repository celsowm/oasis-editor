import type {
  EditorLayoutLine,
  EditorLayoutBlock,
  EditorPageSettings,
  EditorParagraphStyle,
  EditorState,
} from "@/core/model.js";
import { resolveEffectiveParagraphStyle } from "@/core/model.js";
import { findFootnoteReference } from "@/core/footnotes.js";
import {
  FOOTNOTE_MARKER_GUTTER_PX,
  PX_PER_POINT,
  getParagraphBorderInsets,
  paragraphBetweenBorderMatches,
} from "@/layoutProjection/index.js";
import {
  drawFloatingImagesForParagraph,
  drawParagraph,
  resolveCanvasTextRenderMetrics,
} from "./canvasParagraphPainter.js";
import { drawBorderBox, type CanvasBorderEdge } from "./canvasBorders.js";
import { drawTable } from "./canvasTablePainter.js";
import { resolveCanvasTableWidth } from "./CanvasTableLayout.js";
import { resolveFloatingTableRect } from "@/layoutProjection/floatingObjects.js";
import { drawFloatingTextBoxesForParagraph } from "./canvasTextBoxPainter.js";
import { drawDropCapForParagraph } from "./canvasDropCapPainter.js";
import type { CanvasBlockPainters } from "./canvasBlockPainters.js";

/**
 * The concrete block painters threaded through the canvas paint pipeline so
 * text-box content can recurse into paragraphs/tables without those modules
 * importing each other. `canvasBlockPainter` is the orchestrator that owns this
 * wiring.
 */
const canvasBlockPainters: CanvasBlockPainters = { drawParagraph, drawTable };

function toCanvasEdge(
  border: EditorParagraphStyle["borderTop"],
): CanvasBorderEdge | undefined {
  if (!border) {
    return undefined;
  }
  return {
    width: border.width * PX_PER_POINT,
    color: border.color,
    type: border.type,
  };
}

/**
 * Paints paragraph shading (`w:shd`) and borders (`w:pBdr`) behind/around the
 * paragraph content. The box spans the indent-aware text width and the height
 * of the laid-out lines. Border widths are stored in points and converted to
 * pixels here.
 */
function drawParagraphDecorations(
  ctx: CanvasRenderingContext2D,
  paragraphStyle: EditorParagraphStyle,
  lines: EditorLayoutLine[],
  originX: number,
  contentTop: number,
  contentWidth: number,
): void {
  const hasBorder =
    !!paragraphStyle.borderTop ||
    !!paragraphStyle.borderRight ||
    !!paragraphStyle.borderBottom ||
    !!paragraphStyle.borderLeft ||
    !!paragraphStyle.borderBar;
  if (!paragraphStyle.shading && !hasBorder) {
    return;
  }

  let linesHeight = 0;
  for (const line of lines) {
    linesHeight = Math.max(linesHeight, line.top + line.height);
  }
  if (linesHeight <= 0) {
    return;
  }

  const insets = getParagraphBorderInsets(paragraphStyle);
  const boxHeight = insets.top + linesHeight + insets.bottom;
  const left = originX + (paragraphStyle.indentLeft ?? 0);
  const right = originX + contentWidth - (paragraphStyle.indentRight ?? 0);
  const width = Math.max(0, right - left);

  if (paragraphStyle.shading) {
    ctx.save();
    ctx.fillStyle = paragraphStyle.shading;
    ctx.fillRect(left, contentTop, width, boxHeight);
    ctx.restore();
  }

  if (hasBorder) {
    drawBorderBox(ctx, left, contentTop, width, boxHeight, {
      top: toCanvasEdge(paragraphStyle.borderTop),
      right: toCanvasEdge(paragraphStyle.borderRight),
      bottom: toCanvasEdge(paragraphStyle.borderBottom),
      left: toCanvasEdge(paragraphStyle.borderLeft),
    });
  }

  // `w:bar`: a vertical stroke at the paragraph's leading edge, drawn at the
  // box's left boundary. Drawn as a zero-width box with only a "left" edge so
  // the dash/solid/dotted logic is reused.
  if (paragraphStyle.borderBar) {
    drawBorderBox(ctx, left, contentTop, 0, boxHeight, {
      left: toCanvasEdge(paragraphStyle.borderBar),
    });
  }
}

export function renderBlockList(
  ctx: CanvasRenderingContext2D,
  state: EditorState,
  blocks: EditorLayoutBlock[],
  originX: number,
  originY: number,
  contentWidth: number,
  pageIndex: number,
  onUpdate: () => void,
  pageSettings?: EditorPageSettings,
): void {
  let cursorY = originY;
  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex]!;
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      const paragraphStyle = resolveEffectiveParagraphStyle(
        block.sourceBlock.style,
        state.document.styles,
      );
      const spacingBefore =
        block.layout.startOffset === 0
          ? (paragraphStyle.spacingBefore ?? 0)
          : 0;
      const boxTop = cursorY + spacingBefore;
      const textTop = boxTop + getParagraphBorderInsets(paragraphStyle).top;
      drawParagraphDecorations(
        ctx,
        paragraphStyle,
        block.layout.lines,
        originX,
        boxTop,
        contentWidth,
      );

      if (pageSettings) {
        drawFloatingTextBoxesForParagraph({
          ctx,
          paragraphLines: block.layout.lines,
          state,
          pageSettings,
          contentLeft: originX,
          contentTop: originY,
          contentWidth,
          paragraphTop: textTop,
          pageIndex,
          onUpdate,
          layer: "behind",
          painters: canvasBlockPainters,
        });
        drawFloatingImagesForParagraph({
          ctx,
          paragraphLines: block.layout.lines,
          state,
          pageSettings,
          contentLeft: originX,
          contentTop: originY,
          contentWidth,
          paragraphTop: textTop,
          onUpdate,
          layer: "behind",
        });
      }

      drawParagraph(
        ctx,
        block.sourceBlock,
        block.layout.lines,
        state,
        originX,
        textTop,
        onUpdate,
        canvasBlockPainters,
        pageIndex,
      );

      if (block.sourceBlock.dropCap) {
        drawDropCapForParagraph({
          ctx,
          paragraph: block.sourceBlock,
          lines: block.layout.lines,
          originX,
          paragraphTop: textTop,
        });
      }

      if (pageSettings) {
        drawFloatingTextBoxesForParagraph({
          ctx,
          paragraphLines: block.layout.lines,
          state,
          pageSettings,
          contentLeft: originX,
          contentTop: originY,
          contentWidth,
          paragraphTop: textTop,
          pageIndex,
          onUpdate,
          layer: "front",
          painters: canvasBlockPainters,
        });
        drawFloatingImagesForParagraph({
          ctx,
          paragraphLines: block.layout.lines,
          state,
          pageSettings,
          contentLeft: originX,
          contentTop: originY,
          contentWidth,
          paragraphTop: textTop,
          onUpdate,
          layer: "front",
        });
      }

      // `w:between`: a horizontal border drawn at the bottom of this paragraph
      // when the next sibling paragraph (same page, different id) also defines a
      // matching `between` edge. Word suppresses it across page breaks; since
      // the block list is per-page, a next-block on the next page is simply not
      // in this array.
      const nextBlock = blocks[blockIndex + 1];
      if (
        nextBlock?.sourceBlock.type === "paragraph" &&
        nextBlock.layout &&
        nextBlock.sourceBlock.id !== block.sourceBlock.id
      ) {
        const nextStyle = resolveEffectiveParagraphStyle(
          nextBlock.sourceBlock.style,
          state.document.styles,
        );
        if (paragraphBetweenBorderMatches(paragraphStyle, nextStyle)) {
          let linesHeight = 0;
          for (const line of block.layout.lines) {
            linesHeight = Math.max(linesHeight, line.top + line.height);
          }
          const betweenY = textTop + linesHeight;
          const barLeft = originX + (paragraphStyle.indentLeft ?? 0);
          const barRight =
            originX + contentWidth - (paragraphStyle.indentRight ?? 0);
          drawBorderBox(
            ctx,
            barLeft,
            betweenY,
            Math.max(0, barRight - barLeft),
            0,
            { top: toCanvasEdge(paragraphStyle.borderBetween) },
          );
        }
      }
    } else if (block.sourceBlock.type === "table") {
      const floating = block.sourceBlock.style?.floating;
      if (floating && pageSettings) {
        const width = resolveCanvasTableWidth(block.sourceBlock, contentWidth);
        const rect = resolveFloatingTableRect({
          floating,
          pageSettings,
          contentLeft: originX,
          contentTop: originY,
          contentWidth,
          anchorTop: cursorY,
          width,
          height: block.floatingTableHeight ?? 1,
          pageIndex,
        });
        rect.y += block.floatingTableOffsetY ?? 0;
        drawTable(
          ctx,
          block.sourceBlock,
          undefined,
          state,
          rect.x,
          rect.y,
          contentWidth,
          rect.height,
          pageIndex,
          onUpdate,
          canvasBlockPainters,
        );
        cursorY += Math.max(0, block.estimatedHeight);
        continue;
      }
      drawTable(
        ctx,
        block.sourceBlock,
        block.tableSegment,
        state,
        originX,
        cursorY,
        contentWidth,
        block.estimatedHeight,
        pageIndex,
        onUpdate,
        canvasBlockPainters,
      );
    }
    cursorY += Math.max(0, block.estimatedHeight);
  }
}

export function renderFootnoteBlockList(
  ctx: CanvasRenderingContext2D,
  state: EditorState,
  blocks: EditorLayoutBlock[],
  footnoteReferenceIds: string[],
  originX: number,
  originY: number,
  contentWidth: number,
  pageIndex: number,
  onUpdate: () => void,
): void {
  let cursorY = originY;
  const markerDrawn = new Set<string>();
  const markerByFootnoteId = new Map(
    footnoteReferenceIds.map((footnoteId): [string, string] => [
      footnoteId,
      findFootnoteReference(state.document, footnoteId)?.run.text ?? "",
    ]),
  );
  for (const block of blocks) {
    const owningFootnoteId = footnoteReferenceIds.find((footnoteId): boolean =>
      block.blockId.startsWith(`${footnoteId}:`),
    );
    if (owningFootnoteId && !markerDrawn.has(owningFootnoteId)) {
      const marker = markerByFootnoteId.get(owningFootnoteId);
      if (marker) {
        const markerMetrics = resolveCanvasTextRenderMetrics(
          { superscript: true },
          11,
        );
        ctx.save();
        ctx.font = `400 ${markerMetrics.fontSize}px Calibri, sans-serif`;
        ctx.fillStyle = "#000000";
        ctx.fillText(
          marker,
          originX,
          cursorY + 12 + markerMetrics.baselineOffset,
        );
        ctx.restore();
      }
      markerDrawn.add(owningFootnoteId);
    }
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      const paragraphStyle = resolveEffectiveParagraphStyle(
        block.sourceBlock.style,
        state.document.styles,
      );
      const spacingBefore =
        block.layout.startOffset === 0
          ? (paragraphStyle.spacingBefore ?? 0)
          : 0;
      const boxTop = cursorY + spacingBefore;
      const textTop = boxTop + getParagraphBorderInsets(paragraphStyle).top;
      drawParagraphDecorations(
        ctx,
        paragraphStyle,
        block.layout.lines,
        originX + FOOTNOTE_MARKER_GUTTER_PX,
        boxTop,
        Math.max(24, contentWidth - FOOTNOTE_MARKER_GUTTER_PX),
      );
      drawParagraph(
        ctx,
        block.sourceBlock,
        block.layout.lines,
        state,
        originX + FOOTNOTE_MARKER_GUTTER_PX,
        textTop,
        onUpdate,
        canvasBlockPainters,
        pageIndex,
      );
    } else if (block.sourceBlock.type === "table") {
      drawTable(
        ctx,
        block.sourceBlock,
        block.tableSegment,
        state,
        originX + FOOTNOTE_MARKER_GUTTER_PX,
        cursorY,
        Math.max(24, contentWidth - FOOTNOTE_MARKER_GUTTER_PX),
        block.estimatedHeight,
        pageIndex,
        onUpdate,
        canvasBlockPainters,
      );
    }
    cursorY += Math.max(0, block.estimatedHeight) + 2;
  }
}
