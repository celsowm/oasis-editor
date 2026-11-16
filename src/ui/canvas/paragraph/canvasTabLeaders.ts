import type { EditorLayoutLine, EditorResolvedTab } from "@/core/model.js";
import { CANVAS_DASH_DASHED, CANVAS_DASH_DOTTED } from "../canvasBorders.js";

export function resolveTabLeader(
  line: EditorLayoutLine,
  offset: number,
): EditorResolvedTab["leader"] {
  return line.resolvedTabs?.[offset]?.leader;
}

export function drawTabLeader(
  ctx: CanvasRenderingContext2D,
  leader: NonNullable<ReturnType<typeof resolveTabLeader>>,
  x1: number,
  x2: number,
  y: number,
): void {
  if (x2 <= x1 + 2) return;
  ctx.save();
  ctx.lineWidth = leader === "heavy" ? 1.5 : 1;
  ctx.strokeStyle = ctx.fillStyle as string;
  if (leader === "dot" || leader === "middleDot") {
    ctx.setLineDash(CANVAS_DASH_DOTTED);
  } else if (leader === "hyphen") {
    ctx.setLineDash(CANVAS_DASH_DASHED);
  } else {
    ctx.setLineDash([]);
  }
  const leaderY = leader === "underscore" ? y + 2 : y;
  ctx.beginPath();
  ctx.moveTo(x1, leaderY);
  ctx.lineTo(x2, leaderY);
  ctx.stroke();
  ctx.restore();
}
