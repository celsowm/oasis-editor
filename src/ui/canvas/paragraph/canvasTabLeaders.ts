import type {
  EditorLayoutLine,
  EditorParagraphNode,
  EditorState,
} from "@/core/model.js";
import { resolveEffectiveParagraphStyle } from "@/core/model.js";
import { PX_PER_POINT } from "@/layoutProjection/constants.js";
import { CANVAS_DASH_DASHED, CANVAS_DASH_DOTTED } from "../canvasBorders.js";

export function resolveTabLeader(
  paragraph: EditorParagraphNode,
  line: EditorLayoutLine,
  tabLeft: number,
  state: EditorState,
): "dot" | "hyphen" | "underscore" | "heavy" | "middleDot" | undefined {
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    state.document.styles,
  );
  const tabs = paragraphStyle.tabs ?? [];
  if (tabs.length === 0) return undefined;
  const lineStart = line.slots[0]?.left ?? 0;
  const relativeLeft = tabLeft - lineStart;
  const stop = tabs
    .filter((tab) => tab.type !== "clear")
    .map((tab) => ({ ...tab, positionPx: tab.position * PX_PER_POINT }))
    .filter((tab) => tab.positionPx > relativeLeft + 0.01)
    .sort((a, b) => a.positionPx - b.positionPx)[0];
  return stop?.leader && stop.leader !== "none" ? stop.leader : undefined;
}

export function drawTabLeader(
  ctx: CanvasRenderingContext2D,
  leader: NonNullable<ReturnType<typeof resolveTabLeader>>,
  x1: number,
  x2: number,
  y: number,
) {
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
