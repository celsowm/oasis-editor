import { DocumentModel } from "../document/DocumentTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { PageTemplate } from "../pages/PageTemplateTypes.js";
import { PageLayout, LayoutState } from "../layout/LayoutTypes.js";
import { BlockNode, isTableNode, isTextBlock } from "../document/BlockTypes.js";
import {
  PaginationContext,
  createNewPage,
  createPaginationContext,
} from "./PaginationContext.js";
import { applyHeaderFooterToPage } from "./HeaderFooterLayoutEngine.js";
import { IFontManager } from "../typography/FontManager.js";
import { LayoutStrategy } from "./LayoutStrategy.js";
import {
  ParagraphLayoutStrategy,
  ImageLayoutStrategy,
  PageBreakLayoutStrategy,
  TableLayoutStrategy,
} from "./BlockLayoutStrategies.js";

const FOOTNOTE_SEPARATOR_HEIGHT = 16;
const FOOTNOTE_ENTRY_GAP = 4;

const strategies: Record<string, LayoutStrategy> = {
  paragraph: new ParagraphLayoutStrategy(),
  heading: new ParagraphLayoutStrategy(),
  "list-item": new ParagraphLayoutStrategy(),
  "ordered-list-item": new ParagraphLayoutStrategy(),
  image: new ImageLayoutStrategy(),
  "page-break": new PageBreakLayoutStrategy(),
  table: new TableLayoutStrategy(),
};

const processBlocks = (
  blocks: BlockNode[],
  ctx: PaginationContext,
  fontManager: IFontManager,
  containerX: number = 0,
  containerWidth?: number,
): void => {
  for (const block of blocks) {
    const strategy = strategies[block.kind] || (isTableNode(block) ? strategies.table : null);
    if (strategy) {
      strategy.layout(block, ctx, fontManager, containerX, containerWidth);
    }
  }
};

function collectFootnoteRefs(blocks: BlockNode[]): Set<string> {
  const refs = new Set<string>();
  for (const block of blocks) {
    if (!isTextBlock(block)) continue;
    for (const run of block.children) {
      if (run.footnoteId) refs.add(run.footnoteId);
    }
  }
  return refs;
}

function getPageContentBottom(page: PageLayout): number {
  if (page.fragments.length === 0) return page.contentRect.y;
  let bottom = page.contentRect.y;
  for (const frag of page.fragments) {
    const fragBottom = frag.rect.y + frag.rect.height;
    if (fragBottom > bottom) bottom = fragBottom;
  }
  return bottom;
}

export function paginateDocument(
  doc: DocumentModel,
  measure: TextMeasurer,
  fontManager: IFontManager,
  templates: Record<string, PageTemplate>,
): LayoutState {
  const ctx = createPaginationContext(measure, fontManager);

  if (doc.sections.length === 0) {
    return { pages: [], fragmentsByBlockId: {}, footnotesByPage: {}, editingFootnoteId: null };
  }

  for (const section of doc.sections) {
    const template = templates[section.pageTemplateId] || Object.values(templates)[0];
    if (!template) {
        throw new Error(`No templates available for pagination. Checked section pageTemplateId: ${section.pageTemplateId}`);
    }

    ctx.section = section;
    ctx.template = template;
    ctx.contentWidth =
      (ctx.template?.size?.width || 0) - (ctx.template?.margins?.left || 0) - (ctx.template?.margins?.right || 0);
    ctx.contentHeight =
      (ctx.template?.size?.height || 0) - (ctx.template?.margins?.top || 0) - (ctx.template?.margins?.bottom || 0);
    ctx.effectiveTopMargin = ctx.template?.margins?.top || 0;

    if (!ctx.currentPage) {
      createNewPage(ctx);
    }

    processBlocks(section.children, ctx, fontManager);

    if (ctx.currentPage) {
      ctx.pages.push(ctx.currentPage);
      ctx.currentPage = null as any;
    }

    // Apply headers/footers to all pages of this section
    for (const page of ctx.pages) {
      if (page.sectionId === section.id) {
        applyHeaderFooterToPage(
          page,
          section,
          ctx.measure,
          ctx.fragmentsByBlockId,
          fontManager,
        );
      }
    }
  }

  // Handle Footnotes (Simplified for refactor demo)
  // In a real implementation, we would re-run pagination if footnotes shift content
  for (const page of ctx.pages) {
    const pageRefs = collectFootnoteRefs(
      doc.sections
        .find((s) => s.id === page.sectionId)
        ?.children.filter((b) =>
          ctx.fragmentsByBlockId[b.id]?.some((f) => f.pageId === page.id),
        ) || [],
    );

    if (pageRefs.size > 0 && doc.footnotes) {
      let footnoteY = getPageContentBottom(page) + FOOTNOTE_SEPARATOR_HEIGHT;
      for (const refId of pageRefs) {
        const footnote = doc.footnotes.find((f) => f.id === refId);
        if (footnote) {
          processBlocks(footnote.blocks, { ...ctx, currentPage: page, currentY: footnoteY }, fontManager);
          footnoteY = getPageContentBottom(page) + FOOTNOTE_ENTRY_GAP;
        }
      }
    }
  }

  return {
    pages: ctx.pages,
    fragmentsByBlockId: ctx.fragmentsByBlockId,
    footnotesByPage: {}, // Footnote mapping could be populated if needed
    editingFootnoteId: null,
  };
}
