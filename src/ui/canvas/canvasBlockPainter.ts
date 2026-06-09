import type {
  EditorLayoutLine,
  EditorLayoutBlock,
  EditorPageSettings,
  EditorParagraphStyle,
  EditorState,
} from "../../core/model.js";
import { resolveEffectiveParagraphStyle } from "../../core/model.js";
import { findFootnoteReference } from "../../core/footnotes.js";
import {
  FOOTNOTE_MARKER_GUTTER_PX,
  PX_PER_POINT,
  getParagraphBorderInsets,
} from "../../layoutProjection/index.js";
import {
  drawParagraph,
  resolveCanvasTextRenderMetrics,
} from "./canvasParagraphPainter.js";
import { drawBorderBox, type CanvasBorderEdge } from "./canvasBorders.js";
import { drawTable } from "./canvasTablePainter.js";
import { drawFloatingTextBoxesForParagraph } from "./canvasTextBoxPainter.js";

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
) {
  const hasBorder =
    !!paragraphStyle.borderTop ||
    !!paragraphStyle.borderRight ||
    !!paragraphStyle.borderBottom ||
    !!paragraphStyle.borderLeft;
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
) {
  let cursorY = originY;
  for (const block of blocks) {
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
          layer: "front",
        });
      }
    } else if (block.sourceBlock.type === "table") {
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
) {
  let cursorY = originY;
  const markerDrawn = new Set<string>();
  const markerByFootnoteId = new Map(
    footnoteReferenceIds.map((footnoteId) => [
      footnoteId,
      findFootnoteReference(state.document, footnoteId)?.run.text ?? "",
    ]),
  );
  for (const block of blocks) {
    const owningFootnoteId = footnoteReferenceIds.find((footnoteId) =>
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
      );
    }
    cursorY += Math.max(0, block.estimatedHeight) + 2;
  }
}
