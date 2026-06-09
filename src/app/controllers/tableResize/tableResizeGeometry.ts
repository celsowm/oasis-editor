import {
  getDocumentSectionsCanonical,
  type EditorState,
  type EditorTableNode,
} from "../../../core/model.js";
import { buildCanvasLayoutSnapshot } from "../../../ui/canvas/CanvasLayoutSnapshot.js";
import type { SnapshotCellRect, TableGeometry } from "./tableResizeTypes.js";

function getAllBlocks(state: EditorState) {
  return getDocumentSectionsCanonical(state.document).flatMap((section) => [
    ...(section.header ?? []),
    ...section.blocks,
    ...(section.footer ?? []),
  ]);
}

export function getTableById(
  state: EditorState,
  tableId: string,
): EditorTableNode | null {
  const table = getAllBlocks(state).find(
    (block): block is EditorTableNode =>
      block.type === "table" && block.id === tableId,
  );
  return table ?? null;
}

export function buildTableGeometries(
  surface: HTMLElement,
  state: EditorState,
): TableGeometry[] {
  const snapshot = buildCanvasLayoutSnapshot({
    surface,
    state,
  });
  if (!snapshot) {
    return [];
  }

  const byTable = new Map<string, Map<string, SnapshotCellRect>>();
  const contentBoundsByCell = new Map<
    string,
    { left: number; top: number; right: number; bottom: number }
  >();
  for (const paragraph of snapshot.paragraphs) {
    const cell = paragraph.tableCell;
    if (!cell) {
      continue;
    }
    const key = `${paragraph.pageIndex}:${cell.rowIndex}:${cell.cellIndex}`;
    const tableMap =
      byTable.get(cell.tableId) ?? new Map<string, SnapshotCellRect>();
    let geometryCell = tableMap.get(key);
    if (!geometryCell) {
      geometryCell = {
        tableId: cell.tableId,
        rowIndex: cell.rowIndex,
        cellIndex: cell.cellIndex,
        pageIndex: paragraph.pageIndex,
        left: cell.left,
        top: cell.top,
        right: cell.left + cell.width,
        bottom: cell.top + cell.height,
        width: cell.width,
        height: cell.height,
        contentMinWidth: 0,
        contentMinHeight: 0,
      };
      tableMap.set(key, geometryCell);
      byTable.set(cell.tableId, tableMap);
    }

    const lineRightEdges = paragraph.lines.flatMap((line) =>
      line.slots.map((slot) => slot.left),
    );
    const lineBottomEdges = paragraph.lines.map(
      (line) => line.top + line.height,
    );
    const contentLeft =
      lineRightEdges.length > 0 ? Math.min(...lineRightEdges) : paragraph.left;
    const contentRight =
      lineRightEdges.length > 0 ? Math.max(...lineRightEdges) : paragraph.left;
    const contentTop =
      paragraph.lines.length > 0 ? paragraph.lines[0]!.top : paragraph.top;
    const contentBottom =
      lineBottomEdges.length > 0
        ? Math.max(...lineBottomEdges)
        : paragraph.top + paragraph.height;
    const contentKey = `${cell.tableId}:${paragraph.pageIndex}:${cell.rowIndex}:${cell.cellIndex}`;
    const current = contentBoundsByCell.get(contentKey);
    if (!current) {
      contentBoundsByCell.set(contentKey, {
        left: contentLeft,
        top: contentTop,
        right: contentRight,
        bottom: contentBottom,
      });
    } else {
      current.left = Math.min(current.left, contentLeft);
      current.top = Math.min(current.top, contentTop);
      current.right = Math.max(current.right, contentRight);
      current.bottom = Math.max(current.bottom, contentBottom);
    }
  }

  for (const [tableId, cellsMap] of byTable.entries()) {
    for (const cell of cellsMap.values()) {
      const content = contentBoundsByCell.get(
        `${tableId}:${cell.pageIndex}:${cell.rowIndex}:${cell.cellIndex}`,
      );
      if (!content) continue;
      cell.contentMinWidth = Math.max(0, content.right - content.left);
      cell.contentMinHeight = Math.max(0, content.bottom - content.top);
    }
  }

  const result: TableGeometry[] = [];
  for (const [tableId, cellsMap] of byTable.entries()) {
    const cells = Array.from(cellsMap.values());
    if (cells.length === 0) {
      continue;
    }
    const left = Math.min(...cells.map((cell) => cell.left));
    const top = Math.min(...cells.map((cell) => cell.top));
    const right = Math.max(...cells.map((cell) => cell.right));
    const bottom = Math.max(...cells.map((cell) => cell.bottom));
    result.push({
      tableId,
      cells,
      bounds: {
        left,
        top,
        right,
        bottom,
        width: Math.max(1, right - left),
        height: Math.max(1, bottom - top),
      },
    });
  }

  return result;
}
