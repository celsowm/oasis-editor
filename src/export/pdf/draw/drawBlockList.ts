import type {
  EditorDocument,
  EditorLayoutBlock,
  EditorPageSettings,
} from "@/core/model.js";
import { resolveEffectiveParagraphStyle } from "@/core/model.js";
import { getParagraphBorderInsets } from "@/layoutProjection/index.js";
import { PdfFontRegistry } from "@/export/pdf/fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import { drawParagraph, drawParagraphDecorations } from "./drawParagraph.js";
import { drawTableBlock } from "./drawTable.js";
import { drawFloatingTextBoxesForParagraph } from "./drawTextBoxShape.js";
import type { BlockDrawers } from "./blockDrawers.js";

/**
 * The concrete block drawers threaded through the PDF draw pipeline so text-box
 * content can recurse into paragraphs/tables without those modules importing
 * each other. `drawBlockList` is the orchestrator that owns this wiring.
 */
const blockDrawers: BlockDrawers = { drawParagraph, drawTableBlock };

export async function drawBlockList(
  writer: OasisPdfWriter,
  pageIndex: number,
  blocks: EditorLayoutBlock[] | undefined,
  document: EditorDocument,
  originX: number,
  originY: number,
  contentWidth: number,
  fontRegistry: PdfFontRegistry,
  listOrdinals: Map<string, string>,
  pageSettings?: EditorPageSettings,
): Promise<void> {
  if (!blocks || blocks.length === 0) {
    return;
  }

  const contentTop = originY;
  let cursorY = originY;
  for (const block of blocks) {
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      const paragraphStyle = resolveEffectiveParagraphStyle(
        block.sourceBlock.style,
        document.styles,
      );
      const spacingBefore =
        block.layout.startOffset === 0 && cursorY > originY
          ? (paragraphStyle.spacingBefore ?? 0)
          : 0;
      const boxTop = cursorY + spacingBefore;
      const textTop = boxTop + getParagraphBorderInsets(paragraphStyle).top;
      drawParagraphDecorations(
        writer,
        pageIndex,
        paragraphStyle,
        block.layout.lines,
        originX,
        boxTop,
        contentWidth,
      );
      await drawParagraph(
        writer,
        pageIndex,
        block.sourceBlock,
        block.layout.lines,
        document,
        originX,
        textTop,
        fontRegistry,
        listOrdinals,
        blockDrawers,
      );
      if (pageSettings) {
        await drawFloatingTextBoxesForParagraph({
          writer,
          document,
          fontRegistry,
          pageIndex,
          lines: block.layout.lines,
          pageSettings,
          contentLeft: originX,
          contentTop,
          contentWidth,
          paragraphTop: boxTop,
          drawers: blockDrawers,
        });
      }
    } else if (block.sourceBlock.type === "table") {
      await drawTableBlock(
        writer,
        pageIndex,
        block,
        document,
        originX,
        cursorY,
        contentWidth,
        fontRegistry,
        listOrdinals,
        blockDrawers,
      );
    }
    cursorY += Math.max(0, block.estimatedHeight);
  }
}
