import type {
  EditorBlockNode,
  EditorDocument,
  EditorLayoutBlock,
  EditorLayoutPage,
  EditorLayoutParagraph,
  EditorNamedStyle,
  EditorPageSettings,
  EditorSection,
} from "@/core/model.js";
import {
  getPageBodyBottom,
  getPageBodyTop,
  getPageContentWidth,
} from "@/core/model.js";
import type { ITextMeasurer } from "@/core/engine.js";
import type { HeaderFooterBlockProjector } from "./headerFooterLayoutContext.js";
import type { LayoutProjectionContext } from "./paragraphPagination.js";

export type BlocksLayoutProjector = (context: {
  blocks: EditorBlockNode[];
  pageSettings: EditorSection["pageSettings"];
  maxPageHeight: number;
  measuredHeights?: Record<string, number>;
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>;
  styles?: Record<string, EditorNamedStyle>;
  pageOffset?: number;
  totalPages?: number;
  existingPages?: EditorLayoutPage[];
  layoutMode?: "fast" | "wordParity";
  measurer?: ITextMeasurer;
  reservedHeightByPageIndex?: Map<number, number>;
  defaultTabStop?: number;
  projectionContext?: LayoutProjectionContext;
}) => EditorLayoutPage[];

export interface SectionPaginationContext {
  sections: EditorSection[];
  documentStyles?: EditorDocument["styles"];
  maxPageHeightOverride?: number;
  measuredHeights?: Record<string, number>;
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>;
  measurer: ITextMeasurer;
  defaultTabStop?: number;
  needsTotalPages: boolean;
  projectBlocks: BlocksLayoutProjector;
  projectHeaderFooterBlocks: HeaderFooterBlockProjector;
  projectionContext?: LayoutProjectionContext;
}

export interface SectionPaginationResult {
  pages: EditorLayoutPage[];
  totalPages?: number;
}

function getProjectedBlocksHeight(
  blocks: EditorLayoutBlock[] | undefined,
): number {
  if (!blocks || blocks.length === 0) {
    return 0;
  }
  return blocks.reduce((sum, block): number => sum + block.estimatedHeight, 0);
}

function selectSectionHeaderBlocks(
  section: EditorSection,
  pageIndexInSection: number,
  globalPageIndex: number,
): EditorBlockNode[] | undefined {
  const isFirstPageOfSection = pageIndexInSection === 0;
  const isEvenPageNumber = (globalPageIndex + 1) % 2 === 0;
  if (isFirstPageOfSection && section.firstPageHeader) {
    return section.firstPageHeader;
  }
  if (isEvenPageNumber && section.evenPageHeader) {
    return section.evenPageHeader;
  }
  return section.header;
}

function selectSectionFooterBlocks(
  section: EditorSection,
  pageIndexInSection: number,
  globalPageIndex: number,
): EditorBlockNode[] | undefined {
  const isFirstPageOfSection = pageIndexInSection === 0;
  const isEvenPageNumber = (globalPageIndex + 1) % 2 === 0;
  if (isFirstPageOfSection && section.firstPageFooter) {
    return section.firstPageFooter;
  }
  if (isEvenPageNumber && section.evenPageFooter) {
    return section.evenPageFooter;
  }
  return section.footer;
}

function resolveEffectiveVerticalMetrics(
  pageSettings: EditorPageSettings,
  headerBlocks: EditorLayoutBlock[] | undefined,
  footerBlocks: EditorLayoutBlock[] | undefined,
): {
  bodyTop: number;
  bodyBottom: number;
  contentHeight: number;
  headerTop: number;
  footerTop: number;
} {
  const staticBodyTop = getPageBodyTop(pageSettings);
  const staticBodyBottom = getPageBodyBottom(pageSettings);
  const headerHeight = getProjectedBlocksHeight(headerBlocks);
  const footerHeight = getProjectedBlocksHeight(footerBlocks);

  const headerTop = pageSettings.margins.header;
  const footerTop =
    pageSettings.height - pageSettings.margins.footer - footerHeight;

  const headerOccupiedBottom =
    headerHeight > 0
      ? Math.min(pageSettings.height, headerTop + headerHeight)
      : 0;
  const footerOccupiedTop =
    footerHeight > 0 ? Math.max(0, footerTop) : pageSettings.height;
  const bodyTop = Math.max(staticBodyTop, headerOccupiedBottom);
  const bodyBottom = Math.max(
    bodyTop,
    Math.min(staticBodyBottom, footerOccupiedTop),
  );
  return {
    bodyTop,
    bodyBottom,
    headerTop,
    footerTop,
    contentHeight: Math.max(24, Math.floor(bodyBottom - bodyTop)),
  };
}

function createHeaderFooterVariantProjector(context: SectionPaginationContext) {
  return (
    blocks: EditorBlockNode[] | undefined,
    contentWidth: number,
    pageIndex?: number,
    totalPageCount?: number,
  ): EditorLayoutBlock[] | undefined =>
    blocks
      ? context.projectHeaderFooterBlocks(blocks, {
          pageIndex,
          totalPages: totalPageCount,
          measuredHeights: context.measuredHeights,
          measuredParagraphLayouts: context.measuredParagraphLayouts,
          styles: context.documentStyles,
          contentWidth,
          measurer: context.measurer,
          defaultTabStop: context.defaultTabStop,
          projectionContext: context.projectionContext,
        })
      : undefined;
}

function projectTallestHeaderVariant(
  section: EditorSection,
  contentWidth: number,
  projectHeaderFooterVariant: ReturnType<
    typeof createHeaderFooterVariantProjector
  >,
): EditorLayoutBlock[] {
  const variants = [
    section.header,
    section.firstPageHeader,
    section.evenPageHeader,
  ]
    .map((blocks): EditorLayoutBlock[] | undefined =>
      projectHeaderFooterVariant(blocks, contentWidth),
    )
    .filter((blocks): blocks is EditorLayoutBlock[] => !!blocks);
  return variants.sort(
    (a, b): number => getProjectedBlocksHeight(b) - getProjectedBlocksHeight(a),
  )[0];
}

function projectTallestFooterVariant(
  section: EditorSection,
  contentWidth: number,
  projectHeaderFooterVariant: ReturnType<
    typeof createHeaderFooterVariantProjector
  >,
): EditorLayoutBlock[] {
  const variants = [
    section.footer,
    section.firstPageFooter,
    section.evenPageFooter,
  ]
    .map((blocks): EditorLayoutBlock[] | undefined =>
      projectHeaderFooterVariant(blocks, contentWidth),
    )
    .filter((blocks): blocks is EditorLayoutBlock[] => !!blocks);
  return variants.sort(
    (a, b): number => getProjectedBlocksHeight(b) - getProjectedBlocksHeight(a),
  )[0];
}

function calculateTotalPages(
  context: SectionPaginationContext,
  projectHeaderFooterVariant: ReturnType<
    typeof createHeaderFooterVariantProjector
  >,
): number {
  let currentTotal = 0;
  const activePages: EditorLayoutPage[] = [];
  for (const section of context.sections) {
    const contentWidth = getPageContentWidth(section.pageSettings);
    const headerBlocks = projectTallestHeaderVariant(
      section,
      contentWidth,
      projectHeaderFooterVariant,
    );
    const footerBlocks = projectTallestFooterVariant(
      section,
      contentWidth,
      projectHeaderFooterVariant,
    );
    const metrics = resolveEffectiveVerticalMetrics(
      section.pageSettings,
      headerBlocks,
      footerBlocks,
    );
    const pageHeight = context.maxPageHeightOverride ?? metrics.contentHeight;
    const isContinuous =
      section.breakType === "continuous" && activePages.length > 0;

    const sectionPages = context.projectBlocks({
      blocks: section.blocks,
      pageSettings: section.pageSettings,
      maxPageHeight: pageHeight,
      measuredHeights: context.measuredHeights,
      measuredParagraphLayouts: context.measuredParagraphLayouts,
      pageOffset: isContinuous ? currentTotal - 1 : currentTotal,
      existingPages: isContinuous ? [activePages[activePages.length - 1]] : [],
      measurer: context.measurer,
      defaultTabStop: context.defaultTabStop,
      projectionContext: context.projectionContext,
    });

    if (isContinuous) {
      activePages.pop();
      activePages.push(...sectionPages);
      currentTotal = activePages.length;
    } else {
      activePages.push(...sectionPages);
      currentTotal = activePages.length;
    }
  }
  return currentTotal;
}

function projectAllPages(
  context: SectionPaginationContext,
  totalPages: number | undefined,
  projectHeaderFooterVariant: ReturnType<
    typeof createHeaderFooterVariantProjector
  >,
  reservedHeightByPageIndex?: Map<number, number>,
): EditorLayoutPage[] {
  const allPages: EditorLayoutPage[] = [];

  for (const section of context.sections) {
    const contentWidth = getPageContentWidth(section.pageSettings);
    const sectionHeaderBlocks = projectTallestHeaderVariant(
      section,
      contentWidth,
      projectHeaderFooterVariant,
    );
    const sectionFooterBlocks = projectTallestFooterVariant(
      section,
      contentWidth,
      projectHeaderFooterVariant,
    );
    const sectionMetrics = resolveEffectiveVerticalMetrics(
      section.pageSettings,
      sectionHeaderBlocks,
      sectionFooterBlocks,
    );
    const pageHeight =
      context.maxPageHeightOverride ?? sectionMetrics.contentHeight;
    const isContinuous =
      section.breakType === "continuous" && allPages.length > 0;
    const sectionPageOffset = isContinuous
      ? allPages.length - 1
      : allPages.length;

    const sectionPages = context.projectBlocks({
      blocks: section.blocks,
      pageSettings: section.pageSettings,
      maxPageHeight: pageHeight,
      measuredHeights: context.measuredHeights,
      measuredParagraphLayouts: context.measuredParagraphLayouts,
      styles: context.documentStyles,
      pageOffset: sectionPageOffset,
      totalPages,
      existingPages: isContinuous ? [allPages[allPages.length - 1]] : [],
      measurer: context.measurer,
      reservedHeightByPageIndex,
      defaultTabStop: context.defaultTabStop,
      projectionContext: context.projectionContext,
    });

    if (isContinuous) {
      allPages.pop();
    }

    for (const page of sectionPages) {
      const pageIndexInSection = page.index - sectionPageOffset;
      const pageContentWidth = getPageContentWidth(page.pageSettings);
      const headerBlocks =
        projectHeaderFooterVariant(
          selectSectionHeaderBlocks(
            section,
            Math.max(0, pageIndexInSection),
            page.index,
          ),
          pageContentWidth,
          page.index,
          totalPages,
        ) ?? page.headerBlocks;
      const footerBlocks =
        projectHeaderFooterVariant(
          selectSectionFooterBlocks(
            section,
            Math.max(0, pageIndexInSection),
            page.index,
          ),
          pageContentWidth,
          page.index,
          totalPages,
        ) ?? page.footerBlocks;

      const pageMetrics = resolveEffectiveVerticalMetrics(
        page.pageSettings,
        headerBlocks,
        footerBlocks,
      );
      const reservedHeight = reservedHeightByPageIndex?.get(page.index) ?? 0;
      page.headerBlocks = headerBlocks;
      page.footerBlocks = footerBlocks;
      page.bodyTop = pageMetrics.bodyTop;
      page.bodyBottom = Math.max(
        pageMetrics.bodyTop,
        pageMetrics.bodyBottom - reservedHeight,
      );
      page.headerTop = pageMetrics.headerTop;
      page.footerTop = pageMetrics.footerTop;
      page.maxHeight = Math.max(
        24,
        (context.maxPageHeightOverride ?? pageMetrics.contentHeight) -
          reservedHeight,
      );
      allPages.push(page);
    }
  }

  return allPages;
}

export function projectDocumentSections(
  context: SectionPaginationContext,
  reservedHeightByPageIndex?: Map<number, number>,
): SectionPaginationResult {
  const projectHeaderFooterVariant =
    createHeaderFooterVariantProjector(context);
  const totalPages = context.needsTotalPages
    ? calculateTotalPages(context, projectHeaderFooterVariant)
    : undefined;

  return {
    totalPages,
    pages: projectAllPages(
      context,
      totalPages,
      projectHeaderFooterVariant,
      reservedHeightByPageIndex,
    ),
  };
}
