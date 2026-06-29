import type {
  EditorBlockNode,
  EditorLayoutPage,
  EditorLayoutParagraph,
  EditorNamedStyle,
  EditorPageSettings,
} from "@/core/model.js";
import type { ITextMeasurer } from "@/core/engine.js";
import type { LayoutProjectionContext } from "./paragraphPagination.js";

export interface ProjectBlocksLayoutContext {
  blocks: EditorBlockNode[];
  pageSettings: EditorPageSettings;
  maxPageHeight: number;
  measuredHeights?: Record<string, number>;
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>;
  styles?: Record<string, EditorNamedStyle>;
  pageOffset?: number;
  totalPages?: number;
  existingPages?: EditorLayoutPage[];
  measurer?: ITextMeasurer;
  reservedHeightByPageIndex?: Map<number, number>;
  defaultTabStop?: number;
  /**
   * Overrides the line-wrapping width (default: full page content width). Used
   * by the multi-column flow to wrap at a single column's width.
   */
  contentWidthOverride?: number;
  projectionContext?: LayoutProjectionContext;
}
