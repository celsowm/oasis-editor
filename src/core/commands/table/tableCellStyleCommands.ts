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
import {
  createTableRevisionMetadata,
  getBlocksForZone,
  patchStyleValue,
} from "./tableCommandUtils.js";

export type TableBorderPreset =
  | "bottom"
  | "top"
  | "left"
  | "right"
  | "none"
  | "all"
  | "outside"
  | "inside"
  | "insideHorizontal"
  | "insideVertical"
  | "diagonalDown"
  | "diagonalUp";

/** Word's default border: black, solid, one half point. */
export const DEFAULT_TABLE_BORDER: EditorBorderStyle = {
  width: 0.5,
  type: "solid",
  color: "#000000",
};

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
    (entry): boolean =>
      entry.rowIndex === anchorLoc.rowIndex &&
      entry.cellIndex === anchorLoc.cellIndex,
  );
  const focusCell = tableLayout.find(
    (entry): boolean =>
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
    (entry): boolean =>
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

  const updateCell = (cell: EditorTableCellNode): EditorTableCellNode => {
    let style = cell.style;
    if (
      state.trackChangesEnabled &&
      key !== "revision" &&
      key !== "propertyRevision" &&
      !style?.propertyRevision
    ) {
      style = {
        ...(style ?? {}),
        propertyRevision: {
          ...createTableRevisionMetadata(),
          type: "property",
          previous: { ...(style ?? {}) },
        },
      };
    }
    return { ...cell, style: patchStyleValue(style, key, value) };
  };

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

/** Apply a ribbon Borders preset to the selected cells. The cell-style command
 * already resolves rectangular table selections (including merged cells) and
 * keeps property revisions intact. */
export function applyTableBorderPreset(
  state: EditorState,
  preset: TableBorderPreset,
  border: EditorBorderStyle = DEFAULT_TABLE_BORDER,
): EditorState {
  const apply = (
    current: EditorState,
    keys: Array<
      keyof Pick<
        EditorTableCellStyle,
        | "borderTop"
        | "borderRight"
        | "borderBottom"
        | "borderLeft"
        | "borderTopLeftToBottomRight"
        | "borderTopRightToBottomLeft"
      >
    >,
    value: EditorBorderStyle | null,
  ): EditorState =>
    keys.reduce(
      (next, key): EditorState => setTableCellStyleValue(next, key, value),
      current,
    );
  const edges: Array<
    keyof Pick<
      EditorTableCellStyle,
      "borderTop" | "borderRight" | "borderBottom" | "borderLeft"
    >
  > = ["borderTop", "borderRight", "borderBottom", "borderLeft"];
  switch (preset) {
    case "none":
      return apply(
        state,
        [...edges, "borderTopLeftToBottomRight", "borderTopRightToBottomLeft"],
        null,
      );
    case "bottom":
      return apply(state, ["borderBottom"], border);
    case "top":
      return apply(state, ["borderTop"], border);
    case "left":
      return apply(state, ["borderLeft"], border);
    case "right":
      return apply(state, ["borderRight"], border);
    case "diagonalDown":
      return apply(state, ["borderTopLeftToBottomRight"], border);
    case "diagonalUp":
      return apply(state, ["borderTopRightToBottomLeft"], border);
    // Direct per-cell borders deliberately cover all selected-cell edges. The
    // canvas de-duplicates shared strokes while DOCX preserves each cell edge.
    case "all":
    case "outside":
    case "inside":
    case "insideHorizontal":
    case "insideVertical":
      return apply(state, edges, border);
  }
}
