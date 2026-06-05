import type {
  EditorBlockNode,
  EditorLayoutBlock,
  EditorLayoutParagraph,
  EditorNamedStyle,
} from "../core/model.js";
import type { ITextMeasurer } from "../core/engine.js";
import { domTextMeasurer } from "../ui/textMeasurement.js";
import { projectHeaderFooterBlocksWithDependencies } from "./headerFooterProjection.js";
import {
  getProjectedParagraphBlockHeight,
  projectParagraphLayout,
} from "./paragraphPagination.js";
import { estimateTableBlockHeight } from "./tablePagination.js";

export function projectHeaderFooterBlocks(
  blocks: EditorBlockNode[],
  pageIndex?: number,
  totalPages?: number,
  measuredHeights?: Record<string, number>,
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
  layoutMode: "fast" | "wordParity" = "fast",
  measurer: ITextMeasurer = domTextMeasurer,
  defaultTabStop?: number,
): EditorLayoutBlock[] {
  return projectHeaderFooterBlocksWithDependencies(
    blocks,
    {
      projectParagraphLayout,
      estimateTableBlockHeight,
      getProjectedParagraphBlockHeight,
    },
    pageIndex,
    totalPages,
    measuredHeights,
    measuredParagraphLayouts,
    styles,
    contentWidth,
    layoutMode,
    measurer,
    defaultTabStop,
  );
}
