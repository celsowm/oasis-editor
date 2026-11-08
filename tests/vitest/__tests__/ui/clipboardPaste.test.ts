import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { getDocumentParagraphs, getParagraphText, paragraphOffsetToPosition } from "@/core/model.js";
import type { EditorState } from "@/core/model.js";
import { canReadSystemClipboard, pasteFromSystemClipboard, type ClipboardPasteDeps } from "@/ui/app/clipboardPaste.js";

function harness(initialText = "Hi") {
  const para = createEditorParagraph(initialText);
  let state: EditorState = createEditorStateFromDocument(createEditorDocument([para]));
  state = {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(para, initialText.length),
      focus: paragraphOffsetToPosition(para, initialText.length),
    },
  };
  let readonly = false;
  const focus = vi.fn();
  const reset = vi.fn();
  const clear = vi.fn();
  const deps: ClipboardPasteDeps = {
    state: () => state,
    isReadOnly: () => readonly,
    applyTransactionalState: (producer) => { state = producer(state); },
    applyTableAwareParagraphEdit: (current, edit) => edit(current),
    clearPreferredColumn: clear,
    resetTransactionGrouping: reset,
    focusInput: focus,
  };
  return {
    deps,
    get text() {
      return getDocumentParagraphs(state.document)
        .map((p) => getParagraphText(p)).join("\n");
    },
    get state() { return state; },
    changeDocument: () => {
      state = createEditorStateFromDocument(
        createEditorDocument([createEditorParagraph("Replaced")]),
      );
    },
    setReadOnly: (value: boolean) => { readonly = value; },
    focus, clear, reset,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("programmatic clipboard paste", () => {
  it("inserts plain text into the model with one transaction", async () => {
    const app = harness();
    const readText = vi.fn().mockResolvedValue(" there");
    vi.stubGlobal("navigator", { clipboard: { readText } });
    expect(canReadSystemClipboard()).toBe(true);
    expect(await pasteFromSystemClipboard(app.deps, "text")).toBe(true);
    expect(app.text).toBe("Hi there");
    expect(app.focus).toHaveBeenCalledOnce();
    expect(app.clear).toHaveBeenCalledOnce();
    expect(app.reset).toHaveBeenCalledOnce();
  });

  it("preserves rich markup when available and ignores plain-text fallback", async () => {
    const app = harness();
    const read = vi.fn().mockResolvedValue([{
      types: ["text/html", "text/plain"],
      getType: async (type: string) => ({
        text: async () => type === "text/html"
          ? "<p><strong>World</strong></p>" : "World",
      }),
    }]);
    vi.stubGlobal("navigator", { clipboard: { read, readText: async () => "fallback" } });
    expect(await pasteFromSystemClipboard(app.deps, "rich")).toBe(true);
    expect(app.text).toContain("World");
    const paragraphs = getDocumentParagraphs(app.state.document);
    expect(paragraphs.some((p) =>
      p.runs.some((run) => run.text.includes("World") && run.styles?.bold === true)
    )).toBe(true);
  });

  it("does not insert when permissions are unavailable", async () => {
    const app = harness();
    vi.stubGlobal("navigator", { clipboard: {
      readText: vi.fn().mockRejectedValue(new Error("not allowed")),
    } });
    const before = app.state.document;
    expect(await pasteFromSystemClipboard(app.deps, "text")).toBe(false);
    expect(app.state.document).toBe(before);
    expect(app.focus).not.toHaveBeenCalled();
  });

  it("never modifies read-only documents", async () => {
    const app = harness();
    const readText = vi.fn().mockResolvedValue("source");
    vi.stubGlobal("navigator", { clipboard: { readText } });
    app.setReadOnly(true);
    expect(await pasteFromSystemClipboard(app.deps, "text")).toBe(false);
    expect(readText).not.toHaveBeenCalled();
    expect(app.text).toBe("Hi");
  });

  it("cancels stale async paste if the document changed during a permission prompt", async () => {
    const app = harness();
    let settle!: (value: string) => void;
    const readText = vi.fn().mockImplementation(() =>
      new Promise<string>((resolve) => { settle = resolve; })
    );
    vi.stubGlobal("navigator", { clipboard: { readText } });
    const pending = pasteFromSystemClipboard(app.deps, "text");
    app.changeDocument();
    settle("WRONG DOCUMENT");
    expect(await pending).toBe(false);
    expect(app.text).toBe("Replaced");
    expect(app.focus).not.toHaveBeenCalled();
  });

  it("uses plain text rather than HTML when explicitly requested", async () => {
    const app = harness();
    const read = vi.fn().mockResolvedValue([{
      types: ["text/html", "text/plain"],
      getType: async (type: string) => ({ text: async () =>
        type === "text/html" ? "<b>Bold</b>" : "plain" }),
    }]);
    vi.stubGlobal("navigator", { clipboard: { read } });
    expect(await pasteFromSystemClipboard(app.deps, "text")).toBe(true);
    expect(app.text).toBe("Hiplain");
    expect(app.state.document.sections[0]?.blocks[0]?.type).toBe("paragraph");
  });
});
