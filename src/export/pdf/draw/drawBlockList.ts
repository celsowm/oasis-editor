import type {
  EditorDocument,
  EditorLayoutBlock,
  EditorPageSettings,
} from "@/core/model.js";
import { resolveEffectiveParagraphStyle } from "@/core/model.js";
import { assertNever } from "@/core/assertNever.js";
import { getParagraphBorderInsets } from "@/layoutProjection/index.js";
import { PdfFontRegistry } from "@/export/pdf/fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import { drawParagraph, drawParagraphDecorations } from "./drawParagraph.js";
import { drawFloatingImagesForParagraph } from "./drawFragment.js";
import { drawTableBlock } from "./drawTable.js";
import { drawFloatingTextBoxesForParagraph } from "./drawTextBoxShape.js";
import { resolveCanvasTableWidth } from "@/ui/canvas/CanvasTableLayout.js";
import { resolveFloatingTableRect } from "@/layoutProjection/floatingObjects.js";
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
  onParagraphDrawn?: (paragraphId: string, topPx: number) => void,
): Promise<void> {
  if (!blocks || blocks.length === 0) {
    return;
  }

  const contentTop = originY;
  let cursorY = originY;
  for (const block of blocks) {
    switch (block.sourceBlock.type) {
      case "paragraph": {
        if (!block.layout) {
          break;
        }
        const paragraphStyle = resolveEffectiveParagraphStyle(
          block.sourceBlock.style,
          document.styles,
        );
        const spacingBefore =
          block.layout.startOffset === 0 && cursorY > originY
            ? (paragraphStyle.spacingBefore ?? 0)
            : 0;
        const boxTop = cursorY + spacingBefore;
        onParagraphDrawn?.(block.sourceBlock.id, boxTop);
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
        if (pageSettings) {
          await drawFloatingImagesForParagraph({
            writer,
            pageIndex,
            lines: block.layout.lines,
            document,
            pageSettings,
            contentLeft: originX,
            contentTop,
            contentWidth,
            paragraphTop: textTop,
            layer: "behind",
          });
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
            layer: "behind",
          });
        }
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
          await drawFloatingImagesForParagraph({
            writer,
            pageIndex,
            lines: block.layout.lines,
            document,
            pageSettings,
            contentLeft: originX,
            contentTop,
            contentWidth,
            paragraphTop: textTop,
            layer: "front",
          });
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
            layer: "front",
          });
        }
        break;
      }
      case "table":
        if (block.sourceBlock.style?.floating && pageSettings) {
          const width = resolveCanvasTableWidth(
            block.sourceBlock,
            contentWidth,
          );
          const rect = resolveFloatingTableRect({
            floating: block.sourceBlock.style.floating,
            pageSettings,
            contentLeft: originX,
            contentTop,
            contentWidth,
            anchorTop: cursorY,
            width,
            height: block.floatingTableHeight ?? 1,
            pageIndex,
          });
          rect.y += block.floatingTableOffsetY ?? 0;
          await drawTableBlock(
            writer,
            pageIndex,
            { ...block, estimatedHeight: rect.height },
            document,
            rect.x,
            rect.y,
            contentWidth,
            fontRegistry,
            listOrdinals,
            blockDrawers,
          );
          break;
        }
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
        break;
      default:
        assertNever(block.sourceBlock, "block");
    }
    cursorY += Math.max(0, block.estimatedHeight);
  }
}
