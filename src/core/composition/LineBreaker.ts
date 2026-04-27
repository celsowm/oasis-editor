import { TextRun } from "../document/BlockTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";

export interface LineBrokenResult {
  text: string;
  width: number;
}

export const breakTextIntoLines = (
  runs: TextRun[],
  maxWidth: number,
  measure: TextMeasurer,
  defaultFontFamily: string,
  defaultFontSize: number,
  isHeading: boolean,
): LineBrokenResult[] => {
  const lines: LineBrokenResult[] = [];

  let currentLineText = "";
  let currentLineWidth = 0;

  for (const run of runs) {
    const weight = run.marks?.bold || isHeading ? 700 : 400;
    const style = run.marks?.italic ? "italic" : "normal";
    const family = run.marks?.fontFamily || defaultFontFamily;
    const size = run.marks?.fontSize || defaultFontSize;

    const words = run.text.split(/(\n|[ \t]+)/);

    for (const segment of words) {
      if (!segment) continue;

      if (segment === "\n") {
        lines.push({ text: currentLineText + "\n", width: currentLineWidth });
        currentLineText = "";
        currentLineWidth = 0;
        continue;
      }

      const metrics = measure.measureText({
        text: segment,
        fontFamily: family,
        fontSize: size,
        fontWeight: weight,
        fontStyle: style,
      });

      if (currentLineWidth + metrics.width <= maxWidth || !currentLineText) {
        currentLineText += segment;
        currentLineWidth += metrics.width;
      } else {
        lines.push({ text: currentLineText, width: currentLineWidth });
        currentLineText = segment.trimStart() ? segment : "";
        currentLineWidth = segment.trimStart() ? metrics.width : 0;
      }
    }
  }

  if (currentLineText) {
    lines.push({ text: currentLineText, width: currentLineWidth });
  }

  return lines;
};
