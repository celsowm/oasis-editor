import { describe, expect, it, vi } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getDocumentParagraphs,
  paragraphOffsetToPosition,
  type EditorState,
  type EditorParagraphNode,
} from "@/core/model.js";
import { createEditorFormatPainter } from "@/ui/app/createEditorFormatPainter.js";

function harness() {
  const source = createEditorParagraphFromRuns([
    { text: "Source", styles: { bold: true, fontFamily: "Original Font" } },
  ]);
  const first = createEditorParagraph("alpha");
  const second = createEditorParagraph("bravo");
  let state: EditorState = createEditorStateFromDocument(
    createEditorDocument([source, first, second]),
  );
  let readOnly = false;
  const history: EditorState[] = [];
  const focusInput = vi.fn();
  const painter = createEditorFormatPainter({
    state: () => state,
    isReadOnly: () => readOnly,
    applyTransactionalState: (change): void => {
      const next = change(state);
      if (next.document !== state.document) history.push(state);
      state = next;
    },
    applyTableAwareParagraphEdit: (current, change) => change(current),
    clearPreferredColumn: vi.fn(),
    resetTransactionGrouping: vi.fn(),
    focusInput,
  });
  const select = (p: EditorParagraphNode, start: number, end: number): void => {
    state = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(p, start),
        focus: paragraphOffsetToPosition(p, end),
      },
    };
  };
  const styles = (index: number) =>
    getDocumentParagraphs(state.document)[index]?.runs[0]?.styles;
  return {
    painter, source, first, second, select, styles, history, focusInput,
    setReadOnly: (readOnlyValue: boolean) => { readOnly = readOnlyValue; },
    replaceDocument: (): void => {
      state = createEditorStateFromDocument(
        createEditorDocument([createEditorParagraph("replaced")]),
      );
    },
  };
}

describe("per-editor Format Painter gesture controller", () => {
  it("paints the next finalized selection and disarms one-shot mode", () => {
    const app = harness();
    app.select(app.source, 0, 6);
    expect(app.painter.armOnce()).toBe(true);
    expect(app.painter.mode()).toBe("once");
    expect(app.painter.applyToSelection("pointer")).toBe(false);
    expect(app.painter.mode()).toBe("once");

    app.select(app.first, 0, 5);
    expect(app.painter.applyToSelection("pointer")).toBe(true);
    expect(app.styles(1)?.bold).toBe(true);
    expect(app.painter.mode()).toBeNull();
    expect(app.history).toHaveLength(1);
    expect(app.focusInput).toHaveBeenCalled();
    app.select(app.second, 0, 5);
    expect(app.painter.applyToSelection("pointer")).toBe(false);
    expect(app.styles(2)?.bold).toBeUndefined();
  });

  it("keeps continuous mode armed after multiple document transactions", () => {
    const app = harness();
    app.select(app.source, 0, 6);
    expect(app.painter.armContinuous()).toBe(true);
    app.select(app.first, 0, 5);
    expect(app.painter.applyToSelection("pointer")).toBe(true);
    expect(app.painter.mode()).toBe("continuous");
    app.select(app.second, 0, 5);
    expect(app.painter.applyToSelection("pointer")).toBe(true);
    expect(app.styles(1)?.bold).toBe(true);
    expect(app.styles(2)?.bold).toBe(true);
    expect(app.history).toHaveLength(2);
    app.painter.cancel();
    expect(app.painter.mode()).toBeNull();
  });

  it("supports a clicked word and ignores keyboard caret moves", () => {
    const app = harness();
    app.select(app.source, 0, 6);
    app.painter.armOnce();
    app.select(app.first, 2, 2);
    expect(app.painter.applyToSelection("keyboard")).toBe(false);
    expect(app.painter.mode()).toBe("once");
    expect(app.painter.applyToSelection("pointer")).toBe(true);
    expect(app.styles(1)?.bold).toBe(true);
    expect(app.painter.mode()).toBeNull();
  });

  it("does not run when read-only or after another document replaces the source", () => {
    const app = harness();
    app.select(app.source, 0, 6);
    app.setReadOnly(true);
    expect(app.painter.armOnce()).toBe(false);
    app.setReadOnly(false);
    app.painter.armContinuous();
    app.replaceDocument();
    expect(app.painter.applyToSelection("pointer")).toBe(false);
    expect(app.painter.mode()).toBeNull();
    expect(app.history).toHaveLength(0);
  });

  it("keeps two mounted editor controllers independent", () => {
    const a = harness();
    const b = harness();
    a.select(a.source, 0, 6);
    b.select(b.source, 0, 6);
    a.painter.armOnce();
    b.painter.armContinuous();
    a.select(a.first, 0, 5);
    a.painter.applyToSelection("pointer");
    expect(a.painter.mode()).toBeNull();
    expect(b.painter.mode()).toBe("continuous");
    expect(b.styles(1)?.bold).toBeUndefined();
    b.painter.cancel();
  });
});
