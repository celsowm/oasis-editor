import type {
  EditorLayoutBlock,
  EditorState,
  EditorTableNode,
} from "../../core/model.js";
import { buildSegmentTable } from "../../core/tableLayout.js";
import { buildCanvasTableLayout } from "./CanvasTableLayout.js";
import { drawBorderBox } from "./canvasBorders.js";
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
  const segmentTable = tableSegment
    ? buildSegmentTable(table, tableSegment)
    : table;
  const tableLayout = buildCanvasTableLayout({
    table: segmentTable,
    state,
    pageIndex,
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
    drawBorderBox(
      ctx,
      cell.left,
      cell.top,
      cell.width,
      cell.height,
      cell.borders,
    );
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
  const viteEnv =
    (import.meta as { env?: Record<string, string | boolean | undefined> })
      .env ?? {};
  if (tableLayout.unsupported.length > 0 && viteEnv.DEV) {
    console.warn("[oasis-editor] canvas table unsupported features", {
      tableId: table.id,
      reasons: tableLayout.unsupported,
    });
  }
}
