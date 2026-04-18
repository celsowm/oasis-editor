import { LogicalPosition } from "../../core/selection/SelectionTypes.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { LayoutFragment } from "../../core/layout/LayoutFragment.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";

export class PositionCalculator {
  private layout: LayoutState;

  constructor(layout: LayoutState) {
    this.layout = layout;
  }

  /**
   * Converts a run-relative position to a block-relative offset.
   */
  getAbsoluteOffsetInBlock(
    position: LogicalPosition,
    fragment: LayoutFragment | undefined,
  ): number {
    if (!fragment || !fragment.runs) return position.offset;

    let absoluteOffset = 0;
    for (const run of fragment.runs) {
      if (run.id === position.inlineId) {
        return absoluteOffset + position.offset;
      }
      absoluteOffset += run.text.length;
    }
    return position.offset;
  }

  calculateYPosition(position: LogicalPosition): number | null {
    const fragments = this.layout.fragmentsByBlockId[position.blockId];
    if (!fragments || fragments.length === 0) return null;

    // First find which fragment contains the position
    const firstFragment = fragments[0];
    const candidateAbsOffset = this.getAbsoluteOffsetInBlock(
      position,
      firstFragment,
    );

    // Based on that offset, find the actual fragment
    const fragment =
      fragments.find(
        (f) =>
          candidateAbsOffset >= f.startOffset &&
          candidateAbsOffset <= f.endOffset,
      ) ?? firstFragment;

    if (!fragment || !fragment.lines) {
      return fragment?.rect.y ?? null;
    }

    // Get the REAL absolute offset using the correct fragment
    const absoluteOffset = this.getAbsoluteOffsetInBlock(position, fragment);

    // Line offsetStart/offsetEnd are block-relative (not fragment-relative)
    // But if fragment.startOffset > 0, need to adjust
    const offsetInBlock = absoluteOffset - fragment.startOffset;

    for (let i = 0; i < fragment.lines.length; i++) {
      const line = fragment.lines[i];
      // Use exclusive upper bound - position at exactly line.end goes to NEXT line
      if (offsetInBlock >= line.offsetStart && offsetInBlock < line.offsetEnd) {
        return line.y;
      }
    }

    return fragment.lines[fragment.lines.length - 1].y;
  }

  calculateXOffset(
    position: LogicalPosition,
    fragment: LayoutFragment | null,
    measurer: TextMeasurer,
  ): number {
    if (!fragment || !measurer) return 0;

    // Get the absolute offset using this fragment's runs
    const absoluteOffset = this.getAbsoluteOffsetInBlock(position, fragment);

    // Line offsetStart/offsetEnd are block-relative (from ParagraphComposer)
    // Calculate offset relative to block (account for fragment's start)
    const offsetInBlock = absoluteOffset - fragment.startOffset;

    let targetLine = fragment.lines ? fragment.lines[0] : null;
    if (fragment.lines) {
      for (const line of fragment.lines) {
        // Use exclusive upper bound - position at exactly line.end goes to NEXT line
        if (
          offsetInBlock >= line.offsetStart &&
          offsetInBlock < line.offsetEnd
        ) {
          targetLine = line;
          break;
        }
      }
      if (!targetLine) {
        targetLine = fragment.lines[fragment.lines.length - 1];
      }
    }

    const lineStartOffset = targetLine ? targetLine.offsetStart : 0;
    const offsetInLine = Math.max(0, offsetInBlock - lineStartOffset);

    if (offsetInLine === 0) return 0;

    let totalWidth = 0;
    let currentGlobalOffset = 0;

    const runs = fragment.runs?.length
      ? fragment.runs
      : [{ id: "", text: fragment.text, marks: fragment.marks ?? {} }];

    for (const run of runs) {
      const runStart = currentGlobalOffset;
      const runEnd = currentGlobalOffset + run.text.length;

      const measureStart = Math.max(lineStartOffset, runStart);
      const measureEnd = Math.min(lineStartOffset + offsetInLine, runEnd);

      if (measureStart < measureEnd) {
        const textToMeasure = run.text.substring(
          measureStart - runStart,
          measureEnd - runStart,
        );

        let fontWeight = fragment.typography.fontWeight;
        if (run.marks?.["bold"] || fragment.kind === "heading")
          fontWeight = 700;
        const fontStyle = run.marks?.["italic"] ? "italic" : "normal";

        const measured = measurer.measureText({
          text: textToMeasure,
          fontFamily:
            (run.marks?.["fontFamily"] as string) ||
            fragment.typography.fontFamily,
          fontSize:
            (run.marks?.["fontSize"] as number) || fragment.typography.fontSize,
          fontWeight,
          fontStyle,
        });
        totalWidth += measured.width;
      }

      currentGlobalOffset += run.text.length;
      if (currentGlobalOffset >= lineStartOffset + offsetInLine) break;
    }

    return totalWidth;
  }
}
