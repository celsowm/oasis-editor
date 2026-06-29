import type { ITextMeasurer } from "@/core/engine.js";
import { domTextMeasurer } from "@/ui/textMeasurement.js";
import type { EditorLayoutLine } from "@/core/model.js";

export const canvasTextMeasurer: ITextMeasurer = {
  composeMeasuredParagraphLines: (options): EditorLayoutLine[] =>
    domTextMeasurer.composeMeasuredParagraphLines(options),
  resolveRenderedLineHeightPx: (styles, lineHeightMultiple): number =>
    domTextMeasurer.resolveRenderedLineHeightPx(styles, lineHeightMultiple),
};
