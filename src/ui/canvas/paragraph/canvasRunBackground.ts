import type { EditorLayoutLine, EditorCaretSlot } from "@/core/model.js";
import { PX_PER_POINT } from "@/layoutProjection/constants.js";
import { drawBorderBox } from "../canvasBorders.js";

export function resolveFragmentPaintBounds(
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
): { left: number; right: number } | null {
  const slotByOffset = new Map(
    line.slots.map((slot): readonly [number, EditorCaretSlot] => [slot.offset, slot] as const),
  );
  const slots = fragment.chars
    .filter((char): boolean => char.char !== "\n")
    .map((char): any => slotByOffset.get(char.paragraphOffset))
    .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot));
  if (slots.length === 0) return null;

  const first = slots[0]!;
  const last = slots[slots.length - 1]!;
  const nextSlot = slotByOffset.get(last.offset + 1);
  if (nextSlot) {
    return { left: first.left, right: nextSlot.left };
  }

  const lastSlotIndex = line.slots.findIndex(
    (slot): boolean => slot.offset === last.offset,
  );
  const followingSlot =
    lastSlotIndex >= 0 ? line.slots[lastSlotIndex + 1] : undefined;
  return {
    left: first.left,
    right: followingSlot?.left ?? last.left + Math.max(8, line.height * 0.45),
  };
}

function drawFragmentColorRect(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
  color: string,
  alpha?: number,
): void {
  const bounds = resolveFragmentPaintBounds(line, fragment);
  if (!bounds) return;
  ctx.save();
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(
    originX + bounds.left,
    originY + line.top + 2,
    Math.max(0, bounds.right - bounds.left),
    Math.max(2, line.height - 4),
  );
  ctx.restore();
}

export function drawFragmentHighlight(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
  color: string,
): void {
  drawFragmentColorRect(ctx, line, fragment, originX, originY, color, 0.35);
}

// Run shading (w:shd) is a solid background fill behind the text.
export function drawFragmentShading(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
  color: string,
): void {
  drawFragmentColorRect(ctx, line, fragment, originX, originY, color);
}

// Run border (w:bdr): a box stroked around the run's text on all four edges.
export function drawFragmentBorder(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  originX: number,
  originY: number,
  border: {
    width: number;
    type: "solid" | "dashed" | "dotted" | "none";
    color: string;
  },
): void {
  if (border.type === "none" || border.width <= 0) return;
  const bounds = resolveFragmentPaintBounds(line, fragment);
  if (!bounds) return;
  const edge = { ...border, width: Math.max(0.5, border.width * PX_PER_POINT) };
  drawBorderBox(
    ctx,
    originX + bounds.left,
    originY + line.top + 1,
    Math.max(0, bounds.right - bounds.left),
    Math.max(2, line.height - 2),
    { top: edge, right: edge, bottom: edge, left: edge },
  );
}
