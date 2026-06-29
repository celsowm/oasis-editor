import { MERGE_KEYS, type MergeKey } from "@/core/transactionMergeKeys.js";
import { createSignal } from "solid-js";
import {
  getDocumentParagraphs,
  getParagraphs,
  paragraphOffsetToPosition,
  resolveImageSrc,
  type EditorPosition,
  type EditorParagraphNode,
  type EditorState,
} from "@/core/model.js";
import type { RunOfKind } from "@/core/model/runKind.js";
import { normalizeSelection } from "@/core/selection.js";
import {
  moveSelectedImageToPosition,
  resizeSelectedImage,
  rotateSelectedImage,
} from "@/core/commands/image.js";
import { setSelection } from "@/core/commands/selection.js";
import { getMaxInlineImageWidth } from "@/ui/imageGeometry.js";
import type { ResizeHandleDirection } from "@/ui/resizeGeometry.js";
import type { EditorLogger } from "@/utils/logger.js";
import type { EditorHistoryState } from "@/ui/editorHistory.js";
import { createResizeSession } from "./createResizeSession.js";
import { createRotateSession } from "./createRotateSession.js";

export interface ActiveImageDrag {
  paragraphId: string;
  paragraphOffset: number;
  src: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface ImagePointerBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PendingImagePointer {
  paragraphId: string;
  paragraphOffset: number;
  startClientX: number;
  startClientY: number;
  src: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface EditorImageOperationsDeps {
  state: EditorState;
  surfaceRef: () => HTMLDivElement | undefined;
  resolvePositionAtSurfacePoint: (
    clientX: number,
    clientY: number,
  ) => EditorPosition | null;
  applyState: (next: EditorState) => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: MergeKey },
  ) => void;
  updateHistoryState: (
    updater: (current: EditorHistoryState) => EditorHistoryState,
  ) => void;
  focusInput: () => void;
  focusInputAfterPointerSelection: () => void;
  cloneState: (source: EditorState) => EditorState;
  logger: EditorLogger;
  /** Visual zoom factor `z`; resize pointer deltas are divided by it. */
  zoomFactor?: () => number;
}

export function createEditorImageOperations(
  deps: EditorImageOperationsDeps,
): ReturnType<typeof createEditorImageOperationsImpl> {
  return createEditorImageOperationsImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEditorImageOperationsImpl(deps: EditorImageOperationsDeps) {
  const [dragging, setDragging] = createSignal(false);
  const [draggedImageInfo, setDraggedImageInfo] =
    createSignal<ActiveImageDrag | null>(null);
  const [mousePos, setMousePos] = createSignal({ x: 0, y: 0 });
  const [dropTargetPos, setDropTargetPos] = createSignal<EditorPosition | null>(
    null,
  );

  let activeImageDrag: ActiveImageDrag | null = null;
  let pendingImagePointer: PendingImagePointer | null = null;
  let imageDragCursorStyle: HTMLStyleElement | null = null;

  const getSelectedImageInfo = (
    current: EditorState,
  ): {
    paragraph: EditorParagraphNode;
    run: RunOfKind<"image">;
    startOffset: number;
    width: number;
    height: number;
    src: string;
  } | null => {
    const normalized = normalizeSelection(current);
    if (
      normalized.isCollapsed ||
      normalized.startIndex !== normalized.endIndex ||
      normalized.endParagraphOffset - normalized.startParagraphOffset !== 1
    ) {
      return null;
    }

    const paragraph = getParagraphs(current)[normalized.startIndex];
    if (!paragraph) {
      return null;
    }

    let offset = 0;
    for (const run of paragraph.runs) {
      const startOffset = offset;
      offset += run.text.length;
      if (
        run.kind === "image" &&
        run.text.length === 1 &&
        startOffset === normalized.startParagraphOffset
      ) {
        return {
          paragraph,
          run,
          startOffset,
          width: run.image.width,
          height: run.image.height,
          // Resolve any "asset:<id>" reference to the actual URL so the
          // drag-ghost <img> rendered into the DOM works directly.
          src: resolveImageSrc(current.document, run.image.src),
        };
      }
    }

    return null;
  };

  const resolvePositionAtSurfacePoint = (
    clientX: number,
    clientY: number,
  ): EditorPosition | null => {
    return deps.resolvePositionAtSurfacePoint(clientX, clientY);
  };

  const showImageDragCursor = (): void => {
    if (imageDragCursorStyle) return;
    imageDragCursorStyle = document.createElement("style");
    imageDragCursorStyle.setAttribute("data-oasis-image-drag-cursor", "");
    imageDragCursorStyle.textContent =
      "*, *::before, *::after { cursor: grabbing !important; }";
    document.head.appendChild(imageDragCursorStyle);
  };

  const hideImageDragCursor = (): void => {
    if (imageDragCursorStyle) {
      imageDragCursorStyle.remove();
      imageDragCursorStyle = null;
    }
    document.body.style.cursor = "";
  };

  const clearImagePointerTracking = (): void => {
    hideImageDragCursor();
    pendingImagePointer = null;
    activeImageDrag = null;
    setDragging(false);
    setDraggedImageInfo(null);
    setDropTargetPos(null);
    window.removeEventListener("mousemove", handleImageDragMouseMove);
    window.removeEventListener("mouseup", handleImageDragMouseUp);
  };

  const stopImageDrag = (): void => {
    clearImagePointerTracking();
  };

  const imageResizeSession = createResizeSession(
    {
      label: "image",
      getSelected: (current) => getSelectedImageInfo(current),
      applyResize: (current, width, height): EditorState =>
        resizeSelectedImage(current, width, height),
      getMaxWidth: (current, paragraphId): number =>
        getMaxInlineImageWidth(
          deps.surfaceRef(),
          current.document,
          paragraphId,
          current.activeSectionIndex ?? 0,
        ),
    },
    {
      state: deps.state,
      applyState: deps.applyState,
      updateHistoryState: deps.updateHistoryState,
      cloneState: deps.cloneState,
      focusInput: deps.focusInput,
      logger: deps.logger,
      zoomFactor: deps.zoomFactor,
    },
  );

  const imageRotateSession = createRotateSession(
    {
      label: "image",
      applyRotate: (current, rotation): EditorState =>
        rotateSelectedImage(current, rotation),
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

  const handleImageDragMouseMove = (event: MouseEvent): void => {
    let dragState = activeImageDrag;
    if (!dragState) {
      const pendingState = pendingImagePointer;
      if (!pendingState) {
        return;
      }

      const deltaX = Math.abs(event.clientX - pendingState.startClientX);
      const deltaY = Math.abs(event.clientY - pendingState.startClientY);
      if (deltaX + deltaY < 4) {
        return;
      }

      dragState = {
        paragraphId: pendingState.paragraphId,
        paragraphOffset: pendingState.paragraphOffset,
        src: pendingState.src,
        width: pendingState.width,
        height: pendingState.height,
        offsetX: pendingState.offsetX,
        offsetY: pendingState.offsetY,
      };
      activeImageDrag = dragState;
      pendingImagePointer = null;
      setDragging(true);
      showImageDragCursor();
      deps.logger.info(
        `image drag:start ${dragState.paragraphId}@${dragState.paragraphOffset} client=(${event.clientX},${event.clientY})`,
      );
    }

    setMousePos({ x: event.clientX, y: event.clientY });
    setDraggedImageInfo({ ...dragState });
    setDropTargetPos(
      resolvePositionAtSurfacePoint(event.clientX, event.clientY),
    );
  };

  const handleImageDragMouseUp = (event: MouseEvent): void => {
    const pendingState = pendingImagePointer;
    const dragState = activeImageDrag;
    if (!dragState && !pendingState) {
      deps.focusInput();
      return;
    }

    if (dragState) {
      const position = resolvePositionAtSurfacePoint(
        event.clientX,
        event.clientY,
      );
      if (position) {
        deps.logger.info(
          `image drag:done ${dragState.paragraphId} -> ${position.paragraphId}:${position.runId}[${position.offset}]`,
        );
        deps.applyTransactionalState(
          (current): EditorState =>
            moveSelectedImageToPosition(current, position),
          { mergeKey: MERGE_KEYS.moveImage },
        );
      } else {
        deps.logger.warn(
          `image drag:cancel ${dragState.paragraphId} no target at (${event.clientX},${event.clientY})`,
        );
      }
    }

    clearImagePointerTracking();
    deps.focusInput();
  };

  const startImageDrag = (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent,
    pointerBounds?: ImagePointerBounds,
  ): void => {
    const currentTarget = event.currentTarget as HTMLElement | null;
    const rect = pointerBounds
      ? {
          left: pointerBounds.left,
          top: pointerBounds.top,
          width: pointerBounds.width,
          height: pointerBounds.height,
        }
      : currentTarget?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const selectedImage = getSelectedImageInfo(deps.state);

    pendingImagePointer = {
      paragraphId,
      paragraphOffset,
      startClientX: event.clientX,
      startClientY: event.clientY,
      src: selectedImage?.src ?? "",
      width: selectedImage?.width ?? rect.width,
      height: selectedImage?.height ?? rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    activeImageDrag = null;
    setMousePos({ x: event.clientX, y: event.clientY });
    setDragging(false);
    setDraggedImageInfo(null);
    setDropTargetPos(null);
    window.addEventListener("mousemove", handleImageDragMouseMove);
    window.addEventListener("mouseup", handleImageDragMouseUp);
  };

  const handleImageMouseDown = (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent & { currentTarget: HTMLElement },
  ): void => {
    event.preventDefault();
    event.stopPropagation();

    const paragraph = getDocumentParagraphs(deps.state.document).find(
      (p): boolean => p.id === paragraphId,
    );
    if (paragraph) {
      deps.applyState(
        setSelection(deps.state, {
          anchor: paragraphOffsetToPosition(paragraph, paragraphOffset),
          focus: paragraphOffsetToPosition(paragraph, paragraphOffset + 1),
        }),
      );
    }

    startImageDrag(paragraphId, paragraphOffset, event);
    deps.focusInputAfterPointerSelection();
  };

  const handleImageResizeHandleMouseDown = (
    paragraphId: string,
    paragraphOffset: number,
    direction: ResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    imageResizeSession.start(
      paragraphId,
      paragraphOffset,
      direction,
      event,
      deps.state,
    );
  };

  const handleImageRotateHandleMouseDown = (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent & { currentTarget: HTMLElement },
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    imageRotateSession.start(paragraphId, paragraphOffset, event, deps.state);
  };

  return {
    dragging,
    draggedImageInfo,
    mousePos,
    dropTargetPos,
    getSelectedImageInfo,
    startImageDrag,
    stopImageDrag,
    stopImageResize: imageResizeSession.stop,
    stopImageRotate: imageRotateSession.stop,
    handleImageMouseDown,
    handleImageResizeHandleMouseDown,
    handleImageRotateHandleMouseDown,
  };
}
