import { DocumentModel } from "../document/DocumentTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { PageTemplate } from "../pages/PageTemplateTypes.js";
import { Rect, LayoutFragment, LineInfo } from "../layout/LayoutFragment.js";
import { PageLayout, LayoutState } from "../layout/LayoutTypes.js";
import { composeParagraph } from "../composition/ParagraphComposer.js";
import { BlockNode, TableNode } from "../document/BlockTypes.js";

interface PaginationContext {
  pages: PageLayout[];
  currentPage: PageLayout;
  currentY: number;
  contentWidth: number;
  contentHeight: number;
  effectiveTopMargin: number;
  fragmentsByBlockId: Record<string, LayoutFragment[]>;
  pageCounter: number;
  section: any;
  template: PageTemplate;
  measure: TextMeasurer;
}

const createNewPage = (ctx: PaginationContext): void => {
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
  };
  ctx.currentY = ctx.currentPage.contentRect.y;
};

/**
 * Measures blocks without adding them to the global context.
 * Used for table cell height calculation.
 */
const measureBlocks = (
  blocks: BlockNode[],
  width: number,
  measure: TextMeasurer,
  section: any,
): { height: number; fragments: LayoutFragment[] } => {
  let localY = 0;
  const fragments: LayoutFragment[] = [];

  for (const block of blocks) {
    if (block.kind === "image") {
      const imgW = Math.min(block.width, width);
      const scale = imgW / block.width;
      const imgH = Math.round(block.height * scale);

      fragments.push({
        id: `fragment:${block.id}:0`,
        blockId: block.id,
        sectionId: section.id,
        pageId: "", // To be filled later
        fragmentIndex: 0,
        kind: "image",
        startOffset: 0,
        endOffset: 0,
        text: "",
        rect: { x: 0, y: localY, width: imgW, height: imgH },
        typography: { fontFamily: "", fontSize: 0, fontWeight: 400 },
        runs: [],
        marks: {},
        lines: [],
        align: block.align,
        imageSrc: block.src,
        imageAlt: block.alt ?? "",
      });
      localY += imgH + 12;
      // ... (existing image handling remains)
    } else if (
      block.kind === "paragraph" ||
      block.kind === "heading" ||
      block.kind === "list-item" ||
      block.kind === "ordered-list-item"
    ) {
      const composed = composeParagraph(block, width, measure);
      const textLength = block.children
        .map((child) => child.text)
        .join("").length;
      fragments.push({
        id: `fragment:${block.id}:0`,
        blockId: block.id,
        sectionId: section.id,
        pageId: "",
        fragmentIndex: 0,
        kind: block.kind,
        startOffset: 0,
        endOffset: textLength,
        text: composed.text,
        rect: { x: 0, y: localY, width: width, height: composed.totalHeight },
        typography: composed.typography,
        runs: composed.runs,
        marks: {},
        lines: composed.lines.map((l) => ({ ...l, y: l.y + localY })),
        align: composed.align,
        indentation: composed.indentation,
        listNumber: composed.listNumber,
      });
      localY += composed.totalHeight + 12;
    }
    // ... (existing table handling remains)
  }

  return { height: localY, fragments };
};

const processBlocks = (
  blocks: BlockNode[],
  ctx: PaginationContext,
  containerX: number = 0,
  containerWidth?: number,
): void => {
  const width = containerWidth ?? ctx.contentWidth;

  for (const block of blocks) {
    // ... (existing image handling remains)

    if (
      block.kind === "paragraph" ||
      block.kind === "heading" ||
      block.kind === "list-item" ||
      block.kind === "ordered-list-item"
    ) {
      const composed = composeParagraph(block, width, ctx.measure);

      if (
        ctx.currentY + composed.totalHeight >
        ctx.currentPage.contentRect.y + ctx.contentHeight
      ) {
        createNewPage(ctx);
      }

      const textLength = block.children
        .map((child) => child.text)
        .join("").length;
      const fragment: LayoutFragment = {
        id: `fragment:${block.id}:0`,
        blockId: block.id,
        sectionId: ctx.section.id,
        pageId: ctx.currentPage.id,
        fragmentIndex: 0,
        kind: block.kind,
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
      };

      ctx.currentPage.fragments.push(fragment);
      ctx.fragmentsByBlockId[block.id] = [fragment];
      ctx.currentY += composed.totalHeight + 12;
      continue;
    }

    if (block.kind === "table") {
      const table = block as TableNode;

      for (let rIdx = 0; rIdx < table.rows.length; rIdx++) {
        const row = table.rows[rIdx];

        let maxRowHeight = 0;
        const cellResults: { height: number; fragments: LayoutFragment[] }[] =
          [];

        for (let cIdx = 0; cIdx < row.cells.length; cIdx++) {
          const cell = row.cells[cIdx];
          const cellWidth = table.columnWidths[cIdx];

          const result = measureBlocks(
            cell.children,
            cellWidth - 10,
            ctx.measure,
            ctx.section,
          );
          cellResults.push(result);
          maxRowHeight = Math.max(maxRowHeight, result.height + 10); // + padding
        }

        if (
          ctx.currentY + maxRowHeight >
          ctx.currentPage.contentRect.y + ctx.contentHeight
        ) {
          createNewPage(ctx);
        }

        let currentX = 0;
        for (let cIdx = 0; cIdx < row.cells.length; cIdx++) {
          const cell = row.cells[cIdx];
          const cellWidth = table.columnWidths[cIdx];

          const cellFrag: LayoutFragment = {
            id: `fragment:${cell.id}:cell`,
            blockId: cell.id,
            sectionId: ctx.section.id,
            pageId: ctx.currentPage.id,
            fragmentIndex: 0,
            kind: "table-cell",
            startOffset: 0,
            endOffset: 0,
            text: "",
            rect: {
              x: ctx.currentPage.contentRect.x + containerX + currentX,
              y: ctx.currentY,
              width: cellWidth,
              height: maxRowHeight,
            },
            typography: { fontFamily: "", fontSize: 0, fontWeight: 400 },
            runs: [],
            marks: {},
            lines: [],
            align: "left",
          };
          ctx.currentPage.fragments.push(cellFrag);

          const res = cellResults[cIdx];
          for (const f of res.fragments) {
            f.rect.x +=
              ctx.currentPage.contentRect.x + containerX + currentX + 5;
            f.rect.y += ctx.currentY + 5;
            f.pageId = ctx.currentPage.id;
            for (const l of f.lines) {
              l.y += ctx.currentY + 5;
            }
            ctx.currentPage.fragments.push(f);
            if (!ctx.fragmentsByBlockId[f.blockId])
              ctx.fragmentsByBlockId[f.blockId] = [];
            ctx.fragmentsByBlockId[f.blockId].push(f);
          }

          currentX += cellWidth;
        }

        ctx.currentY += maxRowHeight;
      }
      ctx.currentY += 12; // Bottom margin for table
    }
  }
};

const applyHeaderFooter = (
  page: PageLayout,
  section: any,
  measure: TextMeasurer,
  fragmentsByBlockId: Record<string, LayoutFragment[]>,
): void => {
  if (page.headerRect && section.header) {
    const { fragments } = measureBlocks(
      section.header,
      page.headerRect.width,
      measure,
      section,
    );
    for (const f of fragments) {
      f.rect.x += page.headerRect.x;
      f.rect.y += page.headerRect.y;
      f.pageId = page.id;
      for (const l of f.lines) {
        l.y += page.headerRect.y;
      }
      page.headerFragments.push(f);
      if (!fragmentsByBlockId[f.blockId]) fragmentsByBlockId[f.blockId] = [];
      fragmentsByBlockId[f.blockId].push(f);
    }
  }

  if (page.footerRect && section.footer) {
    const { fragments } = measureBlocks(
      section.footer,
      page.footerRect.width,
      measure,
      section,
    );
    for (const f of fragments) {
      f.rect.x += page.footerRect.x;
      f.rect.y += page.footerRect.y;
      f.pageId = page.id;
      for (const l of f.lines) {
        l.y += page.footerRect.y;
      }
      page.footerFragments.push(f);
      if (!fragmentsByBlockId[f.blockId]) fragmentsByBlockId[f.blockId] = [];
      fragmentsByBlockId[f.blockId].push(f);
    }
  }
};

export const paginateDocument = (
  documentModel: DocumentModel,
  measure: TextMeasurer,
  templates: Record<string, PageTemplate>,
): LayoutState => {
  const fragmentsByBlockId: Record<string, LayoutFragment[]> = {};
  const pages: PageLayout[] = [];
  let pageCounter = 0;

  for (const section of documentModel.sections) {
    const template: PageTemplate =
      templates[section.pageTemplateId] ??
      templates["template:a4:default"];
    
    const contentWidth =
      template.size.width - template.margins.left - template.margins.right;

    // 1. Measure Header/Footer to determine dynamic margins
    let headerHeight = 0;
    let footerHeight = 0;
    
    if (template.header.enabled && section.header) {
        const res = measureBlocks(section.header, contentWidth, measure, section);
        headerHeight = res.height;
    }
    
    if (template.footer.enabled && section.footer) {
        const res = measureBlocks(section.footer, contentWidth, measure, section);
        footerHeight = res.height;
    }

    const headerTopOffset = 32;
    const footerBottomOffset = 32;
    
    const effectiveTopMargin = Math.max(template.margins.top, headerTopOffset + headerHeight + 16);
    const effectiveBottomMargin = Math.max(template.margins.bottom, footerBottomOffset + footerHeight + 16);
    
    const contentHeight = template.size.height - effectiveTopMargin - effectiveBottomMargin;

    const headerRect: Rect | null = template.header.enabled
      ? {
          x: template.margins.left,
          y: headerTopOffset,
          width: contentWidth,
          height: headerHeight,
        }
      : null;
      
    const footerRect: Rect | null = template.footer.enabled
      ? {
          x: template.margins.left,
          y: template.size.height - footerBottomOffset - footerHeight,
          width: contentWidth,
          height: footerHeight,
        }
      : null;

    const ctx: PaginationContext = {
      pages,
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
    };

    processBlocks(section.children, ctx);
    pages.push(ctx.currentPage);

    // 2. Apply measured header/footer fragments to all pages of this section
    const sectionPages = pages.filter((p) => p.sectionId === section.id);
    for (const page of sectionPages) {
      if (page.headerRect && section.header) {
        const { fragments } = measureBlocks(section.header, contentWidth, measure, section);
        for (const f of fragments) {
          f.rect.x += page.headerRect.x;
          f.rect.y += page.headerRect.y;
          f.pageId = page.id;
          for (const l of f.lines) l.y += page.headerRect.y;
          page.headerFragments.push(f);
          if (!fragmentsByBlockId[f.blockId]) fragmentsByBlockId[f.blockId] = [];
          fragmentsByBlockId[f.blockId].push(f);
        }
      }
      
      if (page.footerRect && section.footer) {
        const { fragments } = measureBlocks(section.footer, contentWidth, measure, section);
        for (const f of fragments) {
          f.rect.x += page.footerRect.x;
          f.rect.y += page.footerRect.y;
          f.pageId = page.id;
          for (const l of f.lines) l.y += page.footerRect.y;
          page.footerFragments.push(f);
          if (!fragmentsByBlockId[f.blockId]) fragmentsByBlockId[f.blockId] = [];
          fragmentsByBlockId[f.blockId].push(f);
        }
      }
    }

    pageCounter = ctx.pageCounter + 1;
  }

  return { pages, fragmentsByBlockId };
};
