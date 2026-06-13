import type {
  EditorBlockNode,
  EditorDocument,
  EditorEditingZone,
  EditorParagraphNode,
  EditorState,
  EditorTableNode,
  TableLocation,
} from "../../model.js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getActiveZone,
  getDocumentSections,
} from "../../model.js";

export type StylePatchValue<T, K extends keyof T> = T[K] | null;

export interface ActiveTableLocation {
  activeSectionIndex: number;
  loc: TableLocation & { zone: EditorEditingZone };
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
    footer: section.footer ? updateBlocks(section.footer) : undefined,
  }));
  return {
    ...state,
    document: {
      ...state.document,
      sections: nextSections,
    },
  };
}

export function updateTablesInBlocks(
  blocks: EditorBlockNode[],
  updateTable: (table: EditorTableNode) => EditorTableNode,
): EditorBlockNode[] {
  return blocks.map((block) => {
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
  return blocks.map((block) => {
    if (block.type === "paragraph") return block;
    return {
      ...updateTable(block),
      rows: block.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          blocks: updateNestedTablesInBlocks(
            cell.blocks,
            updateTable,
          ) as EditorParagraphNode[],
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

export function resolveActiveTableLocation(
  state: EditorState,
): ActiveTableLocation | null {
  const activeSectionIndex = getActiveSectionIndex(state);
  const loc = findParagraphTableLocation(
    state.document,
    state.selection.focus.paragraphId,
    activeSectionIndex,
  );
  return loc ? { activeSectionIndex, loc } : null;
}

export function updateActiveTableBlocks(
  state: EditorState,
  updateTable: (table: EditorTableNode) => EditorTableNode,
): EditorState {
  const target = resolveActiveTableLocation(state);
  if (!target) return state;

  const { activeSectionIndex, loc } = target;
  const activeZone = getActiveZone(state);
  const updateBlocks = (
    blocks: EditorBlockNode[],
    zone: EditorEditingZone,
  ): EditorBlockNode[] =>
    blocks.map((block, blockIndex) => {
      if (
        block.type === "table" &&
        blockIndex === loc.blockIndex &&
        zone === loc.zone
      ) {
        return updateTable(block);
      }
      return block;
    });

  const nextSections = getDocumentSections(state.document).map(
    (section, sectionIndex) => {
      if (sectionIndex !== activeSectionIndex) return section;
      return {
        ...section,
        blocks:
          activeZone === "main"
            ? updateBlocks(section.blocks, "main")
            : section.blocks,
        header:
          activeZone === "header" && section.header
            ? updateBlocks(section.header, "header")
            : section.header,
        footer:
          activeZone === "footer" && section.footer
            ? updateBlocks(section.footer, "footer")
            : section.footer,
      };
    },
  );

  return {
    ...state,
    document: {
      ...state.document,
      sections: nextSections,
    },
  };
}
