import type { EditorLayoutLine, EditorParagraphNode } from "@/core/model.js";
import { measureDropCapWidth } from "@/layoutProjection/dropCapExclusion.js";
import {
  resolveCanvasFontFamily,
  resolveCanvasTextRenderMetrics,
} from "./canvasParagraphPainter.js";

const DEFAULT_FONT_SIZE = 14.6667; // 11pt

/**
 * Draws a paragraph's drop cap (the large initial letter). The wrapping body
 * text has already been shortened by the matching exclusion in
 * `resolveDropCapExclusion`, so the cap occupies the gap to the left of those
 * lines. The cap baseline aligns with the baseline of its last spanned line
 * (mirroring `drawParagraph`'s `line.top + line.height * 0.8`).
 */
export function drawDropCapForParagraph(options: {
  ctx: CanvasRenderingContext2D;
  paragraph: EditorParagraphNode;
  lines: EditorLayoutLine[];
  originX: number;
  paragraphTop: number;
}): void {
  const { ctx, paragraph, lines, originX, paragraphTop } = options;
  const dropCap = paragraph.dropCap;
  if (!dropCap) {
    return;
  }

  const style = dropCap.style;
  const fontSize = style?.fontSize ?? DEFAULT_FONT_SIZE;
  const bodyLineHeight = lines[0]?.height ?? fontSize;
  const renderMetrics = resolveCanvasTextRenderMetrics(style, fontSize);

  const fontWeight = style?.bold ? "700" : "400";
  const fontStyle = style?.italic ? "italic" : "normal";
  const fontFamily = resolveCanvasFontFamily(style?.fontFamily);

  const glyphWidth = measureDropCapWidth(dropCap);
  const x = dropCap.type === "margin" ? originX - glyphWidth : originX;
  // Baseline of the last spanned line: (lines - 1) full lines down + 0.8 of the
  // last line's height. The cap is sized so its cap-height reaches the first
  // line's top from there.
  const baselineY =
    paragraphTop +
    (dropCap.lines - 0.2) * bodyLineHeight +
    renderMetrics.baselineOffset;

  ctx.save();
  ctx.font = `${fontStyle} ${fontWeight} ${renderMetrics.fontSize}px ${fontFamily}`;
  ctx.fillStyle = style?.color ?? "#000000";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(dropCap.text, x, baselineY);
  ctx.restore();
}
