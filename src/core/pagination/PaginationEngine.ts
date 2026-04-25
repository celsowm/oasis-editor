import { DocumentModel } from "../document/DocumentTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { PageTemplate } from "../pages/PageTemplateTypes.js";
import { Rect, LayoutFragment } from "../layout/LayoutFragment.js";
import { PageLayout, LayoutState } from "../layout/LayoutTypes.js";
import { composeParagraph } from "../composition/ParagraphComposer.js";
import { BlockNode, TableNode, isTableNode } from "../document/BlockTypes.js";
import {
  PaginationContext,
  createNewPage,
  createPaginationContext,
} from "./PaginationContext.js";
import { measureTextBlocks, measureImageBlock } from "./BlockLayoutEngine.js";
import { layoutTableBlock } from "./TableLayoutEngine.js";
import { applyHeaderFooterToPage } from "./HeaderFooterLayoutEngine.js";

const processBlocks = (
  blocks: BlockNode[],
  ctx: PaginationContext,
  containerX: number = 0,
  containerWidth?: number,
): void => {
  const width = containerWidth ?? ctx.contentWidth;

  for (const block of blocks) {
    if (block.kind === "page-break") {
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
        typography: { fontFamily: "Inter", fontSize: 0, fontWeight: 0 },
        runs: [],
        marks: {},
        lines: [],
        align: "left",
      };
      ctx.currentPage.fragments.push(pbFragment);
      ctx.fragmentsByBlockId[block.id] = [pbFragment];
      continue;
    }

    if (block.kind === "image") {
      const { fragment, height } = measureImageBlock(block, width, ctx.section);
      fragment.rect.x = ctx.currentPage.contentRect.x + containerX;
      fragment.rect.y = ctx.currentY;
      fragment.pageId = ctx.currentPage.id;

      ctx.currentPage.fragments.push(fragment);
      ctx.fragmentsByBlockId[block.id] = [fragment];
      ctx.currentY += height + 12;
      continue;
    }

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
        listFormat: composed.listFormat,
        listLevel: composed.listLevel,
      };

      ctx.currentPage.fragments.push(fragment);
      ctx.fragmentsByBlockId[block.id] = [fragment];
      ctx.currentY += composed.totalHeight + 12;
      continue;
    }

    if (isTableNode(block)) {
      layoutTableBlock(block, ctx, containerX);
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
      templates[section.pageTemplateId] ?? templates["template:a4:default"];

    const contentWidth =
      template.size.width - template.margins.left - template.margins.right;

    // 1. Measure Header/Footer to determine dynamic margins
    let headerHeight = 0;
    let footerHeight = 0;

    if (template.header.enabled && section.header) {
      const res = measureTextBlocks(
        section.header,
        contentWidth,
        measure,
        section,
      );
      headerHeight = res.height;
    }

    if (template.footer.enabled && section.footer) {
      const res = measureTextBlocks(
        section.footer,
        contentWidth,
        measure,
        section,
      );
      footerHeight = res.height;
    }

    const headerTopOffset = 32;
    const footerBottomOffset = 32;

    const effectiveTopMargin = Math.max(
      template.margins.top,
      headerTopOffset + headerHeight + 16,
    );
    const effectiveBottomMargin = Math.max(
      template.margins.bottom,
      footerBottomOffset + footerHeight + 16,
    );

    const contentHeight =
      template.size.height - effectiveTopMargin - effectiveBottomMargin;

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

    const ctx = createPaginationContext(
      section,
      template,
      contentWidth,
      contentHeight,
      effectiveTopMargin,
      headerRect,
      footerRect,
      pageCounter,
      fragmentsByBlockId,
      measure,
    );

    processBlocks(section.children, ctx);
    pages.push(ctx.currentPage);

    // 2. Apply measured header/footer fragments to all pages of this section
    const sectionPages = pages.filter((p) => p.sectionId === section.id);
    for (const page of sectionPages) {
      applyHeaderFooterToPage(page, section, measure, fragmentsByBlockId);
    }

    pageCounter = ctx.pageCounter + 1;
  }

  return { pages, fragmentsByBlockId };
};
