import { type EditorState } from "@/core/model.js";
import {
  getSelectedTextBoxRun,
  resizeSelectedTextBox,
  rotateSelectedTextBox,
} from "@/core/editorCommands.js";
import { getMaxInlineImageWidth } from "@/ui/imageGeometry.js";
import { resolveTextBoxRenderHeight } from "@/ui/canvas/textBoxRenderHeight.js";
import type { ResizeHandleDirection } from "@/ui/resizeGeometry.js";
import type { EditorLogger } from "@/utils/logger.js";
import type { EditorHistoryState } from "@/ui/editorHistory.js";
import { createResizeSession } from "./createResizeSession.js";
import { createRotateSession } from "./createRotateSession.js";

export interface EditorTextBoxOperationsDeps {
  state: EditorState;
  surfaceRef: () => HTMLDivElement | undefined;
  applyState: (next: EditorState) => void;
  updateHistoryState: (
    updater: (current: EditorHistoryState) => EditorHistoryState,
  ) => void;
  focusInput: () => void;
  cloneState: (source: EditorState) => EditorState;
  logger: EditorLogger;
}

export function createEditorTextBoxOperations(
  deps: EditorTextBoxOperationsDeps,
) {
  const getSelectedTextBoxSize = (
    current: EditorState,
  ): { width: number; height: number } | null => {
    const selected = getSelectedTextBoxRun(current);
    if (!selected?.run.textBox) {
      return null;
    }
    return {
      width: selected.run.textBox.width,
      // Start the drag from the height actually painted on screen. For an
      // auto-fit box that is its content height, not the stored height, so the
      // box doesn't jump on the first pointer move.
      height: resolveTextBoxRenderHeight(selected.run.textBox, current, 0),
    };
  };

  const resizeSession = createResizeSession(
    {
      label: "text box",
      getSelected: getSelectedTextBoxSize,
      applyResize: (current, width, height, direction) =>
        resizeSelectedTextBox(current, width, height, {
          handleDirection: direction,
        }),
      // Cap growth at the page/cell content width, but never below the box's
      // current width so an already-wide floating box isn't clamped smaller on
      // the first pointer move.
      getMaxWidth: (current, paragraphId) => {
        const contentMax = getMaxInlineImageWidth(
          deps.surfaceRef(),
          current.document,
          paragraphId,
          current.activeSectionIndex ?? 0,
        );
        const selected = getSelectedTextBoxSize(current);
        return selected ? Math.max(contentMax, selected.width) : contentMax;
      },
    },
    {
      state: deps.state,
      applyState: deps.applyState,
      updateHistoryState: deps.updateHistoryState,
      cloneState: deps.cloneState,
      focusInput: deps.focusInput,
      logger: deps.logger,
    },
  );

  const rotateSession = createRotateSession(
    {
      label: "text box",
      applyRotate: (current, rotation) =>
        rotateSelectedTextBox(current, rotation),
    },
    {
      state: deps.state,
      applyState: deps.applyState,
      updateHistoryState: deps.updateHistoryState,
      cloneState: deps.cloneState,
      focusInput: deps.focusInput,
      logger: deps.logger,
    },
  );

  const handleTextBoxResizeHandleMouseDown = (
    paragraphId: string,
    paragraphOffset: number,
    direction: ResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => {
    event.preventDefault();
    event.stopPropagation();
    resizeSession.start(
      paragraphId,
      paragraphOffset,
      direction,
      event,
      deps.state,
    );
  };

  const handleTextBoxRotateHandleMouseDown = (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => {
    event.preventDefault();
    event.stopPropagation();
    rotateSession.start(paragraphId, paragraphOffset, event, deps.state);
  };

  return {
    handleTextBoxResizeHandleMouseDown,
    handleTextBoxRotateHandleMouseDown,
    stopTextBoxResize: resizeSession.stop,
    stopTextBoxRotate: rotateSession.stop,
  };
}
