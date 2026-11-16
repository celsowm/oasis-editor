import {
  findParagraphLocation,
  findParagraphTablePathLocation,
  getBlockParagraphs,
  getDocumentSections,
  getParagraphLength,
  type EditorSelection,
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

export type TableTabTarget =
  | { kind: "outside" | "blocked" | "beforeFirst" | "afterLast" }
  | { kind: "adjacent"; selection: EditorSelection };

export const resolveTableTabTarget = (
  document: EditorDocument,
  paragraphId: string,
  delta: -1 | 1,
): TableTabTarget => {
  const paragraphLocation = findParagraphLocation(document, paragraphId);
  if (!paragraphLocation) return { kind: "outside" };
  const tableLocation = findParagraphTablePathLocation(
    document,
    paragraphId,
    paragraphLocation.sectionIndex,
  );
  if (!tableLocation) return { kind: "outside" };

  const table = resolveInnermostTable(
    getCandidateStories(document, paragraphId),
    tableLocation.tablePath,
    paragraphId,
  );
  if (!table) return { kind: "blocked" };

  const cells = table.rows.filter(row => !row.style?.hidden).flatMap((row): EditorTableCellNode[] =>
    row.cells.filter(
      (cell): boolean => cell.vMerge !== "continue" && cell.blocks.length > 0,
    ),
  );
  const currentCellIndex = cells.findIndex((cell): boolean =>
    cellContainsParagraph(cell, paragraphId),
  );
  if (currentCellIndex === -1) return { kind: "blocked" };
  const targetIndex = currentCellIndex + delta;
  if (targetIndex < 0) return { kind: "beforeFirst" };
  if (targetIndex >= cells.length) return { kind: "afterLast" };
  const target = cells[targetIndex]!;
  // Do not create a destructive range spanning nested-table boundaries.
  // Plain cells can safely select all their paragraphs.
  const plain = target.blocks.every(block => block.type === "paragraph");
  const paragraphs = target.blocks.flatMap(getBlockParagraphs);
  const first = plain ? paragraphs[0] :
    target.blocks.find((block): block is EditorParagraphNode => block.type === "paragraph") ?? paragraphs[0];
  if (!first) return { kind: "blocked" };
  const last = plain ? paragraphs[paragraphs.length - 1]! : first;
  return {
    kind: "adjacent",
    selection: {
      anchor: paragraphOffsetToPosition(first, 0),
      focus: paragraphOffsetToPosition(last, getParagraphLength(last)),
    },
  };
};

/** Position-only projection retained for callers that do not select cell text. */
export const resolveAdjacentTableCellPosition = (
  document: EditorDocument,
  paragraphId: string,
  delta: -1 | 1,
): EditorPosition | null => {
  const target = resolveTableTabTarget(document, paragraphId, delta);
  return target.kind === "adjacent" ? target.selection.anchor : null;
};
