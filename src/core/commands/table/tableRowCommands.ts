import type {
  EditorState,
  EditorTableNode,
  EditorTableRowStyle, EditorTableRowNode, EditorBlockNode } from "@/core/model.js";
import {
  patchStyleValue,
  createTableRevisionMetadata,
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
    const nextRows = table.rows.map((row, rowIndex): EditorTableRowNode =>
      rowIndex === target.loc.rowIndex
        ? (() => {
            let style = row.style;
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
            return { ...row, style: patchStyleValue(style, key, value) };
          })()
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
    rows: table.rows.map((row, rowIndex): EditorTableRowNode => {
      if (rowIndex !== target.loc.rowIndex) return row;
      let style = row.style;
      if (state.trackChangesEnabled && !style?.propertyRevision) {
        style = {
          ...(style ?? {}),
          propertyRevision: {
            ...createTableRevisionMetadata(),
            type: "property",
            previous: { ...(style ?? {}), isHeader: row.isHeader },
          },
        };
      }
      const isHeader = value === null ? undefined : value;
      return {
        ...row,
        isHeader,
        style: patchStyleValue(style, "isHeader", isHeader ?? null),
      };
    }),
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
      let style = row.style;
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
      nextRows[rowIndex] = {
        ...row,
        style: patchStyleValue(style, "height", height),
      };
    }
    return { ...table, rows: nextRows };
  };

  return updateStateSections(state, (blocks): EditorBlockNode[] =>
    updateTablesInBlocks(blocks, updateTable),
  );
}
