import {
  getParagraphs,
  paragraphOffsetToPosition,
  type EditorState,
} from "@/core/model.js";
import type { EditorHistoryState } from "@/ui/editorHistory.js";
import type { EditorLogger } from "@/utils/logger.js";

/** Snap increment (degrees) applied while the Shift key is held. */
const ROTATION_SNAP_DEGREES = 15;

/**
 * Object-type-specific behaviour for a rotate session. Images and text boxes
 * differ only in how a new rotation is committed; the pointer/center machinery
 * is shared.
 */
export interface RotateSessionAdapter {
  /** Commit a new rotation (degrees) for the selected object. */
  applyRotate: (state: EditorState, rotation: number) => EditorState;
  /** Short label used in diagnostic logs (e.g. "image", "text box"). */
  label: string;
}

export interface RotateSessionDeps {
  state: EditorState;
  applyState: (next: EditorState) => void;
  updateHistoryState: (
    updater: (current: EditorHistoryState) => EditorHistoryState,
  ) => void;
  cloneState: (source: EditorState) => EditorState;
  focusInput: () => void;
  logger: EditorLogger;
}

interface ActiveRotate {
  paragraphId: string;
  paragraphOffset: number;
  centerX: number;
  centerY: number;
  initialState: EditorState;
}

/**
 * Drives a knob-based rotation: it measures the pointer angle relative to the
 * object's center (captured from the selection overlay's bounding box on start),
 * normalizes it so the knob — which sits due north — maps to 0°, optionally
 * snaps to {@link ROTATION_SNAP_DEGREES} while Shift is held, and snapshots the
 * pre-rotation state onto the undo stack on release.
 */
export function createRotateSession(
  adapter: RotateSessionAdapter,
  deps: RotateSessionDeps,
) {
  let active: ActiveRotate | null = null;

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
    const rotate = active;
    if (!rotate) {
      return;
    }

    // The knob points north (−90° in atan2 terms), so add 90° to map it to 0°.
    const angle =
      (Math.atan2(
        event.clientY - rotate.centerY,
        event.clientX - rotate.centerX,
      ) *
        180) /
        Math.PI +
      90;
    let rotation = ((angle % 360) + 360) % 360;
    if (event.shiftKey) {
      rotation =
        (Math.round(rotation / ROTATION_SNAP_DEGREES) * ROTATION_SNAP_DEGREES) %
        360;
    }

    const selection = selectionForObject(
      deps.state,
      rotate.paragraphId,
      rotate.paragraphOffset,
    );
    if (!selection) {
      deps.logger.warn(`${adapter.label} rotate:missing paragraph`, rotate);
      return;
    }

    deps.applyState(
      adapter.applyRotate(withSelection(deps.state, selection), rotation),
    );
  };

  const handleMouseUp = (): void => {
    const rotate = active;
    if (rotate) {
      deps.updateHistoryState((current) => ({
        ...current,
        undoStack: [...current.undoStack, deps.cloneState(rotate.initialState)],
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
    event: MouseEvent & { currentTarget: HTMLElement },
    initialState: EditorState,
  ): void => {
    const overlay = event.currentTarget.closest(
      ".oasis-editor-selection-overlay",
    );
    if (!overlay) {
      return;
    }
    // The bounding box of a CSS-rotated element is its axis-aligned envelope,
    // whose center still coincides with the object's true center of rotation.
    const rect = overlay.getBoundingClientRect();

    active = {
      paragraphId,
      paragraphOffset,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      initialState: deps.cloneState(initialState),
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return { start, stop };
}
