import { MERGE_KEYS, type MergeKey } from "@/core/transactionMergeKeys.js";
import { createSignal } from "solid-js";
import { setSelection } from "@/core/commands/selection.js";
import { moveOrCopySelectionToPosition } from "@/core/commands/text.js";
import type { EditorPosition, EditorState } from "@/core/model.js";
import { getParagraphs, positionToParagraphOffset } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import type { SurfaceHit } from "@/ui/canvas/CanvasHitTestService.js";

const WORD_LIKE_DRAG_CURSOR =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg fill='none' stroke-linejoin='round' stroke-linecap='round'%3E%3Cpath d='M6 3.5 6 22.5 10.7 17.9 14.1 26.6 17.2 25.4 13.8 16.9 20.4 16.9Z' fill='white' stroke='white' stroke-width='4'/%3E%3Cpath d='M6 3.5 6 22.5 10.7 17.9 14.1 26.6 17.2 25.4 13.8 16.9 20.4 16.9Z' fill='white' stroke='black' stroke-width='1.4'/%3E%3Cpath d='M7.5 7.1 7.5 19.1 10.9 15.8 14.7 24.4' stroke='white' stroke-width='1.15' opacity='.95'/%3E%3Crect x='22' y='23' width='8.5' height='6.5' rx='.5' fill='white' stroke='white' stroke-width='3'/%3E%3Crect x='22' y='23' width='8.5' height='6.5' rx='.5' stroke='black' stroke-width='1.25' stroke-dasharray='2 2'/%3E%3C/g%3E%3C/svg%3E\") 6 4, auto";

export interface EditorTextDragDeps {
  state: () => EditorState;
  isReadOnly: () => boolean;
  resolveSurfaceHitAtPoint: (
    clientX: number,
    clientY: number,
    context?: { forDrag?: boolean },
  ) => SurfaceHit | null;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: MergeKey },
  ) => void;
  applyTableAwareParagraphEdit: (
    state: EditorState,
    edit: (state: EditorState) => EditorState,
  ) => EditorState;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  focusInputAfterPointerSelection: () => void;
  logger?: {
    debug: (msg: string, payload?: unknown) => void;
    info: (msg: string, payload?: unknown) => void;
    warn?: (msg: string, payload?: unknown) => void;
  };
}

function isPositionInsideSelection(
  state: EditorState,
  position: EditorPosition,
): boolean {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return false;
  }
  const paragraphs = getParagraphs(state);
  const targetIndex = paragraphs.findIndex(
    (paragraph) => paragraph.id === position.paragraphId,
  );
  if (
    targetIndex < normalized.startIndex ||
    targetIndex > normalized.endIndex
  ) {
    return false;
  }
  const targetParagraph = paragraphs[targetIndex];
  if (!targetParagraph) {
    return false;
  }
  const targetOffset = positionToParagraphOffset(targetParagraph, position);
  if (
    targetIndex === normalized.startIndex &&
    targetOffset < normalized.startParagraphOffset
  ) {
    return false;
  }
  if (
    targetIndex === normalized.endIndex &&
    targetOffset > normalized.endParagraphOffset
  ) {
    return false;
  }
  return true;
}

export function createEditorTextDrag(deps: EditorTextDragDeps) {
  const [dragging, setDragging] = createSignal(false);
  const [dropTargetPos, setDropTargetPos] = createSignal<EditorPosition | null>(
    null,
  );
  const [copyMode, setCopyMode] = createSignal(false);
  const [pointerPos, setPointerPos] = createSignal<{
    x: number;
    y: number;
  } | null>(null);
  const [caretViewport, setCaretViewport] = createSignal<{
    left: number;
    top: number;
    height: number;
  } | null>(null);
  let pendingStart: { x: number; y: number; position: EditorPosition } | null =
    null;
  let cursorStyleEl: HTMLStyleElement | null = null;
  let lastDropTargetKey: string | null = null;

  const hideCursor = () => {
    if (cursorStyleEl) {
      cursorStyleEl.remove();
      cursorStyleEl = null;
    }
  };

  const showCursor = () => {
    if (cursorStyleEl) return;
    cursorStyleEl = document.createElement("style");
    cursorStyleEl.setAttribute("data-oasis-text-drag-cursor", "");
    cursorStyleEl.textContent = `*, *::before, *::after { cursor: ${WORD_LIKE_DRAG_CURSOR} !important; }`;
    document.head.appendChild(cursorStyleEl);
  };

  const stopDrag = () => {
    deps.logger?.info("text-drag:stop", {
      dragging: dragging(),
      dropTarget: dropTargetPos()
        ? `${dropTargetPos()!.paragraphId}:${dropTargetPos()!.runId}[${dropTargetPos()!.offset}]`
        : null,
      copyMode: copyMode(),
    });
    pendingStart = null;
    lastDropTargetKey = null;
    setDragging(false);
    setDropTargetPos(null);
    setCopyMode(false);
    setPointerPos(null);
    setCaretViewport(null);
    hideCursor();
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  };

  const handleWindowMouseMove = (event: MouseEvent) => {
    if (!pendingStart) {
      return;
    }
    const nextCopyMode = event.ctrlKey || event.metaKey;
    setCopyMode(nextCopyMode);
    if (!dragging()) {
      const deltaX = Math.abs(event.clientX - pendingStart.x);
      const deltaY = Math.abs(event.clientY - pendingStart.y);
      if (deltaX + deltaY < 4) {
        return;
      }
      deps.logger?.info("text-drag:activate", {
        start: pendingStart,
        at: { x: event.clientX, y: event.clientY },
        deltaX,
        deltaY,
      });
      setDragging(true);
      showCursor();
    }
    setPointerPos({ x: event.clientX, y: event.clientY });
    // Keep drop-caret preview aligned with the pointer using the
    // canvas hit result.
    const hit = deps.resolveSurfaceHitAtPoint(event.clientX, event.clientY);
    if (!hit?.resolvedFromParagraph) {
      deps.logger?.debug("text-drag:hit-miss", {
        x: event.clientX,
        y: event.clientY,
      });
      setDropTargetPos(null);
      setCaretViewport(null);
      return;
    }
    const nextTarget = hit.tableCellAnchorPosition ?? hit.position;
    const targetKey = `${nextTarget.paragraphId}:${nextTarget.runId}[${nextTarget.offset}]|${hit.zone}|src=${hit.tableCellAnchorPosition ? "cell-anchor" : "hit"}`;
    if (targetKey !== lastDropTargetKey) {
      deps.logger?.info("text-drag:target", {
        x: event.clientX,
        y: event.clientY,
        zone: hit.zone,
        resolvedFromParagraph: hit.resolvedFromParagraph,
        paragraphId: hit.paragraphId,
        paragraphOffset: hit.paragraphOffset,
        hitPosition: `${hit.position.paragraphId}:${hit.position.runId}[${hit.position.offset}]`,
        target: `${nextTarget.paragraphId}:${nextTarget.runId}[${nextTarget.offset}]`,
        source: hit.tableCellAnchorPosition
          ? "tableCellAnchorPosition"
          : "position",
      });
      lastDropTargetKey = targetKey;
    }
    setDropTargetPos(nextTarget);
    setCaretViewport(hit.caretViewport ?? null);
  };

  const handleWindowMouseUp = (event: MouseEvent) => {
    deps.logger?.info("text-drag:mouseup", {
      x: event.clientX,
      y: event.clientY,
      dragging: dragging(),
      copyMode: copyMode(),
      dropTarget: dropTargetPos()
        ? `${dropTargetPos()!.paragraphId}:${dropTargetPos()!.runId}[${dropTargetPos()!.offset}]`
        : null,
    });
    if (dragging() && dropTargetPos()) {
      const destination = dropTargetPos()!;
      const copy = copyMode();
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState(
        (current) =>
          deps.applyTableAwareParagraphEdit(current, (temp) =>
            moveOrCopySelectionToPosition(temp, destination, { copy }),
          ),
        { mergeKey: copy ? MERGE_KEYS.copyTextByDrag : MERGE_KEYS.moveTextByDrag },
      );
      deps.logger?.info("text-drag:apply", {
        mode: copy ? "copy" : "move",
        destination: `${destination.paragraphId}:${destination.runId}[${destination.offset}]`,
      });
    } else if (pendingStart) {
      const startPosition = pendingStart.position;
      deps.applyTransactionalState(
        (current) => {
          if (!isPositionInsideSelection(current, startPosition)) {
            return current;
          }
          return setSelection(current, {
            anchor: startPosition,
            focus: startPosition,
          });
        },
        { mergeKey: MERGE_KEYS.collapseSelectionByClick },
      );
      deps.logger?.info("text-drag:collapse", {
        at: `${startPosition.paragraphId}:${startPosition.runId}[${startPosition.offset}]`,
      });
    }
    stopDrag();
    deps.focusInputAfterPointerSelection();
  };

  const tryStartTextDrag = (
    event: MouseEvent,
    hit: SurfaceHit | null,
  ): boolean => {
    if (deps.isReadOnly() || !hit?.resolvedFromParagraph) {
      deps.logger?.debug("text-drag:skip-start", {
        reason: deps.isReadOnly() ? "readonly" : "no-hit",
        x: event.clientX,
        y: event.clientY,
      });
      return false;
    }
    const current = deps.state();
    if (!isPositionInsideSelection(current, hit.position)) {
      deps.logger?.debug("text-drag:skip-start", {
        reason: "outside-selection",
        x: event.clientX,
        y: event.clientY,
        hit: `${hit.position.paragraphId}:${hit.position.runId}[${hit.position.offset}]`,
      });
      return false;
    }
    deps.logger?.info("text-drag:start-pending", {
      x: event.clientX,
      y: event.clientY,
      hit: `${hit.position.paragraphId}:${hit.position.runId}[${hit.position.offset}]`,
      zone: hit.zone,
    });
    pendingStart = {
      x: event.clientX,
      y: event.clientY,
      position: hit.tableCellAnchorPosition ?? hit.position,
    };
    setPointerPos({ x: event.clientX, y: event.clientY });
    setCopyMode(event.ctrlKey || event.metaKey);
    setDropTargetPos(null);
    setCaretViewport(hit.caretViewport ?? null);
    setDragging(false);
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return true;
  };

  return {
    dragging,
    dropTargetPos,
    copyMode,
    pointerPos,
    caretViewport,
    tryStartTextDrag,
    stopDrag,
  };
}
