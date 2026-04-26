import { BlockNode } from "../document/BlockTypes.js";
import { PaginationContext } from "./PaginationContext.js";
import { IFontManager } from "../typography/FontManager.js";

export interface LayoutStrategy {
  layout(
    block: BlockNode,
    ctx: PaginationContext,
    fontManager: IFontManager,
    containerX: number,
    containerWidth?: number,
  ): void;
}
