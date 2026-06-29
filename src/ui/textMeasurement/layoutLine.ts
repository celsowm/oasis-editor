import type { EditorLayoutLine } from "@/core/model.js";

function buildSlots(
  startOffset: number,
  endOffset: number,
  lefts: number[],
  top: number,
  height: number,
): { paragraphId: string; offset: number; left: number; top: number; height: number; }[] {
  return Array.from(
    { length: endOffset - startOffset + 1 },
    (_, slotIndex): { paragraphId: string; offset: number; left: number; top: number; height: number; } => ({
      paragraphId: "",
      offset: startOffset + slotIndex,
      left: lefts[slotIndex] ?? lefts[lefts.length - 1] ?? 0,
      top,
      height,
    }),
  );
}

export function commitLine(
  lines: EditorLayoutLine[],
  paragraphId: string,
  startOffset: number,
  endOffset: number,
  slotLefts: number[],
  top: number,
  height: number,
  availableWidth?: number,
): void {
  lines.push({
    paragraphId,
    index: lines.length,
    startOffset,
    endOffset,
    top,
    height,
    availableWidth,
    slots: buildSlots(startOffset, endOffset, slotLefts, top, height).map(
      (slot): { paragraphId: string; offset: number; left: number; top: number; height: number; } => ({
        ...slot,
        paragraphId,
      }),
    ),
    fragments: [],
  });
}

export function shiftLine(
  line: EditorLayoutLine,
  deltaX: number,
): EditorLayoutLine {
  if (Math.abs(deltaX) < 0.01) {
    return line;
  }
  return {
    ...line,
    slots: line.slots.map((slot): { left: number; paragraphId: string; offset: number; top: number; height: number; } => ({
      ...slot,
      left: slot.left + deltaX,
    })),
  };
}
