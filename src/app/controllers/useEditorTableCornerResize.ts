import { createSignal } from "solid-js";
import { createPointerGesture } from "./pointerGesture.js";
import type { Accessor } from "solid-js";
import type { EditorLayoutDocument, EditorState } from "@/core/model.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import {
  setTableColumnWidths,
  setTableRowHeights,
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
import {
  cancelScheduledAnimationFrame,
  scheduleAnimationFrame,
} from "./animationFrame.js";

const DRAG_THRESHOLD_PX = 2;
let tableCornerResizeCursorOwner: object | null = null;

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
  handlePointerDown: (tableId: string, event: PointerEvent) => void;
  stop: () => void;
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
  const next = setTableColumnWidths(
    state,
    resize.tableId,
    nextWidths,
    nextTotalPt,
  );
  const nextRowHeights: Record<number, number> = {};
  resize.rowHeightsPx.forEach((heightPx, index): void => {
    nextRowHeights[index] = Math.max(
      MIN_TABLE_SIZE_PT,
      pxToPt(heightPx * scaleY),
    );
  });
  return setTableRowHeights(next, resize.tableId, nextRowHeights);
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
  let resizeFrameHandle: number | null = null;
  let resizePendingPoint: { clientX: number; clientY: number } | null = null;
  const cursorOwner = {};

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

  const gesture = createPointerGesture();

  const handleWindowMouseMove = (event: PointerEvent): void => {
    if (!gesture.owns(event)) return;
    if (!resizing()) return;
    resizePendingPoint = { clientX: event.clientX, clientY: event.clientY };
    if (resizeFrameHandle === null) {
      resizeFrameHandle = scheduleAnimationFrame(processResizeFrame);
    }
  };

  const processResizeFrame = (): void => {
    resizeFrameHandle = null;
    const point = resizePendingPoint;
    resizePendingPoint = null;
    if (!point) return;
    setResizing((current): TableCornerResizeState | null =>
      current
        ? {
            ...current,
            currentClientX: point.clientX,
            currentClientY: point.clientY,
          }
        : null,
    );
  };

  const stop = (): void => {
    resizePendingPoint = null;
    if (resizeFrameHandle !== null) {
      cancelScheduledAnimationFrame(resizeFrameHandle);
      resizeFrameHandle = null;
    }
    setResizing(null);
    gesture.release();
    window.removeEventListener("pointermove", handleWindowMouseMove);
    window.removeEventListener("pointerup", handleWindowMouseUp);
    window.removeEventListener("pointercancel", handleWindowMouseUp);
    if (tableCornerResizeCursorOwner === cursorOwner) {
      tableCornerResizeCursorOwner = null;
      if (document.body.style.cursor === "nwse-resize") {
        document.body.style.cursor = "";
      }
    }
  };

  const handleWindowMouseUp = (event: PointerEvent): void => {
    if (!gesture.owns(event)) return;
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

  const handlePointerDown = (tableId: string, event: PointerEvent): void => {
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

    tableCornerResizeCursorOwner = cursorOwner;
    document.body.style.cursor = "nwse-resize";
    gesture.claim(event);
    window.addEventListener("pointermove", handleWindowMouseMove);
    window.addEventListener("pointerup", handleWindowMouseUp);
    window.addEventListener("pointercancel", handleWindowMouseUp);
    event.preventDefault();
    event.stopPropagation();
  };

  return { resizing, previewRect, handlePointerDown, stop };
}
