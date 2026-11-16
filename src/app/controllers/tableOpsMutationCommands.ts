import { cloneBlock } from "@/core/cloneState.js";
import { cloneParagraph } from "@/core/document/clone.js";
import { createEditorDocument } from "@/core/editorState.js";
import { transformBookmarksAcrossParagraphEdit } from "@/core/document/bookmarkAnchors.js";
import { transformCommentsAcrossParagraphEdit } from "@/core/document/commentAnchors.js";
import {
  findParagraphLocation,
  findParagraphTablePathLocation,
  getActiveSectionIndex,
  getBlockParagraphs,
  getDocumentSectionsCanonical,
  getParagraphs,
  paragraphOffsetToPosition,
  resolveTablePath,
  type EditorBlockNode,
  type EditorEditingZone,
  type EditorParagraphNode,
  type EditorSection,
  type EditorState,
  type EditorTableCellNode,
  type EditorTableNode,
} from "@/core/model.js";

type HeaderStoryKey = "header" | "firstPageHeader" | "evenPageHeader";
type FooterStoryKey = "footer" | "firstPageFooter" | "evenPageFooter";
type SectionStoryKey = HeaderStoryKey | FooterStoryKey | "blocks";

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

function resolveSectionStoryKey(
  current: EditorState,
  section: EditorSection,
  zone: EditorEditingZone,
): SectionStoryKey {
  if (zone === "main") return "blocks";
  const paragraphId = current.selection.focus.paragraphId;
  if (zone === "header") {
    const candidates: Array<
      readonly [HeaderStoryKey, EditorBlockNode[] | undefined]
    > = [
      ["header", section.header],
      ["firstPageHeader", section.firstPageHeader],
      ["evenPageHeader", section.evenPageHeader],
    ];
    return (
      candidates.find(([, blocks]): boolean =>
        storyContainsParagraph(blocks, paragraphId),
      )?.[0] ?? "header"
    );
  }
  if (zone === "footer") {
    const candidates: Array<
      readonly [FooterStoryKey, EditorBlockNode[] | undefined]
    > = [
      ["footer", section.footer],
      ["firstPageFooter", section.firstPageFooter],
      ["evenPageFooter", section.evenPageFooter],
    ];
    return (
      candidates.find(([, blocks]): boolean =>
        storyContainsParagraph(blocks, paragraphId),
      )?.[0] ?? "footer"
    );
  }
  return "blocks";
}

function resolveActiveFootnoteId(current: EditorState): string | undefined {
  const location = findParagraphLocation(
    current.document,
    current.selection.focus.paragraphId,
  );
  return location?.zone === "footnote"
    ? location.footnoteId
    : current.activeFootnoteId;
}

export function getTableOperationTargetBlocks(
  current: EditorState,
  zone: EditorEditingZone,
): EditorBlockNode[] {
  if (zone === "footnote") {
    const footnoteId = resolveActiveFootnoteId(current);
    return footnoteId
      ? (current.document.footnotes?.items[footnoteId]?.blocks ?? [])
      : [];
  }

  const sections = getDocumentSectionsCanonical(current.document);
  const activeSectionIndex = getActiveSectionIndex(current);
  const section =
    sections[Math.max(0, Math.min(activeSectionIndex, sections.length - 1))];
  if (!section) return [];
  const storyKey = resolveSectionStoryKey(current, section, zone);
  return storyKey === "blocks" ? section.blocks : (section[storyKey] ?? []);
}

export const updateBlocksInCurrentSection = (
  current: EditorState,
  blocks: EditorBlockNode[],
  zone: EditorEditingZone = "main",
): EditorState => {
  if (zone === "footnote") {
    const footnoteId = resolveActiveFootnoteId(current);
    const footnotes = current.document.footnotes;
    const footnote = footnoteId ? footnotes?.items[footnoteId] : undefined;
    if (!footnoteId || !footnotes || !footnote) return current;
    return {
      ...current,
      document: {
        ...current.document,
        footnotes: {
          ...footnotes,
          items: {
            ...footnotes.items,
            [footnoteId]: { ...footnote, blocks },
          },
        },
      },
    };
  }

  const activeSectionIndex = getActiveSectionIndex(current);
  const sections = getDocumentSectionsCanonical(current.document);
  const boundedSectionIndex = Math.max(
    0,
    Math.min(activeSectionIndex, sections.length - 1),
  );
  const section = sections[boundedSectionIndex];
  if (!section) return current;

  const storyKey = resolveSectionStoryKey(current, section, zone);
  const nextSections = [...sections];
  nextSections[boundedSectionIndex] =
    storyKey === "blocks"
      ? { ...section, blocks }
      : { ...section, [storyKey]: blocks };

  return {
    ...current,
    document: {
      ...current.document,
      sections: nextSections,
    },
  };
};

type TablePathLocation = NonNullable<
  ReturnType<typeof findParagraphTablePathLocation>
>;

function normalizeInnermostLocation(
  location: TablePathLocation,
): TablePathLocation {
  const innermost = location.tablePath[location.tablePath.length - 1];
  return innermost
    ? {
        ...location,
        rowIndex: innermost.rowIndex,
        cellIndex: innermost.cellIndex,
      }
    : location;
}

export interface TableLocationMutation {
  tableBlock: EditorTableNode;
  targetCell: EditorTableCellNode;
  location: TablePathLocation;
  targetBlocks: EditorBlockNode[];
}

function cloneTablePath(
  blocks: EditorBlockNode[],
  tablePath: TablePathLocation["tablePath"],
): EditorBlockNode[] {
  const rootBlocks = [...blocks];
  let currentBlocks = rootBlocks;

  for (let i = 0; i < tablePath.length; i += 1) {
    const segment = tablePath[i];
    if (!segment) break;

    const table = currentBlocks[segment.tableBlockIndex];
    if (!table || table.type !== "table") break;

    const clonedTable = { ...table, rows: [...table.rows] };
    currentBlocks[segment.tableBlockIndex] = clonedTable;

    const row = clonedTable.rows[segment.rowIndex];
    if (!row) break;

    const clonedRow = { ...row, cells: [...row.cells] };
    clonedTable.rows[segment.rowIndex] = clonedRow;

    const cell = clonedRow.cells[segment.cellIndex];
    if (!cell) break;

    const clonedCell = { ...cell, blocks: [...cell.blocks] };
    clonedRow.cells[segment.cellIndex] = clonedCell;

    currentBlocks = clonedCell.blocks;
  }
  return rootBlocks;
}

function resolveClonedTablePath(
  targetBlocks: EditorBlockNode[],
  location: TablePathLocation,
): TableLocationMutation | null {
  const resolvedPath = resolveTablePath(targetBlocks, location.tablePath);
  const resolvedTarget = resolvedPath?.[resolvedPath.length - 1];
  if (!resolvedTarget) return null;

  return {
    tableBlock: resolvedTarget.table,
    targetCell: resolvedTarget.cell,
    location: normalizeInnermostLocation(location),
    targetBlocks,
  };
}

function resolveTableParagraphEditMutation(
  current: EditorState,
  getTargetBlocks: (
    state: EditorState,
    zone: EditorEditingZone,
  ) => EditorBlockNode[],
  location: TablePathLocation,
): TableLocationMutation | null {
  const rootSegment = location.tablePath[0];
  if (!rootSegment) return null;

  const sourceBlocks = getTargetBlocks(current, location.zone);
  const sourceRoot = sourceBlocks[rootSegment.tableBlockIndex];
  if (!sourceRoot || sourceRoot.type !== "table") return null;

  return resolveClonedTablePath(
    cloneTablePath(sourceBlocks, location.tablePath),
    location,
  );
}

/**
 * Resolves a mutation-safe clone for structural table commands. These commands
 * may update rows or cells outside the selected path, so the owning table must
 * remain deeply cloned rather than sharing mutable descendants with history.
 */
export function resolveTablePathMutation(
  current: EditorState,
  getTargetBlocks: (
    state: EditorState,
    zone: EditorEditingZone,
  ) => EditorBlockNode[],
  location: TablePathLocation,
): TableLocationMutation | null {
  const rootSegment = location.tablePath[0];
  if (!rootSegment) return null;

  const sourceBlocks = getTargetBlocks(current, location.zone);
  const sourceRoot = sourceBlocks[rootSegment.tableBlockIndex];
  if (!sourceRoot || sourceRoot.type !== "table") return null;

  const targetBlocks = [...sourceBlocks];
  targetBlocks[rootSegment.tableBlockIndex] = cloneBlock(sourceRoot);
  return resolveClonedTablePath(targetBlocks, location);
}

/**
 * A text-edit projection may grow or shrink its paragraphs. Never redistribute
 * those paragraphs into a flat traversal of interleaved tables. Project only
 * a contiguous group of direct paragraph siblings in the owning story/cell.
 */
function resolveParagraphSiblingRange(
  blocks: EditorBlockNode[],
  selection: EditorState["selection"],
): { start: number; end: number } | null {
  const anchor = blocks.findIndex(block => block.type === "paragraph" && block.id === selection.anchor.paragraphId);
  const focus = blocks.findIndex(block => block.type === "paragraph" && block.id === selection.focus.paragraphId);
  if (anchor < 0 || focus < 0) return null;
  let start = Math.min(anchor, focus);
  let end = Math.max(anchor, focus) + 1;
  if (blocks.slice(start, end).some(block => block.type !== "paragraph")) return null;
  while (start > 0 && blocks[start - 1]?.type === "paragraph") start--;
  while (end < blocks.length && blocks[end]?.type === "paragraph") end++;
  return { start, end };
}

export const applyTableAwareParagraphEdit = (
  current: EditorState,
  getTargetBlocks: (
    state: EditorState,
    zone: EditorEditingZone,
  ) => EditorBlockNode[],
  edit: (tempState: EditorState) => EditorState,
): EditorState => {
  const focusLocation = findParagraphLocation(current.document, current.selection.focus.paragraphId);
  const anchorLocation = findParagraphLocation(current.document, current.selection.anchor.paragraphId);
  if (!focusLocation || !anchorLocation) return edit(current);
  if (focusLocation.zone !== anchorLocation.zone ||
      focusLocation.sectionIndex !== anchorLocation.sectionIndex ||
      focusLocation.footnoteId !== anchorLocation.footnoteId) return current;

  const location = findParagraphTablePathLocation(
    current.document,
    current.selection.focus.paragraphId,
    getActiveSectionIndex(current),
  );
  const zone = focusLocation.zone;
  let targetBlocks: EditorBlockNode[];
  let siblingBlocks: EditorBlockNode[];
  if (location) {
    const mutation = resolveTableParagraphEditMutation(current, getTargetBlocks, location);
    if (!mutation) return current;
    targetBlocks = mutation.targetBlocks;
    siblingBlocks = mutation.targetCell.blocks;
  } else {
    const source = getTargetBlocks(current, zone);
    // Ordinary text-only stories keep their normal editing path, including
    // document-level effects and history, without a temporary document.
    if (source.length && source.every(block => block.type === "paragraph") &&
        source.some(block => block.id === current.selection.anchor.paragraphId) &&
        source.some(block => block.id === current.selection.focus.paragraphId)) return edit(current);
    targetBlocks = [...source];
    siblingBlocks = targetBlocks;
  }

  const range = resolveParagraphSiblingRange(siblingBlocks, current.selection);
  // Cross-cell, cross-table and cross-nested-table text deletion requires a
  // dedicated structural selection command; refuse it symmetrically.
  if (!range) return current;
  const projected = createEditorDocument(
    siblingBlocks.slice(range.start, range.end).map(block =>
      block.type === "paragraph" ? cloneParagraph(block) : block),
    current.document.pageSettings,
    undefined,
    current.document.styles,
    undefined,
    current.document.assets,
  );
  const tempState: EditorState = {
    ...current,
    activeSectionIndex: 0,
    activeZone: "main",
    document: {...projected, settings:current.document.settings},
    selection: {
      anchor: { ...current.selection.anchor },
      focus: { ...current.selection.focus },
    },
  };
  const tempResult = edit(tempState);
  const replacementBlocks =
    getDocumentSectionsCanonical(tempResult.document)[0]?.blocks ?? [];
  // This port also supports callbacks that mutate their private projection
  // in place. Identity alone cannot distinguish them from a true no-op.
  // Restrict the structural comparison to that uncommon return path.
  if (tempResult === tempState &&
      JSON.stringify(replacementBlocks) === JSON.stringify(siblingBlocks.slice(range.start, range.end)) &&
      JSON.stringify(tempResult.selection) === JSON.stringify(current.selection)) return current;
  siblingBlocks.splice(range.start, range.end - range.start, ...replacementBlocks);

  const nextState = updateBlocksInCurrentSection(current, targetBlocks, zone);
  const before = getParagraphs(current);
  const after = getParagraphs(nextState);
  const bookmarks = current.document.bookmarks;
  const comments = current.document.comments;
  return {
    ...nextState,
    document: {
      ...nextState.document,
      ...(bookmarks ? { bookmarks: transformBookmarksAcrossParagraphEdit(bookmarks, before, after) } : {}),
      ...(comments ? { comments: transformCommentsAcrossParagraphEdit(comments, before, after) } : {}),
    },
    selection: tempResult.selection,
  };
};

export function resolveLocationTableMutation(
  current: EditorState,
  getTargetBlocks: (
    state: EditorState,
    zone: EditorEditingZone,
  ) => EditorBlockNode[],
): TableLocationMutation | null {
  const location = findParagraphTablePathLocation(
    current.document,
    current.selection.focus.paragraphId,
    getActiveSectionIndex(current),
  );
  return location
    ? resolveTablePathMutation(current, getTargetBlocks, location)
    : null;
}

export function commitTableMutation(
  current: EditorState,
  targetBlocks: EditorBlockNode[],
  zone: EditorEditingZone,
  nextParagraph: EditorParagraphNode | null | undefined,
): EditorState {
  const nextState = updateBlocksInCurrentSection(current, targetBlocks, zone);
  if (!nextParagraph) return nextState;
  return {
    ...nextState,
    selection: {
      anchor: paragraphOffsetToPosition(nextParagraph, 0),
      focus: paragraphOffsetToPosition(nextParagraph, 0),
    },
  };
}
