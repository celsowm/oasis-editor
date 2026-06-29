import type {
  EditorDocument,
  EditorLayoutFragment,
  EditorLayoutLine,
  EditorParagraphNode,
  EditorTextStyle,
  EditorCaretSlot,
} from "@/core/model.js";
import { resolveEffectiveParagraphStyle } from "@/core/model.js";
import { EMPHASIS_GLYPH } from "@/core/textStyleMappings.js";
import { PX_PER_POINT } from "@/layoutProjection/constants.js";
import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import { pxToPt } from "@/export/pdf/units.js";
import { resolveFragmentSlots } from "../fragmentGeometry.js";

// Run emphasis mark (w:em): a small glyph centered above each glyph (below for underDot).
export function drawFragmentEmphasis(
  writer: OasisPdfWriter,
  pageIndex: number,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  originX: number,
  originY: number,
  styles: Required<EditorTextStyle>,
): void {
  const mark = styles.emphasisMark;
  if (!mark || mark === "none") return;
  const glyph = EMPHASIS_GLYPH[mark];
  if (!glyph) return;
  const slots = resolveFragmentSlots(line, fragment);
  const below = mark === "underDot";
  const size = Math.max(4, line.height * 0.35);
  const y = below
    ? originY + line.top + line.height + size
    : originY + line.top + size;
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i]!;
    if (slot.char === " " || slot.char === "\t" || slot.char === "\n") continue;
    const next = slots[i + 1];
    const centerX = next
      ? (slot.left + next.left) / 2
      : slot.left + line.height * 0.25;
    writer.drawText(pageIndex, {
      x: pxToPt(originX + centerX - size * 0.25),
      y: pxToPt(y),
      text: glyph,
      fontSize: pxToPt(size),
      color: styles.color ?? "#000000",
    });
  }
}

export function drawTabLeaders(
  writer: OasisPdfWriter,
  pageIndex: number,
  paragraph: EditorParagraphNode,
  line: EditorLayoutLine,
  fragment: EditorLayoutFragment,
  document: EditorDocument,
  originX: number,
  baselineY: number,
  color: string,
): void {
  const slotByOffset = new Map(
    line.slots.map(
      (slot): readonly [number, EditorCaretSlot] =>
        [slot.offset, slot] as const,
    ),
  );
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    document.styles,
  );
  const tabs = paragraphStyle.tabs ?? [];

  for (const char of fragment.chars) {
    if (char.char !== "\t") continue;
    const slot = slotByOffset.get(char.paragraphOffset);
    const nextSlot = slotByOffset.get(char.paragraphOffset + 1);
    if (!slot || !nextSlot) continue;

    const lineStart = line.slots[0]?.left ?? 0;
    const relativeLeft = slot.left - lineStart;
    const stop = tabs
      .filter((tab): boolean => tab.type !== "clear")
      .map((tab) => ({ ...tab, positionPx: tab.position * PX_PER_POINT }))
      .filter((tab): boolean => tab.positionPx > relativeLeft + 0.01)
      .sort((a, b): number => a.positionPx - b.positionPx)[0];
    const leader =
      stop?.leader && stop.leader !== "none" ? stop.leader : undefined;
    if (!leader) continue;

    const y = leader === "underscore" ? baselineY + 2 : baselineY;
    writer.drawLine(pageIndex, {
      x1: pxToPt(originX + slot.left),
      y1: pxToPt(y),
      x2: pxToPt(originX + nextSlot.left),
      y2: pxToPt(y),
      stroke: color,
      lineWidth: pxToPt(leader === "heavy" ? 1.5 : 1),
      dashArray:
        leader === "dot" || leader === "middleDot"
          ? [1, 3]
          : leader === "hyphen"
            ? [5, 3]
            : undefined,
    });
  }
}
