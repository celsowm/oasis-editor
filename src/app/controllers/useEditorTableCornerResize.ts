import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import type { EditorLayoutDocument, EditorState } from "@/core/model.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import {
  setTableColumnWidths,
  setTableRowHeight,
} from "@/core/commands/table.js";
import type { CanvasLayoutSnapshotProvider } from "@/ui/canvas/canvasLayoutSnapshotProvider.js";
import {
  buildTableGeometries,
  getTableById,
} from "./tableResize/tableResizeGeometry.js";
import {
  resolveColumnWidthsPt,
  resolveRowHeightsPx,
} from "./tableResize/tableResizeConstraints.js";
import {
  MIN_TABLE_SIZE_PT,
  ptToPx,
  pxToPt,
} from "./tableResize/tableResizeUnits.js";

const DRAG_THRESHOLD_PX = 2;

/** Live state of a bottom-right corner drag on a single table. */
export interface TableCornerResizeState {
  tableId: string;
  /** Table bounding box in client px at gesture start. */
  bounds: { left: number; top: number; width: number; height: number };
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
  /** Column widths (pt) and total width (pt) captured at start. */
  widthsPt: Record<number, number>;
  totalWidthPt: number;
  /** Rendered row heights (px) captured at start. */
  rowHeightsPx: number[];
}

export interface TableCornerResizeOps {
  resizing: Accessor<TableCornerResizeState | null>;
  /** Preview outline in client/fixed coords while dragging (null otherwise). */
  previewRect: Accessor<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>;
  handleMouseDown: (tableId: string, event: MouseEvent) => void;
}

/**
 * Proportional width/height scale for the current drag, floored so no column
 * shrinks below `MIN_TABLE_SIZE_PT` (pt) and no row below its px equivalent.
 */
export function computeCornerScales(resize: TableCornerResizeState): {
  scaleX: number;
  scaleY: number;
} {
  const rawX =
    (resize.bounds.width + (resize.currentClientX - resize.startClientX)) /
    resize.bounds.width;
  const rawY =
    (resize.bounds.height + (resize.currentClientY - resize.startClientY)) /
    resize.bounds.height;

  const widthValues = Object.values(resize.widthsPt);
  const minColumnPt = widthValues.length > 0 ? Math.min(...widthValues) : 1;
  const minScaleX = minColumnPt > 0 ? MIN_TABLE_SIZE_PT / minColumnPt : 0;

  const minRowPx = ptToPx(MIN_TABLE_SIZE_PT);
  const minRowHeightPx =
    resize.rowHeightsPx.length > 0
      ? Math.min(...resize.rowHeightsPx)
      : minRowPx;
  const minScaleY = minRowHeightPx > 0 ? minRowPx / minRowHeightPx : 0;

  return {
    scaleX: Math.max(minScaleX, rawX),
    scaleY: Math.max(minScaleY, rawY),
  };
}

/**
 * Pure producer: scale every column width by `scaleX` (preserving the scaled
 * total) and every row height by `scaleY`. Exported for unit testing.
 */
export function applyTableCornerResize(
  state: EditorState,
  resize: TableCornerResizeState,
  scaleX: number,
  scaleY: number,
): EditorState {
  const nextWidths: Record<number, number> = {};
  for (const key of Object.keys(resize.widthsPt)) {
    const index = Number(key);
    nextWidths[index] = Math.max(
      MIN_TABLE_SIZE_PT,
      resize.widthsPt[index]! * scaleX,
    );
  }
  const nextTotalPt = Object.values(nextWidths).reduce(
    (sum, value): number => sum + value,
    0,
  );
  let next = setTableColumnWidths(
    state,
    resize.tableId,
    nextWidths,
    nextTotalPt,
  );
  resize.rowHeightsPx.forEach((heightPx, index): void => {
    const nextHeightPt = Math.max(MIN_TABLE_SIZE_PT, pxToPt(heightPx * scaleY));
    next = setTableRowHeight(next, resize.tableId, index, nextHeightPt);
  });
  return next;
}

export function createEditorTableCornerResize(deps: {
  state: () => EditorState;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
  ) => void;
  surfaceRef: () => HTMLElement | undefined;
  documentLayout: Accessor<EditorLayoutDocument>;
  canvasSnapshotProvider: CanvasLayoutSnapshotProvider;
  zoomFactor?: () => number;
}): TableCornerResizeOps {
  const [resizing, setResizing] = createSignal<TableCornerResizeState | null>(
    null,
  );

  const previewRect = (): {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null => {
    const current = resizing();
    if (!current) return null;
    const { scaleX, scaleY } = computeCornerScales(current);
    return {
      left: current.bounds.left,
      top: current.bounds.top,
      width: current.bounds.width * scaleX,
      height: current.bounds.height * scaleY,
    };
  };

  const handleWindowMouseMove = (event: MouseEvent): void => {
    setResizing((current): TableCornerResizeState | null =>
      current
        ? {
            ...current,
            currentClientX: event.clientX,
            currentClientY: event.clientY,
          }
        : null,
    );
  };

  const stop = (): void => {
    setResizing(null);
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
    document.body.style.cursor = "";
  };

  const handleWindowMouseUp = (event: MouseEvent): void => {
    const current = resizing();
    if (current) {
      const movedX = Math.abs(event.clientX - current.startClientX);
      const movedY = Math.abs(event.clientY - current.startClientY);
      if (movedX >= DRAG_THRESHOLD_PX || movedY >= DRAG_THRESHOLD_PX) {
        const settled: TableCornerResizeState = {
          ...current,
          currentClientX: event.clientX,
          currentClientY: event.clientY,
        };
        const { scaleX, scaleY } = computeCornerScales(settled);
        deps.applyTransactionalState(
          (state): EditorState =>
            applyTableCornerResize(state, settled, scaleX, scaleY),
        );
      }
    }
    stop();
  };

  const handleMouseDown = (tableId: string, event: MouseEvent): void => {
    const surface = deps.surfaceRef();
    if (!surface) return;

    const geometries = buildTableGeometries(
      surface,
      deps.state(),
      deps.documentLayout(),
      deps.canvasSnapshotProvider,
      deps.zoomFactor?.(),
    );
    const geometry = geometries.find(
      (candidate): boolean => candidate.tableId === tableId,
    );
    const tableNode = getTableById(deps.state(), tableId);
    if (!geometry || !tableNode) return;

    const tableLayout = buildTableCellLayout(tableNode);
    const { widthsPt } = resolveColumnWidthsPt(
      tableNode,
      tableLayout,
      geometry,
    );
    const rowHeightsPx = resolveRowHeightsPx(tableNode, tableLayout, geometry);
    const totalWidthPt = Object.values(widthsPt).reduce(
      (sum, value): number => sum + value,
      0,
    );

    setResizing({
      tableId,
      bounds: {
        left: geometry.bounds.left,
        top: geometry.bounds.top,
        width: Math.max(1, geometry.bounds.width),
        height: Math.max(1, geometry.bounds.height),
      },
      startClientX: event.clientX,
      startClientY: event.clientY,
      currentClientX: event.clientX,
      currentClientY: event.clientY,
      widthsPt,
      totalWidthPt,
      rowHeightsPx,
    });

    document.body.style.cursor = "nwse-resize";
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    event.preventDefault();
    event.stopPropagation();
  };

  return { resizing, previewRect, handleMouseDown };
}
