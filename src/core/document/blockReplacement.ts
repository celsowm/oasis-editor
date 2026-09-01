import type {
  EditorBlockNode,
  EditorParagraphNode,
  EditorSection,
  EditorSelection,
  EditorState,
  EditorTableCellNode,
  EditorTableNode,
  EditorTableRowNode,
} from "@/core/model.js";
import {
  getActiveSectionIndex,
  getActiveZone,
  getDocumentSections,
  getParagraphs,
} from "@/core/model.js";
import { transformBookmarksAcrossParagraphEdit } from "./bookmarkAnchors.js";
import { transformCommentsAcrossParagraphEdit } from "./commentAnchors.js";

export function blocksContainTables(nodes: EditorBlockNode[]): boolean {
  for (const node of nodes) {
    if (node.type === "table") {
      return true;
    }
  }
  return false;
}

export function replaceParagraphsInBlocks(
  blocks: EditorBlockNode[],
  newParagraphs: EditorParagraphNode[],
): EditorBlockNode[] {
  // When a zone contains no tables, the flat paragraph list is the canonical
  // block list. Replace wholesale so paragraph-count changes are preserved.
  if (!blocksContainTables(blocks)) {
    return newParagraphs;
  }

  let index = 0;
  const processBlocks = (nodes: EditorBlockNode[]): EditorBlockNode[] => {
    let changed = false;
    const result = nodes.map((node): EditorParagraphNode | EditorTableNode => {
      if (node.type === "paragraph") {
        const next = newParagraphs[index++] ?? node;
        if (next !== node) changed = true;
        return next;
      }
      let tableChanged = false;
      const newRows = node.rows.map((row): EditorTableRowNode => {
        let rowChanged = false;
        const newCells = row.cells.map((cell): EditorTableCellNode => {
          const newBlocks = processBlocks(cell.blocks);
          if (newBlocks === cell.blocks) return cell;
          rowChanged = true;
          return { ...cell, blocks: newBlocks };
        });
        if (!rowChanged) return row;
        tableChanged = true;
        return { ...row, cells: newCells };
      });
      if (!tableChanged) return node;
      changed = true;
      return { ...node, rows: newRows };
    });
    return changed ? result : nodes;
  };
  return processBlocks(blocks);
}

export function replaceParagraphsInSection(
  section: EditorSection,
  paragraphs: EditorParagraphNode[],
  zone: "main" | "header" | "footer",
): EditorSection {
  if (zone === "header") {
    return {
      ...section,
      header: replaceParagraphsInBlocks(section.header ?? [], paragraphs),
    };
  }
  if (zone === "footer") {
    return {
      ...section,
      footer: replaceParagraphsInBlocks(section.footer ?? [], paragraphs),
    };
  }

  return {
    ...section,
    blocks: replaceParagraphsInBlocks(section.blocks, paragraphs),
  };
}

export function cloneStateWithParagraphs(
  state: EditorState,
  paragraphs: EditorParagraphNode[],
  selection: EditorSelection,
): EditorState {
  const zone = getActiveZone(state);

  if (zone === "footnote") {
    const footnoteId = state.activeFootnoteId;
    const footnotes = state.document.footnotes;
    if (!footnoteId || !footnotes || !footnotes.items[footnoteId]) {
      return { ...state, selection };
    }
    const currentFootnote = footnotes.items[footnoteId];
    const updatedBlocks = replaceParagraphsInBlocks(
      currentFootnote.blocks,
      paragraphs,
    );
    return {
      ...state,
      document: {
        ...state.document,
        footnotes: {
          ...footnotes,
          items: {
            ...footnotes.items,
            [footnoteId]: { ...currentFootnote, blocks: updatedBlocks },
          },
        },
      },
      selection,
    };
  }

  const sections = getDocumentSections(state.document);
  const sectionIndex = Math.max(
    0,
    Math.min(getActiveSectionIndex(state), sections.length - 1),
  );
  const section = sections[sectionIndex];
  if (!section) {
    return { ...state, selection };
  }

  const updatedSection = replaceParagraphsInSection(section, paragraphs, zone);
  const updatedSections = [...sections];
  updatedSections[sectionIndex] = updatedSection;

  // Keep bookmark anchors pointing at the right text as paragraphs mutate.
  const bookmarks = state.document.bookmarks;
  const oldParagraphs = getParagraphs(state);
  const nextBookmarks =
    bookmarks && bookmarks.order.length > 0
      ? transformBookmarksAcrossParagraphEdit(
          bookmarks,
          oldParagraphs,
          paragraphs,
        )
      : bookmarks;

  const comments = state.document.comments;
  const nextComments =
    comments && comments.order.length > 0
      ? transformCommentsAcrossParagraphEdit(
          comments,
          oldParagraphs,
          paragraphs,
        )
      : comments;

  return {
    ...state,
    document: {
      ...state.document,
      sections: updatedSections,
      ...(nextBookmarks !== bookmarks ? { bookmarks: nextBookmarks } : {}),
      ...(nextComments !== comments ? { comments: nextComments } : {}),
    },
    selection,
  };
}

export function updateTableCellsInBlocks(
  blocks: EditorBlockNode[],
  selectedParagraphIds: Set<string>,
  updateCell: (cell: EditorTableCellNode) => EditorTableCellNode,
): EditorBlockNode[] {
  let changed = false;
  const result = blocks.map((block): EditorParagraphNode | EditorTableNode => {
    if (block.type === "paragraph") return block;

    let tableChanged = false;
    const newRows = block.rows.map((row): EditorTableRowNode => {
      let rowChanged = false;
      const newCells = row.cells.map((cell): EditorTableCellNode => {
        const nestedBlocks = updateTableCellsInBlocks(
          cell.blocks,
          selectedParagraphIds,
          updateCell,
        );
        const directlySelected = cell.blocks.some(
          (child): boolean =>
            child.type === "paragraph" && selectedParagraphIds.has(child.id),
        );
        let nextCell =
          nestedBlocks === cell.blocks
            ? cell
            : { ...cell, blocks: nestedBlocks };
        if (directlySelected) {
          nextCell = updateCell(nextCell);
        }
        if (nextCell !== cell) rowChanged = true;
        return nextCell;
      });
      if (!rowChanged) return row;
      tableChanged = true;
      return { ...row, cells: newCells };
    });
    if (!tableChanged) return block;
    changed = true;
    return { ...block, rows: newRows };
  });
  return changed ? result : blocks;
}
