import { LayoutStrategy } from "./LayoutStrategy.js";
import { BlockNode, isTableNode } from "../document/BlockTypes.js";
import { PaginationContext, createNewPage } from "./PaginationContext.js";
import { IFontManager } from "../typography/FontManager.js";
import { composeParagraph } from "../composition/ParagraphComposer.js";
import { LayoutFragment } from "../layout/LayoutFragment.js";
import { BLOCK_SPACING } from "../pages/PageTemplateTypes.js";
import { measureImageBlock } from "./BlockLayoutEngine.js";
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
    const composed = composeParagraph(block, width, ctx.measure, fontManager);

    if (
      ctx.currentY + composed.totalHeight >
      ctx.currentPage.contentRect.y + ctx.contentHeight
    ) {
      createNewPage(ctx);
    }

    const textLength = (block as any).children
      .map((child: any) => child.text)
      .join("").length;
      
    const fragment: LayoutFragment = {
      id: `fragment:${block.id}:0`,
      blockId: block.id,
      sectionId: ctx.section.id,
      pageId: ctx.currentPage.id,
      fragmentIndex: 0,
      kind: block.kind as any,
      startOffset: 0,
      endOffset: textLength,
      text: composed.text,
      rect: {
        x: ctx.currentPage.contentRect.x + containerX,
        y: ctx.currentY,
        width: width,
        height: composed.totalHeight,
      },
      typography: composed.typography,
      runs: composed.runs,
      marks: {},
      lines: composed.lines.map((line) => ({
        ...line,
        y: line.y + ctx.currentY,
      })),
      align: composed.align,
      indentation: composed.indentation,
      listNumber: composed.listNumber,
      listFormat: composed.listFormat,
      listLevel: composed.listLevel,
    };

    ctx.currentPage.fragments.push(fragment);
    ctx.fragmentsByBlockId[block.id] = [fragment];
    ctx.currentY += composed.totalHeight + 12; // BLOCK_SPACING
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
    const { fragment, height } = measureImageBlock(block as any, width, ctx.section, fontManager);
    
    if (ctx.currentY + height > ctx.currentPage.contentRect.y + ctx.contentHeight) {
        createNewPage(ctx);
    }

    // Apply alignment
    let xOffset = 0;
    const imgW = fragment.rect.width;
    const align = (block as any).align || "left";

    if (align === "center") {
      xOffset = (width - imgW) / 2;
    } else if (align === "right") {
      xOffset = width - imgW;
    }

    fragment.rect.x = ctx.currentPage.contentRect.x + containerX + xOffset;
    fragment.rect.y = ctx.currentY;
    fragment.pageId = ctx.currentPage.id;

    ctx.currentPage.fragments.push(fragment);
    ctx.fragmentsByBlockId[block.id] = [fragment];
    ctx.currentY += height + BLOCK_SPACING;
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
