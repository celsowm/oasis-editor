import type { EditorBlockNode, EditorLayoutBlock } from "@/core/model.js";
import { domTextMeasurer } from "@/ui/textMeasurement.js";
import type { HeaderFooterLayoutContext } from "./headerFooterLayoutContext.js";
import { projectHeaderFooterBlocksWithDependencies } from "./headerFooterProjection.js";
import {
  getProjectedParagraphBlockHeight,
  projectParagraphLayout,
} from "./paragraphPagination.js";
import { estimateTableBlockHeight } from "./tablePagination.js";

export function projectHeaderFooterBlocks(
  blocks: EditorBlockNode[],
  context: HeaderFooterLayoutContext = {},
): EditorLayoutBlock[] {
  return projectHeaderFooterBlocksWithDependencies(
    blocks,
    {
      projectParagraphLayout,
      estimateTableBlockHeight,
      getProjectedParagraphBlockHeight,
    },
    {
      ...context,
      measurer: context.measurer ?? domTextMeasurer,
    },
  );
}
