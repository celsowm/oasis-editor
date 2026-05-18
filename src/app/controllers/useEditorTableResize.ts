import { createSignal } from "solid-js";
import type { EditorState, EditorTableNode } from "../../core/model.js";
import { setTableRowHeight, setTableColumnWidths } from "../../core/editorCommands.js";
import { buildTableCellLayout, type TableCellLayoutEntry } from "../../core/tableLayout.js";
import { buildCanvasLayoutSnapshot } from "../../ui/canvas/CanvasLayoutSnapshot.js";

export interface TableResizeOps {
  resizing: () => {
    type: "column" | "row";
    tableId: string;
    index: number;
    initialPos: number;
    currentPos: number;
    initialRowHeightPx?: number;
    columnWidthsPt?: Record<number, number>;
    maxColumnIndex?: number;
    guideBounds: { left: number; top: number; width: number; height: number };
  } | null;
  handleMouseMove: (event: MouseEvent) => void;
  handleMouseDown: (event: MouseEvent) => boolean; // returns true if handled
}

type ResizeSide = "left" | "right" | "top" | "bottom";

interface SnapshotCellRect {
  tableId: string;
  rowIndex: number;
  cellIndex: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface TableGeometry {
  tableId: string;
  cells: SnapshotCellRect[];
  bounds: { left: number; top: number; right: number; bottom: number; width: number; height: number };
}

interface ResizeHoverInfo {
  tableId: string;
  rowIndex: number;
  cellIndex: number;
  side: ResizeSide;
  rect: SnapshotCellRect;
  tableNode: EditorTableNode;
  layoutEntry: TableCellLayoutEntry;
  tableGeometry: TableGeometry;
}

const POINTS_PER_PIXEL = 0.75;
const PIXELS_PER_POINT = 1 / POINTS_PER_PIXEL;
const EDGE_THRESHOLD_PX = 12;
const MIN_TABLE_SIZE_PT = 10;

function pxToPt(px: number): number {
  return px * POINTS_PER_PIXEL;
}

function ptToPx(pt: number): number {
  return pt * PIXELS_PER_POINT;
}

function parseSizeToPt(value: number | string | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (trimmed.endsWith("pt")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (trimmed.endsWith("px")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? pxToPt(parsed) : null;
  }
  // Ignore percentage/other CSS units for pt conversion.
  if (trimmed.includes("%")) {
    return null;
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function getAllBlocks(state: EditorState) {
  return [
    ...state.document.blocks,
    ...(state.document.sections?.flatMap((section) => [
      ...section.blocks,
      ...(section.header ?? []),
      ...(section.footer ?? []),
    ]) ?? []),
  ];
}

function getTableById(state: EditorState, tableId: string): EditorTableNode | null {
  const table = getAllBlocks(state).find(
    (block): block is EditorTableNode => block.type === "table" && block.id === tableId,
  );
  return table ?? null;
}

function buildTableGeometries(surface: HTMLElement, state: EditorState): TableGeometry[] {
  const snapshot = buildCanvasLayoutSnapshot({
    surface,
    state,
    layoutMode: "wordParity",
  });
  if (!snapshot) {
    return [];
  }

  const byTable = new Map<string, Map<string, SnapshotCellRect>>();
  for (const paragraph of snapshot.paragraphs) {
    const cell = paragraph.tableCell;
    if (!cell) {
      continue;
    }
    const key = `${cell.rowIndex}:${cell.cellIndex}`;
    const tableMap = byTable.get(cell.tableId) ?? new Map<string, SnapshotCellRect>();
    if (!tableMap.has(key)) {
      tableMap.set(key, {
        tableId: cell.tableId,
        rowIndex: cell.rowIndex,
        cellIndex: cell.cellIndex,
        left: cell.left,
        top: cell.top,
        right: cell.left + cell.width,
        bottom: cell.top + cell.height,
        width: cell.width,
        height: cell.height,
      });
      byTable.set(cell.tableId, tableMap);
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

function resolveRowHeightsPx(
  tableNode: EditorTableNode,
  tableLayout: TableCellLayoutEntry[],
  geometry: TableGeometry,
): number[] {
  const rowCount = Math.max(1, tableNode.rows.length);
  const baseRowHeight = geometry.bounds.height / rowCount;
  const rowHeights = Array<number>(rowCount).fill(baseRowHeight);

  const geometryByKey = new Map(
    geometry.cells.map((cell) => [`${cell.rowIndex}:${cell.cellIndex}`, cell] as const),
  );

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const explicitPt = parseSizeToPt(tableNode.rows[rowIndex]?.style?.height);
    if (explicitPt !== null) {
      rowHeights[rowIndex] = Math.max(1, ptToPx(explicitPt));
      continue;
    }

    const singleSpan = tableLayout.find(
      (entry) => entry.rowIndex === rowIndex && entry.rowSpan === 1,
    );
    if (singleSpan) {
      const geometryCell = geometryByKey.get(`${singleSpan.rowIndex}:${singleSpan.cellIndex}`);
      if (geometryCell) {
        rowHeights[rowIndex] = Math.max(1, geometryCell.height);
      }
    }
  }

  return rowHeights;
}

function resolveColumnWidthsPt(
  tableNode: EditorTableNode,
  tableLayout: TableCellLayoutEntry[],
  geometry: TableGeometry,
): { widthsPt: Record<number, number>; maxColumnIndex: number } {
  const visualColumnCount = Math.max(
    1,
    ...tableLayout.map((entry) => entry.visualColumnIndex + Math.max(1, entry.colSpan)),
  );
  const maxColumnIndex = visualColumnCount - 1;

  const widthsPx = Array<number>(visualColumnCount).fill(geometry.bounds.width / visualColumnCount);
  const geometryByKey = new Map(
    geometry.cells.map((cell) => [`${cell.rowIndex}:${cell.cellIndex}`, cell] as const),
  );

  if (tableNode.gridCols && tableNode.gridCols.length >= visualColumnCount) {
    for (let index = 0; index < visualColumnCount; index += 1) {
      widthsPx[index] = Math.max(1, ptToPx(tableNode.gridCols[index]!));
    }
  } else {
    for (const entry of tableLayout) {
      if (entry.colSpan !== 1) {
        continue;
      }
      const geometryCell = geometryByKey.get(`${entry.rowIndex}:${entry.cellIndex}`);
      if (!geometryCell) {
        continue;
      }
      widthsPx[entry.visualColumnIndex] = Math.max(1, geometryCell.width);
    }
  }

  const widthsPt: Record<number, number> = {};
  for (let columnIndex = 0; columnIndex < visualColumnCount; columnIndex += 1) {
    widthsPt[columnIndex] = Math.max(MIN_TABLE_SIZE_PT, pxToPt(widthsPx[columnIndex]!));
  }

  return { widthsPt, maxColumnIndex };
}

export function createEditorTableResize(deps: {
  state: () => EditorState;
  applyTransactionalState: (producer: (current: EditorState) => EditorState) => void;
  surfaceRef: () => HTMLElement | undefined;
  viewportRef: () => HTMLElement | undefined;
}): TableResizeOps {
  const [resizing, setResizing] = createSignal<{
    type: "column" | "row";
    tableId: string;
    index: number;
    initialPos: number;
    currentPos: number;
    initialRowHeightPx?: number;
    columnWidthsPt?: Record<number, number>;
    maxColumnIndex?: number;
    guideBounds: { left: number; top: number; width: number; height: number };
  } | null>(null);

  const getGuideBounds = () => {
    const viewport = deps.viewportRef();
    if (!viewport) {
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }
    const rect = viewport.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: Math.max(0, rect.width),
      height: Math.max(0, rect.height),
    };
  };

  const getTableAtEvent = (event: MouseEvent): ResizeHoverInfo | null => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest(".oasis-editor-table-drag-handle")) {
      return null;
    }

    const surface = deps.surfaceRef();
    if (!surface) {
      return null;
    }

    const state = deps.state();
    const geometries = buildTableGeometries(surface, state);
    if (geometries.length === 0) {
      return null;
    }

    let best: { geometry: TableGeometry; cell: SnapshotCellRect; side: ResizeSide; distance: number } | null = null;

    for (const geometry of geometries) {
      for (const cell of geometry.cells) {
        const verticallyAligned =
          event.clientY >= cell.top - EDGE_THRESHOLD_PX &&
          event.clientY <= cell.bottom + EDGE_THRESHOLD_PX;
        const horizontallyAligned =
          event.clientX >= cell.left - EDGE_THRESHOLD_PX &&
          event.clientX <= cell.right + EDGE_THRESHOLD_PX;

        if (verticallyAligned) {
          const distLeft = Math.abs(event.clientX - cell.left);
          if (distLeft <= EDGE_THRESHOLD_PX && (!best || distLeft < best.distance)) {
            best = { geometry, cell, side: "left", distance: distLeft };
          }

          const distRight = Math.abs(event.clientX - cell.right);
          if (distRight <= EDGE_THRESHOLD_PX && (!best || distRight < best.distance)) {
            best = { geometry, cell, side: "right", distance: distRight };
          }
        }

        if (horizontallyAligned) {
          const distTop = Math.abs(event.clientY - cell.top);
          if (distTop <= EDGE_THRESHOLD_PX && (!best || distTop < best.distance)) {
            best = { geometry, cell, side: "top", distance: distTop };
          }

          const distBottom = Math.abs(event.clientY - cell.bottom);
          if (distBottom <= EDGE_THRESHOLD_PX && (!best || distBottom < best.distance)) {
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
      (entry) => entry.rowIndex === best.cell.rowIndex && entry.cellIndex === best.cell.cellIndex,
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
  };

  const handleMouseMove = (event: MouseEvent) => {
    const currentResizing = resizing();

    if (currentResizing) {
      if (currentResizing.type === "column") {
        document.body.classList.add("oasis-editor-hover-col-resize");
        document.body.classList.remove("oasis-editor-hover-row-resize");
      } else {
        document.body.classList.add("oasis-editor-hover-row-resize");
        document.body.classList.remove("oasis-editor-hover-col-resize");
      }
      return;
    }

    const info = getTableAtEvent(event);
    if (!info) {
      document.body.classList.remove("oasis-editor-hover-col-resize");
      document.body.classList.remove("oasis-editor-hover-row-resize");
      return;
    }

    const isCol = info.side === "left" || info.side === "right";
    if (isCol) {
      document.body.classList.add("oasis-editor-hover-col-resize");
      document.body.classList.remove("oasis-editor-hover-row-resize");
    } else {
      document.body.classList.add("oasis-editor-hover-row-resize");
      document.body.classList.remove("oasis-editor-hover-col-resize");
    }
  };

  const handleMouseDown = (event: MouseEvent) => {
    const info = getTableAtEvent(event);
    if (!info) return false;

    const tableLayout = buildTableCellLayout(info.tableNode);
    const isCol = info.side === "left" || info.side === "right";

    if (isCol) {
      const visualColumnIndex =
        info.side === "left"
          ? info.layoutEntry.visualColumnIndex - 1
          : info.layoutEntry.visualColumnIndex + info.layoutEntry.colSpan - 1;

      if (visualColumnIndex < 0) {
        return false;
      }

      const initialPos = info.side === "left" ? info.rect.left : info.rect.right;
      const { widthsPt, maxColumnIndex } = resolveColumnWidthsPt(
        info.tableNode,
        tableLayout,
        info.tableGeometry,
      );

      setResizing({
        type: "column",
        tableId: info.tableId,
        index: visualColumnIndex,
        initialPos,
        currentPos: initialPos,
        columnWidthsPt: widthsPt,
        maxColumnIndex,
        guideBounds: getGuideBounds(),
      });

      document.body.classList.add("oasis-editor-hover-col-resize");
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
      event.preventDefault();
      event.stopPropagation();
      return true;
    }

    const rowHeightsPx = resolveRowHeightsPx(info.tableNode, tableLayout, info.tableGeometry);
    const targetRowIndex =
      info.side === "top"
        ? info.layoutEntry.visualRowIndex - 1
        : info.layoutEntry.visualRowIndex + info.layoutEntry.rowSpan - 1;

    if (targetRowIndex < 0 || targetRowIndex >= rowHeightsPx.length) {
      return false;
    }

    const initialPos = info.side === "top" ? info.rect.top : info.rect.bottom;

    setResizing({
      type: "row",
      tableId: info.tableId,
      index: targetRowIndex,
      initialPos,
      currentPos: initialPos,
      initialRowHeightPx: rowHeightsPx[targetRowIndex],
      guideBounds: getGuideBounds(),
    });

    document.body.classList.add("oasis-editor-hover-row-resize");
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    event.preventDefault();
    event.stopPropagation();
    return true;
  };

  const handleWindowMouseMove = (event: MouseEvent) => {
    const currentResizing = resizing();
    if (!currentResizing) return;

    setResizing({
      ...currentResizing,
      currentPos: currentResizing.type === "column" ? event.clientX : event.clientY,
      guideBounds: getGuideBounds(),
    });

    if (currentResizing.type === "column") {
      document.body.classList.add("oasis-editor-hover-col-resize");
    } else {
      document.body.classList.add("oasis-editor-hover-row-resize");
    }
  };

  const handleWindowMouseUp = (event: MouseEvent) => {
    const currentResizing = resizing();
    if (!currentResizing) return;

    const delta =
      (currentResizing.type === "column" ? event.clientX : event.clientY) -
      currentResizing.initialPos;

    if (Math.abs(delta) >= 2) {
      const deltaPt = pxToPt(delta);

      deps.applyTransactionalState((current) => {
        if (currentResizing.type === "row") {
          const basePx = currentResizing.initialRowHeightPx ?? ptToPx(MIN_TABLE_SIZE_PT);
          const newSizePt = Math.max(MIN_TABLE_SIZE_PT, pxToPt(basePx + delta));
          return setTableRowHeight(
            current,
            currentResizing.tableId,
            currentResizing.index,
            newSizePt,
          );
        }

        const maxColumnIndex = currentResizing.maxColumnIndex ?? currentResizing.index;
        const baseWidths = { ...(currentResizing.columnWidthsPt ?? {}) };
        for (let i = 0; i <= maxColumnIndex; i += 1) {
          if (baseWidths[i] === undefined) {
            baseWidths[i] = MIN_TABLE_SIZE_PT;
          }
        }

        const oldWidth = baseWidths[currentResizing.index] ?? MIN_TABLE_SIZE_PT;
        let newWidth = Math.max(MIN_TABLE_SIZE_PT, oldWidth + deltaPt);
        const isLastColumn = currentResizing.index === maxColumnIndex;

        if (!isLastColumn) {
          const nextIndex = currentResizing.index + 1;
          const oldNextWidth = baseWidths[nextIndex] ?? MIN_TABLE_SIZE_PT;
          let newNextWidth = oldNextWidth - (newWidth - oldWidth);

          if (newNextWidth < MIN_TABLE_SIZE_PT) {
            newNextWidth = MIN_TABLE_SIZE_PT;
            newWidth = oldWidth + (oldNextWidth - MIN_TABLE_SIZE_PT);
            newWidth = Math.max(MIN_TABLE_SIZE_PT, newWidth);
          }

          baseWidths[currentResizing.index] = newWidth;
          baseWidths[nextIndex] = newNextWidth;
        } else {
          baseWidths[currentResizing.index] = newWidth;
        }

        const tableWidthPt = Object.values(baseWidths).reduce((sum, value) => sum + value, 0);
        const tableNode = getTableById(current, currentResizing.tableId);
        const currentTableWidthPt = parseSizeToPt(tableNode?.style?.width);
        const tableWidthToPersist =
          isLastColumn
            ? tableWidthPt
            : currentTableWidthPt !== null
              ? currentTableWidthPt
              : undefined;
        return setTableColumnWidths(current, currentResizing.tableId, baseWidths, tableWidthToPersist);
      });
    }

    setResizing(null);
    document.body.classList.remove("oasis-editor-hover-col-resize");
    document.body.classList.remove("oasis-editor-hover-row-resize");
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  };

  return {
    resizing,
    handleMouseMove,
    handleMouseDown,
  };
}
