import type {
  EditorDocument,
  EditorLayoutBlock,
} from "../../../core/model.js";
import { resolveEffectiveParagraphStyle } from "../../../core/model.js";
import { PdfFontRegistry } from "../fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "../OasisPdfWriter.js";
import { drawParagraph } from "./drawParagraph.js";
import { drawTableBlock } from "./drawTable.js";

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
): Promise<void> {
  if (!blocks || blocks.length === 0) {
    return;
  }

  let cursorY = originY;
  for (const block of blocks) {
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      const paragraphStyle = resolveEffectiveParagraphStyle(block.sourceBlock.style, document.styles);
      const spacingBefore =
        block.layout.startOffset === 0 && cursorY > originY ? paragraphStyle.spacingBefore ?? 0 : 0;
      await drawParagraph(
        writer,
        pageIndex,
        block.sourceBlock,
        block.layout.lines,
        document,
        originX,
        cursorY + spacingBefore,
        fontRegistry,
        listOrdinals,
      );
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
