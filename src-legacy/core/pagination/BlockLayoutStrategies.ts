import { LayoutStrategy } from "./LayoutStrategy.js";
import { BlockNode } from "../document/BlockTypes.js";
import { PaginationContext, createNewPage } from "./PaginationContext.js";
import { IFontManager } from "../typography/FontManager.js";
import { LayoutFragment } from "../layout/LayoutFragment.js";
import { BLOCK_SPACING } from "../pages/PageTemplateTypes.js";
import { getBlockBehavior } from "../document/BlockBehavior.js";
import { layoutTableBlock } from "./TableLayoutEngine.js";

export class ParagraphLayoutStrategy implements LayoutStrategy {
  layout(
    block: BlockNode,
    ctx: PaginationContext,
    fontManager: IFontManager,
    containerX: number,
    containerWidth?: number,
  ): void {
    const width = containerWidth ?? ctx.contentWidth;
    const behavior = getBlockBehavior(block.kind);
    if (!behavior) return;

    const result = behavior.measure(block, width, ctx.measure, ctx.section, fontManager, ctx.currentY);

    if (
      ctx.currentY + result.height >
      ctx.currentPage.contentRect.y + ctx.contentHeight
    ) {
      createNewPage(ctx);
      // Re-measure with new currentY
      const reResult = behavior.measure(block, width, ctx.measure, ctx.section, fontManager, ctx.currentY);
      result.height = reResult.height;
      result.fragments = reResult.fragments;
    }

    for (const fragment of result.fragments) {
        fragment.pageId = ctx.currentPage.id;
        fragment.rect.x += ctx.currentPage.contentRect.x + containerX;
        ctx.currentPage.fragments.push(fragment);
    }

    ctx.fragmentsByBlockId[block.id] = result.fragments;
    ctx.currentY += result.height + BLOCK_SPACING;
  }
}

export class ImageLayoutStrategy implements LayoutStrategy {
  layout(
    block: BlockNode,
    ctx: PaginationContext,
    fontManager: IFontManager,
    containerX: number,
    containerWidth?: number,
  ): void {
    const width = containerWidth ?? ctx.contentWidth;
    const behavior = getBlockBehavior("image");
    if (!behavior) return;

    const result = behavior.measure(block, width, ctx.measure, ctx.section, fontManager, ctx.currentY);
    
    if (ctx.currentY + result.height > ctx.currentPage.contentRect.y + ctx.contentHeight) {
        createNewPage(ctx);
        const reResult = behavior.measure(block, width, ctx.measure, ctx.section, fontManager, ctx.currentY);
        result.height = reResult.height;
        result.fragments = reResult.fragments;
    }

    const fragment = result.fragments[0];
    // Apply alignment (ImageBehavior returns x=0)
    let xOffset = 0;
    const imgW = fragment.rect.width;
    const align = (block as any).align || "left";

    if (align === "center") {
      xOffset = (width - imgW) / 2;
    } else if (align === "right") {
      xOffset = width - imgW;
    }

    fragment.rect.x += ctx.currentPage.contentRect.x + containerX + xOffset;
    fragment.pageId = ctx.currentPage.id;

    ctx.currentPage.fragments.push(fragment);
    ctx.fragmentsByBlockId[block.id] = [fragment];
    ctx.currentY += result.height + BLOCK_SPACING;
  }
}

export class PageBreakLayoutStrategy implements LayoutStrategy {
  layout(
    block: BlockNode,
    ctx: PaginationContext,
    fontManager: IFontManager,
    containerX: number,
  ): void {
    createNewPage(ctx);
    const pbFragment: LayoutFragment = {
      id: `fragment:${block.id}:0`,
      blockId: block.id,
      sectionId: ctx.section.id,
      pageId: ctx.currentPage.id,
      fragmentIndex: 0,
      kind: "page-break",
      startOffset: 0,
      endOffset: 0,
      text: "",
      rect: {
        x: ctx.currentPage.contentRect.x + containerX,
        y: ctx.currentY,
        width: 0,
        height: 0,
      },
      typography: fontManager.getTypographyForBlock("page-break"),
      runs: [],
      marks: {},
      lines: [],
      align: "left",
    };
    ctx.currentPage.fragments.push(pbFragment);
    ctx.fragmentsByBlockId[block.id] = [pbFragment];
  }
}

export class TableLayoutStrategy implements LayoutStrategy {
  layout(
    block: BlockNode,
    ctx: PaginationContext,
    fontManager: IFontManager,
    containerX: number,
  ): void {
    layoutTableBlock(block as any, ctx, containerX);
  }
}
