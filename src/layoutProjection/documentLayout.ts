import type {
  EditorBlockNode,
  EditorDocument,
  EditorLayoutDocument,
  EditorLayoutParagraph,
} from "../core/model.js";
import { getDocumentSections } from "../core/model.js";
import type { ITextMeasurer } from "../core/engine.js";
import { domTextMeasurer } from "../ui/textMeasurement.js";
import {
  applyFootnotesToPages,
  buildFootnoteReservations,
  MAX_FOOTNOTE_LAYOUT_ITERATIONS,
  reservationSignature,
} from "./footnotePagination.js";
import { projectBlocksLayout } from "./blocksPagination.js";
import { projectHeaderFooterBlocks } from "./headerFooterFootnotes.js";
import { projectDocumentSections } from "./sectionPagination.js";

function blockContainsNumPagesField(block: EditorBlockNode): boolean {
  if (block.type === "paragraph") {
    return block.runs.some((run) => run.field?.type === "NUMPAGES");
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
    layoutMode?: "fast" | "wordParity";
    measurer?: ITextMeasurer;
  } = {},
): EditorLayoutDocument {
  const layoutMode = options.layoutMode ?? "fast";
  const measurer = options.measurer ?? domTextMeasurer;
  const sections = getDocumentSections(document);
  const needsTotalPages = documentContainsNumPagesField(document);

  const sectionContext = {
    sections,
    documentStyles: document.styles,
    maxPageHeightOverride,
    measuredHeights,
    measuredParagraphLayouts,
    layoutMode,
    measurer,
    needsTotalPages,
    projectBlocks: projectBlocksLayout,
    projectHeaderFooterBlocks,
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
    layoutMode,
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
