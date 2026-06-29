import {
  getParagraphs,
  paragraphOffsetToPosition,
  type EditorState,
} from "@/core/model.js";
import {
  resolveResizedDimensions,
  type ResizeHandleDirection,
} from "@/ui/resizeGeometry.js";
import type { EditorHistoryState } from "@/ui/editorHistory.js";
import type { EditorLogger } from "@/utils/logger.js";

export interface ResizeSessionSelection {
  width: number;
  height: number;
}

/**
 * Object-type-specific behaviour for a resize session. Images and text boxes
 * differ only in how the selected object's size is read and how a new size is
 * committed; the pointer/lifecycle machinery is shared.
 */
export interface ResizeSessionAdapter {
  /** Read the selected object's current size, or `null` to abort the session. */
  getSelected: (state: EditorState) => ResizeSessionSelection | null;
  /** Commit a new size for the dragged handle, returning the next state. */
  applyResize: (
    state: EditorState,
    width: number,
    height: number,
    direction: ResizeHandleDirection,
  ) => EditorState;
  /** Maximum width (px) the object may grow to in its paragraph context. */
  getMaxWidth: (state: EditorState, paragraphId: string) => number;
  /** Short label used in diagnostic logs (e.g. "image", "text box"). */
  label: string;
}

export interface ResizeSessionDeps {
  state: EditorState;
  applyState: (next: EditorState) => void;
  updateHistoryState: (
    updater: (current: EditorHistoryState) => EditorHistoryState,
  ) => void;
  cloneState: (source: EditorState) => EditorState;
  focusInput: () => void;
  logger: EditorLogger;
  /** Visual zoom factor `z`; pointer deltas (screen px) are divided by it. */
  zoomFactor?: () => number;
}

interface ActiveResize {
  paragraphId: string;
  paragraphOffset: number;
  handleDirection: ResizeHandleDirection;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
  aspectRatio: number;
  initialState: EditorState;
}

/**
 * Drives a handle-based resize: it tracks the pointer, resolves the next size
 * via {@link resolveResizedDimensions}, re-applies the resize from the captured
 * dimensions each move (so EMU rounding never accumulates), and snapshots the
 * pre-resize state onto the undo stack on release. The object-specific bits are
 * supplied by {@link ResizeSessionAdapter}.
 */
export function createResizeSession(
  adapter: ResizeSessionAdapter,
  deps: ResizeSessionDeps,
) {
  let active: ActiveResize | null = null;

  const selectionForObject = (
    state: EditorState,
    paragraphId: string,
    paragraphOffset: number,
  ): EditorState["selection"] | null => {
    const paragraph = getParagraphs(state).find((p): boolean => p.id === paragraphId);
    if (!paragraph) {
      return null;
    }
    return {
      anchor: paragraphOffsetToPosition(paragraph, paragraphOffset),
      focus: paragraphOffsetToPosition(paragraph, paragraphOffset + 1),
    };
  };

  const withSelection = (
    state: EditorState,
    selection: EditorState["selection"],
  ): EditorState => ({
    ...state,
    selection: {
      anchor: { ...selection.anchor },
      focus: { ...selection.focus },
    },
  });

  const handleMouseMove = (event: MouseEvent): void => {
    const resize = active;
    if (!resize) {
      return;
    }

    const z = deps.zoomFactor?.() ?? 1;
    const deltaX = (event.clientX - resize.startClientX) / z;
    const deltaY = (event.clientY - resize.startClientY) / z;
    const maxWidth = adapter.getMaxWidth(deps.state, resize.paragraphId);
    const { width, height } = resolveResizedDimensions(
      resize,
      deltaX,
      deltaY,
      event.shiftKey,
      maxWidth,
    );

    const selection = selectionForObject(
      deps.state,
      resize.paragraphId,
      resize.paragraphOffset,
    );
    if (!selection) {
      deps.logger.warn(`${adapter.label} resize:missing paragraph`, resize);
      return;
    }

    deps.applyState(
      adapter.applyResize(
        withSelection(deps.state, selection),
        width,
        height,
        resize.handleDirection,
      ),
    );
  };

  const handleMouseUp = (): void => {
    const resize = active;
    if (resize) {
      deps.updateHistoryState((current) => ({
        ...current,
        undoStack: [...current.undoStack, deps.cloneState(resize.initialState)],
        redoStack: [],
      }));
    }

    stop();
    deps.focusInput();
  };

  const stop = (): void => {
    active = null;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  const start = (
    paragraphId: string,
    paragraphOffset: number,
    handleDirection: ResizeHandleDirection,
    event: MouseEvent,
    initialState: EditorState,
  ): void => {
    const selection = selectionForObject(
      initialState,
      paragraphId,
      paragraphOffset,
    );
    if (!selection) {
      return;
    }
    const selected = adapter.getSelected(
      withSelection(initialState, selection),
    );
    if (!selected) {
      return;
    }

    active = {
      paragraphId,
      paragraphOffset,
      handleDirection,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: selected.width,
      startHeight: selected.height,
      aspectRatio: selected.width / selected.height,
      initialState: deps.cloneState(initialState),
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return { start, stop };
}
