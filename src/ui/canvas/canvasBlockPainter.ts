import type { EditorLayoutBlock, EditorState } from "../../core/model.js";
import { resolveEffectiveParagraphStyle } from "../../core/model.js";
import { findFootnoteReference } from "../../core/footnotes.js";
import { FOOTNOTE_MARKER_GUTTER_PX } from "../../layoutProjection/index.js";
import { drawParagraph, resolveCanvasTextRenderMetrics } from "./canvasParagraphPainter.js";
import { drawTable } from "./canvasTablePainter.js";

export function renderBlockList(
  ctx: CanvasRenderingContext2D,
  state: EditorState,
  blocks: EditorLayoutBlock[],
  originX: number,
  originY: number,
  contentWidth: number,
  pageIndex: number,
  onUpdate: () => void,
) {
  let cursorY = originY;
  for (const block of blocks) {
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      const paragraphStyle = resolveEffectiveParagraphStyle(block.sourceBlock.style, state.document.styles);
      const spacingBefore = block.layout.startOffset === 0 ? (paragraphStyle.spacingBefore ?? 0) : 0;
      drawParagraph(ctx, block.sourceBlock, block.layout.lines, state, originX, cursorY + spacingBefore, onUpdate);
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
        const markerMetrics = resolveCanvasTextRenderMetrics({ superscript: true }, 11);
        ctx.save();
        ctx.font = `400 ${markerMetrics.fontSize}px Calibri, sans-serif`;
        ctx.fillStyle = "#000000";
        ctx.fillText(marker, originX, cursorY + 12 + markerMetrics.baselineOffset);
        ctx.restore();
      }
      markerDrawn.add(owningFootnoteId);
    }
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      const paragraphStyle = resolveEffectiveParagraphStyle(block.sourceBlock.style, state.document.styles);
      const spacingBefore = block.layout.startOffset === 0 ? (paragraphStyle.spacingBefore ?? 0) : 0;
      drawParagraph(
        ctx,
        block.sourceBlock,
        block.layout.lines,
        state,
        originX + FOOTNOTE_MARKER_GUTTER_PX,
        cursorY + spacingBefore,
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
