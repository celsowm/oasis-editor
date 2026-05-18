import { createMemo, Show } from "solid-js";
import type { EditorState, EditorPosition } from "../../core/model.js";
import { getParagraphs, positionToParagraphOffset } from "../../core/model.js";
import { collectParagraphCharRects } from "../positionAtPoint.js";
import { getParagraphBoundaryElement, getEmptyBlockRect } from "../domGeometry.js";
import { getCaretSlotRects } from "../caretGeometry.js";
import { CaretOverlay } from "./CaretOverlay.js";

export function DropCaret(props: {
  surfaceRef: HTMLDivElement | undefined;
  state: EditorState;
  targetPos: () => EditorPosition;
  pointerPos?: () => { x: number; y: number } | null;
  caretViewport?: () => { left: number; top: number; height: number } | null;
}) {
  let lastDebugKey: string | null = null;
  const layout = createMemo(() => {
    const pos = props.targetPos();
    const surfaceRef = props.surfaceRef;
    if (!surfaceRef) return null;

    const charRects = collectParagraphCharRects(surfaceRef, pos.paragraphId);
    let viewportLeft = 0;
    let viewportTop = 0;
    let height = 28;

    if (charRects.length === 0) {
      const caret = props.caretViewport?.() ?? null;
      if (caret) {
        viewportLeft = caret.left;
        viewportTop = caret.top;
        height = Math.max(12, Math.min(36, caret.height));
        const debugKey = `${pos.paragraphId}:${pos.runId}[${pos.offset}]|canvas-hit-caret`;
        if (debugKey !== lastDebugKey) {
          // eslint-disable-next-line no-console
          console.info("[DropCaret] layout", {
            target: `${pos.paragraphId}:${pos.runId}[${pos.offset}]`,
            charRects: charRects.length,
            viewportLeft,
            viewportTop,
            height,
            mode: "canvas-hit-caret",
          });
          lastDebugKey = debugKey;
        }
        return { viewportLeft, viewportTop, height };
      }
      const pointer = props.pointerPos?.() ?? null;
      if (pointer) {
        viewportLeft = pointer.x;
        viewportTop = pointer.y - 12;
        height = 24;
        const debugKey = `${pos.paragraphId}:${pos.runId}[${pos.offset}]|pointer`;
        if (debugKey !== lastDebugKey) {
          // eslint-disable-next-line no-console
          console.info("[DropCaret] layout", {
            target: `${pos.paragraphId}:${pos.runId}[${pos.offset}]`,
            charRects: charRects.length,
            viewportLeft,
            viewportTop,
            height,
            mode: "pointer-fallback",
          });
          lastDebugKey = debugKey;
        }
        return { viewportLeft, viewportTop, height };
      }
      const pElement = getParagraphBoundaryElement(surfaceRef, pos.paragraphId, "end");
      const fallbackRect = pElement ? (getEmptyBlockRect(pElement) ?? pElement.getBoundingClientRect()) : null;
      if (fallbackRect) {
        viewportLeft = fallbackRect.left;
        viewportTop = fallbackRect.top;
        height = fallbackRect.height || 28;
      }
    } else {
      const rects = getCaretSlotRects(charRects);
      const paragraphNode = getParagraphs(props.state).find((p) => p.id === pos.paragraphId);
      const paragraphOffset = paragraphNode ? positionToParagraphOffset(paragraphNode, pos) : 0;
      const slotIndex = Math.max(0, Math.min(paragraphOffset, rects.length - 1));
      const rect = rects[slotIndex];
      if (rect) {
        viewportLeft = rect.left;
        viewportTop = rect.top;
        height = Math.min(rect.height, 32);
      }
    }

    const debugKey = `${pos.paragraphId}:${pos.runId}[${pos.offset}]|rects=${charRects.length}|left=${Math.round(viewportLeft)}|top=${Math.round(viewportTop)}|h=${Math.round(height)}`;
    if (debugKey !== lastDebugKey) {
      // eslint-disable-next-line no-console
      console.info("[DropCaret] layout", {
        target: `${pos.paragraphId}:${pos.runId}[${pos.offset}]`,
        charRects: charRects.length,
        viewportLeft,
        viewportTop,
        height,
        mode: charRects.length === 0 ? "fallback-empty-block" : "slot-rect",
      });
      lastDebugKey = debugKey;
    }

    return { viewportLeft, viewportTop, height };
  });

  return (
    <Show when={layout()}>
      {(l) => (
        <CaretOverlay
          active={true}
          fixed={true}
          left={l().viewportLeft}
          top={l().viewportTop}
          height={l().height}
        />
      )}
    </Show>
  );
}
