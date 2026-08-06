import {
  getBlockParagraphs,
  getDocumentSections,
  paragraphOffsetToPosition,
  type EditorDocument,
  type EditorPosition,
  type EditorParagraphNode,
  type EditorTableCellNode,
  type EditorTableNode,
  type EditorTableRowNode,
} from "@/core/model.js";

export const getRowVisualWidth = (row: EditorTableRowNode): number =>
  row.cells.reduce(
    (sum, cell): number => sum + Math.max(1, cell.colSpan ?? 1),
    0,
  );

export const getTableVisualWidth = (table: EditorTableNode): number =>
  table.rows.reduce(
    (max, row): number => Math.max(max, getRowVisualWidth(row)),
    0,
  );

export const findCellAtVisualColumn = (
  row: EditorTableRowNode,
  visualColumn: number,
): EditorTableCellNode | null => {
  let visualCursor = 0;
  for (const cell of row.cells) {
    const span = Math.max(1, cell.colSpan ?? 1);
    if (visualColumn >= visualCursor && visualColumn < visualCursor + span) {
      return cell;
    }
    visualCursor += span;
  }
  return null;
};

function firstParagraphInCell(
  cell: EditorTableCellNode | undefined,
): EditorParagraphNode | null {
  if (!cell) return null;
  for (const block of cell.blocks) {
    const paragraph = getBlockParagraphs(block)[0];
    if (paragraph) return paragraph;
  }
  return null;
}

function cellContainsParagraph(
  cell: EditorTableCellNode,
  paragraphId: string,
): boolean {
  return cell.blocks.some((block): boolean =>
    getBlockParagraphs(block).some(
      (paragraph): boolean => paragraph.id === paragraphId,
    ),
  );
}

export const findFirstNavigableParagraphInTable = (
  table: EditorTableNode,
): EditorParagraphNode | null => {
  for (const row of table.rows) {
    for (const cell of row.cells) {
      if (cell.vMerge === "continue") continue;
      const paragraph = firstParagraphInCell(cell);
      if (paragraph) return paragraph;
    }
  }
  return null;
};

export const resolveAdjacentTableCellPosition = (
  document: EditorDocument,
  paragraphId: string,
  delta: -1 | 1,
): EditorPosition | null => {
  const sections = getDocumentSections(document);
  for (const section of sections) {
    const allBlocks = [
      ...(section.header || []),
      ...section.blocks,
      ...(section.footer || []),
    ];
    for (const block of allBlocks) {
      if (block.type !== "table") continue;
      const cells = block.rows.flatMap((row): EditorTableCellNode[] =>
        row.cells.filter(
          (cell): boolean =>
            cell.vMerge !== "continue" && cell.blocks.length > 0,
        ),
      );
      const currentCellIndex = cells.findIndex((cell): boolean =>
        cellContainsParagraph(cell, paragraphId),
      );
      if (currentCellIndex === -1) continue;
      const targetParagraph = firstParagraphInCell(cells[currentCellIndex + delta]);
      return targetParagraph
        ? paragraphOffsetToPosition(targetParagraph, 0)
        : null;
    }
  }
  return null;
};
