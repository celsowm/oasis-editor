import type {
  EditorBorderStyle,
  EditorState,
  EditorTableCellNode,
  EditorTableCellStyle,
  TablePathSegment,
} from "@/core/model.js";
import {
  findParagraphTablePathLocation,
  getActiveSectionIndex,
  getBlockParagraphs,
  getDocumentSections,
  getParagraphs,
  resolveTablePath,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import {
  buildTableCellLayout,
  type TableCellLayoutEntry,
} from "@/core/tableLayout.js";
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

/** Explicitly suppresses a border. Missing cell borders intentionally fall
 * back to the editor's default visible table border. */
export const NO_TABLE_BORDER: EditorBorderStyle = {
  width: 0,
  type: "none",
  color: "transparent",
};

interface TableBorderSelection {
  entries: TableCellLayoutEntry[];
  selectedEntries: TableCellLayoutEntry[];
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

function pathsIdentifySameTable(
  left: readonly TablePathSegment[],
  right: readonly TablePathSegment[],
): boolean {
  if (left.length === 0 || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftSegment = left[index]!;
    const rightSegment = right[index]!;
    if (leftSegment.tableBlockIndex !== rightSegment.tableBlockIndex) {
      return false;
    }
    if (
      index < left.length - 1 &&
      (leftSegment.rowIndex !== rightSegment.rowIndex ||
        leftSegment.cellIndex !== rightSegment.cellIndex)
    ) {
      return false;
    }
  }
  return true;
}

function resolveTableBorderSelection(
  state: EditorState,
): TableBorderSelection | null {
  const activeSectionIndex = getActiveSectionIndex(state);
  const anchorLoc = findParagraphTablePathLocation(
    state.document,
    state.selection.anchor.paragraphId,
    activeSectionIndex,
  );
  const focusLoc = findParagraphTablePathLocation(
    state.document,
    state.selection.focus.paragraphId,
    activeSectionIndex,
  );
  if (
    !anchorLoc ||
    !focusLoc ||
    anchorLoc.zone !== focusLoc.zone ||
    !pathsIdentifySameTable(anchorLoc.tablePath, focusLoc.tablePath)
  ) {
    return null;
  }

  const blocks = getBlocksForZone(
    state.document,
    activeSectionIndex,
    anchorLoc.zone,
  );
  if (!blocks) return null;
  const anchorResolved = resolveTablePath(blocks, anchorLoc.tablePath);
  const focusResolved = resolveTablePath(blocks, focusLoc.tablePath);
  const anchorTarget = anchorResolved?.[anchorResolved.length - 1];
  const focusTarget = focusResolved?.[focusResolved.length - 1];
  if (
    !anchorTarget ||
    !focusTarget ||
    anchorTarget.table !== focusTarget.table
  ) {
    return null;
  }

  const anchorSegment = anchorLoc.tablePath[anchorLoc.tablePath.length - 1];
  const focusSegment = focusLoc.tablePath[focusLoc.tablePath.length - 1];
  if (!anchorSegment || !focusSegment) return null;

  const entries = buildTableCellLayout(anchorTarget.table);
  const anchorCell = entries.find(
    (entry): boolean =>
      entry.rowIndex === anchorSegment.rowIndex &&
      entry.cellIndex === anchorSegment.cellIndex,
  );
  const focusCell = entries.find(
    (entry): boolean =>
      entry.rowIndex === focusSegment.rowIndex &&
      entry.cellIndex === focusSegment.cellIndex,
  );
  if (!anchorCell || !focusCell) return null;

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
  const selectedEntries = entries.filter(
    (entry): boolean =>
      entry.visualRowIndex <= endRow &&
      entry.visualRowIndex + entry.rowSpan - 1 >= startRow &&
      entry.visualColumnIndex <= endCol &&
      entry.visualColumnIndex + entry.colSpan - 1 >= startCol,
  );
  return { entries, selectedEntries, startRow, endRow, startCol, endCol };
}

function collectTableSelectedParagraphIds(state: EditorState): Set<string> {
  const selectedParagraphIds = new Set<string>();
  const selection = resolveTableBorderSelection(state);
  if (!selection) return selectedParagraphIds;
  for (const entry of selection.selectedEntries) {
    for (const block of entry.cell.blocks) {
      for (const paragraph of getBlockParagraphs(block)) {
        selectedParagraphIds.add(paragraph.id);
      }
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
  type BorderKey = keyof Pick<
    EditorTableCellStyle,
    | "borderTop"
    | "borderRight"
    | "borderBottom"
    | "borderLeft"
    | "borderStart"
    | "borderEnd"
    | "borderTopLeftToBottomRight"
    | "borderTopRightToBottomLeft"
  >;
  const selection = resolveTableBorderSelection(state);
  if (!selection) return state;

  const patches = new Map<
    string,
    Partial<Record<BorderKey, EditorBorderStyle>>
  >();
  const selectedIds = new Set(
    selection.selectedEntries.map((entry): string => entry.cell.id),
  );
  const occupancy = new Map<string, TableCellLayoutEntry>();
  for (const entry of selection.entries) {
    for (
      let row = entry.visualRowIndex;
      row < entry.visualRowIndex + entry.rowSpan;
      row += 1
    ) {
      for (
        let col = entry.visualColumnIndex;
        col < entry.visualColumnIndex + entry.colSpan;
        col += 1
      ) {
        occupancy.set(`${row}:${col}`, entry);
      }
    }
  }
  const set = (
    entry: TableCellLayoutEntry | undefined,
    key: BorderKey,
    value = border,
  ): void => {
    if (!entry) return;
    const patch = patches.get(entry.cell.id) ?? {};
    patch[key] = value;
    patches.set(entry.cell.id, patch);
  };
  const setPair = (
    first: TableCellLayoutEntry | undefined,
    firstKey: BorderKey,
    second: TableCellLayoutEntry | undefined,
    secondKey: BorderKey,
    value = border,
  ): void => {
    set(first, firstKey, value);
    if (second && second.cell.id !== first?.cell.id)
      set(second, secondKey, value);
  };
  const applySide = (
    side: "top" | "right" | "bottom" | "left",
    value = border,
  ): void => {
    if (side === "top" || side === "bottom") {
      const row = side === "top" ? selection.startRow : selection.endRow;
      const outsideRow = row + (side === "top" ? -1 : 1);
      for (let col = selection.startCol; col <= selection.endCol; col += 1) {
        const owner = occupancy.get(`${row}:${col}`);
        if (!owner || !selectedIds.has(owner.cell.id)) continue;
        setPair(
          owner,
          side === "top" ? "borderTop" : "borderBottom",
          occupancy.get(`${outsideRow}:${col}`),
          side === "top" ? "borderBottom" : "borderTop",
          value,
        );
      }
      return;
    }
    const col = side === "left" ? selection.startCol : selection.endCol;
    const outsideCol = col + (side === "left" ? -1 : 1);
    for (let row = selection.startRow; row <= selection.endRow; row += 1) {
      const owner = occupancy.get(`${row}:${col}`);
      if (!owner || !selectedIds.has(owner.cell.id)) continue;
      setPair(
        owner,
        side === "left" ? "borderLeft" : "borderRight",
        occupancy.get(`${row}:${outsideCol}`),
        side === "left" ? "borderRight" : "borderLeft",
        value,
      );
    }
  };
  const applyInsideHorizontal = (): void => {
    for (let row = selection.startRow + 1; row <= selection.endRow; row += 1) {
      for (let col = selection.startCol; col <= selection.endCol; col += 1) {
        const above = occupancy.get(`${row - 1}:${col}`);
        const below = occupancy.get(`${row}:${col}`);
        if (
          above &&
          below &&
          above.cell.id !== below.cell.id &&
          selectedIds.has(above.cell.id) &&
          selectedIds.has(below.cell.id)
        ) {
          setPair(above, "borderBottom", below, "borderTop");
        }
      }
    }
  };
  const applyInsideVertical = (): void => {
    for (let col = selection.startCol + 1; col <= selection.endCol; col += 1) {
      for (let row = selection.startRow; row <= selection.endRow; row += 1) {
        const left = occupancy.get(`${row}:${col - 1}`);
        const right = occupancy.get(`${row}:${col}`);
        if (
          left &&
          right &&
          left.cell.id !== right.cell.id &&
          selectedIds.has(left.cell.id) &&
          selectedIds.has(right.cell.id)
        ) {
          setPair(left, "borderRight", right, "borderLeft");
        }
      }
    }
  };

  switch (preset) {
    case "none": {
      for (const entry of selection.selectedEntries) {
        for (const key of [
          "borderTop",
          "borderRight",
          "borderBottom",
          "borderLeft",
          "borderStart",
          "borderEnd",
          "borderTopLeftToBottomRight",
          "borderTopRightToBottomLeft",
        ] as BorderKey[])
          set(entry, key, NO_TABLE_BORDER);
      }
      applySide("top", NO_TABLE_BORDER);
      applySide("right", NO_TABLE_BORDER);
      applySide("bottom", NO_TABLE_BORDER);
      applySide("left", NO_TABLE_BORDER);
      break;
    }
    case "top":
      applySide("top");
      break;
    case "right":
      applySide("right");
      break;
    case "bottom":
      applySide("bottom");
      break;
    case "left":
      applySide("left");
      break;
    case "outside":
      applySide("top");
      applySide("right");
      applySide("bottom");
      applySide("left");
      break;
    case "insideHorizontal":
      applyInsideHorizontal();
      break;
    case "insideVertical":
      applyInsideVertical();
      break;
    case "inside":
      applyInsideHorizontal();
      applyInsideVertical();
      break;
    case "all":
      applySide("top");
      applySide("right");
      applySide("bottom");
      applySide("left");
      applyInsideHorizontal();
      applyInsideVertical();
      break;
    case "diagonalDown":
      for (const entry of selection.selectedEntries)
        set(entry, "borderTopLeftToBottomRight");
      break;
    case "diagonalUp":
      for (const entry of selection.selectedEntries)
        set(entry, "borderTopRightToBottomLeft");
      break;
  }

  if (patches.size === 0) return state;
  const touchedParagraphIds = new Set<string>();
  for (const entry of selection.entries) {
    if (!patches.has(entry.cell.id)) continue;
    for (const block of entry.cell.blocks) {
      for (const paragraph of getBlockParagraphs(block)) {
        touchedParagraphIds.add(paragraph.id);
      }
    }
  }
  const updateCell = (cell: EditorTableCellNode): EditorTableCellNode => {
    const patch = patches.get(cell.id);
    if (!patch) return cell;
    let style = cell.style;
    if (state.trackChangesEnabled && !style?.propertyRevision) {
      style = {
        ...(style ?? {}),
        propertyRevision: {
          ...createTableRevisionMetadata(),
          type: "property",
          previous: { ...(style ?? {}) },
        },
      };
    }
    for (const [key, value] of Object.entries(patch) as Array<
      [BorderKey, EditorBorderStyle]
    >) {
      style = patchStyleValue(style, key, value);
    }
    return { ...cell, style };
  };
  const nextSections = getDocumentSections(state.document).map((section) => ({
    ...section,
    blocks: updateTableCellsInBlocks(
      section.blocks,
      touchedParagraphIds,
      updateCell,
    ),
    header: section.header
      ? updateTableCellsInBlocks(
          section.header,
          touchedParagraphIds,
          updateCell,
        )
      : undefined,
    footer: section.footer
      ? updateTableCellsInBlocks(
          section.footer,
          touchedParagraphIds,
          updateCell,
        )
      : undefined,
  }));
  return { ...state, document: { ...state.document, sections: nextSections } };
}
