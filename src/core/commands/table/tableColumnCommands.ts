import type {
  EditorBlockNode,
  EditorState,
  EditorTableNode,
  EditorTableStyle,
  EditorTableCellNode,
} from "@/core/model.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import { parseUnitToPt as parseWidthToPt } from "@/core/units/parseUnitToPt.js";
import {
  createTableRevisionMetadata,
  updateActiveTableBlocks,
  updateStateSections,
  updateNestedTablesInBlocks,
} from "./tableCommandUtils.js";

/** Fallback per-column width (pt) when a table has no resolvable grid. */
const DEFAULT_DISTRIBUTED_COLUMN_PT = 120;

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
    const layoutByRowAndCell = new Map(
      tableLayout.map((entry) => [
        `${entry.rowIndex}:${entry.cellIndex}`,
        entry,
      ]),
    );
    const visualColumnCount = Math.max(
      1,
      ...tableLayout.map(
        (entry): number => entry.visualColumnIndex + Math.max(1, entry.colSpan),
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
      const nextCells = row.cells.map(
        (cell, cellIndex): EditorTableCellNode => {
          const entry = layoutByRowAndCell.get(`${rowIndex}:${cellIndex}`);
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
                width: newWidth,
                ...(propertyRevision ? { propertyRevision } : {}),
              },
            };
          }

          return cell;
        },
      );
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

  return updateStateSections(
    state,
    (blocks: EditorBlockNode[]): EditorBlockNode[] =>
      updateNestedTablesInBlocks(blocks, updateTable),
  );
}

/**
 * Equalize the widths of every visual column in the active table (Word's
 * "Distribute Columns"), preserving the table's total width. Merged cells keep
 * their span, so a cell spanning N columns gets N equal shares.
 */
export function distributeSelectedTableColumns(
  state: EditorState,
): EditorState {
  return updateActiveTableBlocks(state, (table): EditorTableNode => {
    const layout = buildTableCellLayout(table);
    const visualColumnCount = Math.max(
      1,
      ...layout.map(
        (entry): number => entry.visualColumnIndex + Math.max(1, entry.colSpan),
      ),
    );
    const totalPt = (table.gridCols ?? []).reduce(
      (sum, width): number =>
        sum + (typeof width === "number" && width > 0 ? width : 0),
      0,
    );
    const total =
      totalPt > 0 ? totalPt : visualColumnCount * DEFAULT_DISTRIBUTED_COLUMN_PT;
    const columnWidth = total / visualColumnCount;
    const nextGridCols = Array.from(
      { length: visualColumnCount },
      (): number => columnWidth,
    );
    const nextRows = table.rows.map((row, rowIndex) => ({
      ...row,
      cells: row.cells.map((cell, cellIndex): EditorTableCellNode => {
        const entry = layout.find(
          (item): boolean =>
            item.rowIndex === rowIndex && item.cellIndex === cellIndex,
        );
        if (!entry) return cell;
        return {
          ...cell,
          style: {
            ...(cell.style ?? {}),
            width: columnWidth * Math.max(1, entry.colSpan),
          },
        };
      }),
    }));
    return {
      ...table,
      gridCols: nextGridCols,
      rows: nextRows,
      style: { ...(table.style ?? {}), width: total },
    };
  });
}
