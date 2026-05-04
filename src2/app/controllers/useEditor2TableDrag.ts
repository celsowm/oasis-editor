import { createSignal } from "solid-js";
import type { Editor2State } from "../../core/model.js";
import { moveBlockToPosition } from "../../core/editorCommands.js";
import type { Editor2Position } from "../../core/model.js";

export interface TableDragOps {
  dragging: () => boolean;
  startClientY: () => number;
  handleMouseDown: (tableId: string, event: MouseEvent) => void;
  dropTargetPos: () => Editor2Position | null;
}

export function createEditor2TableDrag(deps: {
  state: () => Editor2State;
  applyTransactionalState: (producer: (current: Editor2State) => Editor2State) => void;
  resolvePositionAtSurfacePoint: (clientX: number, clientY: number) => Editor2Position | null;
  focusInput: () => void;
}) {
  const [resizing, setResizing] = createSignal<{
    tableId: string;
    width: number;
    height: number;
    offsetX: number; // mouse offset relative to handle top-left
    offsetY: number;
  } | null>(null);

  const [dragging, setDragging] = createSignal(false);
  const [draggedTableInfo, setDraggedTableInfo] = createSignal<{
    tableId: string;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [dropTargetPos, setDropTargetPos] = createSignal<Editor2Position | null>(null);
  const [startClientY, setStartClientY] = createSignal(0);
  const [mousePos, setMousePos] = createSignal({ x: 0, y: 0 });
  
  const stopDrag = () => {
    setDragging(false);
    setDraggedTableInfo(null);
    setDropTargetPos(null);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "";
  };

  const handleMouseMove = (event: MouseEvent) => {
    setMousePos({ x: event.clientX, y: event.clientY });
    if (!dragging()) {
        const delta = Math.abs(event.clientY - startClientY());
        if (delta > 4) {
            console.log("[TableDrag] Starting drag for table:", draggedTableInfo()?.tableId);
            setDragging(true);
            document.body.style.cursor = "grabbing";
        } else {
            return;
        }
    }
    
    document.body.style.cursor = "grabbing";
    const pos = deps.resolvePositionAtSurfacePoint(event.clientX, event.clientY);
    
    // Check if target is inside the dragged table
    const tableId = draggedTableInfo()?.tableId;
    if (pos && tableId) {
        const tableBlock = document.querySelector(`[data-source-block-id="${tableId}"]`);
        const targetElement = document.querySelector(`[data-paragraph-id="${pos.paragraphId}"]`);
        if (tableBlock && targetElement && tableBlock.contains(targetElement)) {
            setDropTargetPos(null);
            return;
        }
    }

    setDropTargetPos(pos);
  };

  const handleMouseUp = (event: MouseEvent) => {
    const info = draggedTableInfo();
    console.log("[TableDrag] MouseUp. Dragging:", dragging(), "Table:", info?.tableId, "Target:", dropTargetPos());
    if (dragging()) {
        const pos = deps.resolvePositionAtSurfacePoint(event.clientX, event.clientY);
        const tableId = info?.tableId;
        
        if (pos && tableId) {
            console.log("[TableDrag] Moving table", tableId, "to", pos);
            deps.applyTransactionalState((current) => {
                return moveBlockToPosition(current, tableId, pos);
            });
        }
    }
    stopDrag();
    deps.focusInput();
  };

  const handleMouseDown = (tableId: string, event: MouseEvent) => {
    console.log("[TableDrag] MouseDown on handle for table:", tableId);
    event.preventDefault();
    event.stopPropagation();

    const handle = event.currentTarget as HTMLElement;
    const handleRect = handle.getBoundingClientRect();
    const tableBlock = handle.closest(".oasis-editor-2-table-block") as HTMLElement;
    const tableRect = tableBlock.getBoundingClientRect();
    
    setDraggedTableInfo({
      tableId,
      width: tableRect.width,
      height: tableRect.height,
      offsetX: event.clientX - handleRect.left,
      offsetY: event.clientY - handleRect.top,
    });
    
    setStartClientY(event.clientY);
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
  };
}