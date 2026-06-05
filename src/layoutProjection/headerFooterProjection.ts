import type {
  EditorBlockNode,
  EditorLayoutBlock,
  EditorLayoutParagraph,
  EditorNamedStyle,
  EditorParagraphNode,
} from "../core/model.js";
import type { ITextMeasurer } from "../core/engine.js";

type ProjectParagraphLayoutFn = (
  paragraph: EditorParagraphNode,
  pageIndex?: number,
  totalPages?: number,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
  measurer?: ITextMeasurer,
  defaultTabStop?: number,
) => EditorLayoutParagraph;

type EstimateTableBlockHeightFn = (
  block: Extract<EditorBlockNode, { type: "table" }>,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
  measurer?: ITextMeasurer,
  defaultTabStop?: number,
) => number;
type GetProjectedParagraphBlockHeightFn = (
  paragraph: EditorParagraphNode,
  layout: EditorLayoutParagraph,
  styles: Record<string, EditorNamedStyle> | undefined,
) => number;

export function projectHeaderFooterBlocksWithDependencies(
  blocks: EditorBlockNode[],
  deps: {
    projectParagraphLayout: ProjectParagraphLayoutFn;
    estimateTableBlockHeight: EstimateTableBlockHeightFn;
    getProjectedParagraphBlockHeight: GetProjectedParagraphBlockHeightFn;
  },
  pageIndex?: number,
  totalPages?: number,
  measuredHeights?: Record<string, number>,
  _measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
  measurer?: ITextMeasurer,
  defaultTabStop?: number,
): EditorLayoutBlock[] {
  return blocks.map((block, index) => {
    if (block.type === "paragraph") {
      const layout = deps.projectParagraphLayout(
        block,
        pageIndex,
        totalPages,
        styles,
        contentWidth,
        measurer,
        defaultTabStop,
      );
      return {
        blockId: block.id,
        sourceBlockId: block.id,
        blockType: block.type,
        paragraphId: block.id,
        globalIndex: index,
        estimatedHeight:
          measuredHeights?.[block.id] ??
          deps.getProjectedParagraphBlockHeight(block, layout, styles),
        layout,
        sourceBlock: block,
      };
    }
    return {
      blockId: block.id,
      sourceBlockId: block.id,
      blockType: block.type,
      globalIndex: index,
      estimatedHeight:
        measuredHeights?.[block.id] ??
        deps.estimateTableBlockHeight(
          block,
          styles,
          contentWidth,
          measurer,
          defaultTabStop,
        ),
      sourceBlock: block,
    };
  });
}
