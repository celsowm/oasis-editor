import { PageTemplate } from "../pages/PageTemplateTypes.js";
import { Rect, LayoutFragment } from "../layout/LayoutFragment.js";
import { PageLayout } from "../layout/LayoutTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { SectionNode } from "../document/SectionTypes.js";
import { IFontManager } from "../typography/FontManager.js";

export interface PaginationContext {
  pages: PageLayout[];
  currentPage: PageLayout;
  currentY: number;
  contentWidth: number;
  contentHeight: number;
  effectiveTopMargin: number;
  fragmentsByBlockId: Record<string, LayoutFragment[]>;
  pageCounter: number;
  section: SectionNode;
  template: PageTemplate;
  measure: TextMeasurer;
  fontManager: IFontManager;
}

export function createNewPage(ctx: PaginationContext): void {
  ctx.pages.push(ctx.currentPage);
  ctx.pageCounter += 1;
  ctx.currentPage = {
    id: `page:${ctx.pageCounter}`,
    sectionId: ctx.section.id,
    pageIndex: ctx.pageCounter,
    pageNumber: String(ctx.pageCounter + 1),
    templateId: ctx.template.id,
    rect: {
      x: 0,
      y: 0,
      width: ctx.template.size.width,
      height: ctx.template.size.height,
    },
    contentRect: {
      x: ctx.template.margins.left,
      y: ctx.effectiveTopMargin,
      width: ctx.contentWidth,
      height: ctx.contentHeight,
    },
    headerRect: ctx.currentPage.headerRect,
    footerRect: ctx.currentPage.footerRect,
    fragments: [],
    headerFragments: [],
    footerFragments: [],
    footnoteFragments: [],
    footnoteAreaRect: null,
  };
  ctx.currentY = ctx.currentPage.contentRect.y;
}

export function createPaginationContext(
  section: SectionNode,
  template: PageTemplate,
  contentWidth: number,
  contentHeight: number,
  effectiveTopMargin: number,
  headerRect: Rect | null,
  footerRect: Rect | null,
  pageCounter: number,
  fragmentsByBlockId: Record<string, LayoutFragment[]>,
  measure: TextMeasurer,
  fontManager: IFontManager,
): PaginationContext {
  return {
    pages: [],
    currentPage: {
      id: `page:${pageCounter}`,
      sectionId: section.id,
      pageIndex: pageCounter,
      pageNumber: String(pageCounter + 1),
      templateId: template.id,
      rect: {
        x: 0,
        y: 0,
        width: template.size.width,
        height: template.size.height,
      },
      contentRect: {
        x: template.margins.left,
        y: effectiveTopMargin,
        width: contentWidth,
        height: contentHeight,
      },
      headerRect,
      footerRect,
      fragments: [],
      headerFragments: [],
      footerFragments: [],
      footnoteFragments: [],
      footnoteAreaRect: null,
    },
    currentY: effectiveTopMargin,
    contentWidth,
    contentHeight,
    effectiveTopMargin,
    fragmentsByBlockId,
    pageCounter,
    section,
    template,
    measure,
    fontManager,
  };
}
