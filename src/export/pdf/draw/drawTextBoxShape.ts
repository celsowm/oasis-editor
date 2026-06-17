import type {
  EditorDocument,
  EditorLayoutLine,
  EditorPageSettings,
  EditorTextBoxData,
} from "@/core/model.js";
import { projectBlocksLayout } from "@/layoutProjection/blocksPagination.js";
import {
  getTextBoxFloatingGeometry,
  resolveFloatingObjectRect,
} from "@/layoutProjection/floatingObjects.js";
import { getPresetPathSegments } from "@/layoutProjection/presetGeometry.js";
import { PdfFontRegistry } from "@/export/pdf/fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import { pxToPt } from "@/export/pdf/units.js";
import { drawParagraph } from "./drawParagraph.js";
import { drawTableBlock } from "./drawTable.js";

interface TextBoxPaintContext {
  document: EditorDocument;
  fontRegistry: PdfFontRegistry;
  pageIndex: number;
}

function getPadding(textBox: EditorTextBoxData): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  return {
    left: textBox.body?.paddingLeft ?? 0,
    top: textBox.body?.paddingTop ?? 0,
    right: textBox.body?.paddingRight ?? 0,
    bottom: textBox.body?.paddingBottom ?? 0,
  };
}

/** Fills/strokes a shape / text box's geometry. Rectangle is in pixels. */
function drawShapeGeometry(
  writer: OasisPdfWriter,
  pageIndex: number,
  textBox: EditorTextBoxData,
  xPx: number,
  yPx: number,
  widthPx: number,
  heightPx: number,
): void {
  const segments = getPresetPathSegments(
    textBox.shape?.preset,
    pxToPt(xPx),
    pxToPt(yPx),
    pxToPt(widthPx),
    pxToPt(heightPx),
  );

  const fill = textBox.shape?.fill;
  const borderColor = textBox.shape?.borderColor;
  const borderWidthPt =
    textBox.shape?.borderWidthPt ?? (borderColor ? 0.75 : 0);

  writer.drawPath(pageIndex, {
    segments,
    fill,
    stroke: borderColor && borderWidthPt > 0 ? borderColor : undefined,
    lineWidth: borderWidthPt,
  });
}

/**
 * Lays out and draws the text box's inner block content (paragraphs/tables),
 * clipped to the padded inner box. Mirrors the canvas `renderTextBoxContent`
 * (horizontal flow only; vertical/stacked text directions are not handled).
 */
async function drawTextBoxContent(
  writer: OasisPdfWriter,
  textBox: EditorTextBoxData,
  ctx: TextBoxPaintContext,
  xPx: number,
  yPx: number,
  widthPx: number,
  heightPx: number,
): Promise<void> {
  if (textBox.blocks.length === 0) {
    return;
  }
  const padding = getPadding(textBox);
  const innerX = xPx + padding.left;
  const innerY = yPx + padding.top;
  const innerWidth = Math.max(1, widthPx - padding.left - padding.right);
  const innerHeight = Math.max(1, heightPx - padding.top - padding.bottom);

  const pages = projectBlocksLayout({
    blocks: textBox.blocks,
    pageSettings: {
      width: innerWidth,
      height: innerHeight,
      orientation: "portrait",
      margins: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        header: 0,
        footer: 0,
        gutter: 0,
      },
    },
    maxPageHeight: innerHeight,
    styles: ctx.document.styles,
    pageOffset: ctx.pageIndex,
  });
  const blocks = pages[0]?.blocks ?? [];
  if (blocks.length === 0) {
    return;
  }

  const listOrdinals = new Map<string, number>();
  writer.saveGraphicsState(ctx.pageIndex);
  writer.clipRect(
    ctx.pageIndex,
    pxToPt(innerX),
    pxToPt(innerY),
    pxToPt(innerWidth),
    pxToPt(innerHeight),
  );
  let cursorY = innerY;
  for (const block of blocks) {
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      await drawParagraph(
        writer,
        ctx.pageIndex,
        block.sourceBlock,
        block.layout.lines,
        ctx.document,
        innerX,
        cursorY,
        ctx.fontRegistry,
        listOrdinals,
      );
    } else if (block.sourceBlock.type === "table") {
      await drawTableBlock(
        writer,
        ctx.pageIndex,
        block,
        ctx.document,
        innerX,
        cursorY,
        innerWidth,
        ctx.fontRegistry,
        listOrdinals,
      );
    }
    cursorY += Math.max(0, block.estimatedHeight);
  }
  writer.restoreGraphicsState(ctx.pageIndex);
}

/**
 * Paints a text box / shape (geometry + inner content) at the given box,
 * honoring `textBox.rotation` by rotating about the box center — mirroring the
 * canvas `paintTextBox`. Shared by inline and floating text box rendering.
 */
export async function paintTextBox(
  writer: OasisPdfWriter,
  textBox: EditorTextBoxData,
  ctx: TextBoxPaintContext,
  xPx: number,
  yPx: number,
  widthPx: number,
  heightPx: number,
): Promise<void> {
  const rotation = textBox.rotation;
  if (rotation) {
    writer.saveGraphicsState(ctx.pageIndex);
    writer.rotateAbout(
      ctx.pageIndex,
      pxToPt(xPx + widthPx / 2),
      pxToPt(yPx + heightPx / 2),
      rotation,
    );
  }

  drawShapeGeometry(
    writer,
    ctx.pageIndex,
    textBox,
    xPx,
    yPx,
    widthPx,
    heightPx,
  );
  await drawTextBoxContent(writer, textBox, ctx, xPx, yPx, widthPx, heightPx);

  if (rotation) {
    writer.restoreGraphicsState(ctx.pageIndex);
  }
}

/**
 * Paints the floating (anchored) text boxes / shapes of a single paragraph,
 * mirroring the canvas `drawFloatingTextBoxesForParagraph`: positions are
 * resolved with {@link resolveFloatingObjectRect} into absolute page
 * coordinates. Inline (non-floating) boxes are handled in the fragment loop.
 */
export async function drawFloatingTextBoxesForParagraph(options: {
  writer: OasisPdfWriter;
  document: EditorDocument;
  fontRegistry: PdfFontRegistry;
  pageIndex: number;
  lines: EditorLayoutLine[];
  pageSettings: EditorPageSettings;
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  paragraphTop: number;
}): Promise<void> {
  const {
    writer,
    document,
    fontRegistry,
    pageIndex,
    lines,
    pageSettings,
    contentLeft,
    contentTop,
    contentWidth,
    paragraphTop,
  } = options;

  for (const line of lines) {
    const slotByOffset = new Map(
      line.slots.map((slot) => [slot.offset, slot] as const),
    );
    for (const fragment of line.fragments) {
      const textBox = fragment.textBox;
      if (!textBox?.floating) {
        continue;
      }
      const slot = slotByOffset.get(fragment.startOffset);
      const anchorLeft = contentLeft + (slot?.left ?? 0);
      const lineTop = paragraphTop + line.top;

      const rect = resolveFloatingObjectRect({
        object: getTextBoxFloatingGeometry(textBox),
        pageSettings,
        contentLeft,
        contentTop,
        contentWidth,
        paragraphTop,
        lineTop,
        anchorLeft,
      });

      await paintTextBox(
        writer,
        textBox,
        { document, fontRegistry, pageIndex },
        rect.x,
        rect.y,
        rect.width,
        rect.height,
      );
    }
  }
}
