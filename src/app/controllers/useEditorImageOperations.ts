
import { createSignal } from "solid-js";
import { getParagraphs, paragraphOffsetToPosition, type EditorPosition, type EditorState } from "../../core/model.js";
import { normalizeSelection, isSelectionCollapsed } from "../../core/selection.js";
import { moveSelectedImageToPosition, setSelection, resizeSelectedImage } from "../../core/editorCommands.js";
import { getMaxInlineImageWidth } from "../../ui/domGeometry.js";
import { resolvePositionAtPoint } from "../../ui/positionAtPoint.js";
import type { ImageResizeHandleDirection } from "../../ui/editorUiTypes.js";
import type { EditorLogger } from "../../utils/logger.js";
import type { EditorHistoryState } from "../../ui/editorHistory.js";

export interface ActiveImageResize {
  paragraphId: string;
  paragraphOffset: number;
  handleDirection: ImageResizeHandleDirection;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
  aspectRatio: number;
  initialState: EditorState;
}

export interface ActiveImageDrag {
  paragraphId: string;
  paragraphOffset: number;
  startClientX: number;
  startClientY: number;
  dragging: boolean;
  src: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface EditorImageOperationsDeps {
  state: EditorState;
  surfaceRef: () => HTMLDivElement | undefined;
  applyState: (next: EditorState) => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: string },
  ) => void;
  updateHistoryState: (updater: (current: EditorHistoryState) => EditorHistoryState) => void;
  focusInput: () => void;
  cloneState: (source: EditorState) => EditorState;
  logger: EditorLogger;
}

export function createEditorImageOperations(deps: EditorImageOperationsDeps) {
  const [dragging, setDragging] = createSignal(false);
  const [draggedImageInfo, setDraggedImageInfo] = createSignal<ActiveImageDrag | null>(null);
  const [mousePos, setMousePos] = createSignal({ x: 0, y: 0 });
  const [dropTargetPos, setDropTargetPos] = createSignal<EditorPosition | null>(null);

  let activeImageDrag: ActiveImageDrag | null = null;
  let activeImageResize: ActiveImageResize | null = null;
  let imageDragCursorStyle: HTMLStyleElement | null = null;

  const clamp = (value: number, min: number, max?: number): number => {
    const lowerBound = Math.max(min, value);
    if (max === undefined) {
      return lowerBound;
    }
    return Math.min(max, lowerBound);
  };

  const axisSignForDirection = (
    direction: ImageResizeHandleDirection,
    axis: "x" | "y",
  ): -1 | 0 | 1 => {
    if (axis === "x") {
      if (direction.includes("e")) return 1;
      if (direction.includes("w")) return -1;
      return 0;
    }

    if (direction.includes("s")) return 1;
    if (direction.includes("n")) return -1;
    return 0;
  };

  const resolveResizedDimensions = (
    resizeState: ActiveImageResize,
    deltaX: number,
    deltaY: number,
    preserveAspectRatio: boolean,
    maxWidth: number,
  ) => {
    const widthSign = axisSignForDirection(resizeState.handleDirection, "x");
    const heightSign = axisSignForDirection(resizeState.handleDirection, "y");
    const rawWidth =
      widthSign === 0
        ? resizeState.startWidth
        : resizeState.startWidth + deltaX * widthSign;
    const rawHeight =
      heightSign === 0
        ? resizeState.startHeight
        : resizeState.startHeight + deltaY * heightSign;

    let nextWidth = clamp(rawWidth, 24, maxWidth);
    let nextHeight = clamp(rawHeight, 24);

    if (!preserveAspectRatio) {
      return { width: nextWidth, height: nextHeight };
    }

    const aspectRatio = resizeState.aspectRatio || 1;
    const hasHorizontalHandle = widthSign !== 0;
    const hasVerticalHandle = heightSign !== 0;

    if (hasHorizontalHandle && hasVerticalHandle) {
      const widthScale = nextWidth / resizeState.startWidth;
      const heightScale = nextHeight / resizeState.startHeight;
      const dominantScale =
        Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
          ? widthScale
          : heightScale;
      nextWidth = clamp(resizeState.startWidth * dominantScale, 24, maxWidth);
      nextHeight = clamp(nextWidth / aspectRatio, 24);
      return { width: nextWidth, height: nextHeight };
    }

    if (hasHorizontalHandle) {
      nextWidth = clamp(nextWidth, 24, maxWidth);
      nextHeight = clamp(nextWidth / aspectRatio, 24);
      return { width: nextWidth, height: nextHeight };
    }

    nextHeight = clamp(nextHeight, 24);
    nextWidth = clamp(nextHeight * aspectRatio, 24, maxWidth);
    nextHeight = clamp(nextWidth / aspectRatio, 24);
    return { width: nextWidth, height: nextHeight };
  };

  const getSelectedImageInfo = (current: EditorState) => {
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
        run.image &&
        run.text.length === 1 &&
        startOffset === normalized.startParagraphOffset
      ) {
        return {
          paragraph,
          run,
          startOffset,
          width: run.image.width,
          height: run.image.height,
          src: run.image.src,
        };
      }
    }

    return null;
  };

  const resolvePositionAtSurfacePoint = (clientX: number, clientY: number): EditorPosition | null => {
    const surface = deps.surfaceRef();
    return surface
      ? resolvePositionAtPoint({
          clientX,
          clientY,
          surface,
          state: deps.state,
          documentLike: document,
        })
      : null;
  };

  const showImageDragCursor = () => {
    if (imageDragCursorStyle) return;
    imageDragCursorStyle = document.createElement("style");
    imageDragCursorStyle.setAttribute("data-oasis-image-drag-cursor", "");
    imageDragCursorStyle.textContent = "*, *::before, *::after { cursor: grabbing !important; }";
    document.head.appendChild(imageDragCursorStyle);
  };

  const hideImageDragCursor = () => {
    if (imageDragCursorStyle) {
      imageDragCursorStyle.remove();
      imageDragCursorStyle = null;
    }
    document.body.style.cursor = "";
  };

  const stopImageDrag = () => {
    hideImageDragCursor();
    activeImageDrag = null;
    setDragging(false);
    setDraggedImageInfo(null);
    setDropTargetPos(null);
    window.removeEventListener("mousemove", handleImageDragMouseMove);
    window.removeEventListener("mouseup", handleImageDragMouseUp);
  };

  const stopImageResize = () => {
    activeImageResize = null;
    window.removeEventListener("mousemove", handleImageResizeMouseMove);
    window.removeEventListener("mouseup", handleImageResizeMouseUp);
  };

  const handleImageDragMouseMove = (event: MouseEvent) => {
    const dragState = activeImageDrag;
    if (!dragState) {
      return;
    }

    setMousePos({ x: event.clientX, y: event.clientY });

    const deltaX = Math.abs(event.clientX - dragState.startClientX);
    const deltaY = Math.abs(event.clientY - dragState.startClientY);
    if (!dragState.dragging && deltaX + deltaY >= 4) {
      dragState.dragging = true;
      setDragging(true);
      showImageDragCursor();
      deps.logger.info(`image drag:start ${dragState.paragraphId}@${dragState.paragraphOffset} client=(${dragState.startClientX},${dragState.startClientY})`);
    }

    if (dragState.dragging) {
        setDraggedImageInfo({ ...dragState });
        setDropTargetPos(resolvePositionAtSurfacePoint(event.clientX, event.clientY));
    }
  };

  const handleImageDragMouseUp = (event: MouseEvent) => {
    const dragState = activeImageDrag;
    if (!dragState) {
      deps.focusInput();
      return;
    }

    if (dragState.dragging) {
      const position = resolvePositionAtSurfacePoint(event.clientX, event.clientY);
      if (position) {
        deps.logger.info(`image drag:done ${dragState.paragraphId} -> ${position.paragraphId}:${position.runId}[${position.offset}]`);
        deps.applyTransactionalState(
          (current) => moveSelectedImageToPosition(current, position),
          { mergeKey: "moveImage" },
        );
      } else {
        deps.logger.warn(`image drag:cancel ${dragState.paragraphId} no target at (${event.clientX},${event.clientY})`);
      }
    }

    stopImageDrag();
    deps.focusInput();
  };

  const handleImageResizeMouseMove = (event: MouseEvent) => {
    const resizeState = activeImageResize;
    if (!resizeState) {
      return;
    }

    const deltaX = event.clientX - resizeState.startClientX;
    const deltaY = event.clientY - resizeState.startClientY;
    const maxWidth = getMaxInlineImageWidth(deps.surfaceRef(), deps.state.document, resizeState.paragraphId);
    const { width: nextWidth, height: nextHeight } = resolveResizedDimensions(
      resizeState,
      deltaX,
      deltaY,
      event.shiftKey,
      maxWidth,
    );
    const paragraph = getParagraphs(deps.state).find((candidate) => candidate.id === resizeState.paragraphId);
    if (!paragraph) {
      deps.logger.warn("image resize:missing paragraph", resizeState);
      return;
    }
    deps.logger.debug("image resize:move", {
      paragraphId: resizeState.paragraphId,
      paragraphOffset: resizeState.paragraphOffset,
      handleDirection: resizeState.handleDirection,
      deltaX,
      deltaY,
      nextWidth,
      nextHeight,
      maxWidth,
      preserveAspectRatio: event.shiftKey,
    });
    
    const applySelectionToStatePreservingStructure = (
        current: EditorState,
        nextSelection: EditorState["selection"],
      ): EditorState => ({
        ...current,
        selection: {
          anchor: { ...nextSelection.anchor },
          focus: { ...nextSelection.focus },
        },
      });

    deps.applyState(
      resizeSelectedImage(
        applySelectionToStatePreservingStructure(deps.state, {
          anchor: paragraphOffsetToPosition(paragraph, resizeState.paragraphOffset),
          focus: paragraphOffsetToPosition(paragraph, resizeState.paragraphOffset + 1),
        }),
        nextWidth,
        nextHeight,
      ),
    );
  };

  const handleImageResizeMouseUp = () => {
    const resizeState = activeImageResize;
    if (resizeState) {
      const selectedImage = getSelectedImageInfo(deps.state);
      deps.logger.info("image resize:done", {
        paragraphId: resizeState.paragraphId,
        startWidth: resizeState.startWidth,
        startHeight: resizeState.startHeight,
        current: selectedImage
          ? {
              width: selectedImage.width,
              height: selectedImage.height,
            }
          : null,
      });
      
      deps.updateHistoryState((current) => ({
        ...current,
        undoStack: [...current.undoStack, deps.cloneState(resizeState.initialState)],
        redoStack: [],
      }));
    }

    stopImageResize();
    deps.focusInput();
  };

  const startImageDrag = (paragraphId: string, paragraphOffset: number, event: MouseEvent) => {
    const imageElement = event.currentTarget as HTMLElement;
    const rect = imageElement.getBoundingClientRect();

    const selectedImage = getSelectedImageInfo(deps.state);

    activeImageDrag = {
      paragraphId,
      paragraphOffset,
      startClientX: event.clientX,
      startClientY: event.clientY,
      dragging: false,
      src: selectedImage?.src ?? "",
      width: selectedImage?.width ?? rect.width,
      height: selectedImage?.height ?? rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setMousePos({ x: event.clientX, y: event.clientY });
    window.addEventListener("mousemove", handleImageDragMouseMove);
    window.addEventListener("mouseup", handleImageDragMouseUp);
  };

  const startImageResize = (
    paragraphId: string,
    paragraphOffset: number,
    handleDirection: ImageResizeHandleDirection,
    event: MouseEvent,
    initialState: EditorState,
  ) => {
    const paragraph = getParagraphs(initialState).find((p) => p.id === paragraphId);
    if (!paragraph) return;

    const applySelectionToStatePreservingStructure = (
        current: EditorState,
        nextSelection: EditorState["selection"],
      ): EditorState => ({
        ...current,
        selection: {
          anchor: { ...nextSelection.anchor },
          focus: { ...nextSelection.focus },
        },
      });

    const selectedImage = getSelectedImageInfo(
      applySelectionToStatePreservingStructure(initialState, {
        anchor: paragraphOffsetToPosition(paragraph, paragraphOffset),
        focus: paragraphOffsetToPosition(paragraph, paragraphOffset + 1),
      }),
    );
    if (!selectedImage) return;

    activeImageResize = {
      paragraphId,
      paragraphOffset,
      handleDirection,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: selectedImage.width,
      startHeight: selectedImage.height,
      aspectRatio: selectedImage.width / selectedImage.height,
      initialState: deps.cloneState(initialState),
    };
    window.addEventListener("mousemove", handleImageResizeMouseMove);
    window.addEventListener("mouseup", handleImageResizeMouseUp);
  };

  return {
    dragging,
    draggedImageInfo,
    mousePos,
    dropTargetPos,
    getSelectedImageInfo,
    startImageDrag,
    startImageResize,
    stopImageDrag,
    stopImageResize,
  };
}
