import type { ITextMeasurer } from "@/core/engine.js";
import { domTextMeasurer } from "@/ui/textMeasurement.js";

export const canvasTextMeasurer: ITextMeasurer = {
  composeMeasuredParagraphLines: (options) =>
    domTextMeasurer.composeMeasuredParagraphLines(options),
  resolveRenderedLineHeightPx: (styles, lineHeightMultiple) =>
    domTextMeasurer.resolveRenderedLineHeightPx(styles, lineHeightMultiple),
};
