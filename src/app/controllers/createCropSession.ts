import {
  getParagraphs,
  getRunImage,
  paragraphOffsetToPosition,
  type EditorState,
} from "@/core/model.js";
import {
  getSelectedImageRun,
  setSelectedImageCrop,
} from "@/core/commands/image.js";
import {
  resolveCroppedImage,
  resolveMovedImageCrop,
  type CropSessionGeometry,
} from "@/ui/cropGeometry.js";
import type { ResizeHandleDirection } from "@/ui/resizeGeometry.js";
import type { EditorImageCrop } from "@/core/model.js";
import {
  appendEditorHistoryEntry,
  type EditorHistoryState,
} from "@/ui/editorHistory.js";
import type { EditorLogger } from "@/utils/logger.js";

export interface CropSessionDeps {
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

interface ActiveCrop extends CropSessionGeometry {
  paragraphId: string;
  paragraphOffset: number;
  startClientX: number;
  startClientY: number;
  initialState: EditorState;
  mode: "handle" | "move";
}

/**
 * Drives a handle-based image crop, mirroring {@link createResizeSession}: it
 * tracks the pointer, resolves the next crop + displayed size via
 * {@link resolveCroppedImage} from the captured start geometry each move (so
 * rounding never accumulates), and snapshots the pre-crop state onto the undo
 * stack on release.
 */
export function createCropSession(deps: CropSessionDeps): {
  start: (
    paragraphId: string,
    paragraphOffset: number,
    handleDirection: ResizeHandleDirection,
    event: MouseEvent,
    initialState: EditorState,
  ) => void;
  startMove: (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent,
    initialState: EditorState,
  ) => void;
  stop: () => void;
} {
  let active: ActiveCrop | null = null;

  const selectionForObject = (
    state: EditorState,
    paragraphId: string,
    paragraphOffset: number,
  ): EditorState["selection"] | null => {
    const paragraph = getParagraphs(state).find(
      (p): boolean => p.id === paragraphId,
    );
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
    const crop = active;
    if (!crop) {
      return;
    }
    const z = deps.zoomFactor?.() ?? 1;
    const deltaX = (event.clientX - crop.startClientX) / z;
    const deltaY = (event.clientY - crop.startClientY) / z;
    const result =
      crop.mode === "move"
        ? resolveMovedImageCrop(crop, deltaX, deltaY)
        : resolveCroppedImage(crop, deltaX, deltaY);

    const selection = selectionForObject(
      deps.state,
      crop.paragraphId,
      crop.paragraphOffset,
    );
    if (!selection) {
      deps.logger.warn("image crop:missing paragraph", crop);
      return;
    }

    deps.applyState(
      setSelectedImageCrop(withSelection(deps.state, selection), {
        crop: result.crop,
        width: result.width,
        height: result.height,
      }),
    );
  };

  const handleMouseUp = (): void => {
    const crop = active;
    if (crop) {
      deps.updateHistoryState((current) => ({
        ...current,
        undoStack: appendEditorHistoryEntry(
          current.undoStack,
          deps.cloneState(crop.initialState),
        ),
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

  const begin = (
    paragraphId: string,
    paragraphOffset: number,
    handleDirection: ResizeHandleDirection,
    event: MouseEvent,
    initialState: EditorState,
    mode: "handle" | "move",
  ): void => {
    const selection = selectionForObject(
      initialState,
      paragraphId,
      paragraphOffset,
    );
    if (!selection) {
      return;
    }
    const selected = getSelectedImageRun(
      withSelection(initialState, selection),
    );
    const image = selected && getRunImage(selected.run);
    if (!image) {
      return;
    }
    const startCrop: EditorImageCrop = { ...(image.crop ?? {}) };
    active = {
      paragraphId,
      paragraphOffset,
      handleDirection,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: image.width,
      startHeight: image.height,
      startCrop,
      initialState: deps.cloneState(initialState),
      mode,
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const start = (
    paragraphId: string,
    paragraphOffset: number,
    handleDirection: ResizeHandleDirection,
    event: MouseEvent,
    initialState: EditorState,
  ): void =>
    begin(
      paragraphId,
      paragraphOffset,
      handleDirection,
      event,
      initialState,
      "handle",
    );

  const startMove = (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent,
    initialState: EditorState,
  ): void =>
    begin(paragraphId, paragraphOffset, "se", event, initialState, "move");

  return { start, startMove, stop };
}
