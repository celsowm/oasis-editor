import type {
  EditorParagraphNode,
  EditorState,
} from "../../core/model.js";
import { resolveEffectiveTextStyleForParagraph } from "../../core/model.js";
import {
  resolveCanvasFontFamily,
  resolveCanvasTextRenderMetrics,
} from "./canvasParagraphPainter.js";

/**
 * How a block of text should be painted given its OOXML flow direction.
 * - `horizontal`: normal left-to-right horizontal text (no transform).
 * - `rotate-cw`: rotated 90° clockwise — text reads top→bottom, columns
 *   advance right→left (`w:textDirection` `tbRl`, DrawingML `vert`).
 * - `rotate-ccw`: rotated 90° counter-clockwise — text reads bottom→top,
 *   columns advance left→right (`btLr`, `vert270`).
 * - `stack`: upright glyphs stacked top→bottom (East-Asian `lrTbV`/`tbRlV`,
 *   DrawingML `wordArtVert`).
 */
export type VerticalRenderMode =
  | "horizontal"
  | "rotate-cw"
  | "rotate-ccw"
  | "stack";

/**
 * Map an OOXML text-direction token (`w:textDirection/@w:val` or
 * `wps:bodyPr/@vert`) to a canvas render mode.
 */
export function resolveVerticalMode(
  direction: string | null | undefined,
): VerticalRenderMode {
  switch (direction) {
    case "tbRl":
    case "vert":
      return "rotate-cw";
    case "btLr":
    case "vert270":
      return "rotate-ccw";
    case "lrTbV":
    case "tbRlV":
    case "wordArtVert":
      return "stack";
    default:
      return "horizontal";
  }
}

export interface VerticalBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Run `paint` inside a canvas transform so that content laid out horizontally
 * in a width/height-swapped coordinate space appears rotated to fill `box`.
 *
 * The callback paints at local origin (0, 0) into a box whose dimensions are
 * `(layoutWidth = box.height, layoutHeight = box.width)` — i.e. text flows
 * along the box's long (vertical) axis.
 */
export function withRotatedBox(
  ctx: CanvasRenderingContext2D,
  box: VerticalBox,
  mode: "rotate-cw" | "rotate-ccw",
  paint: (layoutWidth: number, layoutHeight: number) => void,
): void {
  ctx.save();
  if (mode === "rotate-cw") {
    ctx.translate(box.x + box.width, box.y);
    ctx.rotate(Math.PI / 2);
  } else {
    ctx.translate(box.x, box.y + box.height);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.beginPath();
  ctx.rect(0, 0, box.height, box.width);
  ctx.clip();
  paint(box.height, box.width);
  ctx.restore();
}

const STACK_LINE_FACTOR = 1.25;

/** Estimate the vertical extent (px) of a paragraph painted as stacked glyphs. */
export function estimateStackedParagraphHeight(
  paragraph: EditorParagraphNode,
  state: EditorState,
): number {
  let glyphs = 0;
  let maxFontSize = 0;
  for (const run of paragraph.runs) {
    if (run.image || run.textBox) {
      continue;
    }
    const styles = resolveEffectiveTextStyleForParagraph(
      run.styles,
      paragraph.style?.styleId,
      state.document.styles,
    );
    const fontSize = styles.fontSize ?? 14.6667;
    maxFontSize = Math.max(maxFontSize, fontSize);
    for (const char of run.text) {
      if (char !== "\n") {
        glyphs += 1;
      }
    }
  }
  if (glyphs === 0) {
    return Math.max(1, maxFontSize * STACK_LINE_FACTOR);
  }
  return glyphs * maxFontSize * STACK_LINE_FACTOR;
}

/**
 * Paint a paragraph as upright glyphs stacked top→bottom inside `box`.
 * Successive columns (after a hard break or when the box overflows) advance
 * left or right depending on `mode`.
 */
export function drawStackedParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: EditorParagraphNode,
  state: EditorState,
  box: VerticalBox,
  startColumnRight: number,
): number {
  // East-Asian stacked text defaults to right-to-left columns.
  const columnsRtl = true;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Resolve the widest font so columns have a stable width.
  let columnWidth = 0;
  for (const run of paragraph.runs) {
    if (run.image || run.textBox) continue;
    const styles = resolveEffectiveTextStyleForParagraph(
      run.styles,
      paragraph.style?.styleId,
      state.document.styles,
    );
    columnWidth = Math.max(columnWidth, (styles.fontSize ?? 14.6667) * 1.1);
  }
  if (columnWidth <= 0) columnWidth = 16;

  let columnRight = startColumnRight;
  let columnCenter = columnsRtl
    ? columnRight - columnWidth / 2
    : columnRight + columnWidth / 2;
  let y = box.y;

  const newColumn = () => {
    if (columnsRtl) {
      columnRight -= columnWidth;
      columnCenter = columnRight - columnWidth / 2;
    } else {
      columnRight += columnWidth;
      columnCenter = columnRight + columnWidth / 2;
    }
    y = box.y;
  };

  for (const run of paragraph.runs) {
    if (run.image || run.textBox) {
      continue;
    }
    const styles = resolveEffectiveTextStyleForParagraph(
      run.styles,
      paragraph.style?.styleId,
      state.document.styles,
    );
    if (styles.hidden) continue;
    const fontSize = styles.fontSize ?? 14.6667;
    const metrics = resolveCanvasTextRenderMetrics(styles, fontSize);
    const glyphHeight = fontSize * STACK_LINE_FACTOR;
    ctx.font = `${styles.italic ? "italic" : "normal"} ${
      styles.bold ? "700" : "400"
    } ${metrics.fontSize}px ${resolveCanvasFontFamily(styles.fontFamily)}`;
    ctx.fillStyle = styles.color ?? "#000000";

    for (const char of run.text) {
      if (char === "\n") {
        newColumn();
        continue;
      }
      if (y + glyphHeight > box.y + box.height && y > box.y) {
        newColumn();
      }
      ctx.fillText(char, columnCenter, y);
      y += glyphHeight;
    }
  }

  ctx.restore();
  // Return the x edge consumed so callers can chain paragraphs as columns.
  return columnsRtl ? columnRight - columnWidth : columnRight + columnWidth;
}
