import {
  isDoubleUnderlineStyle,
  isWavyUnderlineStyle,
  type UnderlineStyle,
  underlineStyleDashArray,
  underlineStyleLineWidthPx,
  WAVY_UNDERLINE_AMPLITUDE_PX,
  WAVY_UNDERLINE_WAVELENGTH_PX,
} from "@/core/textStyleMappings.js";
import {
  DOUBLE_UNDERLINE_OFFSET_PX,
  DOUBLE_STRIKE_OFFSET_PX,
  resolveDecorationLineY,
} from "@/core/decorationGeometry.js";
import type { EditorLayoutLine } from "@/core/model.js";
import { CANVAS_DASH_DASHED, CANVAS_DASH_DOTTED } from "../canvasBorders.js";
import { resolveFragmentPaintBounds } from "./canvasRunBackground.js";

export function drawTextDecoration(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
  kind: "underline" | "strike" | "doubleStrike",
  underlineStyle?: UnderlineStyle,
  underlineColor?: string,
) {
  const bounds = resolveFragmentPaintBounds(line, fragment);
  if (!bounds) return;
  const y = originY + resolveDecorationLineY(kind, line.top, line.height);
  const x1 = originX + bounds.left;
  const x2 = originX + bounds.right;
  ctx.save();
  ctx.strokeStyle = underlineColor || (ctx.fillStyle as string);

  if (kind === "underline") {
    drawUnderlineWithStyle(ctx, x1, x2, y, underlineStyle);
  } else if (kind === "doubleStrike") {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.moveTo(x1, y - DOUBLE_STRIKE_OFFSET_PX);
    ctx.lineTo(x2, y - DOUBLE_STRIKE_OFFSET_PX);
    ctx.moveTo(x1, y + DOUBLE_STRIKE_OFFSET_PX);
    ctx.lineTo(x2, y + DOUBLE_STRIKE_OFFSET_PX);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawUnderlineWithStyle(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  underlineStyle: UnderlineStyle,
) {
  ctx.setLineDash([]);
  ctx.lineWidth = underlineStyleLineWidthPx(underlineStyle);

  if (isDoubleUnderlineStyle(underlineStyle)) {
    ctx.beginPath();
    ctx.moveTo(x1, y - DOUBLE_UNDERLINE_OFFSET_PX);
    ctx.lineTo(x2, y - DOUBLE_UNDERLINE_OFFSET_PX);
    ctx.moveTo(x1, y + DOUBLE_UNDERLINE_OFFSET_PX);
    ctx.lineTo(x2, y + DOUBLE_UNDERLINE_OFFSET_PX);
    ctx.stroke();
    return;
  }

  if (isWavyUnderlineStyle(underlineStyle)) {
    drawWavyLine(ctx, x1, x2, y);
    return;
  }

  const dashArray = underlineStyleDashArray(underlineStyle);
  if (dashArray) {
    ctx.setLineDash(dashArray);
  }

  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawWavyLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
) {
  ctx.beginPath();
  ctx.moveTo(x1, y);
  for (let x = x1; x <= x2; x += 1) {
    const dy =
      Math.sin(((x - x1) / WAVY_UNDERLINE_WAVELENGTH_PX) * Math.PI) *
      WAVY_UNDERLINE_AMPLITUDE_PX;
    ctx.lineTo(x, y + dy);
  }
  ctx.stroke();
}
