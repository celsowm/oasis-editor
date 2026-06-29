import type {
  EditorBlockNode,
  EditorDocument,
  EditorLayoutDocument,
  EditorLayoutParagraph,
} from "@/core/model.js";
import { getDocumentSections, getRunField } from "@/core/model.js";
import type { ITextMeasurer } from "@/core/engine.js";
import { domTextMeasurer } from "@/ui/textMeasurement.js";
import {
  applyFootnotesToPages,
  buildFootnoteReservations,
  MAX_FOOTNOTE_LAYOUT_ITERATIONS,
  reservationSignature,
} from "./footnotePagination.js";
import { projectBlocksLayout } from "./blocksPagination.js";
import { createProjectionContext } from "./paragraphPagination.js";
import { projectHeaderFooterBlocks } from "./headerFooterFootnotes.js";
import { projectDocumentSections } from "./sectionPagination.js";
import { injectEndnotesIntoDocument } from "./endnotePagination.js";

function blockContainsNumPagesField(block: EditorBlockNode): boolean {
  if (block.type === "paragraph") {
    return block.runs.some((run) => getRunField(run)?.type === "NUMPAGES");
  }
  return block.rows.some((row) =>
    row.cells.some((cell) => cell.blocks.some(blockContainsNumPagesField)),
  );
}

function documentContainsNumPagesField(document: EditorDocument): boolean {
  return getDocumentSections(document).some((section) =>
    [
      ...(section.header ?? []),
      ...(section.firstPageHeader ?? []),
      ...(section.evenPageHeader ?? []),
      ...section.blocks,
      ...(section.footer ?? []),
      ...(section.firstPageFooter ?? []),
      ...(section.evenPageFooter ?? []),
    ].some(blockContainsNumPagesField),
  );
}

export function projectDocumentLayout(
  document: EditorDocument,
  maxPageHeightOverride?: number,
  measuredHeights?: Record<string, number>,
  measuredParagraphLayouts?: Record<string, EditorLayoutParagraph>,
  options: {
    measurer?: ITextMeasurer;
  } = {},
): EditorLayoutDocument {
  const measurer = options.measurer ?? domTextMeasurer;
  const projectionContext = createProjectionContext(
    document.settings?.autoHyphenation
      ? {
          enabled: true,
          zone: document.settings.hyphenationZone,
          consecutiveLimit: document.settings.consecutiveHyphenLimit,
          doNotHyphenateCaps: document.settings.doNotHyphenateCaps,
        }
      : undefined,
  );
  // Endnotes render at the end of the document: append their bodies to the last
  // section's flow so normal pagination lays them out. This derived document is
  // used only for layout; the persisted model is untouched.
  const layoutDocument = injectEndnotesIntoDocument(document);
  const sections = getDocumentSections(layoutDocument);
  const needsTotalPages = documentContainsNumPagesField(layoutDocument);

  const sectionContext = {
    sections,
    documentStyles: document.styles,
    maxPageHeightOverride,
    measuredHeights,
    measuredParagraphLayouts,
    measurer,
    defaultTabStop: document.settings?.defaultTabStop,
    needsTotalPages,
    projectBlocks: projectBlocksLayout,
    projectHeaderFooterBlocks,
    projectionContext,
  };

  const projectedSections = projectDocumentSections(sectionContext);
  let pages = projectedSections.pages;
  const totalPages = projectedSections.totalPages;
  if (
    !document.footnotes ||
    Object.keys(document.footnotes.items).length === 0
  ) {
    return { pages };
  }

  const footnoteContext = {
    document,
    totalPages,
    measuredHeights,
    measuredParagraphLayouts,
    measurer,
    projectBlocks: projectHeaderFooterBlocks,
  };
  let reservations = buildFootnoteReservations(pages, footnoteContext);
  let previousSignature = "";
  for (
    let iteration = 0;
    iteration < MAX_FOOTNOTE_LAYOUT_ITERATIONS;
    iteration += 1
  ) {
    const signature = reservationSignature(reservations);
    if (signature === previousSignature) {
      break;
    }
    previousSignature = signature;
    pages = projectDocumentSections(sectionContext, reservations).pages;
    reservations = buildFootnoteReservations(pages, footnoteContext);
  }

  return {
    pages: applyFootnotesToPages(pages, footnoteContext),
  };
}
