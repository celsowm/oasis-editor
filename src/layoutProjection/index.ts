export {
  FOOTNOTE_MARKER_GUTTER_PX,
  PARAGRAPH_BORDER_PADDING_PX,
  PX_PER_POINT,
} from "./constants.js";
export {
  getParagraphBorderInsets,
  paragraphBetweenBorderMatches,
  type ParagraphBorderInsets,
} from "./paragraphBorders.js";
export { estimateParagraphBlockHeight } from "./blockHeights.js";
export { estimateTableBlockHeight } from "./tableProjection.js";
export {
  clearProjectedParagraphLayoutCache,
  measureParagraphLayoutFromRects,
  projectParagraphLayout,
  projectParagraphLayoutWithExclusions,
  resolveClosestOffsetInMeasuredLayout,
} from "./paragraphProjection.js";
export { projectHeaderFooterBlocks } from "./headerFooterFootnotes.js";
export {
  collectParagraphFloatingExclusions,
  getImageFloatingGeometry,
  getTextBoxFloatingGeometry,
  resolveFloatingObjectRect,
  type FloatingExclusionRect,
  type FloatingObjectRect,
} from "./floatingObjects.js";
export { projectBlocksLayout } from "./blocksPagination.js";
export { projectDocumentLayout } from "./documentLayout.js";
export {
  bumpLayoutMetricsEpoch,
  layoutMetricsEpoch,
} from "./layoutMetricsEpoch.js";
