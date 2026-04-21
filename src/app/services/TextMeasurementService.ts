import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { LayoutFragment, LineInfo } from "../../core/layout/LayoutFragment.js";

export class TextMeasurementService {
  constructor(private measurer: TextMeasurer) {}

  public measureWidthUpToOffset(
    fragment: LayoutFragment,
    line: LineInfo,
    endOffset: number,
  ): number {
    const lineStartOffset = line.offsetStart;
    if (lineStartOffset === endOffset) return line.x;

    let totalWidth = line.x;

    // Justification logic
    let extraSpacePerGap = 0;
    if (fragment.align === "justify" && line && fragment.lines) {
      const isLastLine = line === fragment.lines[fragment.lines.length - 1];
      if (!isLastLine) {
        const lineText = line.text.trimEnd();
        const spaces = lineText.match(/ /g) || [];
        if (spaces.length > 0) {
          extraSpacePerGap = (fragment.rect.width - line.width) / spaces.length;
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
      const measureEnd = Math.min(endOffset, runEnd);

      if (measureStart < measureEnd) {
        const textToMeasure = run.text.substring(
          measureStart - runStart,
          measureEnd - runStart,
        );
        let fontWeight = fragment.typography.fontWeight;
        if (run.marks?.["bold"] || fragment.kind === "heading")
          fontWeight = 700;
        const fontStyle = run.marks?.["italic"] ? "italic" : "normal";
        const metrics = this.measurer.measureText({
          text: textToMeasure,
          fontFamily:
            (run.marks?.["fontFamily"] as string) ||
            fragment.typography.fontFamily,
          fontSize:
            (run.marks?.["fontSize"] as number) || fragment.typography.fontSize,
          fontWeight,
          fontStyle,
        });
        totalWidth += metrics.width;

        if (extraSpacePerGap > 0) {
          const spacesInSegment = (textToMeasure.match(/ /g) || []).length;
          totalWidth += spacesInSegment * extraSpacePerGap;
        }
      }
      currentGlobalOffset += run.text.length;
      if (currentGlobalOffset >= endOffset) break;
    }
    return totalWidth;
  }
}
