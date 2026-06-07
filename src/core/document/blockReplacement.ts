import type {
  EditorBlockNode,
  EditorParagraphNode,
  EditorSection,
  EditorSelection,
  EditorState,
  EditorTableCellNode,
} from "../model.js";
import {
  getActiveSectionIndex,
  getActiveZone,
  getDocumentSections,
} from "../model.js";

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
    return nodes.map((node) => {
      if (node.type === "paragraph") {
        return newParagraphs[index++] ?? node;
      }
      return {
        ...node,
        rows: node.rows.map((row) => ({
          ...row,
          cells: row.cells.map((cell) => ({
            ...cell,
            blocks: processBlocks(cell.blocks) as EditorParagraphNode[],
          })),
        })),
      };
    });
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

  return {
    ...state,
    document: {
      ...state.document,
      sections: updatedSections,
    },
    selection,
  };
}

export function updateTableCellsInBlocks(
  blocks: EditorBlockNode[],
  selectedParagraphIds: Set<string>,
  updateCell: (cell: EditorTableCellNode) => EditorTableCellNode,
): EditorBlockNode[] {
  return blocks.map((block) => {
    if (block.type === "paragraph") return block;

    return {
      ...block,
      rows: block.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => {
          const isSelected = cell.blocks.some((paragraph) =>
            selectedParagraphIds.has(paragraph.id),
          );
          return isSelected ? updateCell(cell) : cell;
        }),
      })),
    };
  });
}
