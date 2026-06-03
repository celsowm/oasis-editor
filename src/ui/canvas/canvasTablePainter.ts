import type { EditorLayoutBlock, EditorState, EditorTableNode } from "../../core/model.js";
import { buildSegmentTable } from "../../core/tableLayout.js";
import { buildCanvasTableLayout, type CanvasTableBorderSpec } from "./CanvasTableLayout.js";
import { drawParagraph } from "./canvasParagraphPainter.js";

export function drawTable(
  ctx: CanvasRenderingContext2D,
  table: EditorTableNode,
  tableSegment: EditorLayoutBlock["tableSegment"] | undefined,
  state: EditorState,
  originX: number,
  originY: number,
  contentWidth: number,
  estimatedHeight: number,
  pageIndex: number,
  onUpdate: () => void,
) {
  const segmentTable = tableSegment ? buildSegmentTable(table, tableSegment) : table;
  const tableLayout = buildCanvasTableLayout({
    table: segmentTable,
    state,
    pageIndex,
    layoutMode: resolveCanvasLayoutMode(),
    originX,
    originY,
    contentWidth,
    estimatedHeight,
  });
  for (const cell of tableLayout.cells) {
    if (cell.shading) {
      ctx.fillStyle = cell.shading;
      ctx.fillRect(cell.left, cell.top, cell.width, cell.height);
    }
    drawCellBorders(ctx, cell.left, cell.top, cell.width, cell.height, cell.borders);
    for (const paragraphLayout of cell.paragraphs) {
      drawParagraph(
        ctx,
        paragraphLayout.paragraph,
        paragraphLayout.lines,
        state,
        paragraphLayout.originX,
        paragraphLayout.originY,
        onUpdate,
      );
    }
  }
  const viteEnv = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};
  if (tableLayout.unsupported.length > 0 && viteEnv.DEV) {
    console.warn("[oasis-editor] canvas table unsupported features", {
      tableId: table.id,
      reasons: tableLayout.unsupported,
    });
  }
}

function drawCellBorders(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  borders: {
    top: CanvasTableBorderSpec;
    right: CanvasTableBorderSpec;
    bottom: CanvasTableBorderSpec;
    left: CanvasTableBorderSpec;
  },
) {
  const right = left + width;
  const bottom = top + height;
  const drawEdge = (
    border: CanvasTableBorderSpec,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => {
    if (border.type === "none" || border.width <= 0) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = border.color;
    ctx.lineWidth = border.width;
    if (border.type === "dashed") {
      ctx.setLineDash([5, 3]);
    } else if (border.type === "dotted") {
      ctx.setLineDash([1, 3]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  };

  drawEdge(borders.top, left, top, right, top);
  drawEdge(borders.right, right, top, right, bottom);
  drawEdge(borders.bottom, left, bottom, right, bottom);
  drawEdge(borders.left, left, top, left, bottom);
}

function resolveCanvasLayoutMode(): "fast" | "wordParity" {
  const viteEnv = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};
  if (viteEnv.VITE_OASIS_WORD_PARITY_STRICT === "1") {
    return "wordParity";
  }
  return "wordParity";
}
