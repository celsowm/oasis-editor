import { createEditorDocument } from "@/core/editorState.js";
import {
  findParagraphLocation,
  findParagraphTablePathLocation,
  getActiveSectionIndex,
  getBlockParagraphs,
  getDocumentSectionsCanonical,
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
  tablePath: TablePathLocation["tablePath"]
): EditorBlockNode[] {
  const rootBlocks = [...blocks];
  let currentBlocks = rootBlocks;

  for (let i = 0; i < tablePath.length; i++) {
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

/**
 * Clones only the top-level table that owns `location.tablePath`, then resolves
 * the cloned path to the innermost table and active cell. All mutation callers
 * therefore operate on the intended nested table while unrelated document
 * blocks retain structural sharing.
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

  const targetBlocks = cloneTablePath(sourceBlocks, location.tablePath);

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

export const applyTableAwareParagraphEdit = (
  current: EditorState,
  getTargetBlocks: (
    state: EditorState,
    zone: EditorEditingZone,
  ) => EditorBlockNode[],
  edit: (tempState: EditorState) => EditorState,
): EditorState => {
  const location = findParagraphTablePathLocation(
    current.document,
    current.selection.focus.paragraphId,
    getActiveSectionIndex(current),
  );
  if (
    !location ||
    current.selection.anchor.paragraphId !== current.selection.focus.paragraphId
  ) {
    return edit(current);
  }

  const mutation = resolveTablePathMutation(current, getTargetBlocks, location);
  if (!mutation) return edit(current);

  // When we extract the cell blocks to edit them in isolation, we must shallow clone
  // the paragraph nodes to avoid mutating the original editor state.
  const tempState: EditorState = {
    ...current,
    document: createEditorDocument(
      mutation.targetCell.blocks.map((block) =>
        block.type === 'paragraph' ? { ...block, runs: block.runs.map(run => ({ ...run })) } : block
      ),
      undefined,
      undefined,
      undefined,
      undefined,
      current.document.assets,
    ),
    selection: {
      anchor: { ...current.selection.anchor },
      focus: { ...current.selection.focus },
    },
  };
  const tempResult = edit(tempState);
  const replacementBlocks =
    getDocumentSectionsCanonical(tempResult.document)[0]?.blocks ?? [];

  mutation.targetCell.blocks.splice(
    0,
    mutation.targetCell.blocks.length,
    ...replacementBlocks,
  );
  const nextState = updateBlocksInCurrentSection(
    current,
    mutation.targetBlocks,
    location.zone,
  );
  return {
    ...nextState,
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
