import { createSignal } from "solid-js";
import type { EditorState } from "@/core/model.js";
import { moveBlockToPosition } from "@/core/commands/block.js";
import { setActiveTableStyleValue } from "@/core/commands/table.js";
import { PT_PER_PX } from "@/core/units.js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getEditableBlocksForZone,
  type EditorPosition,
} from "@/core/model.js";
import {
  cancelScheduledAnimationFrame,
  scheduleAnimationFrame,
} from "./animationFrame.js";

let tableDragCursorOwner: object | null = null;

export interface TableDragOps {
  dragging: () => boolean;
  startClientY: () => number;
  handleMouseDown: (tableId: string, event: MouseEvent) => void;
  dropTargetPos: () => EditorPosition | null;
  stop: () => void;
}

export function createEditorTableDrag(deps: {
  state: () => EditorState;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
  ) => void;
  resolvePositionAtSurfacePoint: (
    clientX: number,
    clientY: number,
  ) => EditorPosition | null;
  focusInput: () => void;
}): ReturnType<typeof createEditorTableDragImpl> {
  return createEditorTableDragImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEditorTableDragImpl(deps: {
  state: () => EditorState;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
  ) => void;
  resolvePositionAtSurfacePoint: (
    clientX: number,
    clientY: number,
  ) => EditorPosition | null;
  focusInput: () => void;
}) {
  const [dragging, setDragging] = createSignal(false);
  const [draggedTableInfo, setDraggedTableInfo] = createSignal<{
    tableId: string;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [dropTargetPos, setDropTargetPos] = createSignal<EditorPosition | null>(
    null,
  );
  const [startClientY, setStartClientY] = createSignal(0);
  const [startClientX, setStartClientX] = createSignal(0);
  const [mousePos, setMousePos] = createSignal({ x: 0, y: 0 });
  let dragFrameHandle: number | null = null;
  let dragPendingPoint: { clientX: number; clientY: number } | null = null;
  const cursorOwner = {};

  const positionsEqual = (
    left: EditorPosition | null,
    right: EditorPosition | null,
  ): boolean =>
    left === right ||
    (left !== null &&
      right !== null &&
      left.paragraphId === right.paragraphId &&
      left.runId === right.runId &&
      left.offset === right.offset);

  const updateDropTarget = (next: EditorPosition | null): void => {
    setDropTargetPos((current): EditorPosition | null =>
      positionsEqual(current, next) ? current : next,
    );
  };

  const stopDrag = (): void => {
    dragPendingPoint = null;
    if (dragFrameHandle !== null) {
      cancelScheduledAnimationFrame(dragFrameHandle);
      dragFrameHandle = null;
    }
    setDragging(false);
    setDraggedTableInfo(null);
    setDropTargetPos(null);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    if (tableDragCursorOwner === cursorOwner) {
      tableDragCursorOwner = null;
      if (document.body.style.cursor === "grabbing") {
        document.body.style.cursor = "";
      }
    }
  };

  const processDragFrame = (): void => {
    dragFrameHandle = null;
    const point = dragPendingPoint;
    dragPendingPoint = null;
    if (!point || !dragging()) return;
    setMousePos({ x: point.clientX, y: point.clientY });
    const pos = deps.resolvePositionAtSurfacePoint(
      point.clientX,
      point.clientY,
    );

    // Check if target is inside the dragged table
    const tableId = draggedTableInfo()?.tableId;
    if (pos && tableId) {
      const state = deps.state();
      const location = findParagraphTableLocation(
        state.document,
        pos.paragraphId,
        getActiveSectionIndex(state),
      );
      if (location) {
        const blocks = getEditableBlocksForZone(state, location.zone);
        const tableBlock = blocks[location.blockIndex];
        if (
          tableBlock &&
          tableBlock.type === "table" &&
          tableBlock.id === tableId
        ) {
          updateDropTarget(null);
          return;
        }
      }
    }

    updateDropTarget(pos);
  };

  const handleMouseMove = (event: MouseEvent): void => {
    if (!dragging()) {
      const delta = Math.abs(event.clientY - startClientY());
      if (delta <= 4) return;
      setDragging(true);
      tableDragCursorOwner = cursorOwner;
      document.body.style.cursor = "grabbing";
    }

    dragPendingPoint = { clientX: event.clientX, clientY: event.clientY };
    if (dragFrameHandle === null) {
      dragFrameHandle = scheduleAnimationFrame(processDragFrame);
    }
  };

  const handleMouseUp = (event: MouseEvent): void => {
    const info = draggedTableInfo();
    if (dragging()) {
      const pos = deps.resolvePositionAtSurfacePoint(
        event.clientX,
        event.clientY,
      );
      const tableId = info?.tableId;

      if (tableId) {
        deps.applyTransactionalState((current): EditorState => {
          const findTable = ():
            | ReturnType<typeof getEditableBlocksForZone>[number]
            | undefined => {
            for (const zone of ["main", "header", "footer"] as const) {
              const blocks = getEditableBlocksForZone(current, zone);
              const table = blocks.find(
                (block): boolean =>
                  block.type === "table" && block.id === tableId,
              );
              if (table) return table;
            }
            return undefined;
          };
          const table = findTable();
          if (table?.type === "table" && table.style?.floating) {
            const floating = table.style.floating;
            return setActiveTableStyleValue(current, tableId, "floating", {
              ...floating,
              x:
                (floating.x ?? 0) +
                (event.clientX - startClientX()) * PT_PER_PX,
              y:
                (floating.y ?? 0) +
                (event.clientY - startClientY()) * PT_PER_PX,
              xAlign: undefined,
              yAlign: undefined,
            });
          }
          return pos ? moveBlockToPosition(current, tableId, pos) : current;
        });
      }
    }
    stopDrag();
    deps.focusInput();
  };

  const handleMouseDown = (tableId: string, event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    const handle = event.currentTarget as HTMLElement;
    const handleRect = handle.getBoundingClientRect();
    const tableRect = handleRect;

    setDraggedTableInfo({
      tableId,
      width: tableRect.width,
      height: tableRect.height,
      offsetX: event.clientX - handleRect.left,
      offsetY: event.clientY - handleRect.top,
    });

    setStartClientY(event.clientY);
    setStartClientX(event.clientX);
    setMousePos({ x: event.clientX, y: event.clientY });
    setDragging(false);
    setDropTargetPos(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return {
    dragging,
    draggedTableInfo,
    mousePos,
    dropTargetPos,
    handleMouseDown,
    stop: stopDrag,
  };
}
