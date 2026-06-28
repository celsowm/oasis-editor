import type { EditorLayoutLine } from "@/core/model.js";
import { EMPHASIS_GLYPH } from "@/core/textStyleMappings.js";

// Run emphasis mark (w:em): a small glyph drawn above each character (below for
// underDot), centered on the slot.
export function drawFragmentEmphasis(
  ctx: CanvasRenderingContext2D,
  line: EditorLayoutLine,
  fragment: EditorLayoutLine["fragments"][number],
  slotByOffset: Map<number, EditorLayoutLine["slots"][number]>,
  originX: number,
  originY: number,
  mark: string,
  color: string,
) {
  if (mark === "none") return;
  const glyph = EMPHASIS_GLYPH[mark];
  if (!glyph) return;
  const below = mark === "underDot";
  const y = below
    ? originY + line.top + line.height + 1
    : originY + line.top + 2;
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = below ? "top" : "bottom";
  ctx.font = `400 ${Math.max(6, line.height * 0.35)}px Calibri`;
  for (const char of fragment.chars) {
    if (char.char === "\n" || char.char === "\t" || char.char === " ") continue;
    const slot = slotByOffset.get(char.paragraphOffset);
    const nextSlot = slotByOffset.get(char.paragraphOffset + 1);
    if (!slot) continue;
    const centerX = nextSlot
      ? (slot.left + nextSlot.left) / 2
      : slot.left + line.height * 0.25;
    ctx.fillText(glyph, originX + centerX, y);
  }
  ctx.restore();
}
