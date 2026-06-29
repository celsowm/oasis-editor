import { cloneBlock } from "@/core/cloneState.js";
import { createEditorDocument } from "@/core/editorState.js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getDocumentParagraphs,
  getDocumentSectionsCanonical,
  paragraphOffsetToPosition,
  type EditorBlockNode,
  type EditorEditingZone,
  type EditorParagraphNode,
  type EditorState,
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

export const applyTableAwareParagraphEdit = (
  current: EditorState,
  getTargetBlocks: (
    state: EditorState,
    zone: EditorEditingZone,
  ) => EditorBlockNode[],
  edit: (tempState: EditorState) => EditorState,
): EditorState => {
  const location = findParagraphTableLocation(
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

  const zone = location.zone;
  const currentBlocks = getTargetBlocks(current, zone);
  const clonedTable = cloneBlock(
    currentBlocks[location.blockIndex],
  ) as EditorTableNode;
  if (!clonedTable || clonedTable.type !== "table") {
    return edit(current);
  }
  const nextBlocks = currentBlocks.map((block, i) =>
    i === location.blockIndex ? clonedTable : block,
  );
  const tableBlock = clonedTable;

  const targetCell =
    tableBlock.rows[location.rowIndex]?.cells[location.cellIndex];
  if (!targetCell) {
    return edit(current);
  }

  const tempState: EditorState = {
    ...current,
    document: createEditorDocument(
      targetCell.blocks,
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
  const replacementParagraphs = getDocumentParagraphs(
    tempResult.document,
  ).filter((block): block is EditorParagraphNode => block.type === "paragraph");

  targetCell.blocks.splice(
    0,
    targetCell.blocks.length,
    ...replacementParagraphs,
  );
  const nextState = updateBlocksInCurrentSection(current, nextBlocks, zone);
  return {
    ...nextState,
    selection: tempResult.selection,
  };
};

export interface TableLocationMutation {
  tableBlock: EditorTableNode;
  location: NonNullable<ReturnType<typeof findParagraphTableLocation>>;
  targetBlocks: EditorBlockNode[];
}

export function resolveLocationTableMutation(
  current: EditorState,
  getTargetBlocks: (
    state: EditorState,
    zone: EditorEditingZone,
  ) => EditorBlockNode[],
): TableLocationMutation | null {
  const location = findParagraphTableLocation(
    current.document,
    current.selection.focus.paragraphId,
    getActiveSectionIndex(current),
  );
  if (!location) return null;
  const targetBlocks = [...getTargetBlocks(current, location.zone)];
  const originalTableBlock = targetBlocks[location.blockIndex] as EditorTableNode;
  if (!originalTableBlock || originalTableBlock.type !== "table") return null;

  const tableBlock = cloneBlock(originalTableBlock) as EditorTableNode;
  targetBlocks[location.blockIndex] = tableBlock;
  return { tableBlock, location, targetBlocks };
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
