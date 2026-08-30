import type {
  EditorBlockNode,
  EditorDocument,
  EditorEditingZone,
  EditorParagraphNode,
  EditorState,
  EditorTableNode,
  TableLocation,
  TablePathSegment,
  EditorRevisionMetadata,
  EditorSection,
} from "@/core/model.js";
import {
  findParagraphLocation,
  findParagraphTablePathLocation,
  getActiveSectionIndex,
  getBlockParagraphs,
  getDocumentSections,
} from "@/core/model.js";

export type StylePatchValue<T, K extends keyof T> = T[K] | null;

export interface ActiveTableLocation {
  activeSectionIndex: number;
  loc: TableLocation & { zone: EditorEditingZone };
}

export function createTableRevisionMetadata(): EditorRevisionMetadata {
  return {
    id: `rev:${Math.random().toString(36).slice(2, 9)}`,
    author: "User",
    date: Date.now(),
  };
}

export function patchStyleValue<T extends object, K extends keyof T>(
  style: T | undefined,
  key: K,
  value: StylePatchValue<T, K>,
): T | undefined {
  const nextStyle = { ...(style ?? {}) } as Record<string, unknown>;
  if (value === null) {
    delete nextStyle[key as string];
  } else {
    nextStyle[key as string] = value;
  }
  return Object.keys(nextStyle).length > 0 ? (nextStyle as T) : undefined;
}

export function updateStateSections(
  state: EditorState,
  updateBlocks: (blocks: EditorBlockNode[]) => EditorBlockNode[],
): EditorState {
  const sections = getDocumentSections(state.document);
  const nextSections = sections.map((section) => ({
    ...section,
    blocks: updateBlocks(section.blocks),
    header: section.header ? updateBlocks(section.header) : undefined,
    firstPageHeader: section.firstPageHeader
      ? updateBlocks(section.firstPageHeader)
      : undefined,
    evenPageHeader: section.evenPageHeader
      ? updateBlocks(section.evenPageHeader)
      : undefined,
    footer: section.footer ? updateBlocks(section.footer) : undefined,
    firstPageFooter: section.firstPageFooter
      ? updateBlocks(section.firstPageFooter)
      : undefined,
    evenPageFooter: section.evenPageFooter
      ? updateBlocks(section.evenPageFooter)
      : undefined,
  }));
  const footnotes = state.document.footnotes
    ? {
        ...state.document.footnotes,
        items: Object.fromEntries(
          Object.entries(state.document.footnotes.items).map(([id, note]) => [
            id,
            { ...note, blocks: updateBlocks(note.blocks) },
          ]),
        ),
      }
    : undefined;
  const endnotes = state.document.endnotes
    ? {
        ...state.document.endnotes,
        items: Object.fromEntries(
          Object.entries(state.document.endnotes.items).map(([id, note]) => [
            id,
            { ...note, blocks: updateBlocks(note.blocks) },
          ]),
        ),
      }
    : undefined;
  return {
    ...state,
    document: {
      ...state.document,
      sections: nextSections,
      footnotes,
      endnotes,
    },
  };
}

export function updateTablesInBlocks(
  blocks: EditorBlockNode[],
  updateTable: (table: EditorTableNode) => EditorTableNode,
): EditorBlockNode[] {
  return blocks.map((block): EditorParagraphNode | EditorTableNode => {
    if (block.type === "table") {
      return updateTable(block);
    }
    return block;
  });
}

export function updateNestedTablesInBlocks(
  blocks: EditorBlockNode[],
  updateTable: (table: EditorTableNode) => EditorTableNode,
): EditorBlockNode[] {
  return blocks.map((block): EditorBlockNode => {
    if (block.type === "paragraph") return block;
    const updatedTable = updateTable(block);
    return {
      ...updatedTable,
      rows: updatedTable.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          blocks: updateNestedTablesInBlocks(cell.blocks, updateTable),
        })),
      })),
    };
  });
}

export function getBlocksForZone(
  document: EditorDocument,
  sectionIndex: number,
  zone: EditorEditingZone,
): EditorBlockNode[] | undefined {
  const section = getDocumentSections(document)[sectionIndex];
  if (!section) return undefined;
  if (zone === "header") return section.header;
  if (zone === "footer") return section.footer;
  return section.blocks;
}

function normalizeInnermostTableLocation(
  loc: TableLocation & { zone: EditorEditingZone },
): TableLocation & { zone: EditorEditingZone } {
  const innermost = loc.tablePath[loc.tablePath.length - 1];
  return innermost
    ? {
        ...loc,
        rowIndex: innermost.rowIndex,
        cellIndex: innermost.cellIndex,
      }
    : loc;
}

export function resolveActiveTableLocation(
  state: EditorState,
): ActiveTableLocation | null {
  const activeSectionIndex = getActiveSectionIndex(state);
  const loc = findParagraphTablePathLocation(
    state.document,
    state.selection.focus.paragraphId,
    activeSectionIndex,
  );
  return loc
    ? { activeSectionIndex, loc: normalizeInnermostTableLocation(loc) }
    : null;
}

/**
 * Applies `updateTable` to exactly the table identified by `tablePath`.
 * Ancestor tables/cells are copied only along the target path, preserving
 * structural sharing for every unrelated block and cell.
 */
export function updateTableAtPath(
  blocks: EditorBlockNode[],
  tablePath: readonly TablePathSegment[],
  updateTable: (table: EditorTableNode) => EditorTableNode,
): EditorBlockNode[] {
  const segment = tablePath[0];
  if (!segment) return blocks;

  const target = blocks[segment.tableBlockIndex];
  if (!target || target.type !== "table") return blocks;

  if (tablePath.length === 1) {
    const updated = updateTable(target);
    if (updated === target) return blocks;
    const nextBlocks = [...blocks];
    nextBlocks[segment.tableBlockIndex] = updated;
    return nextBlocks;
  }

  const row = target.rows[segment.rowIndex];
  const cell = row?.cells[segment.cellIndex];
  if (!row || !cell) return blocks;

  const nextCellBlocks = updateTableAtPath(
    cell.blocks,
    tablePath.slice(1),
    updateTable,
  );
  if (nextCellBlocks === cell.blocks) return blocks;

  const nextCells = [...row.cells];
  nextCells[segment.cellIndex] = { ...cell, blocks: nextCellBlocks };
  const nextRows = [...target.rows];
  nextRows[segment.rowIndex] = { ...row, cells: nextCells };
  const nextBlocks = [...blocks];
  nextBlocks[segment.tableBlockIndex] = { ...target, rows: nextRows };
  return nextBlocks;
}

function storyContainsParagraph(
  blocks: readonly EditorBlockNode[] | undefined,
  paragraphId: string,
): boolean {
  return Boolean(
    blocks?.some((block): boolean =>
      getBlockParagraphs(block).some(
        (paragraph): boolean => paragraph.id === paragraphId,
      ),
    ),
  );
}

function updateSelectedSectionStory(
  section: EditorSection,
  loc: TableLocation & { zone: EditorEditingZone },
  paragraphId: string,
  updateBlocks: (blocks: EditorBlockNode[]) => EditorBlockNode[],
): EditorSection {
  if (loc.zone === "main") {
    return { ...section, blocks: updateBlocks(section.blocks) };
  }
  if (loc.zone === "header") {
    if (storyContainsParagraph(section.firstPageHeader, paragraphId)) {
      return {
        ...section,
        firstPageHeader: updateBlocks(section.firstPageHeader!),
      };
    }
    if (storyContainsParagraph(section.evenPageHeader, paragraphId)) {
      return {
        ...section,
        evenPageHeader: updateBlocks(section.evenPageHeader!),
      };
    }
    return {
      ...section,
      header: section.header ? updateBlocks(section.header) : section.header,
    };
  }
  if (loc.zone === "footer") {
    if (storyContainsParagraph(section.firstPageFooter, paragraphId)) {
      return {
        ...section,
        firstPageFooter: updateBlocks(section.firstPageFooter!),
      };
    }
    if (storyContainsParagraph(section.evenPageFooter, paragraphId)) {
      return {
        ...section,
        evenPageFooter: updateBlocks(section.evenPageFooter!),
      };
    }
    return {
      ...section,
      footer: section.footer ? updateBlocks(section.footer) : section.footer,
    };
  }
  return section;
}

export function updateActiveTableBlocks(
  state: EditorState,
  updateTable: (table: EditorTableNode) => EditorTableNode,
): EditorState {
  const target = resolveActiveTableLocation(state);
  if (!target) return state;

  const { activeSectionIndex, loc } = target;
  const paragraphId = state.selection.focus.paragraphId;
  const updateBlocks = (blocks: EditorBlockNode[]): EditorBlockNode[] =>
    updateTableAtPath(blocks, loc.tablePath, updateTable);

  if (loc.zone === "footnote") {
    const paragraphLocation = findParagraphLocation(
      state.document,
      paragraphId,
    );
    const footnoteId = paragraphLocation?.footnoteId ?? state.activeFootnoteId;
    const footnotes = state.document.footnotes;
    const footnote = footnoteId ? footnotes?.items[footnoteId] : undefined;
    if (!footnoteId || !footnotes || !footnote) return state;
    return {
      ...state,
      document: {
        ...state.document,
        footnotes: {
          ...footnotes,
          items: {
            ...footnotes.items,
            [footnoteId]: {
              ...footnote,
              blocks: updateBlocks(footnote.blocks),
            },
          },
        },
      },
    };
  }

  const nextSections = getDocumentSections(state.document).map(
    (section, sectionIndex): EditorSection =>
      sectionIndex === activeSectionIndex
        ? updateSelectedSectionStory(section, loc, paragraphId, updateBlocks)
        : section,
  );

  return {
    ...state,
    document: {
      ...state.document,
      sections: nextSections,
    },
  };
}
