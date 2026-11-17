import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getDocumentParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  type EditorState,
} from "@/core/model.js";
import {
  collapseSelectionAtPosition,
  createEditorTextDrag,
} from "@/app/controllers/useEditorTextDrag.js";
import type { SurfaceHit } from "@/ui/canvas/CanvasHitTestService.js";

/**
 * Regression coverage for the click-to-collapse caret path: a press that lands
 * inside the current selection and never becomes a drag must move the caret
 * without recording an undo entry. Word does not add an undo step for a click,
 * and the recorded no-op entry used to make the first Ctrl+Z after a click do
 * nothing visible (which also broke the popup-dismissal browser suite).
 */
function harness(from = 0, to = 5) {
  const paragraph = createEditorParagraphFromRuns([
    { text: "alpha beta gamma" },
  ]);
  let state: EditorState = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  state = {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, from),
      focus: paragraphOffsetToPosition(paragraph, to),
    },
  };
  const applied: EditorState[] = [];
  const transactions: EditorState[] = [];
  const drag = createEditorTextDrag({
    state: () => state,
    isReadOnly: () => false,
    resolveSurfaceHitAtPoint: () => hitAt(state, 9),
    applyTransactionalState: (producer) => {
      const next = producer(state);
      if (next === state) return;
      transactions.push(next);
      state = next;
    },
    applyState: (next) => {
      applied.push(next);
      state = next;
    },
    applyTableAwareParagraphEdit: (current, edit) => edit(current),
    clearPreferredColumn: vi.fn(),
    resetTransactionGrouping: vi.fn(),
    focusInputAfterPointerSelection: vi.fn(),
  });
  return {
    drag,
    applied,
    transactions,
    paragraph,
    get state() {
      return state;
    },
    setState(next: EditorState) {
      state = next;
    },
  };
}

function hitAt(state: EditorState, offset: number): SurfaceHit {
  const paragraph = getDocumentParagraphs(state.document)[0]!;
  return {
    zone: "main",
    paragraphId: paragraph.id,
    paragraphOffset: offset,
    position: paragraphOffsetToPosition(paragraph, offset),
    source: "canvas-layout",
    resolvedFromParagraph: true,
  };
}

function pointerEvent(
  type: string,
  point: { x: number; y: number },
): PointerEvent {
  return Object.assign(new Event(type), {
    pointerId: 1,
    clientX: point.x,
    clientY: point.y,
    ctrlKey: false,
    metaKey: false,
  }) as unknown as PointerEvent;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("collapseSelectionAtPosition", () => {
  it("collapses the caret at a position inside the selection", () => {
    const h = harness(0, 5);
    const collapsed = collapseSelectionAtPosition(
      h.state,
      hitAt(h.state, 2).position,
    );
    expect(collapsed).not.toBe(h.state);
    // The document is untouched: this is a caret move, not an edit.
    expect(collapsed.document).toBe(h.state.document);
    expect(collapsed.selection.anchor.offset).toBe(2);
    expect(collapsed.selection.focus.offset).toBe(2);
  });

  it("returns the same state for an outside position or a collapsed caret", () => {
    const h = harness(0, 5);
    expect(
      collapseSelectionAtPosition(h.state, hitAt(h.state, 9).position),
    ).toBe(h.state);
    const caret = harness(3, 3);
    expect(
      collapseSelectionAtPosition(caret.state, hitAt(caret.state, 3).position),
    ).toBe(caret.state);
  });
});

describe("click inside a selection", () => {
  it("moves the caret without recording an undo entry", () => {
    const h = harness(0, 5);
    const inside = hitAt(h.state, 2);
    expect(
      h.drag.tryStartTextDrag(
        pointerEvent("pointerdown", { x: 40, y: 40 }),
        inside,
      ),
    ).toBe(true);
    // A press that never moves past the drag threshold is a click.
    window.dispatchEvent(pointerEvent("pointerup", { x: 40, y: 40 }));

    expect(h.transactions).toEqual([]);
    expect(h.applied).toHaveLength(1);
    expect(h.state.selection.anchor.offset).toBe(2);
    expect(h.state.selection.focus.offset).toBe(2);
  });

  it("still records one undoable transaction for a real drag", () => {
    const h = harness(0, 5);
    const inside = hitAt(h.state, 2);
    h.drag.tryStartTextDrag(
      pointerEvent("pointerdown", { x: 40, y: 40 }),
      inside,
    );
    window.dispatchEvent(pointerEvent("pointermove", { x: 90, y: 40 }));
    window.dispatchEvent(pointerEvent("pointerup", { x: 90, y: 40 }));

    expect(h.transactions).toHaveLength(1);
    expect(h.applied).toEqual([]);
    expect(
      getParagraphText(getDocumentParagraphs(h.state.document)[0]!),
    ).not.toBe("alpha beta gamma");
  });
});
