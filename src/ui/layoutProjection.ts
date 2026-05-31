export {
  FOOTNOTE_MARKER_GUTTER_PX,
} from "./layoutProjection/constants.js";
export {
  estimateParagraphBlockHeight,
} from "./layoutProjection/blockHeights.js";
export {
  estimateTableBlockHeight,
} from "./layoutProjection/tableProjection.js";
export {
  measureParagraphLayoutFromRects,
  projectParagraphLayout,
  resolveClosestOffsetInMeasuredLayout,
} from "./layoutProjection/paragraphProjection.js";
export {
  projectHeaderFooterBlocks,
} from "./layoutProjection/headerFooterFootnotes.js";
export {
  projectBlocksLayout,
  projectDocumentLayout,
} from "./layoutProjection/documentPagination.js";
