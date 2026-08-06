import type {
  EditorState,
  EditorTableNode,
  EditorTableRowStyle,
  EditorTableRowNode,
  EditorBlockNode,
} from "@/core/model.js";
import {
  patchStyleValue,
  createTableRevisionMetadata,
  resolveActiveTableLocation,
  updateActiveTableBlocks,
  updateStateSections,
  updateNestedTablesInBlocks,
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
    const nextRows = table.rows.map(
      (row, rowIndex): EditorTableRowNode =>
        rowIndex === target.loc.rowIndex
          ? ((): EditorTableRowNode => {
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
  return setTableRowHeights(state, tableId, { [rowIndex]: height });
}

export function setTableRowHeights(
  state: EditorState,
  tableId: string,
  rowHeights: Readonly<Record<number, number | string | null>>,
): EditorState {
  const updateTable = (table: EditorTableNode): EditorTableNode => {
    if (table.id !== tableId) return table;
    const nextRows = table.rows.map((row, rowIndex): EditorTableRowNode => {
      if (!Object.prototype.hasOwnProperty.call(rowHeights, rowIndex))
        return row;
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
      return {
        ...row,
        style: patchStyleValue(style, "height", rowHeights[rowIndex]!),
      };
    });
    return { ...table, rows: nextRows };
  };

  return updateStateSections(state, (blocks): EditorBlockNode[] =>
    updateNestedTablesInBlocks(blocks, updateTable),
  );
}

/** Fallback row height (px) when no row in the table has an explicit height. */
const DEFAULT_DISTRIBUTED_ROW_PX = 24;

/**
 * Equalize the heights of every row in the active table (Word's "Distribute
 * Rows"). Uses the tallest explicit row height as the target (or a default when
 * none is set) with the `atLeast` rule so cell content can still grow.
 */
export function distributeSelectedTableRows(state: EditorState): EditorState {
  return updateActiveTableBlocks(state, (table): EditorTableNode => {
    let target = 0;
    for (const row of table.rows) {
      const height = row.style?.height;
      const px =
        typeof height === "number"
          ? height
          : typeof height === "string"
            ? Number.parseFloat(height)
            : 0;
      if (Number.isFinite(px) && px > target) target = px;
    }
    if (target <= 0) target = DEFAULT_DISTRIBUTED_ROW_PX;
    const nextRows = table.rows.map(
      (row): EditorTableRowNode => ({
        ...row,
        style: {
          ...(row.style ?? {}),
          height: target,
          heightRule: "atLeast",
        },
      }),
    );
    return { ...table, rows: nextRows };
  });
}
