import { DocumentModel } from "../document/DocumentTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { PageTemplate } from "../pages/PageTemplateTypes.js";
import { Rect, LayoutFragment, LineInfo } from "../layout/LayoutFragment.js";
import { PageLayout, LayoutState } from "../layout/LayoutTypes.js";
import { PAGE_TEMPLATES } from "../pages/PageTemplateFactory.js";
import { composeParagraph } from "../composition/ParagraphComposer.js";

export const paginateDocument = (
  documentModel: DocumentModel,
  measure: TextMeasurer,
): LayoutState => {
  const pages: PageLayout[] = [];
  const fragmentsByBlockId: Record<string, LayoutFragment[]> = {};
  let pageCounter = 0;

  for (const section of documentModel.sections) {
    const template: PageTemplate =
      PAGE_TEMPLATES[section.pageTemplateId] ??
      PAGE_TEMPLATES["template:a4:default"];
    const contentWidth =
      template.size.width - template.margins.left - template.margins.right;
    const contentHeight =
      template.size.height - template.margins.top - template.margins.bottom;
    const headerRect: Rect | null = template.header.enabled
      ? {
          x: template.margins.left,
          y: 32,
          width: contentWidth,
          height: template.header.height,
        }
      : null;
    const footerRect: Rect | null = template.footer.enabled
      ? {
          x: template.margins.left,
          y: template.size.height - 32 - template.footer.height,
          width: contentWidth,
          height: template.footer.height,
        }
      : null;

    let currentPage: PageLayout = {
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
        y: template.margins.top,
        width: contentWidth,
        height: contentHeight,
      },
      headerRect,
      footerRect,
      fragments: [],
    };

    let currentY = currentPage.contentRect.y;

    for (const block of section.children) {
      if (!["paragraph", "heading"].includes(block.kind)) continue;
      const composed = composeParagraph(block, contentWidth, measure);

      if (
        currentY + composed.totalHeight >
        currentPage.contentRect.y + currentPage.contentRect.height
      ) {
        pages.push(currentPage);
        pageCounter += 1;
        currentPage = {
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
            y: template.margins.top,
            width: contentWidth,
            height: contentHeight,
          },
          headerRect,
          footerRect,
          fragments: [],
        };
        currentY = currentPage.contentRect.y;
      }

      const textLength = block.children.reduce(
        (sum, child) => sum + child.text.length,
        0,
      );
      const fragment: LayoutFragment = {
        id: `fragment:${block.id}:0`,
        blockId: block.id,
        sectionId: section.id,
        pageId: currentPage.id,
        fragmentIndex: 0,
        kind: block.kind,
        startOffset: 0,
        endOffset: textLength,
        text: composed.text,
        rect: {
          x: currentPage.contentRect.x,
          y: currentY,
          width: contentWidth,
          height: composed.totalHeight,
        },
        typography: composed.typography,
        runs: composed.runs,
        marks: {},
        lines: composed.lines.map(
          (line): LineInfo => ({
            ...line,
            y: line.y + currentY,
          }),
        ),
        align: composed.align,
      };

      currentPage.fragments.push(fragment);
      fragmentsByBlockId[block.id] = [fragment];
      currentY += composed.totalHeight + 12;
    }

    pages.push(currentPage);
    pageCounter += 1;
  }

  return { pages, fragmentsByBlockId };
};
