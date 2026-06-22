import { createEditorDocument } from "@/core/editorState.js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getDocumentParagraphs,
  getDocumentSectionsCanonical,
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
  const originalTable = currentBlocks[location.blockIndex];
  if (!originalTable || originalTable.type !== "table") {
    return edit(current);
  }

  const originalRow = originalTable.rows[location.rowIndex];
  const targetCell = originalRow?.cells[location.cellIndex];
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

  const newCell = {
    ...targetCell,
    blocks: replacementParagraphs,
  };

  const newRow = {
    ...originalRow,
    cells: originalRow.cells.map((c, i) =>
      i === location.cellIndex ? newCell : c,
    ),
  };

  const newTable = {
    ...originalTable,
    rows: originalTable.rows.map((r, i) =>
      i === location.rowIndex ? newRow : r,
    ),
  };

  const nextBlocks = currentBlocks.map((block, i) =>
    i === location.blockIndex ? newTable : block,
  );

  const nextState = updateBlocksInCurrentSection(current, nextBlocks, zone);
  return {
    ...nextState,
    selection: tempResult.selection,
  };
};
