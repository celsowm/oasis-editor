import { LayoutFragment, LineInfo } from "../../core/layout/LayoutFragment.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { TextRun } from "../../core/document/BlockTypes.js";

/**
 * Calculates extra spacing per space character for justified text.
 */
export function calculateJustificationExtraSpace(
  fragment: LayoutFragment,
  targetLine: LineInfo,
): number {
  if (fragment.align !== "justify" || !fragment.lines) return 0;

  const isLastLine = targetLine === fragment.lines[fragment.lines.length - 1];
  if (isLastLine) return 0;

  const lineText = targetLine.text.trimEnd();
  const spaces = (lineText.match(/ /g) || []).length;
  if (spaces === 0) return 0;

  return (fragment.rect.width - targetLine.width) / spaces;
}

/**
 * Measures the width of a single text segment using the given fragment's typography
 * and the run's marks.
 */
export function measureSegmentWidth(
  text: string,
  run: TextRun,
  fragment: LayoutFragment,
  measurer: TextMeasurer,
): number {
  let fontWeight = fragment.typography.fontWeight;
  if (run.marks?.["bold"] || fragment.kind === "heading") fontWeight = 700;
  const fontStyle = run.marks?.["italic"] ? "italic" : "normal";

  const measured = measurer.measureText({
    text,
    fontFamily:
      (run.marks?.["fontFamily"] as string) || fragment.typography.fontFamily,
    fontSize:
      (run.marks?.["fontSize"] as number) || fragment.typography.fontSize,
    fontWeight,
    fontStyle,
  });

  return measured.width;
}

/**
 * Measures the total width from the start of a line up to a given offset,
 * accounting for justification, indentation, and per-run marks.
 *
 * This is the single shared implementation used by both TextMeasurementService
 * and PositionCalculator to avoid duplication.
 */
export function measureLineWidthUpToOffset(
  fragment: LayoutFragment,
  line: LineInfo,
  endOffset: number,
  measurer: TextMeasurer,
): number {
  const lineStartOffset = line.offsetStart;
  if (lineStartOffset === endOffset) return line.x;

  let totalWidth = line.x;
  const extraSpacePerGap = calculateJustificationExtraSpace(fragment, line);

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
      totalWidth += measureSegmentWidth(textToMeasure, run, fragment, measurer);

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
