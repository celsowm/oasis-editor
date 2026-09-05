import {
  type EditorEditingZone,
  type EditorState,
  type EditorPosition,
  type EditorParagraphNode,
  type EditorBlockNode,
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

/**
 * A finger is far less precise than a mouse, and a touch that lands on the same
 * spot still wanders by several pixels. Every "did the pointer stay put?" test
 * therefore uses a wider tolerance for touch than for mouse/pen.
 */
const TOUCH_SLOP_PX = 20;

/**
 * How long a finger must rest without moving before the gesture is read as a
 * long-press (select the word) rather than as a scroll.
 */
const LONG_PRESS_MS = 500;

/** A touch that lifts within this window, without wandering, counts as a tap. */
const TAP_MAX_DURATION_MS = 500;

const isTouch = (event: PointerEvent): boolean => event.pointerType === "touch";

/** Distance tolerance for "the pointer did not move", widened for fingers. */
const slopFor = (event: PointerEvent, mouseSlop: number): number =>
  isTouch(event) ? TOUCH_SLOP_PX : mouseSlop;

/**
 * Resolves the first navigable paragraph in a header/footer zone, creating a
 * boundary paragraph (and the containing block array) when the zone is empty.
 */
function resolveZoneFirstParagraph(
  blocks: EditorBlockNode[] | undefined,
  zone: "header" | "footer",
): {
  paragraph: EditorParagraphNode | null;
  blocks: EditorBlockNode[] | undefined;
} {
  if (!blocks || blocks.length === 0) {
    const paragraph = createSectionBoundaryParagraph(zone);
    return { paragraph, blocks: [paragraph] };
  }
  const firstBlock = blocks[0]!;
  const paragraph =
    firstBlock.type === "paragraph"
      ? firstBlock
      : (getBlockParagraphs(firstBlock)[0] ?? null);
  return { paragraph, blocks };
}

export interface UseEditorSurfaceEventsProps {
  state: () => EditorState;
  applyState: (newState: EditorState) => void;
  tableResize: { handlePointerDown: (event: PointerEvent) => boolean };
  imageOps: {
    stopImageDrag: () => void;
    stopImageResize: () => void;
    startImageDrag: (
      paragraphId: string,
      paragraphOffset: number,
      event: PointerEvent,
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
  /** Synchronous focus, required for touch to raise the on-screen keyboard. */
  focusInputSync: () => void;
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
    tryStartTextDrag: (event: PointerEvent, hit: SurfaceHit | null) => boolean;
  };
  logger: {
    debug: (msg: string) => void;
    info: (msg: string, payload?: unknown) => void;
  };
  openEquationDialog: (
    initial?: import("@/core/model.js").EditorMathExpression,
    targetRunId?: string,
  ) => void;
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

  /**
   * The pointer that owns the current gesture. Secondary pointers (a second
   * finger starting a pinch-zoom) must not steer a drag that another pointer
   * began, so every move/up handler filters on this id.
   */
  let activePointerId: number | null = null;

  /**
   * A touch that has landed but is not yet committed to being a tap, a scroll
   * or a long-press. Mouse gestures never populate this: they dispatch straight
   * from pointerdown, exactly as they did before pointer events.
   */
  let pendingTouch: {
    pointerId: number;
    clientX: number;
    clientY: number;
    startedAt: number;
    hit: SurfaceHit | null;
    clickDetail: number;
    longPressHandle: ReturnType<typeof setTimeout> | null;
    /** Set once the long-press fired and the word under the finger is selected. */
    longPressFired: boolean;
  } | null = null;

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
      const resolved = resolveZoneFirstParagraph(newHeader, "header");
      zoneParagraph = resolved.paragraph;
      newHeader = resolved.blocks;
    } else if (targetZone === "footer") {
      const resolved = resolveZoneFirstParagraph(newFooter, "footer");
      zoneParagraph = resolved.paragraph;
      newFooter = resolved.blocks;
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

  const cancelPendingTouch = (): void => {
    if (pendingTouch?.longPressHandle) {
      clearTimeout(pendingTouch.longPressHandle);
    }
    pendingTouch = null;
  };

  const stopDragging = (): void => {
    dragAnchor = null;
    dragPendingPoint = null;
    activePointerId = null;
    cancelPendingTouch();
    if (dragFrameHandle !== null) {
      cancelFrame(dragFrameHandle);
      dragFrameHandle = null;
    }
    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerUp);
    window.removeEventListener("pointercancel", handleWindowPointerCancel);
  };

  /**
   * The browser fires `pointercancel` when it takes the gesture over for its own
   * scrolling. Any selection already applied stays: a long-press that selected a
   * word keeps that word selected even if the extend-drag is cut short.
   */
  const startTrackingPointer = (pointerId: number): void => {
    activePointerId = pointerId;
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerCancel);
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

  const handleWindowPointerMove = (event: PointerEvent): void => {
    if (activePointerId !== null && event.pointerId !== activePointerId) {
      return;
    }

    // A finger that wanders before the long-press fires is scrolling, not
    // selecting. Drop the pending tap and let the browser have the gesture.
    if (pendingTouch && !pendingTouch.longPressFired) {
      const moved = Math.hypot(
        event.clientX - pendingTouch.clientX,
        event.clientY - pendingTouch.clientY,
      );
      if (moved > TOUCH_SLOP_PX) {
        stopDragging();
      }
      return;
    }

    if (!dragAnchor) return;
    dragPendingPoint = { clientX: event.clientX, clientY: event.clientY };
    if (dragFrameHandle === null) {
      dragFrameHandle = scheduleFrame(processDragFrame);
    }
  };

  const handleWindowPointerUp = (event: PointerEvent): void => {
    if (activePointerId !== null && event.pointerId !== activePointerId) {
      return;
    }

    // A touch that lifts before the long-press fired, without wandering, is a
    // tap: only now do we know it was not a scroll, so dispatch it here.
    if (pendingTouch && !pendingTouch.longPressFired) {
      const touch = pendingTouch;
      const moved = Math.hypot(
        event.clientX - touch.clientX,
        event.clientY - touch.clientY,
      );
      const isTap =
        moved <= TOUCH_SLOP_PX &&
        Date.now() - touch.startedAt <= TAP_MAX_DURATION_MS;
      cancelPendingTouch();
      stopDragging();
      if (isTap) {
        commitTouchTap(touch.hit, touch.clickDetail, event);
      }
      return;
    }

    logSelection("selection:end");
    stopDragging();
    deps.focusInputAfterPointerSelection();
  };

  const handleWindowPointerCancel = (event: PointerEvent): void => {
    if (activePointerId !== null && event.pointerId !== activePointerId) {
      return;
    }
    // The browser claimed the gesture (it is scrolling). Whatever selection was
    // already applied stands; we simply stop tracking.
    stopDragging();
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
    event: PointerEvent,
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
    // Touch selects the image but does not begin moving it: a finger dragging
    // across the page is scrolling, and the move gesture belongs to the drag
    // handle. Mouse and pen keep the direct-manipulation drag.
    if (!isTouch(event)) {
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
    }
    deps.focusInputAfterPointerSelection();
  };

  const handleShiftClickDown = (
    state: EditorState,
    hit: SurfaceHit,
    pointerId: number,
  ): void => {
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
    startTrackingPointer(pointerId);
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
    let offset = 0;
    const mathRun = paragraph.runs.find((run): boolean => {
      const hitRun =
        run.kind === "math" &&
        hit.paragraphOffset >= offset &&
        hit.paragraphOffset <= offset + run.text.length;
      offset += run.text.length;
      return hitRun;
    });
    if (mathRun?.kind === "math") {
      const position = paragraphOffsetToPosition(
        paragraph,
        hit.paragraphOffset,
      );
      applyWithZone(
        state,
        hit.zone,
        setSelection(state, { anchor: position, focus: position }),
        position,
      );
      stopDragging();
      deps.openEquationDialog(mathRun.math, mathRun.id);
      return;
    }
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

  /**
   * Applies a resolved surface hit. Mouse and pen reach this straight from
   * `pointerdown`; touch reaches it from `pointerup`, once the gesture has been
   * confirmed to be a tap rather than a scroll.
   */
  const dispatchSurfaceDown = (
    state: EditorState,
    hit: SurfaceHit | null,
    clickDetail: number,
    event: PointerEvent,
  ): void => {
    deps.imageOps.stopImageDrag();
    deps.imageOps.stopImageResize();
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();

    if (!hit) {
      deps.focusInputAfterPointerSelection();
      return;
    }
    // Dragging selected text to move it is a mouse/pen gesture: with a finger
    // the same motion is a scroll, and there is no modifier to tell them apart.
    if (!isTouch(event) && deps.textDrag?.tryStartTextDrag(event, hit)) {
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
      handleShiftClickDown(state, hit, event.pointerId);
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
    // Only mouse and pen extend the selection by dragging from the caret. A
    // finger that keeps moving is scrolling; touch extends via long-press.
    if (!isTouch(event)) {
      startTrackingPointer(event.pointerId);
    }
    deps.focusInputAfterPointerSelection();
  };

  /** A touch that lifted in place: place the caret and raise the keyboard. */
  const commitTouchTap = (
    hit: SurfaceHit | null,
    clickDetail: number,
    event: PointerEvent,
  ): void => {
    dispatchSurfaceDown(deps.state(), hit, clickDetail, event);
    // iOS Safari opens the on-screen keyboard only when `focus()` runs inside
    // the user gesture. The rAF-deferred focus used for mouse is ignored there,
    // so the caret would land with no keyboard.
    deps.focusInputSync();
  };

  /**
   * The finger has rested in place long enough to mean "select", not "scroll":
   * select the word underneath and let further movement extend from it.
   */
  const beginTouchLongPress = (): void => {
    const touch = pendingTouch;
    if (!touch) return;
    touch.longPressHandle = null;
    touch.longPressFired = true;

    const hit = touch.hit;
    if (!hit?.resolvedFromParagraph) return;
    const state = deps.state();
    const paragraph = deps.getParagraphById(state.document, hit.paragraphId);
    if (!paragraph) return;

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
    dragAnchor = startPos;
    deps.focusInputSync();
  };

  const handleSurfacePointerDown = (event: PointerEvent): void => {
    // Non-primary buttons (e.g. right-click for the context menu) must not
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
      distance <= slopFor(event, 6) &&
      event.button === lastClickButton;
    clickStreak = withinStreakWindow ? clickStreak + 1 : 1;
    lastClickAt = now;
    lastClickX = event.clientX;
    lastClickY = event.clientY;
    lastClickButton = event.button;
    // Touch reports `detail` as 0 or 1 regardless of tap count, so the streak
    // we track ourselves is what makes double/triple tap work there.
    const clickDetail = Math.max(event.detail, clickStreak);

    const state = deps.state();
    deps.clearPendingCaretTextStyle();
    // Dragging a table edge is unambiguous on every pointer type, so it claims
    // the gesture here and suppresses the browser's own panning.
    if (deps.tableResize.handlePointerDown(event)) {
      event.preventDefault();
      return;
    }

    const hit = deps.resolveSurfaceHitAtPoint(event.clientX, event.clientY, {
      pierce: event.altKey,
    });
    lastMouseDownHit = hit;
    lastMouseDownAt = now;
    lastMouseDownX = event.clientX;
    lastMouseDownY = event.clientY;

    if (isTouch(event)) {
      // Deliberately no `preventDefault`: the page must stay scrollable under
      // the finger. Nothing is applied to the document yet — `pointerup`
      // decides tap versus scroll, and the timer below decides long-press.
      cancelPendingTouch();
      pendingTouch = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        startedAt: now,
        hit,
        clickDetail,
        longPressHandle: setTimeout(beginTouchLongPress, LONG_PRESS_MS),
        longPressFired: false,
      };
      startTrackingPointer(event.pointerId);
      return;
    }

    event.preventDefault();
    dispatchSurfaceDown(state, hit, clickDetail, event);
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

  const handleParagraphPointerDown = (
    _paragraphId: string,
    event: PointerEvent & { currentTarget: HTMLParagraphElement },
  ): void => {
    if (event.button !== 0) {
      return;
    }
    // Touch must keep its default action so the page can still scroll; the
    // pointerdown handler decides what the gesture means.
    if (!isTouch(event)) {
      event.preventDefault();
    }
    handleSurfacePointerDown(event);
  };

  return {
    handleSurfacePointerDown,
    handleSurfaceClick,
    handleSurfaceDblClick,
    handleParagraphPointerDown,
    stopDragging,
  };
}
