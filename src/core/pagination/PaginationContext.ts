import { PageTemplate } from "../pages/PageTemplateTypes.js";
import { LayoutFragment } from "../layout/LayoutFragment.js";
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
  if (!ctx.template || !ctx.section) return;

  if (ctx.currentPage) {
    ctx.pages.push(ctx.currentPage);
  }
  ctx.pageCounter += 1;

  // Blindagem absoluta contra propriedades faltantes no template
  const margins = ctx.template.margins || { top: 0, right: 0, bottom: 0, left: 0 };
  const header = ctx.template.header || { enabled: false, height: 0 };
  const footer = ctx.template.footer || { enabled: false, height: 0 };
  const size = ctx.template.size || { width: 0, height: 0 };

  const headerRect = header.enabled
    ? {
        x: margins.left || 0,
        y: (margins.top || 0) - (header.height || 0),
        width: ctx.contentWidth || 0,
        height: header.height || 0,
      }
    : null;

  const footerRect = footer.enabled
    ? {
        x: margins.left || 0,
        y: (size.height || 0) - (margins.bottom || 0),
        width: ctx.contentWidth || 0,
        height: footer.height || 0,
      }
    : null;

  ctx.currentPage = {
    id: `page:${ctx.pageCounter}`,
    sectionId: ctx.section.id || "default",
    pageIndex: ctx.pageCounter - 1,
    pageNumber: String(ctx.pageCounter),
    templateId: ctx.template.id,
    rect: {
      x: 0,
      y: 0,
      width: size.width || 0,
      height: size.height || 0,
    },
    contentRect: {
      x: margins.left || 0,
      y: ctx.effectiveTopMargin || margins.top || 0,
      width: ctx.contentWidth || 0,
      height: ctx.contentHeight || 0,
    },
    headerRect,
    footerRect,
    fragments: [],
    headerFragments: [],
    footerFragments: [],
    footnoteFragments: [],
    footnoteAreaRect: null,
  };
  ctx.currentY = ctx.currentPage.contentRect.y;
}

export function createPaginationContext(
  measure: TextMeasurer,
  fontManager: IFontManager,
): PaginationContext {
  return {
    pages: [],
    currentPage: null as any,
    currentY: 0,
    contentWidth: 0,
    contentHeight: 0,
    effectiveTopMargin: 0,
    fragmentsByBlockId: {},
    pageCounter: 0,
    section: null as any,
    template: null as any,
    measure,
    fontManager,
  };
}
