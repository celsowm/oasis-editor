import type { ITextMeasurer } from "../core/engine.js";
import { composeMeasuredParagraphLines } from "./textMeasurement/composer.js";
import { resolveRenderedLineHeightPx } from "./textMeasurement/fontMetrics.js";

export { clearTextMeasureCache } from "./textMeasurement/characterWidth.js";
export { resolveRenderedLineHeightPx } from "./textMeasurement/fontMetrics.js";
export {
  applyLineRule,
  resolveLineSpacing,
} from "./textMeasurement/paragraphLineHeight.js";
export {
  composeMeasuredParagraphLines,
  measureParagraphMinContentWidthPx,
} from "./textMeasurement/composer.js";
export type { TextMeasureOptions } from "./textMeasurement/types.js";

export const domTextMeasurer: ITextMeasurer = {
  composeMeasuredParagraphLines,
  resolveRenderedLineHeightPx,
};
