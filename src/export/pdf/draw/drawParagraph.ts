import type {
  EditorBorderStyle,
  EditorDocument,
  EditorLayoutLine,
  EditorParagraphNode,
  EditorParagraphStyle,
} from "@/core/model.js";
import { PdfFontRegistry } from "@/export/pdf/fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import { getParagraphBorderInsets } from "@/layoutProjection/index.js";
import { pxToPt } from "@/export/pdf/units.js";
import { borderDashArray } from "./borderDash.js";
import { drawFragmentText } from "./drawFragment.js";
import { drawListPrefix } from "./lists.js";
import type { BlockDrawers } from "./blockDrawers.js";

/**
 * Paints paragraph shading (`w:shd`) and borders (`w:pBdr`) for PDF export,
 * mirroring the canvas renderer. Coordinates arrive in pixels and are converted
 * to points; border widths are stored in points and used directly. Dashed and
 * dotted edges use {@link borderDashArray} to match the canvas renderer.
 */
export function drawParagraphDecorations(
  writer: OasisPdfWriter,
  pageIndex: number,
  paragraphStyle: EditorParagraphStyle,
  lines: EditorLayoutLine[],
  originX: number,
  contentTop: number,
  contentWidth: number,
): void {
  const edges: Array<
    [EditorBorderStyle | null | undefined, "top" | "right" | "bottom" | "left"]
  > = [
    [paragraphStyle.borderTop, "top"],
    [paragraphStyle.borderRight, "right"],
    [paragraphStyle.borderBottom, "bottom"],
    [paragraphStyle.borderLeft, "left"],
  ];
  const hasBorder = edges.some(
    ([border]) => border && border.type !== "none" && border.width > 0,
  );
  if (!paragraphStyle.shading && !hasBorder) {
    return;
  }

  let linesHeight = 0;
  for (const line of lines) {
    linesHeight = Math.max(linesHeight, line.top + line.height);
  }
  if (linesHeight <= 0) {
    return;
  }

  const insets = getParagraphBorderInsets(paragraphStyle);
  const boxHeight = insets.top + linesHeight + insets.bottom;
  const left = originX + (paragraphStyle.indentLeft ?? 0);
  const right = originX + contentWidth - (paragraphStyle.indentRight ?? 0);
  const bottom = contentTop + boxHeight;

  if (paragraphStyle.shading) {
    writer.drawRect(pageIndex, {
      x: pxToPt(left),
      y: pxToPt(contentTop),
      width: pxToPt(Math.max(0, right - left)),
      height: pxToPt(boxHeight),
      fill: paragraphStyle.shading,
    });
  }

  for (const [border, side] of edges) {
    if (!border || border.type === "none" || border.width <= 0) {
      continue;
    }
    const [x1, y1, x2, y2] =
      side === "top"
        ? [left, contentTop, right, contentTop]
        : side === "bottom"
          ? [left, bottom, right, bottom]
          : side === "left"
            ? [left, contentTop, left, bottom]
            : [right, contentTop, right, bottom];
    writer.drawLine(pageIndex, {
      x1: pxToPt(x1),
      y1: pxToPt(y1),
      x2: pxToPt(x2),
      y2: pxToPt(y2),
      stroke: border.color,
      lineWidth: border.width,
      dashArray: borderDashArray(border.type),
    });
  }
}

export async function drawParagraph(
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
): Promise<void> {
  for (const line of lines) {
    drawListPrefix(
      writer,
      pageIndex,
      paragraph,
      line,
      document,
      originX,
      originY,
      fontRegistry,
      listOrdinals,
    );
    for (const fragment of line.fragments) {
      await drawFragmentText(
        writer,
        pageIndex,
        paragraph,
        line,
        fragment,
        document,
        originX,
        originY,
        fontRegistry,
        drawers,
      );
    }
  }
}
