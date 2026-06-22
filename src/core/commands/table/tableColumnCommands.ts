import type {
  EditorBlockNode,
  EditorState,
  EditorTableNode,
  EditorTableStyle,
} from "@/core/model.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import { PT_PER_PX } from "@/core/units.js";
import {
  createTableRevisionMetadata,
  updateStateSections,
  updateTablesInBlocks,
} from "./tableCommandUtils.js";

function parseWidthToPt(value: number | string | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.includes("%")) {
    return null;
  }
  if (trimmed.endsWith("pt")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (trimmed.endsWith("px")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? parsed * PT_PER_PX : null;
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function setTableColumnWidths(
  state: EditorState,
  tableId: string,
  columnWidths: Record<number, number | string>,
  tableWidth?: number | string,
  tableIndentLeft?: number | string,
): EditorState {
  const updateTable = (table: EditorTableNode): EditorTableNode => {
    if (table.id !== tableId) return table;

    const tableLayout = buildTableCellLayout(table);
    const visualColumnCount = Math.max(
      1,
      ...tableLayout.map(
        (entry) => entry.visualColumnIndex + Math.max(1, entry.colSpan),
      ),
    );
    const nextGridCols = Array<number>(visualColumnCount);
    let hasGridOverride = false;
    let canResolveGrid = true;
    for (
      let columnIndex = 0;
      columnIndex < visualColumnCount;
      columnIndex += 1
    ) {
      const override = parseWidthToPt(columnWidths[columnIndex]);
      if (override !== null) {
        nextGridCols[columnIndex] = Math.max(1, override);
        hasGridOverride = true;
        continue;
      }
      const existing = table.gridCols?.[columnIndex];
      if (
        typeof existing === "number" &&
        Number.isFinite(existing) &&
        existing > 0
      ) {
        nextGridCols[columnIndex] = existing;
        continue;
      }
      canResolveGrid = false;
      break;
    }

    const nextRows = table.rows.map((row, rowIndex) => {
      const nextCells = row.cells.map((cell, cellIndex) => {
        const entry = tableLayout.find(
          (item) => item.rowIndex === rowIndex && item.cellIndex === cellIndex,
        );
        if (!entry) return cell;

        const rightVisualColumnIndex =
          entry.visualColumnIndex + entry.colSpan - 1;
        const newWidth = columnWidths[rightVisualColumnIndex];

        if (newWidth !== undefined && entry.colSpan === 1) {
          const propertyRevision =
            state.trackChangesEnabled && !cell.style?.propertyRevision
              ? {
                  ...createTableRevisionMetadata(),
                  type: "property" as const,
                  previous: { ...(cell.style ?? {}) },
                }
              : cell.style?.propertyRevision;
          return {
            ...cell,
            style: {
              ...(cell.style ?? {}),
              width: typeof newWidth === "number" ? newWidth : newWidth,
              ...(propertyRevision ? { propertyRevision } : {}),
            },
          };
        }

        return cell;
      });
      return { ...row, cells: nextCells };
    });

    const nextStyle: EditorTableStyle = { ...(table.style ?? {}) };
    if (
      state.trackChangesEnabled &&
      !nextStyle.revision &&
      (tableWidth !== undefined || tableIndentLeft !== undefined)
    ) {
      nextStyle.revision = {
        ...createTableRevisionMetadata(),
        type: "property",
        previous: { ...(table.style ?? {}) },
      };
    }
    if (tableWidth !== undefined) {
      nextStyle.width = tableWidth;
    }
    if (tableIndentLeft !== undefined) {
      nextStyle.indentLeft =
        typeof tableIndentLeft === "number"
          ? tableIndentLeft
          : Number(tableIndentLeft);
    }

    return {
      ...table,
      rows: nextRows,
      gridCols:
        hasGridOverride && canResolveGrid ? nextGridCols : table.gridCols,
      gridRevision:
        state.trackChangesEnabled &&
        hasGridOverride &&
        canResolveGrid &&
        !table.gridRevision
          ? {
              ...createTableRevisionMetadata(),
              type: "grid",
              previous: [...(table.gridCols ?? [])],
            }
          : table.gridRevision,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : undefined,
    };
  };

  return updateStateSections(state, (blocks: EditorBlockNode[]) =>
    updateTablesInBlocks(blocks, updateTable),
  );
}
