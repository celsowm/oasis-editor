import { createSignal } from "solid-js";
import type { EditorState } from "../../core/model.js";
import { moveBlockToPosition } from "../../core/editorCommands.js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getEditableBlocksForZone,
  type EditorPosition,
} from "../../core/model.js";

export interface TableDragOps {
  dragging: () => boolean;
  startClientY: () => number;
  handleMouseDown: (tableId: string, event: MouseEvent) => void;
  dropTargetPos: () => EditorPosition | null;
}

export function createEditorTableDrag(deps: {
  state: () => EditorState;
  applyTransactionalState: (producer: (current: EditorState) => EditorState) => void;
  resolvePositionAtSurfacePoint: (clientX: number, clientY: number) => EditorPosition | null;
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
  const [dropTargetPos, setDropTargetPos] = createSignal<EditorPosition | null>(null);
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
        const state = deps.state();
        const location = findParagraphTableLocation(
            state.document,
            pos.paragraphId,
            getActiveSectionIndex(state),
        );
        if (location) {
            const blocks = getEditableBlocksForZone(state, location.zone);
            const tableBlock = blocks[location.blockIndex];
            if (tableBlock && tableBlock.type === "table" && tableBlock.id === tableId) {
                setDropTargetPos(null);
                return;
            }
        }
    }

    setDropTargetPos(pos);
  };

  const handleMouseUp = (event: MouseEvent) => {
    const info = draggedTableInfo();
    if (dragging()) {
        const pos = deps.resolvePositionAtSurfacePoint(event.clientX, event.clientY);
        const tableId = info?.tableId;
        
        if (pos && tableId) {
            deps.applyTransactionalState((current) => {
                return moveBlockToPosition(current, tableId, pos);
            });
        }
    }
    stopDrag();
    deps.focusInput();
  };

  const handleMouseDown = (tableId: string, event: MouseEvent) => {
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
