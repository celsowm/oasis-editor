import type {
  EditorLayoutBlock,
  EditorState,
  EditorTableNode,
} from "@/core/model.js";
import { buildSegmentTable } from "@/core/tableLayout.js";
import {
  buildCanvasTableLayout,
  type CanvasTableCellLayoutEntry,
} from "./CanvasTableLayout.js";
import { drawBorderBox } from "./canvasBorders.js";
import { drawParagraph } from "./canvasParagraphPainter.js";
import { drawStackedParagraph, withRotatedBox } from "./verticalText.js";
import type { CanvasBlockPainters } from "./canvasBlockPainters.js";

/**
 * Paint a cell whose text flows vertically: rotated (90° cw/ccw) content reuses
 * the horizontal line layout under a canvas transform, while stacked content is
 * painted glyph-by-glyph.
 */
function drawVerticalCell(
  ctx: CanvasRenderingContext2D,
  cell: CanvasTableCellLayoutEntry,
  state: EditorState,
  pageIndex: number,
  onUpdate: () => void,
  painters: CanvasBlockPainters,
): void {
  const box = {
    x: cell.contentLeft,
    y: cell.contentTop,
    width: cell.contentWidth,
    height: cell.contentHeight,
  };

  if (cell.verticalMode === "stack") {
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.width, box.height);
    ctx.clip();
    let columnRight = box.x + box.width;
    for (const paragraphLayout of cell.paragraphs) {
      columnRight = drawStackedParagraph(
        ctx,
        paragraphLayout.paragraph,
        state,
        box,
        columnRight,
      );
    }
    ctx.restore();
    return;
  }

  withRotatedBox(
    ctx,
    box,
    cell.verticalMode as "rotate-cw" | "rotate-ccw",
    () => {
      let cursorY = 0;
      for (const paragraphLayout of cell.paragraphs) {
        drawParagraph(
          ctx,
          paragraphLayout.paragraph,
          paragraphLayout.lines,
          state,
          0,
          cursorY,
          onUpdate,
          painters,
          pageIndex,
        );
        cursorY += Math.max(0, paragraphLayout.height);
      }
    },
  );
}

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
  painters: CanvasBlockPainters,
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
    if (cell.verticalMode === "horizontal") {
      for (const paragraphLayout of cell.paragraphs) {
        drawParagraph(
          ctx,
          paragraphLayout.paragraph,
          paragraphLayout.lines,
          state,
          paragraphLayout.originX,
          paragraphLayout.originY,
          onUpdate,
          painters,
          pageIndex,
        );
      }
    } else {
      drawVerticalCell(ctx, cell, state, pageIndex, onUpdate, painters);
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
