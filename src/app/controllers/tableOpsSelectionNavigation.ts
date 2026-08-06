import {
  findParagraphLocation,
  findParagraphTablePathLocation,
  getBlockParagraphs,
  getDocumentSections,
  paragraphOffsetToPosition,
  resolveTablePath,
  type EditorBlockNode,
  type EditorDocument,
  type EditorPosition,
  type EditorParagraphNode,
  type EditorTableCellNode,
  type EditorTableNode,
  type EditorTableRowNode,
  type TablePathSegment,
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

function storyContainsParagraph(
  blocks: readonly EditorBlockNode[],
  paragraphId: string,
): boolean {
  return blocks.some((block): boolean =>
    getBlockParagraphs(block).some(
      (paragraph): boolean => paragraph.id === paragraphId,
    ),
  );
}

function getCandidateStories(
  document: EditorDocument,
  paragraphId: string,
): EditorBlockNode[][] {
  const location = findParagraphLocation(document, paragraphId);
  if (!location) return [];
  if (location.zone === "footnote") {
    const footnote = location.footnoteId
      ? document.footnotes?.items[location.footnoteId]
      : undefined;
    return footnote ? [footnote.blocks] : [];
  }

  const section = getDocumentSections(document)[location.sectionIndex];
  if (!section) return [];
  if (location.zone === "main") return [section.blocks];
  if (location.zone === "header") {
    return [
      section.header,
      section.firstPageHeader,
      section.evenPageHeader,
    ].filter((blocks): blocks is EditorBlockNode[] => Boolean(blocks));
  }
  return [
    section.footer,
    section.firstPageFooter,
    section.evenPageFooter,
  ].filter((blocks): blocks is EditorBlockNode[] => Boolean(blocks));
}

function resolveInnermostTable(
  stories: readonly EditorBlockNode[][],
  tablePath: readonly TablePathSegment[],
  paragraphId: string,
): EditorTableNode | null {
  for (const blocks of stories) {
    if (!storyContainsParagraph(blocks, paragraphId)) continue;
    const resolved = resolveTablePath(blocks, tablePath);
    const table = resolved?.[resolved.length - 1]?.table;
    if (table) return table;
  }
  return null;
}

export const resolveAdjacentTableCellPosition = (
  document: EditorDocument,
  paragraphId: string,
  delta: -1 | 1,
): EditorPosition | null => {
  const paragraphLocation = findParagraphLocation(document, paragraphId);
  if (!paragraphLocation) return null;
  const tableLocation = findParagraphTablePathLocation(
    document,
    paragraphId,
    paragraphLocation.sectionIndex,
  );
  if (!tableLocation) return null;

  const table = resolveInnermostTable(
    getCandidateStories(document, paragraphId),
    tableLocation.tablePath,
    paragraphId,
  );
  if (!table) return null;

  const cells = table.rows.flatMap((row): EditorTableCellNode[] =>
    row.cells.filter(
      (cell): boolean =>
        cell.vMerge !== "continue" && cell.blocks.length > 0,
    ),
  );
  const currentCellIndex = cells.findIndex((cell): boolean =>
    cellContainsParagraph(cell, paragraphId),
  );
  if (currentCellIndex === -1) return null;

  const targetParagraph = firstParagraphInCell(cells[currentCellIndex + delta]);
  return targetParagraph ? paragraphOffsetToPosition(targetParagraph, 0) : null;
};
