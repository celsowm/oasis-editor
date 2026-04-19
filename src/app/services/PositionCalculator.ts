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
   * Converts a logical position to a block-relative offset.
   */
  getOffsetInBlock(position: LogicalPosition): number {
    const fragments = this.layout.fragmentsByBlockId[position.blockId];
    if (!fragments || fragments.length === 0) return position.offset;

    for (const fragment of fragments) {
      let offsetInFragment = 0;
      for (const run of fragment.runs) {
        if (run.id === position.inlineId) {
          return fragment.startOffset + offsetInFragment + position.offset;
        }
        offsetInFragment += run.text.length;
      }
    }

    // If we didn't find the run ID, it might be an empty block or just at the end
    return position.offset;
  }

  getFragmentContainingPosition(
    position: LogicalPosition,
  ): LayoutFragment | null {
    const fragments = this.layout.fragmentsByBlockId[position.blockId];
    if (!fragments || fragments.length === 0) return null;

    const absoluteOffset = this.getOffsetInBlock(position);

    return (
      fragments.find(
        (f) => absoluteOffset >= f.startOffset && absoluteOffset <= f.endOffset,
      ) ?? fragments[0]
    );
  }

  calculateYPosition(position: LogicalPosition): number | null {
    const fragment = this.getFragmentContainingPosition(position);
    if (!fragment || !fragment.lines) {
      return fragment?.rect.y ?? null;
    }

    const absoluteOffset = this.getOffsetInBlock(position);
    const offsetInBlock = absoluteOffset - fragment.startOffset;

    for (let i = 0; i < fragment.lines.length; i++) {
      const line = fragment.lines[i];
      // Use inclusive/exclusive bounds: at exactly lineEnd, it might belong to NEXT line
      // unless it's the last line of the fragment
      if (
        offsetInBlock >= line.offsetStart &&
        offsetInBlock <= line.offsetEnd
      ) {
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

    // Get the absolute offset in the whole block
    const absoluteOffset = this.getOffsetInBlock(position);

    // Line offsetStart/offsetEnd are block-relative
    const offsetInBlock = absoluteOffset - fragment.startOffset;

    let targetLine = fragment.lines ? fragment.lines[0] : null;
    if (fragment.lines) {
      for (const line of fragment.lines) {
        // Use exclusive upper bound - position at exactly line.end goes to NEXT line
        if (
          offsetInBlock >= line.offsetStart &&
          offsetInBlock <= line.offsetEnd
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

    let totalWidth = targetLine?.x ?? 0;

    if (offsetInLine === 0) return totalWidth;

    // Justification logic
    let extraSpacePerGap = 0;
    if (fragment.align === "justify" && targetLine && fragment.lines) {
      const isLastLine =
        targetLine === fragment.lines[fragment.lines.length - 1];
      if (!isLastLine) {
        const lineText = targetLine.text.trimEnd();
        const spaces = lineText.match(/ /g) || [];
        if (spaces.length > 0) {
          extraSpacePerGap =
            (fragment.rect.width - targetLine.width) / spaces.length;
        }
      }
    }

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

        // Add justification extra space
        if (extraSpacePerGap > 0) {
          const spacesInSegment = (textToMeasure.match(/ /g) || []).length;
          totalWidth += spacesInSegment * extraSpacePerGap;
        }
      }

      currentGlobalOffset += run.text.length;
      if (currentGlobalOffset >= lineStartOffset + offsetInLine) break;
    }

    return totalWidth;
  }
}
