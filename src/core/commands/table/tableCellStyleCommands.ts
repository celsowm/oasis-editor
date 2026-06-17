import type {
  EditorBorderStyle,
  EditorState,
  EditorTableCellNode,
  EditorTableCellStyle,
} from "@/core/model.js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getDocumentSections,
  getParagraphs,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import { updateTableCellsInBlocks } from "@/core/document/blockReplacement.js";
import { getBlocksForZone, patchStyleValue } from "./tableCommandUtils.js";

function collectTableSelectedParagraphIds(state: EditorState): Set<string> {
  const selectedParagraphIds = new Set<string>();
  const activeSectionIndex = getActiveSectionIndex(state);
  const anchorLoc = findParagraphTableLocation(
    state.document,
    state.selection.anchor.paragraphId,
    activeSectionIndex,
  );
  const focusLoc = findParagraphTableLocation(
    state.document,
    state.selection.focus.paragraphId,
    activeSectionIndex,
  );

  if (
    !anchorLoc ||
    !focusLoc ||
    anchorLoc.blockIndex !== focusLoc.blockIndex ||
    anchorLoc.zone !== focusLoc.zone
  ) {
    return selectedParagraphIds;
  }

  const blocks = getBlocksForZone(
    state.document,
    activeSectionIndex,
    anchorLoc.zone,
  );
  const tableBlock = blocks?.[anchorLoc.blockIndex];
  if (!tableBlock || tableBlock.type !== "table") {
    return selectedParagraphIds;
  }

  const tableLayout = buildTableCellLayout(tableBlock);
  const anchorCell = tableLayout.find(
    (entry) =>
      entry.rowIndex === anchorLoc.rowIndex &&
      entry.cellIndex === anchorLoc.cellIndex,
  );
  const focusCell = tableLayout.find(
    (entry) =>
      entry.rowIndex === focusLoc.rowIndex &&
      entry.cellIndex === focusLoc.cellIndex,
  );
  if (!anchorCell || !focusCell) {
    return selectedParagraphIds;
  }

  const startRow = Math.min(
    anchorCell.visualRowIndex,
    focusCell.visualRowIndex,
  );
  const endRow = Math.max(
    anchorCell.visualRowIndex + anchorCell.rowSpan - 1,
    focusCell.visualRowIndex + focusCell.rowSpan - 1,
  );
  const startCol = Math.min(
    anchorCell.visualColumnIndex,
    focusCell.visualColumnIndex,
  );
  const endCol = Math.max(
    anchorCell.visualColumnIndex + anchorCell.colSpan - 1,
    focusCell.visualColumnIndex + focusCell.colSpan - 1,
  );

  const cells = tableLayout.filter(
    (entry) =>
      entry.visualRowIndex <= endRow &&
      entry.visualRowIndex + entry.rowSpan - 1 >= startRow &&
      entry.visualColumnIndex <= endCol &&
      entry.visualColumnIndex + entry.colSpan - 1 >= startCol,
  );

  for (const entry of cells) {
    for (const paragraph of entry.cell.blocks) {
      selectedParagraphIds.add(paragraph.id);
    }
  }
  return selectedParagraphIds;
}

function collectLinearSelectedParagraphIds(state: EditorState): Set<string> {
  const selectedParagraphIds = new Set<string>();
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  for (let i = normalized.startIndex; i <= normalized.endIndex; i += 1) {
    selectedParagraphIds.add(paragraphs[i]!.id);
  }
  return selectedParagraphIds;
}

export function setTableCellStyleValue<K extends keyof EditorTableCellStyle>(
  state: EditorState,
  key: K,
  value: EditorTableCellStyle[K] | null,
): EditorState {
  const selectedParagraphIds = collectTableSelectedParagraphIds(state);
  if (selectedParagraphIds.size === 0) {
    for (const id of collectLinearSelectedParagraphIds(state)) {
      selectedParagraphIds.add(id);
    }
  }

  const updateCell = (cell: EditorTableCellNode): EditorTableCellNode => ({
    ...cell,
    style: patchStyleValue(cell.style, key, value),
  });

  const nextSections = getDocumentSections(state.document).map((section) => ({
    ...section,
    blocks: updateTableCellsInBlocks(
      section.blocks,
      selectedParagraphIds,
      updateCell,
    ),
    header: section.header
      ? updateTableCellsInBlocks(
          section.header,
          selectedParagraphIds,
          updateCell,
        )
      : undefined,
    footer: section.footer
      ? updateTableCellsInBlocks(
          section.footer,
          selectedParagraphIds,
          updateCell,
        )
      : undefined,
  }));
  return {
    ...state,
    document: {
      ...state.document,
      sections: nextSections,
    },
  };
}

export function setTableCellWidth(
  state: EditorState,
  width: number | string | null,
): EditorState {
  return setTableCellStyleValue(state, "width", width);
}

export function setTableCellBorders(
  state: EditorState,
  border: EditorBorderStyle | null,
): EditorState {
  let nextState = setTableCellStyleValue(state, "borderTop", border);
  nextState = setTableCellStyleValue(nextState, "borderRight", border);
  nextState = setTableCellStyleValue(nextState, "borderBottom", border);
  nextState = setTableCellStyleValue(nextState, "borderLeft", border);
  return nextState;
}
