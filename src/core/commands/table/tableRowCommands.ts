import type {
  EditorState,
  EditorTableNode,
  EditorTableRowStyle,
} from "../../model.js";
import {
  patchStyleValue,
  resolveActiveTableLocation,
  updateActiveTableBlocks,
  updateStateSections,
  updateTablesInBlocks,
} from "./tableCommandUtils.js";

export function setSelectedTableRowStyleValue<
  K extends keyof EditorTableRowStyle,
>(
  state: EditorState,
  key: K,
  value: EditorTableRowStyle[K] | null,
): EditorState {
  const target = resolveActiveTableLocation(state);
  if (!target) return state;

  const updateTable = (table: EditorTableNode): EditorTableNode => {
    const nextRows = table.rows.map((row, rowIndex) =>
      rowIndex === target.loc.rowIndex
        ? { ...row, style: patchStyleValue(row.style, key, value) }
        : row,
    );
    return { ...table, rows: nextRows };
  };

  return updateActiveTableBlocks(state, updateTable);
}

export function setSelectedTableRowHeader(
  state: EditorState,
  value: boolean | null,
): EditorState {
  const target = resolveActiveTableLocation(state);
  if (!target) return state;

  const updateTable = (table: EditorTableNode): EditorTableNode => ({
    ...table,
    rows: table.rows.map((row, rowIndex) =>
      rowIndex === target.loc.rowIndex
        ? { ...row, isHeader: value === null ? undefined : value }
        : row,
    ),
  });

  return updateActiveTableBlocks(state, updateTable);
}

export function setTableRowHeight(
  state: EditorState,
  tableId: string,
  rowIndex: number,
  height: number | string | null,
): EditorState {
  const updateTable = (table: EditorTableNode): EditorTableNode => {
    if (table.id !== tableId) return table;
    const nextRows = [...table.rows];
    const row = nextRows[rowIndex];
    if (row) {
      nextRows[rowIndex] = {
        ...row,
        style: patchStyleValue(row.style, "height", height),
      };
    }
    return { ...table, rows: nextRows };
  };

  return updateStateSections(state, (blocks) =>
    updateTablesInBlocks(blocks, updateTable),
  );
}
