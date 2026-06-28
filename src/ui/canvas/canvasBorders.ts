/** Canvas `setLineDash` pattern for dashed borders (dash length, gap length). */
export const CANVAS_DASH_DASHED: [number, number] = [5, 3];
/** Canvas `setLineDash` pattern for dotted borders (dash length, gap length). */
export const CANVAS_DASH_DOTTED: [number, number] = [1, 3];

export interface CanvasBorderEdge {
  width: number;
  color: string;
  type: "solid" | "dashed" | "dotted" | "none";
}

export interface CanvasBorderBox {
  top?: CanvasBorderEdge;
  right?: CanvasBorderEdge;
  bottom?: CanvasBorderEdge;
  left?: CanvasBorderEdge;
  topLeftToBottomRight?: CanvasBorderEdge;
  topRightToBottomLeft?: CanvasBorderEdge;
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  border: CanvasBorderEdge | undefined,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  if (!border || border.type === "none" || border.width <= 0) {
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = border.color;
  ctx.lineWidth = border.width;
  if (border.type === "dashed") {
    ctx.setLineDash(CANVAS_DASH_DASHED);
  } else if (border.type === "dotted") {
    ctx.setLineDash(CANVAS_DASH_DOTTED);
  } else {
    ctx.setLineDash([]);
  }
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Strokes the four edges of a rectangular box. Edges left `undefined` are
 * skipped. Shared by table-cell borders and paragraph borders so both render
 * dashes/dotted/solid identically.
 */
export function drawBorderBox(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  borders: CanvasBorderBox,
) {
  const right = left + width;
  const bottom = top + height;
  drawEdge(ctx, borders.top, left, top, right, top);
  drawEdge(ctx, borders.right, right, top, right, bottom);
  drawEdge(ctx, borders.bottom, left, bottom, right, bottom);
  drawEdge(ctx, borders.left, left, top, left, bottom);
  drawEdge(ctx, borders.topLeftToBottomRight, left, top, right, bottom);
  drawEdge(ctx, borders.topRightToBottomLeft, right, top, left, bottom);
}
