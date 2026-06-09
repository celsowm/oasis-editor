import type { EditorState } from "../../../core/model.js";
import { buildTableCellLayout } from "../../../core/tableLayout.js";
import { getTableById, buildTableGeometries } from "./tableResizeGeometry.js";
import type { ResizeSide, ResizeHoverInfo, SnapshotCellRect, TableGeometry } from "./tableResizeTypes.js";

const EDGE_THRESHOLD_COLUMN_PX = 4;
const EDGE_THRESHOLD_ROW_PX = 4;

export function findTableResizeHoverInfo(
  event: MouseEvent,
  surface: HTMLElement,
  state: EditorState,
): ResizeHoverInfo | null {
  const geometries = buildTableGeometries(surface, state);
  if (geometries.length === 0) {
    return null;
  }

  let best: {
    geometry: TableGeometry;
    cell: SnapshotCellRect;
    side: ResizeSide;
    distance: number;
  } | null = null;

  for (const geometry of geometries) {
    for (const cell of geometry.cells) {
      const verticallyAligned =
        event.clientY >= cell.top - EDGE_THRESHOLD_COLUMN_PX &&
        event.clientY <= cell.bottom + EDGE_THRESHOLD_COLUMN_PX;
      const horizontallyAligned =
        event.clientX >= cell.left - EDGE_THRESHOLD_ROW_PX &&
        event.clientX <= cell.right + EDGE_THRESHOLD_ROW_PX;

      if (verticallyAligned) {
        const distLeft = Math.abs(event.clientX - cell.left);
        if (
          distLeft <= EDGE_THRESHOLD_COLUMN_PX &&
          (!best || distLeft < best.distance)
        ) {
          best = { geometry, cell, side: "left", distance: distLeft };
        }

        const distRight = Math.abs(event.clientX - cell.right);
        if (
          distRight <= EDGE_THRESHOLD_COLUMN_PX &&
          (!best || distRight < best.distance)
        ) {
          best = { geometry, cell, side: "right", distance: distRight };
        }
      }

      if (horizontallyAligned) {
        const distTop = Math.abs(event.clientY - cell.top);
        if (
          distTop <= EDGE_THRESHOLD_ROW_PX &&
          (!best || distTop < best.distance)
        ) {
          best = { geometry, cell, side: "top", distance: distTop };
        }

        const distBottom = Math.abs(event.clientY - cell.bottom);
        if (
          distBottom <= EDGE_THRESHOLD_ROW_PX &&
          (!best || distBottom < best.distance)
        ) {
          best = { geometry, cell, side: "bottom", distance: distBottom };
        }
      }
    }
  }

  if (!best) {
    return null;
  }

  const tableNode = getTableById(state, best.geometry.tableId);
  if (!tableNode) {
    return null;
  }

  const tableLayout = buildTableCellLayout(tableNode);
  const layoutEntry = tableLayout.find(
    (entry) =>
      entry.rowIndex === best.cell.rowIndex &&
      entry.cellIndex === best.cell.cellIndex,
  );
  if (!layoutEntry) {
    return null;
  }

  return {
    tableId: best.geometry.tableId,
    rowIndex: best.cell.rowIndex,
    cellIndex: best.cell.cellIndex,
    side: best.side,
    rect: best.cell,
    tableNode,
    layoutEntry,
    tableGeometry: best.geometry,
  };
}
