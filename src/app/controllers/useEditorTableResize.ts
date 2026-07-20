import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import type { EditorLayoutDocument, EditorState } from "@/core/model.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import type { CanvasLayoutSnapshotProvider } from "@/ui/canvas/canvasLayoutSnapshotProvider.js";
import type {
  TableResizeOps,
  TableResizeState,
} from "./tableResize/tableResizeTypes.js";
import { findTableResizeHoverInfo } from "./tableResize/tableResizeHitTest.js";
import {
  resolveRowHeightsPx,
  resolveColumnWidthsPt,
  resolveMinRowHeightPx,
  resolveMinColumnWidthsPx,
} from "./tableResize/tableResizeConstraints.js";
import {
  applyRowResize,
  applyColumnResize,
} from "./tableResize/tableResizeApply.js";
import { parseSizeToPt } from "./tableResize/tableResizeUnits.js";
import {
  getGuideBounds,
  clearResizeCursorClasses,
  setHoverCursorClass,
  setActiveCursorClass,
} from "./tableResize/tableResizeDom.js";
import {
  cancelScheduledAnimationFrame,
  scheduleAnimationFrame,
} from "./animationFrame.js";

export { type TableResizeOps } from "./tableResize/tableResizeTypes.js";

const DRAG_THRESHOLD_PX = 2;

export function createEditorTableResize(deps: {
  state: () => EditorState;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
  ) => void;
  surfaceRef: () => HTMLElement | undefined;
  viewportRef: () => HTMLElement | undefined;
  documentLayout: Accessor<EditorLayoutDocument>;
  canvasSnapshotProvider: CanvasLayoutSnapshotProvider;
  /** Visual zoom factor `z`; resize pointer deltas are divided by it. */
  zoomFactor?: () => number;
}): TableResizeOps {
  const [resizing, setResizing] = createSignal<TableResizeState | null>(null);
  let hoverFrameHandle: number | null = null;
  let hoverPendingPoint: { clientX: number; clientY: number } | null = null;
  let resizeFrameHandle: number | null = null;
  let resizePendingPoint: { clientX: number; clientY: number } | null = null;
  const cursorOwner = {};

  const processHoverFrame = (): void => {
    hoverFrameHandle = null;
    const point = hoverPendingPoint;
    hoverPendingPoint = null;
    if (!point || resizing()) return;

    const surface = deps.surfaceRef();
    if (!surface) {
      clearResizeCursorClasses();
      return;
    }

    const info = findTableResizeHoverInfo(
      point,
      surface,
      deps.state(),
      deps.documentLayout(),
      deps.canvasSnapshotProvider,
      deps.zoomFactor?.(),
    );
    if (!info) {
      clearResizeCursorClasses();
      return;
    }

    setHoverCursorClass(
      info.side === "left" || info.side === "right",
      cursorOwner,
    );
  };

  const handleMouseMove = (event: MouseEvent): void => {
    if (resizing()) return;
    hoverPendingPoint = { clientX: event.clientX, clientY: event.clientY };
    if (hoverFrameHandle === null) {
      hoverFrameHandle = scheduleAnimationFrame(processHoverFrame);
    }
  };

  const handleMouseDown = (event: MouseEvent): boolean => {
    hoverPendingPoint = null;
    if (hoverFrameHandle !== null) {
      cancelScheduledAnimationFrame(hoverFrameHandle);
      hoverFrameHandle = null;
    }
    clearResizeCursorClasses();

    const surface = deps.surfaceRef();
    if (!surface) return false;

    const info = findTableResizeHoverInfo(
      event,
      surface,
      deps.state(),
      deps.documentLayout(),
      deps.canvasSnapshotProvider,
      deps.zoomFactor?.(),
    );
    if (!info) return false;

    const state = deps.state();
    const tableLayout = buildTableCellLayout(info.tableNode);
    const isCol = info.side === "left" || info.side === "right";

    if (isCol) {
      const isLeftTableEdge =
        info.side === "left" && info.layoutEntry.visualColumnIndex === 0;
      const visualColumnIndex = isLeftTableEdge
        ? 0
        : info.side === "left"
          ? info.layoutEntry.visualColumnIndex - 1
          : info.layoutEntry.visualColumnIndex + info.layoutEntry.colSpan - 1;

      if (visualColumnIndex < 0) return false;

      const initialPos =
        info.side === "left" ? info.rect.left : info.rect.right;
      const { widthsPt, maxColumnIndex } = resolveColumnWidthsPt(
        info.tableNode,
        tableLayout,
        info.tableGeometry,
      );
      const minColumnWidthsPx = resolveMinColumnWidthsPx(
        state,
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
        minColumnWidthsPx,
        resizeFromLeftEdge: isLeftTableEdge,
        initialTableIndentLeftPt:
          parseSizeToPt(info.tableNode.style?.indentLeft) ?? 0,
        guideBounds: getGuideBounds(deps.viewportRef),
      });

      setActiveCursorClass(true, cursorOwner);
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
      event.preventDefault();
      event.stopPropagation();
      return true;
    }

    const rowHeightsPx = resolveRowHeightsPx(
      info.tableNode,
      tableLayout,
      info.tableGeometry,
    );
    const targetRowIndex =
      info.side === "top"
        ? info.layoutEntry.visualRowIndex - 1
        : info.layoutEntry.visualRowIndex + info.layoutEntry.rowSpan - 1;

    if (targetRowIndex < 0 || targetRowIndex >= rowHeightsPx.length) {
      return false;
    }

    const initialPos = info.side === "top" ? info.rect.top : info.rect.bottom;
    const minRowHeightPx = resolveMinRowHeightPx(
      info.tableNode,
      tableLayout,
      info.tableGeometry,
      targetRowIndex,
    );

    setResizing({
      type: "row",
      tableId: info.tableId,
      index: targetRowIndex,
      initialPos,
      currentPos: initialPos,
      initialRowHeightPx: rowHeightsPx[targetRowIndex],
      minRowHeightPx,
      guideBounds: getGuideBounds(deps.viewportRef),
    });

    setActiveCursorClass(false, cursorOwner);
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    event.preventDefault();
    event.stopPropagation();
    return true;
  };

  const handleWindowMouseMove = (event: MouseEvent): void => {
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
    const currentResizing = resizing();
    if (!point || !currentResizing) return;
    setResizing({
      ...currentResizing,
      currentPos:
        currentResizing.type === "column" ? point.clientX : point.clientY,
      guideBounds: getGuideBounds(deps.viewportRef),
    });
  };

  const stop = (): void => {
    hoverPendingPoint = null;
    resizePendingPoint = null;
    if (hoverFrameHandle !== null) {
      cancelScheduledAnimationFrame(hoverFrameHandle);
      hoverFrameHandle = null;
    }
    if (resizeFrameHandle !== null) {
      cancelScheduledAnimationFrame(resizeFrameHandle);
      resizeFrameHandle = null;
    }
    setResizing(null);
    clearResizeCursorClasses(cursorOwner);
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  };

  const handleWindowMouseUp = (event: MouseEvent): void => {
    const currentResizing = resizing();
    if (!currentResizing) return;

    const z = deps.zoomFactor?.() ?? 1;
    const delta =
      ((currentResizing.type === "column" ? event.clientX : event.clientY) -
        currentResizing.initialPos) /
      z;

    if (Math.abs(delta) >= DRAG_THRESHOLD_PX) {
      deps.applyTransactionalState((current): EditorState => {
        if (currentResizing.type === "row") {
          return applyRowResize(current, currentResizing, delta);
        }
        return applyColumnResize(current, currentResizing, delta);
      });
    }

    stop();
  };

  return {
    resizing,
    handleMouseMove,
    handleMouseDown,
    stop,
  };
}
