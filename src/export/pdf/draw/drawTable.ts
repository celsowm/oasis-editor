import type {
  EditorDocument,
  EditorLayoutBlock,
  EditorState,
} from "../../../core/model.js";
import { buildSegmentTable } from "../../../core/tableLayout.js";
import {
  buildCanvasTableLayout,
  type CanvasTableBorderSpec,
  type CanvasTableCellLayoutEntry,
} from "../../../ui/canvas/CanvasTableLayout.js";
import { PdfFontRegistry } from "../fonts/PdfFontRegistry.js";
import { OasisPdfWriter } from "../OasisPdfWriter.js";
import { pxToPt } from "../units.js";
import { borderDashArray } from "./borderDash.js";
import { drawParagraph } from "./drawParagraph.js";

function drawCellEdge(
  writer: OasisPdfWriter,
  pageIndex: number,
  border: CanvasTableBorderSpec,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  if (border.type === "none" || border.width <= 0) {
    return;
  }
  writer.drawLine(pageIndex, {
    x1: pxToPt(x1),
    y1: pxToPt(y1),
    x2: pxToPt(x2),
    y2: pxToPt(y2),
    stroke: border.color,
    lineWidth: pxToPt(border.width),
    dashArray: borderDashArray(border.type),
  });
}

function drawCellBorders(
  writer: OasisPdfWriter,
  pageIndex: number,
  cell: CanvasTableCellLayoutEntry,
  originX: number,
  originY: number,
): void {
  const left = originX + cell.left;
  const top = originY + cell.top;
  const right = left + cell.width;
  const bottom = top + cell.height;
  drawCellEdge(writer, pageIndex, cell.borders.top, left, top, right, top);
  drawCellEdge(
    writer,
    pageIndex,
    cell.borders.right,
    right,
    top,
    right,
    bottom,
  );
  drawCellEdge(
    writer,
    pageIndex,
    cell.borders.bottom,
    left,
    bottom,
    right,
    bottom,
  );
  drawCellEdge(writer, pageIndex, cell.borders.left, left, top, left, bottom);
}

export async function drawTableBlock(
  writer: OasisPdfWriter,
  pageIndex: number,
  block: EditorLayoutBlock,
  document: EditorDocument,
  originX: number,
  originY: number,
  contentWidth: number,
  fontRegistry: PdfFontRegistry,
  listOrdinals: Map<string, number>,
): Promise<void> {
  if (block.sourceBlock.type !== "table") {
    return;
  }
  const sourceTable = block.sourceBlock;
  const segmentTable = block.tableSegment
    ? buildSegmentTable(sourceTable, block.tableSegment)
    : sourceTable;
  if (segmentTable.rows.length === 0) {
    return;
  }

  // buildCanvasTableLayout only reads `state.document.styles`, so a minimal
  // stub is sufficient.
  const stateStub = { document } as EditorState;
  const tableLayout = buildCanvasTableLayout({
    table: segmentTable,
    state: stateStub,
    pageIndex: 0,
    originX: 0,
    originY: 0,
    contentWidth,
    estimatedHeight: block.estimatedHeight,
  });

  // 1. Shading first so borders render on top.
  for (const cell of tableLayout.cells) {
    if (!cell.shading) continue;
    writer.drawRect(pageIndex, {
      x: pxToPt(originX + cell.left),
      y: pxToPt(originY + cell.top),
      width: pxToPt(cell.width),
      height: pxToPt(cell.height),
      fill: cell.shading,
    });
  }

  // 2. Borders.
  for (const cell of tableLayout.cells) {
    drawCellBorders(writer, pageIndex, cell, originX, originY);
  }

  // 3. Cell content.
  for (const cell of tableLayout.cells) {
    for (const paragraphLayout of cell.paragraphs) {
      await drawParagraph(
        writer,
        pageIndex,
        paragraphLayout.paragraph,
        paragraphLayout.lines,
        document,
        originX + paragraphLayout.originX,
        originY + paragraphLayout.originY,
        fontRegistry,
        listOrdinals,
      );
    }
  }
}
