import type {
  EditorBlockNode,
  EditorLayoutBlock,
  EditorLayoutParagraph,
} from "@/core/model.js";
import { domTextMeasurer } from "@/ui/textMeasurement.js";
import type { HeaderFooterLayoutContext } from "./headerFooterLayoutContext.js";
import { projectHeaderFooterBlocksWithDependencies } from "./headerFooterProjection.js";
import {
  EMPTY_PROJECTION_CONTEXT,
  getProjectedParagraphBlockHeight,
  projectParagraphLayout,
} from "./paragraphPagination.js";
import { estimateTableBlockHeight } from "./tablePagination.js";

export function projectHeaderFooterBlocks(
  blocks: EditorBlockNode[],
  context: HeaderFooterLayoutContext = {},
): EditorLayoutBlock[] {
  const projectionCtx = context.projectionContext ?? EMPTY_PROJECTION_CONTEXT;
  return projectHeaderFooterBlocksWithDependencies(
    blocks,
    {
      projectParagraphLayout: (
        paragraph,
        pageIndex,
        totalPages,
        styles,
        contentWidth,
        measurer,
        defaultTabStop,
      ): EditorLayoutParagraph =>
        projectParagraphLayout(
          paragraph,
          pageIndex,
          totalPages,
          styles,
          contentWidth,
          measurer,
          defaultTabStop,
          projectionCtx,
        ),
      estimateTableBlockHeight,
      getProjectedParagraphBlockHeight,
    },
    {
      ...context,
      measurer: context.measurer ?? domTextMeasurer,
    },
  );
}
