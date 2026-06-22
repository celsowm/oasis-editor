import type {
  EditorBlockNode,
  EditorLayoutBlock,
  EditorLayoutParagraph,
  EditorNamedStyle,
} from "@/core/model.js";
import type { ITextMeasurer } from "@/core/engine.js";

export interface HeaderFooterLayoutContext {
  pageIndex?: number;
  totalPages?: number;
  measuredHeights?: Record<string, number>;
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>;
  styles?: Record<string, EditorNamedStyle>;
  contentWidth?: number;
  measurer?: ITextMeasurer;
  defaultTabStop?: number;
}

export type HeaderFooterBlockProjector = (
  blocks: EditorBlockNode[],
  context?: HeaderFooterLayoutContext,
) => EditorLayoutBlock[];
