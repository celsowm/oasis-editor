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
}) {
  const layout = createMemo(() => {
    const pos = props.targetPos();
    const surfaceRef = props.surfaceRef;
    if (!surfaceRef) return null;

    const charRects = collectParagraphCharRects(surfaceRef, pos.paragraphId);
    let viewportLeft = 0;
    let viewportTop = 0;
    let height = 28;

    if (charRects.length === 0) {
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
