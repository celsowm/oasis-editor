import { LayoutFragment } from "../layout/LayoutFragment.js";
import { PaginationContext, createNewPage } from "./PaginationContext.js";
import { TableNode } from "../document/BlockTypes.js";
import { measureTextBlocks } from "./BlockLayoutEngine.js";
import { BLOCK_SPACING } from "../pages/PageTemplateTypes.js";

export function layoutTableBlock(
  block: TableNode,
  ctx: PaginationContext,
  containerX: number = 0,
): void {
  // First pass: compute row heights considering merged cells
  const rowHeights: number[] = new Array(block.rows.length).fill(0);
  const cellResults: { height: number; fragments: LayoutFragment[] }[][] = [];

  for (let rIdx = 0; rIdx < block.rows.length; rIdx++) {
    const row = block.rows[rIdx];
    const rowCellResults: { height: number; fragments: LayoutFragment[] }[] = [];
    let maxHeight = 0;

    for (let cIdx = 0; cIdx < row.cells.length; cIdx++) {
      const cell = row.cells[cIdx];
      // Skip continuation cells (merged into another cell)
      if (cell.colSpan === 0 || cell.rowSpan === 0) {
        rowCellResults.push({ height: 0, fragments: [] });
        continue;
      }

      const colSpan = cell.colSpan || 1;
      let cellWidth = 0;
      for (let i = 0; i < colSpan && cIdx + i < block.columnWidths.length; i++) {
        cellWidth += block.columnWidths[cIdx + i];
      }

      const result = measureTextBlocks(
        cell.children,
        cellWidth - 10,
        ctx.measure,
        ctx.section,
        ctx.fontManager,
      );
      rowCellResults.push(result);
      maxHeight = Math.max(maxHeight, result.height + 10);
    }

    cellResults.push(rowCellResults);
    rowHeights[rIdx] = maxHeight;
  }

  // Second pass: distribute rowspan heights
  for (let rIdx = 0; rIdx < block.rows.length; rIdx++) {
    const row = block.rows[rIdx];
    for (let cIdx = 0; cIdx < row.cells.length; cIdx++) {
      const cell = row.cells[cIdx];
      if (cell.colSpan === 0 || cell.rowSpan === 0) continue;

      const rowSpan = cell.rowSpan || 1;
      if (rowSpan > 1) {
        let totalHeight = 0;
        for (let i = 0; i < rowSpan && rIdx + i < block.rows.length; i++) {
          totalHeight += rowHeights[rIdx + i];
        }
        const result = cellResults[rIdx][cIdx];
        if (result.height + 10 > totalHeight) {
          // Expand the last row to accommodate
          const extra = result.height + 10 - totalHeight;
          rowHeights[rIdx + rowSpan - 1] += extra;
        }
      }
    }
  }

  // Third pass: render cells
  for (let rIdx = 0; rIdx < block.rows.length; rIdx++) {
    const row = block.rows[rIdx];
    const rowHeight = rowHeights[rIdx];

    if (
      ctx.currentY + rowHeight >
      ctx.currentPage.contentRect.y + ctx.contentHeight
    ) {
      createNewPage(ctx);
    }

    let currentX = 0;
    for (let cIdx = 0; cIdx < row.cells.length; cIdx++) {
      const cell = row.cells[cIdx];

      // Skip continuation cells
      if (cell.colSpan === 0 || cell.rowSpan === 0) {
        currentX += block.columnWidths[cIdx] || 0;
        continue;
      }

      const colSpan = cell.colSpan || 1;
      const rowSpan = cell.rowSpan || 1;

      let cellWidth = 0;
      for (let i = 0; i < colSpan && cIdx + i < block.columnWidths.length; i++) {
        cellWidth += block.columnWidths[cIdx + i];
      }

      let cellHeight = rowHeight;
      for (let i = 1; i < rowSpan && rIdx + i < block.rows.length; i++) {
        cellHeight += rowHeights[rIdx + i];
      }

      const cellFrag: LayoutFragment = {
        id: `fragment:${cell.id}:cell`,
        blockId: cell.id,
        sectionId: ctx.section.id,
        pageId: ctx.currentPage.id,
        fragmentIndex: 0,
        kind: "table-cell",
        startOffset: 0,
        endOffset: 0,
        text: "",
        rect: {
          x: ctx.currentPage.contentRect.x + containerX + currentX,
          y: ctx.currentY,
          width: cellWidth,
          height: cellHeight,
        },
        typography: { fontFamily: "", fontSize: 0, fontWeight: 400, lineHeight: 0 },
        runs: [],
        marks: {},
        lines: [],
        align: "left",
      };
      ctx.currentPage.fragments.push(cellFrag);

      const res = cellResults[rIdx][cIdx];
      if (res) {
        for (const f of res.fragments) {
          f.rect.x +=
            ctx.currentPage.contentRect.x + containerX + currentX + 5;
          f.rect.y += ctx.currentY + 5;
          f.pageId = ctx.currentPage.id;
          for (const l of f.lines) {
            l.y += ctx.currentY + 5;
          }
          ctx.currentPage.fragments.push(f);
          if (!ctx.fragmentsByBlockId[f.blockId])
            ctx.fragmentsByBlockId[f.blockId] = [];
          ctx.fragmentsByBlockId[f.blockId].push(f);
        }
      }

      currentX += cellWidth;
    }

    ctx.currentY += rowHeight;
  }
  ctx.currentY += BLOCK_SPACING;
}
