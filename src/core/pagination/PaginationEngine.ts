import { DocumentModel } from "../document/DocumentTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { PageTemplate } from "../pages/PageTemplateTypes.js";
import { Rect, LayoutFragment, LineInfo } from "../layout/LayoutFragment.js";
import { PageLayout, LayoutState } from "../layout/LayoutTypes.js";
import { PAGE_TEMPLATES } from "../pages/PageTemplateFactory.js";
import { composeParagraph } from "../composition/ParagraphComposer.js";
import { BlockNode, TableNode } from "../document/BlockTypes.js";

interface PaginationContext {
  pages: PageLayout[];
  currentPage: PageLayout;
  currentY: number;
  contentWidth: number;
  contentHeight: number;
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
      y: ctx.template.margins.top,
      width: ctx.contentWidth,
      height: ctx.contentHeight,
    },
    headerRect: ctx.currentPage.headerRect,
    footerRect: ctx.currentPage.footerRect,
    fragments: [],
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
    section: any
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
                startOffset: 0, endOffset: 0, text: "",
                rect: { x: 0, y: localY, width: imgW, height: imgH },
                typography: { fontFamily: "", fontSize: 0, fontWeight: 400 },
                runs: [], marks: {}, lines: [], align: block.align,
                imageSrc: block.src, imageAlt: block.alt ?? ""
            });
            localY += imgH + 12;
        } else if (block.kind === "paragraph" || block.kind === "heading") {
            const composed = composeParagraph(block, width, measure);
            const textLength = block.children.map((child) => child.text).join("").length;
            fragments.push({
                id: `fragment:${block.id}:0`,
                blockId: block.id,
                sectionId: section.id,
                pageId: "",
                fragmentIndex: 0,
                kind: block.kind,
                startOffset: 0, endOffset: textLength,
                text: composed.text,
                rect: { x: 0, y: localY, width: width, height: composed.totalHeight },
                typography: composed.typography,
                runs: composed.runs, marks: {},
                lines: composed.lines.map(l => ({ ...l, y: l.y + localY })),
                align: composed.align
            });
            localY += composed.totalHeight + 12;
        }
        // Nested tables inside tables are not yet supported in measurement
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
    if (block.kind === "image") {
      const imgW = Math.min(block.width, width);
      const scale = imgW / block.width;
      const imgH = Math.round(block.height * scale);

      if (ctx.currentY + imgH > ctx.currentPage.contentRect.y + ctx.contentHeight) {
        createNewPage(ctx);
      }

      const alignOffsetX: number =
        block.align === "center" ? (width - imgW) / 2 : block.align === "right" ? width - imgW : 0;

      const fragment: LayoutFragment = {
        id: `fragment:${block.id}:0`,
        blockId: block.id,
        sectionId: ctx.section.id,
        pageId: ctx.currentPage.id,
        fragmentIndex: 0,
        kind: "image",
        startOffset: 0,
        endOffset: 0,
        text: "",
        rect: {
          x: ctx.currentPage.contentRect.x + containerX + alignOffsetX,
          y: ctx.currentY,
          width: imgW,
          height: imgH,
        },
        typography: { fontFamily: "", fontSize: 0, fontWeight: 400 },
        runs: [],
        marks: {},
        lines: [],
        align: block.align,
        imageSrc: block.src,
        imageAlt: block.alt ?? "",
      };

      ctx.currentPage.fragments.push(fragment);
      ctx.fragmentsByBlockId[block.id] = [fragment];
      ctx.currentY += imgH + 12;
      continue;
    }

    if (block.kind === "paragraph" || block.kind === "heading") {
      const composed = composeParagraph(block, width, ctx.measure);

      if (ctx.currentY + composed.totalHeight > ctx.currentPage.contentRect.y + ctx.contentHeight) {
        createNewPage(ctx);
      }

      const textLength = block.children.map((child) => child.text).join("").length;
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
        lines: composed.lines.map((line) => ({ ...line, y: line.y + ctx.currentY })),
        align: composed.align,
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
        const cellResults: { height: number; fragments: LayoutFragment[] }[] = [];

        for (let cIdx = 0; cIdx < row.cells.length; cIdx++) {
          const cell = row.cells[cIdx];
          const cellWidth = table.columnWidths[cIdx];
          
          const result = measureBlocks(cell.children, cellWidth - 10, ctx.measure, ctx.section);
          cellResults.push(result);
          maxRowHeight = Math.max(maxRowHeight, result.height + 10); // + padding
        }

        if (ctx.currentY + maxRowHeight > ctx.currentPage.contentRect.y + ctx.contentHeight) {
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
              startOffset: 0, endOffset: 0, text: "",
              rect: {
                  x: ctx.currentPage.contentRect.x + containerX + currentX,
                  y: ctx.currentY,
                  width: cellWidth,
                  height: maxRowHeight
              },
              typography: { fontFamily: "", fontSize: 0, fontWeight: 400 },
              runs: [], marks: {}, lines: [], align: "left"
          };
          ctx.currentPage.fragments.push(cellFrag);

          const res = cellResults[cIdx];
          for (const f of res.fragments) {
              f.rect.x += ctx.currentPage.contentRect.x + containerX + currentX + 5;
              f.rect.y += ctx.currentY + 5;
              f.pageId = ctx.currentPage.id;
              for(const l of f.lines) {
                  l.y += ctx.currentY + 5;
              }
              ctx.currentPage.fragments.push(f);
              if (!ctx.fragmentsByBlockId[f.blockId]) ctx.fragmentsByBlockId[f.blockId] = [];
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

export const paginateDocument = (
  documentModel: DocumentModel,
  measure: TextMeasurer,
): LayoutState => {
  const fragmentsByBlockId: Record<string, LayoutFragment[]> = {};
  const pages: PageLayout[] = [];
  let pageCounter = 0;

  for (const section of documentModel.sections) {
    const template: PageTemplate =
      PAGE_TEMPLATES[section.pageTemplateId] ?? PAGE_TEMPLATES["template:a4:default"];
    const contentWidth = template.size.width - template.margins.left - template.margins.right;
    const contentHeight = template.size.height - template.margins.top - template.margins.bottom;

    const headerRect: Rect | null = template.header.enabled
      ? { x: template.margins.left, y: 32, width: contentWidth, height: template.header.height }
      : null;
    const footerRect: Rect | null = template.footer.enabled
      ? { x: template.margins.left, y: template.size.height - 32 - template.footer.height, width: contentWidth, height: template.footer.height }
      : null;

    const ctx: PaginationContext = {
      pages,
      currentPage: {
        id: `page:${pageCounter}`,
        sectionId: section.id,
        pageIndex: pageCounter,
        pageNumber: String(pageCounter + 1),
        templateId: template.id,
        rect: { x: 0, y: 0, width: template.size.width, height: template.size.height },
        contentRect: { x: template.margins.left, y: template.margins.top, width: contentWidth, height: contentHeight },
        headerRect,
        footerRect,
        fragments: [],
      },
      currentY: template.margins.top,
      contentWidth,
      contentHeight,
      fragmentsByBlockId,
      pageCounter,
      section,
      template,
      measure,
    };

    processBlocks(section.children, ctx);
    pages.push(ctx.currentPage);
    pageCounter = ctx.pageCounter + 1;
  }

  return { pages, fragmentsByBlockId };
};
