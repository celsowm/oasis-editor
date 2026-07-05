import type { CanvasSnapshotLine } from "./canvasSnapshotTypes.js";

interface SourceSlot {
  offset: number;
  left: number;
  top: number;
  height: number;
}

interface SourceLine {
  startOffset: number;
  endOffset: number;
  top: number;
  height: number;
  slots: SourceSlot[];
}

/**
 * Projects layout lines/slots into screen-anchored snapshot geometry by adding
 * the given left/top origin offsets. Shared by the paragraph-block and
 * table-cell walkers, which build the identical shape from different origins.
 */
export function toSnapshotLines(
  lines: SourceLine[],
  leftOffset: number,
  topOffset: number,
): CanvasSnapshotLine[] {
  return lines.map(
    (line): CanvasSnapshotLine => ({
      startOffset: line.startOffset,
      endOffset: line.endOffset,
      top: topOffset + line.top,
      height: line.height,
      slots: line.slots.map((slot) => ({
        offset: slot.offset,
        left: leftOffset + slot.left,
        top: topOffset + slot.top,
        height: slot.height,
      })),
    }),
  );
}
