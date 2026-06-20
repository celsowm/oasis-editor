import type { EditorParagraphNode, EditorState } from "@/core/model.js";
import { resolveEffectiveTextStyleForParagraph } from "@/core/model.js";
import {
  resolveCanvasFontFamily,
  resolveCanvasTextRenderMetrics,
} from "./canvasFontResolution.js";

/**
 * How a block of text should be painted given its OOXML flow direction.
 * - `horizontal`: normal left-to-right horizontal text (no transform).
 * - `rotate-cw`: rotated 90° clockwise — text reads top→bottom, columns
 *   advance right→left (`w:textDirection` `tbRl`, DrawingML `vert`).
 * - `rotate-ccw`: rotated 90° counter-clockwise — text reads bottom→top,
 *   columns advance left→right (`btLr`, `vert270`).
 * - `stack`: upright glyphs stacked top→bottom — DrawingML `wordArtVert` (and
 *   East-Asian CJK content).
 *
 * Note on the "V" variants: like Word, Latin `lrTbV` renders horizontally and
 * `tbRlV` renders rotated (≈ `tbRl`); only `wordArtVert` stacks glyphs upright.
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
    case "tbRlV":
    case "vert":
      return "rotate-cw";
    case "btLr":
    case "vert270":
      return "rotate-ccw";
    case "wordArtVert":
      return "stack";
    // `lrTbV` falls through: Word renders it as horizontal Latin text.
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
 * Map a point in a rotated box's local layout space (where `lx` runs along the
 * box's long/vertical axis and `ly` across its short axis) to screen space.
 * This is the point form of the affine transform applied by `withRotatedBox`.
 */
export function projectRotatedPoint(
  box: VerticalBox,
  mode: "rotate-cw" | "rotate-ccw",
  lx: number,
  ly: number,
): { x: number; y: number } {
  if (mode === "rotate-cw") {
    return { x: box.x + box.width - ly, y: box.y + lx };
  }
  return { x: box.x + ly, y: box.y + box.height - lx };
}

/**
 * Project a horizontal-layout caret slot into the screen-space rectangle it
 * occupies once the box is rotated. `flow` is the slot's position along the text
 * flow (its `left`), `cross` is its cross-flow position (`cursorY + slot.top`),
 * `advance` is the glyph advance along the flow, and `crossThickness` is the line
 * height. Returns the axis-aligned `{ left, top, height }` used by the generic
 * slot-based hit-test/selection scorers.
 */
export function projectRotatedSlot(
  box: VerticalBox,
  mode: "rotate-cw" | "rotate-ccw",
  flow: number,
  cross: number,
  advance: number,
  crossThickness: number,
): { left: number; top: number; height: number } {
  if (mode === "rotate-cw") {
    return {
      left: box.x + box.width - cross - crossThickness / 2,
      top: box.y + flow,
      height: Math.max(1, advance),
    };
  }
  return {
    left: box.x + cross + crossThickness / 2,
    top: box.y + box.height - flow - advance,
    height: Math.max(1, advance),
  };
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
 * Estimate the horizontal extent (px) of a single stacked column — the column
 * width `drawStackedParagraph` reserves for the paragraph's widest glyph.
 */
export function estimateStackedColumnWidth(
  paragraph: EditorParagraphNode,
  state: EditorState,
): number {
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
  return columnWidth > 0 ? columnWidth : 16;
}

/** One upright glyph positioned within a stacked column (screen space). */
export interface StackedGlyph {
  char: string;
  /** Paragraph text offset of this glyph. */
  offset: number;
  /** Column center x. */
  centerX: number;
  /** Glyph top y. */
  top: number;
  /** Column width. */
  width: number;
  /** Glyph height (advance along the column). */
  height: number;
  /** Canvas font string for painting. */
  font: string;
  /** Fill color. */
  color: string;
}

export interface StackedLayout {
  glyphs: StackedGlyph[];
  /** The x edge consumed, so callers can chain paragraphs as adjacent columns. */
  endColumnRight: number;
}

/**
 * Compute the upright-glyph layout for a paragraph stacked top→bottom inside
 * `box`. Columns advance right→left when `columnsRtl` (East-Asian CJK default),
 * or left→right for Latin WordArt "Stacked" text (`wordArtVert`). `startColumn`
 * is the right edge of the first column when RTL, or its left edge when LTR.
 * This is the single source of truth shared by `drawStackedParagraph` (paint)
 * and the layout snapshot (caret/selection geometry), so the two cannot drift.
 */
export function layoutStackedGlyphs(
  paragraph: EditorParagraphNode,
  state: EditorState,
  box: VerticalBox,
  startColumn: number,
  columnsRtl = true,
): StackedLayout {
  const startColumnRight = startColumn;

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

  const glyphs: StackedGlyph[] = [];
  let offset = 0;
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
    const metrics = resolveCanvasTextRenderMetrics(styles, fontSize);
    const glyphHeight = fontSize * STACK_LINE_FACTOR;
    const font = `${styles.italic ? "italic" : "normal"} ${
      styles.bold ? "700" : "400"
    } ${metrics.fontSize}px ${resolveCanvasFontFamily(styles.fontFamily)}`;
    const color = styles.color ?? "#000000";

    for (const char of run.text) {
      if (char === "\n") {
        newColumn();
        offset += 1;
        continue;
      }
      if (y + glyphHeight > box.y + box.height && y > box.y) {
        newColumn();
      }
      if (!styles.hidden) {
        glyphs.push({
          char,
          offset,
          centerX: columnCenter,
          top: y,
          width: columnWidth,
          height: glyphHeight,
          font,
          color,
        });
      }
      y += glyphHeight;
      offset += 1;
    }
  }

  return {
    glyphs,
    endColumnRight: columnsRtl
      ? columnRight - columnWidth
      : columnRight + columnWidth,
  };
}

/**
 * Paint a paragraph as upright glyphs stacked top→bottom inside `box`.
 * Successive columns (after a hard break or when the box overflows) advance
 * right→left when `columnsRtl`, otherwise left→right. Returns the far edge
 * consumed so callers can chain paragraphs as adjacent columns.
 */
export function drawStackedParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: EditorParagraphNode,
  state: EditorState,
  box: VerticalBox,
  startColumn: number,
  columnsRtl = true,
): number {
  const { glyphs, endColumnRight } = layoutStackedGlyphs(
    paragraph,
    state,
    box,
    startColumn,
    columnsRtl,
  );

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const glyph of glyphs) {
    ctx.font = glyph.font;
    ctx.fillStyle = glyph.color;
    ctx.fillText(glyph.char, glyph.centerX, glyph.top);
  }
  ctx.restore();

  return endColumnRight;
}
