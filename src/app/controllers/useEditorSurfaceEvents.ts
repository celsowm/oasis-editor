import {
  type EditorEditingZone,
  type EditorState,
  type EditorPosition,
  type EditorParagraphNode,
  findParagraphTableLocation,
  findParagraphLocation,
  getDocumentParagraphs,
  getActiveSectionIndex,
  getParagraphText,
  paragraphOffsetToPosition,
  getBlockParagraphs,
  normalizePageSettings,
  DEFAULT_EDITOR_PAGE_SETTINGS,
} from "@/core/model.js";
import { resolveWordSelection } from "@/core/wordBoundaries.js";
import { setSelection } from "@/core/commands/selection.js";
import { createSectionBoundaryParagraph } from "@/core/editorState.js";
import type { SurfaceHit } from "@/ui/canvas/CanvasHitTestService.js";

/**
 * A triple-click reuses the cached mouse-down hit test only when the click is
 * "tight": it must land within this many milliseconds of the mouse-down and
 * within this many pixels of where the mouse went down. Otherwise the hit is
 * recomputed from the click position.
 */
const REUSE_MOUSE_DOWN_HIT_MAX_AGE_MS = 600;
const REUSE_MOUSE_DOWN_HIT_MAX_DISTANCE_PX = 8;

export interface UseEditorSurfaceEventsProps {
  state: () => EditorState;
  applyState: (newState: EditorState) => void;
  tableResize: { handleMouseDown: (event: MouseEvent) => boolean };
  imageOps: {
    stopImageDrag: () => void;
    stopImageResize: () => void;
    startImageDrag: (
      paragraphId: string,
      paragraphOffset: number,
      event: MouseEvent,
      pointerBounds?: {
        left: number;
        top: number;
        width: number;
        height: number;
      },
    ) => void;
  };
  clearPendingCaretTextStyle: () => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  focusInputAfterPointerSelection: () => void;
  resolveSurfaceHitAtPoint: (
    clientX: number,
    clientY: number,
    context?: { forDrag?: boolean; pierce?: boolean },
  ) => SurfaceHit | null;
  getParagraphById: (
    doc: EditorState["document"],
    id: string,
  ) => EditorParagraphNode | undefined;
  textDrag?: {
    tryStartTextDrag: (event: MouseEvent, hit: SurfaceHit | null) => boolean;
  };
  logger: {
    debug: (msg: string) => void;
    info: (msg: string, payload?: unknown) => void;
  };
}

function resolveTripleClickParagraphRange(
  state: EditorState,
  paragraph: EditorParagraphNode,
  targetZone: EditorEditingZone,
): { start: EditorPosition; end: EditorPosition } {
  const zoneParagraphs = getDocumentParagraphs(state.document).filter(
    (candidate): boolean => {
      const location = findParagraphLocation(state.document, candidate.id);
      return location !== null && location.zone === targetZone;
    },
  );
  const index = zoneParagraphs.findIndex(
    (candidate): boolean => candidate.id === paragraph.id,
  );
  const nextParagraph = index >= 0 ? zoneParagraphs[index + 1] : undefined;
  const start = paragraphOffsetToPosition(paragraph, 0);
  const end = nextParagraph
    ? paragraphOffsetToPosition(nextParagraph, 0)
    : paragraphOffsetToPosition(paragraph, getParagraphText(paragraph).length);
  return { start, end };
}

export function createEditorSurfaceEvents(
  deps: UseEditorSurfaceEventsProps,
): ReturnType<typeof createEditorSurfaceEventsImpl> {
  return createEditorSurfaceEventsImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEditorSurfaceEventsImpl(deps: UseEditorSurfaceEventsProps) {
  let dragAnchor: EditorPosition | null = null;
  let dragFrameHandle: number | null = null;
  let dragPendingPoint: { clientX: number; clientY: number } | null = null;
  let clickStreak = 0;
  let lastClickAt = 0;
  let lastClickX = 0;
  let lastClickY = 0;
  let lastClickButton = 0;
  let lastMouseDownHit: SurfaceHit | null = null;
  let lastMouseDownAt = 0;
  let lastMouseDownX = 0;
  let lastMouseDownY = 0;

  const scheduleFrame = (callback: () => void): number => {
    if (
      typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function"
    ) {
      return window.requestAnimationFrame((): void => callback());
    }
    return globalThis.setTimeout(callback, 16) as unknown as number;
  };

  const cancelFrame = (handle: number): void => {
    if (
      typeof window !== "undefined" &&
      typeof window.cancelAnimationFrame === "function"
    ) {
      window.cancelAnimationFrame(handle);
      return;
    }
    globalThis.clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
  };

  const applyWithZone = (
    state: EditorState,
    targetZone: EditorEditingZone,
    newState: EditorState,
    targetPosition?: EditorPosition,
  ): void => {
    const isZoneTransition = targetZone !== (state.activeZone ?? "main");
    const targetFootnoteId =
      targetZone === "footnote" && targetPosition
        ? findParagraphLocation(newState.document, targetPosition.paragraphId)
            ?.footnoteId
        : undefined;
    const isFootnoteTransition =
      targetZone === "footnote" && targetFootnoteId !== state.activeFootnoteId;
    if (!isZoneTransition && !isFootnoteTransition) {
      deps.applyState(newState);
      return;
    }

    let updatedDocument = newState.document;
    let activeSectionIndex = state.activeSectionIndex ?? 0;

    if (!updatedDocument.sections || updatedDocument.sections.length === 0) {
      const headerParagraph = createSectionBoundaryParagraph("header");
      const footerParagraph = createSectionBoundaryParagraph("footer");
      updatedDocument = {
        ...updatedDocument,
        sections: [
          {
            id: "section:1",
            blocks: [],
            pageSettings: normalizePageSettings(
              updatedDocument.pageSettings ?? DEFAULT_EDITOR_PAGE_SETTINGS,
            ),
            header: [headerParagraph],
            footer: [footerParagraph],
          },
        ],
      };
      activeSectionIndex = 0;
    }

    const sections = updatedDocument.sections!;
    const section = sections[activeSectionIndex]!;
    let newHeader = section.header;
    let newFooter = section.footer;
    let zoneParagraph: EditorParagraphNode | null = null;

    if (targetZone === "header") {
      if (!newHeader || newHeader.length === 0) {
        zoneParagraph = createSectionBoundaryParagraph("header");
        newHeader = [zoneParagraph];
      } else {
        const firstBlock = newHeader[0];
        zoneParagraph =
          firstBlock.type === "paragraph"
            ? firstBlock
            : (getBlockParagraphs(firstBlock)[0] ?? null);
      }
    } else if (targetZone === "footer") {
      if (!newFooter || newFooter.length === 0) {
        zoneParagraph = createSectionBoundaryParagraph("footer");
        newFooter = [zoneParagraph];
      } else {
        const firstBlock = newFooter[0];
        zoneParagraph =
          firstBlock.type === "paragraph"
            ? firstBlock
            : (getBlockParagraphs(firstBlock)[0] ?? null);
      }
    }

    if (newHeader !== section.header || newFooter !== section.footer) {
      const newSections = [...sections];
      newSections[activeSectionIndex] = {
        ...section,
        header: newHeader,
        footer: newFooter,
      };
      updatedDocument = { ...updatedDocument, sections: newSections };
    }

    const zonePosition = targetPosition
      ? targetPosition
      : zoneParagraph
        ? paragraphOffsetToPosition(zoneParagraph, 0)
        : newState.selection.anchor;

    deps.applyState({
      ...newState,
      document: updatedDocument,
      selection: { anchor: zonePosition, focus: zonePosition },
      activeSectionIndex,
      activeZone: targetZone,
      activeFootnoteId:
        targetZone === "footnote" ? targetFootnoteId : undefined,
    });
  };

  const logSelection = (label: string): void => {
    const state = deps.state();
    const sel = state.selection;
    const secIdx = getActiveSectionIndex(state);
    const anchorLocInfo = findParagraphTableLocation(
      state.document,
      sel.anchor.paragraphId,
      secIdx,
    );
    const focusLocInfo = findParagraphTableLocation(
      state.document,
      sel.focus.paragraphId,
      secIdx,
    );
    const anchorLoc = anchorLocInfo
      ? `b${anchorLocInfo.blockIndex}r${anchorLocInfo.rowIndex}c${anchorLocInfo.cellIndex}`
      : "";
    const focusLoc = focusLocInfo
      ? `b${focusLocInfo.blockIndex}r${focusLocInfo.rowIndex}c${focusLocInfo.cellIndex}`
      : "";
    deps.logger.debug(
      `${label} ${sel.anchor.paragraphId}[${sel.anchor.offset}]→${sel.focus.paragraphId}[${sel.focus.offset}] [${anchorLoc}→${focusLoc}]`,
    );
  };

  const stopDragging = (): void => {
    dragAnchor = null;
    dragPendingPoint = null;
    if (dragFrameHandle !== null) {
      cancelFrame(dragFrameHandle);
      dragFrameHandle = null;
    }
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  };

  const processDragFrame = (): void => {
    dragFrameHandle = null;
    if (!dragAnchor) return;
    const pendingPoint = dragPendingPoint;
    dragPendingPoint = null;
    if (!pendingPoint) {
      return;
    }
    const hit = deps.resolveSurfaceHitAtPoint(
      pendingPoint.clientX,
      pendingPoint.clientY,
      { forDrag: true },
    );
    if (!hit?.resolvedFromParagraph) {
      return;
    }

    const state = deps.state();
    const next = setSelection(state, {
      anchor: dragAnchor,
      focus: hit.position,
    });
    applyWithZone(state, hit.zone, next, hit.position);
    logSelection("selection:drag");
  };

  const handleWindowMouseMove = (event: MouseEvent): void => {
    if (!dragAnchor) return;
    dragPendingPoint = { clientX: event.clientX, clientY: event.clientY };
    if (dragFrameHandle === null) {
      dragFrameHandle = scheduleFrame(processDragFrame);
    }
  };

  const handleWindowMouseUp = (): void => {
    logSelection("selection:end");
    stopDragging();
    deps.focusInputAfterPointerSelection();
  };

  // Named handlers for each dispatch branch of handleSurfaceMouseDown.
  // All close over the same scope: dragAnchor, stopDragging, deps, applyWithZone.

  const handleZoneTransitionDown = (
    state: EditorState,
    hit: SurfaceHit,
    clickDetail: number,
  ): void => {
    if (clickDetail < 2) {
      dragAnchor = null;
      stopDragging();
      deps.focusInputAfterPointerSelection();
      return;
    }
    dragAnchor = null;
    if (hit.resolvedFromParagraph) {
      applyWithZone(
        state,
        hit.zone,
        {
          ...state,
          selection: {
            anchor: { ...hit.position },
            focus: { ...hit.position },
          },
        },
        hit.position,
      );
    } else {
      applyWithZone(state, hit.zone, state);
    }
    stopDragging();
    deps.focusInputAfterPointerSelection();
  };

  const handleTextBoxDown = (state: EditorState, hit: SurfaceHit): void => {
    const textBoxParagraph = deps.getParagraphById(
      state.document,
      hit.textBox!.paragraphId,
    );
    if (!textBoxParagraph) {
      deps.focusInputAfterPointerSelection();
      return;
    }
    dragAnchor = null;
    const start = paragraphOffsetToPosition(
      textBoxParagraph,
      hit.textBox!.startOffset,
    );
    const end = paragraphOffsetToPosition(
      textBoxParagraph,
      hit.textBox!.endOffset,
    );
    applyWithZone(
      state,
      hit.zone,
      setSelection(state, { anchor: start, focus: end }),
      start,
    );
    stopDragging();
    deps.focusInputAfterPointerSelection();
  };

  const handleImageDown = (
    state: EditorState,
    hit: SurfaceHit,
    event: MouseEvent,
  ): void => {
    const imageParagraph = deps.getParagraphById(
      state.document,
      hit.image!.paragraphId,
    );
    if (!imageParagraph) {
      deps.focusInputAfterPointerSelection();
      return;
    }
    dragAnchor = null;
    const start = paragraphOffsetToPosition(
      imageParagraph,
      hit.image!.startOffset,
    );
    const end = paragraphOffsetToPosition(imageParagraph, hit.image!.endOffset);
    applyWithZone(
      state,
      hit.zone,
      setSelection(state, { anchor: start, focus: end }),
      start,
    );
    stopDragging();
    deps.imageOps.startImageDrag(
      hit.image!.paragraphId,
      hit.image!.startOffset,
      event,
      {
        left: hit.image!.left,
        top: hit.image!.top,
        width: hit.image!.width,
        height: hit.image!.height,
      },
    );
    deps.focusInputAfterPointerSelection();
  };

  const handleShiftClickDown = (state: EditorState, hit: SurfaceHit): void => {
    dragAnchor = state.selection.anchor;
    applyWithZone(
      state,
      hit.zone,
      setSelection(state, {
        anchor: state.selection.anchor,
        focus: hit.position,
      }),
      hit.position,
    );
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    deps.focusInputAfterPointerSelection();
  };

  const handleTripleClickDown = (
    state: EditorState,
    hit: SurfaceHit,
    paragraph: EditorParagraphNode,
  ): void => {
    dragAnchor = null;
    const range = resolveTripleClickParagraphRange(state, paragraph, hit.zone);
    applyWithZone(
      state,
      hit.zone,
      setSelection(state, { anchor: range.start, focus: range.end }),
      range.start,
    );
    stopDragging();
    deps.focusInputAfterPointerSelection();
  };

  const handleDoubleClickDown = (
    state: EditorState,
    hit: SurfaceHit,
    paragraph: EditorParagraphNode,
  ): void => {
    dragAnchor = null;
    const word = resolveWordSelection(
      getParagraphText(paragraph),
      hit.paragraphOffset,
    );
    const startPos = paragraphOffsetToPosition(paragraph, word.start);
    const endPos = paragraphOffsetToPosition(paragraph, word.end);
    applyWithZone(
      state,
      hit.zone,
      setSelection(state, { anchor: startPos, focus: endPos }),
      startPos,
    );
    stopDragging();
    deps.focusInputAfterPointerSelection();
  };

  const handleSurfaceMouseDown = (event: MouseEvent): void => {
    // Non-left mouse buttons (e.g. right-click for context menu) must not
    // alter the selection or steal focus mid-drag.
    if (event.button !== 0) {
      return;
    }
    const now = Date.now();
    const distance = Math.hypot(
      event.clientX - lastClickX,
      event.clientY - lastClickY,
    );
    const withinStreakWindow =
      now - lastClickAt <= 450 &&
      distance <= 6 &&
      event.button === lastClickButton;
    clickStreak = withinStreakWindow ? clickStreak + 1 : 1;
    lastClickAt = now;
    lastClickX = event.clientX;
    lastClickY = event.clientY;
    lastClickButton = event.button;
    const clickDetail = Math.max(event.detail, clickStreak);

    const state = deps.state();
    deps.clearPendingCaretTextStyle();
    if (deps.tableResize.handleMouseDown(event)) return;

    event.preventDefault();
    deps.imageOps.stopImageDrag();
    deps.imageOps.stopImageResize();
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();

    const hit = deps.resolveSurfaceHitAtPoint(event.clientX, event.clientY, {
      pierce: event.altKey,
    });
    lastMouseDownHit = hit;
    lastMouseDownAt = now;
    lastMouseDownX = event.clientX;
    lastMouseDownY = event.clientY;
    if (!hit) {
      deps.focusInputAfterPointerSelection();
      return;
    }
    if (deps.textDrag?.tryStartTextDrag(event, hit)) {
      dragAnchor = null;
      stopDragging();
      deps.focusInputAfterPointerSelection();
      return;
    }

    const paragraph = deps.getParagraphById(state.document, hit.paragraphId);
    const isZoneTransition = hit.zone !== (state.activeZone ?? "main");

    if (isZoneTransition) {
      handleZoneTransitionDown(state, hit, clickDetail);
      return;
    }
    if (hit.textBox) {
      handleTextBoxDown(state, hit);
      return;
    }
    if (hit.image) {
      handleImageDown(state, hit, event);
      return;
    }
    if (event.shiftKey && hit.resolvedFromParagraph) {
      handleShiftClickDown(state, hit);
      return;
    }
    if (clickDetail >= 3 && paragraph) {
      handleTripleClickDown(state, hit, paragraph);
      return;
    }
    if (clickDetail === 2 && paragraph) {
      handleDoubleClickDown(state, hit, paragraph);
      return;
    }

    if (!hit.resolvedFromParagraph) {
      deps.focusInputAfterPointerSelection();
      return;
    }

    // Anchor the drag at the precise clicked offset, not the table cell start.
    // Cross-cell selection is detected from cell locations (not offsets), so
    // snapping to the cell anchor here would only break in-cell text selection
    // (e.g. dragging right-to-left within a single cell).
    dragAnchor = hit.position;
    applyWithZone(
      state,
      hit.zone,
      {
        ...state,
        selection: {
          anchor: { ...hit.position },
          focus: { ...hit.position },
        },
      },
      hit.position,
    );
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    deps.focusInputAfterPointerSelection();
  };

  const handleSurfaceDblClick = (event: MouseEvent): void => {
    event.preventDefault();
    // Keep default browser text selection disabled, but do not block bubbling:
    // some environments sequence triple-click as dblclick + click.
  };

  const handleSurfaceClick = (event: MouseEvent): void => {
    if (event.detail < 3) {
      return;
    }
    event.preventDefault();
    const state = deps.state();
    const distanceFromMouseDown = Math.hypot(
      event.clientX - lastMouseDownX,
      event.clientY - lastMouseDownY,
    );
    const useMouseDownHit =
      Date.now() - lastMouseDownAt <= REUSE_MOUSE_DOWN_HIT_MAX_AGE_MS &&
      distanceFromMouseDown <= REUSE_MOUSE_DOWN_HIT_MAX_DISTANCE_PX;
    const hit = useMouseDownHit
      ? lastMouseDownHit
      : deps.resolveSurfaceHitAtPoint(event.clientX, event.clientY);
    if (!hit?.resolvedFromParagraph) {
      deps.focusInputAfterPointerSelection();
      return;
    }

    const paragraph = deps.getParagraphById(state.document, hit.paragraphId);
    if (!paragraph) {
      deps.focusInputAfterPointerSelection();
      return;
    }
    dragAnchor = null;
    const range = resolveTripleClickParagraphRange(state, paragraph, hit.zone);
    applyWithZone(
      state,
      hit.zone,
      setSelection(state, { anchor: range.start, focus: range.end }),
      range.start,
    );
    stopDragging();
    deps.focusInputAfterPointerSelection();
  };

  const handleParagraphMouseDown = (
    _paragraphId: string,
    event: MouseEvent & { currentTarget: HTMLParagraphElement },
  ): void => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    handleSurfaceMouseDown(event);
  };

  return {
    handleSurfaceMouseDown,
    handleSurfaceClick,
    handleSurfaceDblClick,
    handleParagraphMouseDown,
    stopDragging,
  };
}
