import type { EditorState } from "@/core/model.js";
import type { CanvasTableLayoutResult } from "./CanvasTableLayout.js";
import {
  drawCellBackground,
  drawCellBorders,
} from "./table/tableDrawing.js";
import {
  applyCellContentTransform,
  drawStackedParagraph,
  prepareRotatedParagraphEntry,
} from "./table/tableTextRendering.js";
import {
  drawCanvasParagraph,
  buildCanvasTextSourceForParagraph,
} from "./CanvasParagraphRenderer.js";
import {
  drawCanvasRevisionMarginComment,
  drawCanvasRevisionOverlay,
} from "./CanvasRevisionRenderer.js";

function clipToCellContent(
  ctx: CanvasRenderingContext2D,
  cell: CanvasTableLayoutResult["cells"][number],
  scale: number,
): void {
  ctx.beginPath();
  ctx.rect(
    cell.contentLeft * scale,
    cell.contentTop * scale,
    cell.contentWidth * scale,
    cell.contentHeight * scale,
  );
  ctx.clip();
}

export function renderCanvasTable(
  ctx: CanvasRenderingContext2D,
  tableLayout: CanvasTableLayoutResult,
  state: EditorState,
  scale = 1,
): void {
  // First pass: cell backgrounds, revision overlays, and borders.
  for (const cell of tableLayout.cells) {
    drawCellBackground(ctx, cell, scale);

    if (cell.revision) {
      drawCanvasRevisionOverlay(
        ctx,
        {
          revision: cell.revision,
          left: cell.left,
          top: cell.top,
          width: cell.width,
          height: cell.height,
        },
        scale,
      );
    }

    drawCellBorders(ctx, cell, scale);
  }

  // Second pass: paragraph stories and recursively nested tables.
  for (const cell of tableLayout.cells) {
    for (const paragraphEntry of cell.paragraphs) {
      if (cell.verticalMode === "stack") {
        drawStackedParagraph(ctx, paragraphEntry, state, scale);
        continue;
      }

      ctx.save();
      applyCellContentTransform(ctx, cell, scale);
      clipToCellContent(ctx, cell, scale);

      const renderEntry = prepareRotatedParagraphEntry(
        paragraphEntry,
        cell,
        scale,
      );
      drawCanvasParagraph(ctx, renderEntry, state, scale, {
        source: buildCanvasTextSourceForParagraph(paragraphEntry.paragraph),
      });
      ctx.restore();
    }

    for (const nestedTable of cell.nestedTables ?? []) {
      ctx.save();
      clipToCellContent(ctx, cell, scale);
      renderCanvasTable(ctx, nestedTable, state, scale);
      ctx.restore();
    }

    if (cell.revision) {
      drawCanvasRevisionMarginComment(
        ctx,
        {
          revision: cell.revision,
          left: cell.left,
          top: cell.top,
          width: cell.width,
          height: cell.height,
        },
        scale,
      );
    }
  }
}
