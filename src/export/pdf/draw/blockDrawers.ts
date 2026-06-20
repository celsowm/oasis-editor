import type {
  EditorDocument,
  EditorLayoutBlock,
  EditorLayoutLine,
  EditorParagraphNode,
} from "@/core/model.js";
import type { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import type { PdfFontRegistry } from "@/export/pdf/fonts/PdfFontRegistry.js";

/**
 * The block-level drawing functions a text box's inner content recurses into.
 * Injected into the draw pipeline so `drawTextBoxShape` can render nested
 * paragraphs/tables without importing `drawParagraph`/`drawTable` (which import
 * back through the fragment painter), keeping the recursion acyclic. The
 * concrete object is built by `createBlockDrawers` in `drawBlockList.ts`, the
 * orchestrator that sits above this pipeline.
 *
 * Each function takes the `drawers` bundle as its final argument so deeper
 * nesting (a text box inside a text box) keeps threading the same callbacks.
 */
export interface BlockDrawers {
  drawParagraph(
    writer: OasisPdfWriter,
    pageIndex: number,
    paragraph: EditorParagraphNode,
    lines: EditorLayoutLine[],
    document: EditorDocument,
    originX: number,
    originY: number,
    fontRegistry: PdfFontRegistry,
    listOrdinals: Map<string, string>,
    drawers: BlockDrawers,
  ): Promise<void>;
  drawTableBlock(
    writer: OasisPdfWriter,
    pageIndex: number,
    block: EditorLayoutBlock,
    document: EditorDocument,
    originX: number,
    originY: number,
    contentWidth: number,
    fontRegistry: PdfFontRegistry,
    listOrdinals: Map<string, string>,
    drawers: BlockDrawers,
  ): Promise<void>;
}
