import {
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
  row.cells.reduce((sum, cell) => sum + Math.max(1, cell.colSpan ?? 1), 0);

export const getTableVisualWidth = (table: EditorTableNode): number =>
  table.rows.reduce((max, row) => Math.max(max, getRowVisualWidth(row)), 0);

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

export const findFirstNavigableParagraphInTable = (
  table: EditorTableNode,
): EditorParagraphNode | null => {
  for (const row of table.rows) {
    for (const cell of row.cells) {
      if (cell.vMerge === "continue") continue;
      const paragraph = cell.blocks[0];
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
      const cells = block.rows.flatMap((row) =>
        row.cells.filter(
          (cell) => cell.vMerge !== "continue" && cell.blocks.length > 0,
        ),
      );
      const currentCellIndex = cells.findIndex((cell) =>
        cell.blocks.some((paragraph) => paragraph.id === paragraphId),
      );
      if (currentCellIndex === -1) continue;
      const nextCell = cells[currentCellIndex + delta];
      const targetParagraph = nextCell?.blocks[0];
      return targetParagraph
        ? paragraphOffsetToPosition(targetParagraph, 0)
        : null;
    }
  }
  return null;
};
