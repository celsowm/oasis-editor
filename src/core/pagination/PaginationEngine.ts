import { DocumentModel } from "../document/DocumentTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { PageTemplate, BLOCK_SPACING } from "../pages/PageTemplateTypes.js";
import { Rect, LayoutFragment } from "../layout/LayoutFragment.js";
import { PageLayout, LayoutState } from "../layout/LayoutTypes.js";
import { composeParagraph } from "../composition/ParagraphComposer.js";
import { BlockNode, TableNode, isTableNode, isTextBlock } from "../document/BlockTypes.js";
import {
  PaginationContext,
  createNewPage,
  createPaginationContext,
} from "./PaginationContext.js";
import { measureTextBlocks, measureImageBlock } from "./BlockLayoutEngine.js";
import { layoutTableBlock } from "./TableLayoutEngine.js";
import { applyHeaderFooterToPage } from "./HeaderFooterLayoutEngine.js";
import { IFontManager } from "../typography/FontManager.js";

const FOOTNOTE_SEPARATOR_HEIGHT = 16;
const FOOTNOTE_ENTRY_GAP = 4;

const processBlocks = (
  blocks: BlockNode[],
  ctx: PaginationContext,
  fontManager: IFontManager,
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
        typography: fontManager.getTypographyForBlock("page-break"),
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
      const { fragment, height } = measureImageBlock(block, width, ctx.section, fontManager);
      fragment.rect.x = ctx.currentPage.contentRect.x + containerX;
      fragment.rect.y = ctx.currentY;
      fragment.pageId = ctx.currentPage.id;

      ctx.currentPage.fragments.push(fragment);
      ctx.fragmentsByBlockId[block.id] = [fragment];
      ctx.currentY += height + BLOCK_SPACING;
      continue;
    }

    if (
      block.kind === "paragraph" ||
      block.kind === "heading" ||
      block.kind === "list-item" ||
      block.kind === "ordered-list-item"
    ) {
      const composed = composeParagraph(block, width, ctx.measure, fontManager);

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

function collectFootnoteRefs(
  blocks: BlockNode[],
): Set<string> {
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

function composeFootnoteArea(
  page: PageLayout,
  footnoteIds: string[],
  footnotes: { id: string; blocks: BlockNode[] }[],
  measure: TextMeasurer,
  fragmentsByBlockId: Record<string, LayoutFragment[]>,
  fontManager: IFontManager,
): void {
  if (footnoteIds.length === 0) return;

  const contentBottom = page.contentRect.y + page.contentRect.height;
  const contentEndY = getPageContentBottom(page);
  const typography = fontManager.getTypographyForBlock("footnote");
  const footnoteFontSize = typography.fontSize;
  const footnoteLineHeight = footnoteFontSize * typography.lineHeight;

  let fnY = contentEndY + FOOTNOTE_SEPARATOR_HEIGHT;
  const fnFragments: LayoutFragment[] = [];

  for (const fnId of footnoteIds) {
    const footnote = footnotes.find((f) => f.id === fnId);
    if (!footnote) continue;

    for (const block of footnote.blocks) {
      if (!isTextBlock(block)) continue;

      const composed = composeParagraph(block, page.contentRect.width, measure, fontManager);

      const numberRun = {
        id: `fn-marker:${fnId}`,
        text: fnId,
        marks: { vertAlign: "superscript" as const, fontSize: footnoteFontSize },
        footnoteRefId: fnId,
      };

      const allRuns = [numberRun, ...composed.runs];

      const fragment: LayoutFragment = {
        id: `fragment:footnote:${fnId}:${block.id}:0`,
        blockId: block.id,
        sectionId: page.sectionId,
        pageId: page.id,
        fragmentIndex: 0,
        kind: "footnote-entry",
        startOffset: 0,
        endOffset: composed.text.length + fnId.length,
        text: fnId + " " + composed.text,
        rect: {
          x: page.contentRect.x,
          y: fnY,
          width: page.contentRect.width,
          height: Math.max(composed.totalHeight, footnoteLineHeight),
        },
        typography,
        runs: allRuns,
        marks: {},
        lines: composed.lines.map((line) => ({
          ...line,
          y: line.y + fnY,
        })),
        align: composed.align,
        footnoteId: fnId,
      };

      fnFragments.push(fragment);
      if (!fragmentsByBlockId[block.id]) {
        fragmentsByBlockId[block.id] = [];
      }
      fragmentsByBlockId[block.id].push(fragment);
      fnY += fragment.rect.height + FOOTNOTE_ENTRY_GAP;
    }
  }

  page.footnoteFragments = fnFragments;
  page.footnoteAreaRect = fnFragments.length > 0
    ? {
        x: page.contentRect.x,
        y: fnFragments[0].rect.y - FOOTNOTE_SEPARATOR_HEIGHT,
        width: page.contentRect.width,
        height: fnY - fnFragments[0].rect.y + FOOTNOTE_SEPARATOR_HEIGHT,
      }
    : null;
}

export const paginateDocument = (
  documentModel: DocumentModel,
  measure: TextMeasurer,
  templates: Record<string, PageTemplate>,
  fontManager: IFontManager,
): LayoutState => {
  const fragmentsByBlockId: Record<string, LayoutFragment[]> = {};
  const pages: PageLayout[] = [];
  const footnotesByPage: Record<string, string[]> = {};
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
        fontManager,
      );
      headerHeight = res.height;
    }

    if (template.footer.enabled && section.footer) {
      const res = measureTextBlocks(
        section.footer,
        contentWidth,
        measure,
        section,
        fontManager,
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
      fontManager,
    );

    processBlocks(section.children, ctx, fontManager);
    pages.push(...ctx.pages, ctx.currentPage);

    // 2. Apply measured header/footer fragments to all pages of this section
    const sectionPages = pages.filter((p) => p.sectionId === section.id);
    for (const page of sectionPages) {
      applyHeaderFooterToPage(page, section, measure, fragmentsByBlockId, fontManager);
    }

    // 3. Compose footnote fragments for each page
    const allFootnoteRefs = collectFootnoteRefs(section.children);
    if (allFootnoteRefs.size > 0 && documentModel.footnotes?.length) {
      for (const page of sectionPages) {
        const pageFnIds: string[] = [];
        for (const frag of page.fragments) {
          if (!frag.runs) continue;
          for (const run of frag.runs) {
            if (run.footnoteId && !pageFnIds.includes(run.footnoteId)) {
              pageFnIds.push(run.footnoteId);
            }
          }
        }
        if (pageFnIds.length > 0) {
          composeFootnoteArea(page, pageFnIds, documentModel.footnotes, measure, fragmentsByBlockId, fontManager);
          footnotesByPage[page.id] = pageFnIds;
        }
      }
    }

    pageCounter = ctx.pageCounter + 1;
  }

  return { pages, fragmentsByBlockId, footnotesByPage, editingFootnoteId: null };
};
