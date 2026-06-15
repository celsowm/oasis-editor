import type {
  EditorDocument,
  EditorLayoutBlock,
  EditorPageSettings,
} from "../../../core/model.js";
import { resolveEffectiveParagraphStyle } from "../../../core/model.js";
import { getParagraphBorderInsets } from "../../../layoutProjection/index.js";
import { PdfFontRegistry } from "../fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "../OasisPdfWriter.js";
import { drawParagraph, drawParagraphDecorations } from "./drawParagraph.js";
import { drawTableBlock } from "./drawTable.js";
import { drawFloatingTextBoxesForParagraph } from "./drawTextBoxShape.js";

export async function drawBlockList(
  writer: OasisPdfWriter,
  pageIndex: number,
  blocks: EditorLayoutBlock[] | undefined,
  document: EditorDocument,
  originX: number,
  originY: number,
  contentWidth: number,
  fontRegistry: PdfFontRegistry,
  listOrdinals: Map<string, number>,
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
      );
    }
    cursorY += Math.max(0, block.estimatedHeight);
  }
}
