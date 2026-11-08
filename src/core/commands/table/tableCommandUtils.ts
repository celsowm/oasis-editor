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
  getActiveZone,
  getBlockParagraphs,
  getDocumentSections,
  getHeaderFooterStoryKey,
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

function sectionStoryKind(
  section: EditorSection,
  zone: "header" | "footer",
  paragraphId: string,
): "default" | "firstPage" | "evenPage" {
  if (zone === "header") {
    if (storyContainsParagraph(section.firstPageHeader, paragraphId)) {
      return "firstPage";
    }
    if (storyContainsParagraph(section.evenPageHeader, paragraphId)) {
      return "evenPage";
    }
    return "default";
  }
  if (storyContainsParagraph(section.firstPageFooter, paragraphId)) {
    return "firstPage";
  }
  if (storyContainsParagraph(section.evenPageFooter, paragraphId)) {
    return "evenPage";
  }
  return "default";
}

/** The block story array for a section zone that owns `paragraphId`. */
function getSectionStory(
  section: EditorSection,
  zone: EditorEditingZone,
  paragraphId: string,
): EditorBlockNode[] | null {
  if (zone === "main") return section.blocks;
  if (zone === "header" || zone === "footer") {
    const kind = sectionStoryKind(section, zone, paragraphId);
    const key = getHeaderFooterStoryKey(zone, kind);
    return section[key] ?? null;
  }
  return null;
}

function updateSelectedSectionStory(
  section: EditorSection,
  zone: EditorEditingZone,
  paragraphId: string,
  updateBlocks: (blocks: EditorBlockNode[]) => EditorBlockNode[],
): EditorSection {
  if (zone === "main") {
    return { ...section, blocks: updateBlocks(section.blocks) };
  }
  if (zone === "header") {
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
  if (zone === "footer") {
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

/**
 * Reads the innermost table identified by `tablePath` from a block story
 * (`getBlocksForZone` + the top-level path), following nested hops into the
 * parent cell's `blocks` array as `updateTableAtPath` does.
 */
export function readInnermostTableAtPath(
  blocks: readonly EditorBlockNode[] | undefined,
  tablePath: readonly TablePathSegment[],
): EditorTableNode | null {
  const segment = tablePath[0];
  if (!segment || !blocks) return null;
  const target = blocks[segment.tableBlockIndex];
  if (!target || target.type !== "table") return null;
  if (tablePath.length === 1) return target;
  const row = target.rows[segment.rowIndex];
  const cell = row?.cells[segment.cellIndex];
  if (!row || !cell) return null;
  return readInnermostTableAtPath(cell.blocks, tablePath.slice(1));
}

/**
 * Splices a list of replacement blocks in place of the innermost table
 * identified by `tablePath`. Mirrors `updateTableAtPath` structurally, but
 * replaces the target table with `replacement` (Word's Convert Table to Text).
 */
export function replaceInnermostTableAtPath(
  blocks: EditorBlockNode[],
  tablePath: readonly TablePathSegment[],
  replacement: readonly EditorBlockNode[],
): EditorBlockNode[] | null {
  const segment = tablePath[0];
  if (!segment) return null;
  const target = blocks[segment.tableBlockIndex];
  if (!target || target.type !== "table") return null;

  if (tablePath.length === 1) {
    return [
      ...blocks.slice(0, segment.tableBlockIndex),
      ...replacement,
      ...blocks.slice(segment.tableBlockIndex + 1),
    ];
  }

  const row = target.rows[segment.rowIndex];
  const cell = row?.cells[segment.cellIndex];
  if (!row || !cell) return null;

  const nextCellBlocks = replaceInnermostTableAtPath(
    cell.blocks,
    tablePath.slice(1),
    replacement,
  );
  if (!nextCellBlocks) return null;

  const nextCells = [...row.cells];
  nextCells[segment.cellIndex] = { ...cell, blocks: nextCellBlocks };
  const nextRows = [...target.rows];
  nextRows[segment.rowIndex] = { ...row, cells: nextCells };
  const nextBlocks = [...blocks];
  nextBlocks[segment.tableBlockIndex] = { ...target, rows: nextRows };
  return nextBlocks;
}

/**
 * Resolves the block story that contains the active table (the story whose
 * paragraph owns the caret), based on the same zone/story-selection rules
 * `updateSelectedSectionStory` uses: for main/header/footer it picks the
 * section's relevant story (first page / even page / default), and for
 * footnotes it picks the owning note's `blocks`.
 */
export function getActiveTableStory(
  state: EditorState,
): EditorBlockNode[] | null {
  const target = resolveActiveTableLocation(state);
  if (!target) return null;
  const { activeSectionIndex, loc } = target;
  const paragraphId = state.selection.focus.paragraphId;

  if (loc.zone === "footnote") {
    return getFootnoteBlocks(state, paragraphId);
  }

  const section = getDocumentSections(state.document)[activeSectionIndex];
  if (!section) return null;

  return getSectionStory(section, loc.zone, paragraphId);
}

/**
 * Table-free variant of `getActiveTableStory`: resolves the block story that
 * owns the caret (from `getActiveZone`), used when the caret is not inside a
 * table (e.g. Text to Table). Returns `null` when the caret sits in no
 * editable story.
 */
export function getActiveCaretStory(
  state: EditorState,
): EditorBlockNode[] | null {
  const paragraphId = state.selection.focus.paragraphId;
  const zone = getActiveZone(state);
  if (zone === "footnote") return getFootnoteBlocks(state, paragraphId);

  const activeSectionIndex = getActiveSectionIndex(state);
  const section = getDocumentSections(state.document)[activeSectionIndex];
  if (!section) return null;
  return getSectionStory(section, zone, paragraphId);
}

/** The block story of the footnote owning `paragraphId`, if any. */
function getFootnoteBlocks(
  state: EditorState,
  paragraphId: string,
): EditorBlockNode[] | null {
  const paragraphLocation = findParagraphLocation(state.document, paragraphId);
  const footnoteId = paragraphLocation?.footnoteId ?? state.activeFootnoteId;
  const footnotes = state.document.footnotes;
  const footnote = footnoteId ? footnotes?.items[footnoteId] : undefined;
  return footnote?.blocks ?? null;
}

/**
 * Replaces the active table (the innermost table containing the caret) with a
 * list of replacement blocks, mirroring `updateActiveTableBlocks` but for the
 * Convert Table to Text splice operation. Handles footnote and all section
 * stories; a no-op when no active table resolves.
 */
export function replaceActiveTableWithBlocks(
  state: EditorState,
  replacement: readonly EditorBlockNode[],
): EditorState {
  const target = resolveActiveTableLocation(state);
  if (!target) return state;

  const { activeSectionIndex, loc } = target;
  const paragraphId = state.selection.focus.paragraphId;
  const replaceBlocks = (blocks: EditorBlockNode[]): EditorBlockNode[] => {
    const next = replaceInnermostTableAtPath(
      blocks,
      loc.tablePath,
      replacement,
    );
    return next ?? blocks;
  };

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
              blocks: replaceBlocks(footnote.blocks),
            },
          },
        },
      },
    };
  }

  const nextSections = getDocumentSections(state.document).map(
    (section, sectionIndex): EditorSection =>
      sectionIndex === activeSectionIndex
        ? updateSelectedSectionStory(
            section,
            loc.zone,
            paragraphId,
            replaceBlocks,
          )
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
        ? updateSelectedSectionStory(
            section,
            loc.zone,
            paragraphId,
            updateBlocks,
          )
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

/**
 * Applies `updateBlocks` to the block story that owns the caret, regardless of
 * whether the caret sits inside a table. Resolves the story from the active
 * editing zone (footnote, or the section main/header/footer story), mirroring
 * `updateActiveTableBlocks` but without requiring a table location. Used by the
 * Text to Table conversion which splices a table into a paragraph run.
 */
export function updateActiveCaretBlocks(
  state: EditorState,
  updateBlocks: (blocks: EditorBlockNode[]) => EditorBlockNode[],
): EditorState {
  const paragraphId = state.selection.focus.paragraphId;
  const zone = getActiveZone(state);
  const activeSectionIndex = getActiveSectionIndex(state);

  if (zone === "footnote") {
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
        ? updateSelectedSectionStory(section, zone, paragraphId, updateBlocks)
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
