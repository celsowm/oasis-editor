import { LayoutFragment } from "../layout/LayoutFragment.js";
import { PaginationContext, createNewPage } from "./PaginationContext.js";
import { BlockNode, TableNode } from "../document/BlockTypes.js";
import { measureTextBlocks } from "./BlockLayoutEngine.js";

export function layoutTableBlock(
  block: TableNode,
  ctx: PaginationContext,
  containerX: number = 0,
): void {
  for (let rIdx = 0; rIdx < block.rows.length; rIdx++) {
    const row = block.rows[rIdx];

    let maxRowHeight = 0;
    const cellResults: { height: number; fragments: LayoutFragment[] }[] = [];

    for (let cIdx = 0; cIdx < row.cells.length; cIdx++) {
      const cell = row.cells[cIdx];
      const cellWidth = block.columnWidths[cIdx];

      const result = measureTextBlocks(
        cell.children,
        cellWidth - 10,
        ctx.measure,
        ctx.section,
      );
      cellResults.push(result);
      maxRowHeight = Math.max(maxRowHeight, result.height + 10); // + padding
    }

    if (
      ctx.currentY + maxRowHeight >
      ctx.currentPage.contentRect.y + ctx.contentHeight
    ) {
      createNewPage(ctx);
    }

    let currentX = 0;
    for (let cIdx = 0; cIdx < row.cells.length; cIdx++) {
      const cell = row.cells[cIdx];
      const cellWidth = block.columnWidths[cIdx];

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
          height: maxRowHeight,
        },
        typography: { fontFamily: "", fontSize: 0, fontWeight: 400 },
        runs: [],
        marks: {},
        lines: [],
        align: "left",
      };
      ctx.currentPage.fragments.push(cellFrag);

      const res = cellResults[cIdx];
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

      currentX += cellWidth;
    }

    ctx.currentY += maxRowHeight;
  }
  ctx.currentY += 12; // Bottom margin for table
}
