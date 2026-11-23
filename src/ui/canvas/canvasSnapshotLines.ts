import type { CanvasSnapshotLine } from "./canvasSnapshotTypes.js";
import type { EditorLayoutDisplayOffsetSpan } from "@/core/model.js";
import { displayOffsetToSource } from "@/layoutProjection/fieldDisplayOffsetMap.js";

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
  displayOffsetMap?:readonly EditorLayoutDisplayOffsetSpan[],
): CanvasSnapshotLine[] {
  const offset=(n:number)=>displayOffsetToSource(n,displayOffsetMap);
  return lines.map((line): CanvasSnapshotLine => ({
    startOffset: offset(line.startOffset),
    endOffset: offset(line.endOffset),
    top: topOffset + line.top,
    height: line.height,
    slots: line.slots.map((slot) => ({
      offset: offset(slot.offset),
      left: leftOffset + slot.left,
      top: topOffset + slot.top,
      height: slot.height,
    })),
  }));
}
