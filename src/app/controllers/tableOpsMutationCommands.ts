import { cloneBlock } from "@/core/cloneState.js";
import { createEditorDocument } from "@/core/editorState.js";
import {
  findParagraphTablePathLocation,
  getActiveSectionIndex,
  getDocumentSectionsCanonical,
  paragraphOffsetToPosition,
  resolveTablePath,
  type EditorBlockNode,
  type EditorEditingZone,
  type EditorParagraphNode,
  type EditorState,
  type EditorTableCellNode,
  type EditorTableNode,
} from "@/core/model.js";

export const updateBlocksInCurrentSection = (
  current: EditorState,
  blocks: EditorBlockNode[],
  zone: EditorEditingZone = "main",
): EditorState => {
  const activeSectionIndex = getActiveSectionIndex(current);
  const sections = getDocumentSectionsCanonical(current.document);
  const boundedSectionIndex = Math.max(
    0,
    Math.min(activeSectionIndex, sections.length - 1),
  );
  const section = sections[boundedSectionIndex];
  if (!section) return current;

  const nextSections = [...sections];
  if (zone === "header")
    nextSections[boundedSectionIndex] = { ...section, header: blocks };
  else if (zone === "footer")
    nextSections[boundedSectionIndex] = { ...section, footer: blocks };
  else nextSections[boundedSectionIndex] = { ...section, blocks };

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

  const targetBlocks = [...sourceBlocks];
  targetBlocks[rootSegment.tableBlockIndex] = cloneBlock(sourceRoot);

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

  const mutation = resolveTablePathMutation(
    current,
    getTargetBlocks,
    location,
  );
  if (!mutation) return edit(current);

  const tempState: EditorState = {
    ...current,
    document: createEditorDocument(
      mutation.targetCell.blocks,
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
