import { createMemo, Show } from "solid-js";
import type {
  EditorLayoutDocument,
  EditorPosition,
  EditorState,
} from "@/core/model.js";
import { getParagraphs, positionToParagraphOffset } from "@/core/model.js";
import type { CanvasLayoutSnapshotProvider } from "@/ui/canvas/canvasLayoutSnapshotProvider.js";
import {
  getCaretRectFromSnapshot,
  getParagraphRectFromSnapshot,
} from "@/ui/canvas/CanvasGeometry.js";
import { CaretOverlay } from "./CaretOverlay.js";
import { JSX } from "solid-js";

export function DropCaret(props: {
  surfaceRef: HTMLDivElement | undefined;
  state: EditorState;
  documentLayout: () => EditorLayoutDocument;
  snapshotProvider: CanvasLayoutSnapshotProvider;
  zoomFactor?: () => number;
  targetPos: () => EditorPosition;
  pointerPos?: () => { x: number; y: number } | null;
  caretViewport?: () => { left: number; top: number; height: number } | null;
}): JSX.Element {
  const layout = createMemo(
    (): {
      viewportLeft: number;
      viewportTop: number;
      height: number;
    } | null => {
      const pos = props.targetPos();
      const surfaceRef = props.surfaceRef;
      if (!surfaceRef) return null;

      const snapshot = props.snapshotProvider.getCanvasLayoutSnapshot({
        surface: surfaceRef,
        state: props.state,
        documentLayout: props.documentLayout(),
        zoomFactor: props.zoomFactor?.(),
      });

      let viewportLeft = 0;
      let viewportTop = 0;
      let height = 28;

      if (snapshot) {
        const paragraphNode = getParagraphs(props.state).find(
          (p): boolean => p.id === pos.paragraphId,
        );
        const paragraphOffset = paragraphNode
          ? positionToParagraphOffset(paragraphNode, pos)
          : 0;
        const caretRect = getCaretRectFromSnapshot(
          snapshot,
          pos,
          paragraphOffset,
        );
        if (caretRect) {
          return {
            viewportLeft: caretRect.left,
            viewportTop: caretRect.top,
            height: Math.min(caretRect.height || 28, 32),
          };
        }
        const paragraphRect = getParagraphRectFromSnapshot(
          snapshot,
          pos.paragraphId,
          "end",
        );
        if (paragraphRect) {
          return {
            viewportLeft: paragraphRect.left,
            viewportTop: paragraphRect.top,
            height: paragraphRect.height || 28,
          };
        }
      }

      const caret = props.caretViewport?.() ?? null;
      if (caret) {
        viewportLeft = caret.left;
        viewportTop = caret.top;
        height = Math.max(12, Math.min(36, caret.height));
        return { viewportLeft, viewportTop, height };
      }
      const pointer = props.pointerPos?.() ?? null;
      if (pointer) {
        viewportLeft = pointer.x;
        viewportTop = pointer.y - 12;
        height = 24;
        return { viewportLeft, viewportTop, height };
      }

      return { viewportLeft, viewportTop, height };
    },
  );

  return (
    <Show when={layout()}>
      {(l): JSX.Element => (
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
