import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getDocumentParagraphs, getParagraphText, paragraphOffsetToPosition,
  type EditorState,
} from "@/core/model.js";
import { mergeClipboardFormatting } from "@/core/commands/clipboardMergeFormatting.js";
import { cutEditorSelection, writeEditorSelectionToClipboard } from "@/ui/app/clipboardWrite.js";
import { pasteFromSystemClipboard, type ClipboardPasteDeps } from "@/ui/app/clipboardPaste.js";

function harness(from = 1, to = 5) {
  const p = createEditorParagraphFromRuns([{
    text: "hello world",
    styles: { fontFamily: "Oasis Font", fontSize: 18, color: "#003399" },
  }]);
  p.style = { align: "center", spacingAfter: 20 };
  let state: EditorState = createEditorStateFromDocument(createEditorDocument([p]));
  state = {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(p, from),
      focus: paragraphOffsetToPosition(p, to),
    },
  };
  let readonly = false;
  const focus = vi.fn();
  const clear = vi.fn();
  const reset = vi.fn();
  const changeDocument = () => {
    const next = createEditorParagraphFromRuns([{ text: "different" }]);
    state = createEditorStateFromDocument(createEditorDocument([next]));
  };
  const deps: ClipboardPasteDeps = {
    state: () => state,
    isReadOnly: () => readonly,
    applyTransactionalState: (producer) => { state = producer(state); },
    applyTableAwareParagraphEdit: (s, change) => change(s),
    clearPreferredColumn: clear,
    resetTransactionGrouping: reset,
    focusInput: focus,
  };
  return {
    deps, focus, clear, reset, changeDocument,
    setReadOnly: (value: boolean) => { readonly = value; },
    get state() { return state; },
    get text() {
      return getDocumentParagraphs(state.document).map(getParagraphText).join("\n");
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "execCommand");
  document.body.innerHTML = "";
});

describe("clipboard Cut uses confirmed writes", () => {
  it("copies rich text then deletes selected text in one transaction", async () => {
    const app = harness();
    const write = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { write } });
    vi.stubGlobal("ClipboardItem", class {
      constructor(public readonly data: Record<string, Blob>) {}
    });
    expect(await cutEditorSelection(app.deps)).toBe(true);
    expect(write).toHaveBeenCalledOnce();
    expect(app.text).toBe("h world");
    expect(app.clear).toHaveBeenCalledOnce();
    expect(app.reset).toHaveBeenCalledOnce();
    expect(app.focus).toHaveBeenCalledOnce();
  });

  it("never deletes content when clipboard permissions are rejected", async () => {
    const app = harness();
    const write = vi.fn().mockRejectedValue(new Error("Clipboard denied"));
    vi.stubGlobal("navigator", { clipboard: { write } });
    vi.stubGlobal("ClipboardItem", class {
      constructor(public readonly data: Record<string, Blob>) {}
    });
    const before = app.state.document;
    expect(await cutEditorSelection(app.deps)).toBe(false);
    expect(app.state.document).toBe(before);
    expect(app.text).toBe("hello world");
    expect(app.clear).not.toHaveBeenCalled();
  });

  it("does not cut read-only documents", async () => {
    const app = harness();
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    app.setReadOnly(true);
    expect(await cutEditorSelection(app.deps)).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(app.text).toBe("hello world");
  });

  it("does not remove content after an intervening document replacement", async () => {
    const app = harness();
    let resolveWrite!: () => void;
    const write = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
      resolveWrite = resolve;
    }));
    vi.stubGlobal("navigator", { clipboard: { write } });
    vi.stubGlobal("ClipboardItem", class {
      constructor(public readonly data: Record<string, Blob>) {}
    });
    const pending = cutEditorSelection(app.deps);
    app.changeDocument();
    resolveWrite();
    expect(await pending).toBe(false);
    expect(app.text).toBe("different");
    expect(app.clear).not.toHaveBeenCalled();
  });

  it("does not write to the clipboard with a collapsed selection", async () => {
    const app = harness(3, 3);
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn() } });
    expect(await writeEditorSelectionToClipboard(app.state)).toBe(false);
    expect(await cutEditorSelection(app.deps)).toBe(false);
  });
});

describe("Merge Formatting", () => {
  it("keeps destination font, colour and paragraph style but source emphasis", () => {
    const app = harness(2, 2);
    const source = [{
      runs: [{ text: "Hi", styles: {
        bold: true, italic: true, fontFamily: "Source Font", fontSize: 33,
        color: "#FF0000", link: "https://example.org",
      } }],
      style: { align: "right" as const, spacingAfter: 5 },
    }];
    const merged = mergeClipboardFormatting(app.state, source);
    const style = merged[0]?.runs[0]?.styles;
    expect(style).toMatchObject({
      fontFamily: "Oasis Font", fontSize: 18, color: "#003399",
      bold: true, italic: true, link: "https://example.org",
    });
    expect(merged[0]?.style).toMatchObject({ align: "center", spacingAfter: 20 });
    expect(source[0]?.runs[0]?.styles?.fontFamily).toBe("Source Font");
  });

  it("keeps an explicit source false and does not inherit destination links", () => {
    const p = createEditorParagraphFromRuns([{ text: "abc", styles: {
      bold: true, link: "https://destination.invalid",
    }}]);
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    const merged = mergeClipboardFormatting(state, [{
      runs: [{ text: "x", styles: { bold: false }}],
    }]);
    expect(merged[0]?.runs[0]?.styles?.bold).toBe(false);
    expect(merged[0]?.runs[0]?.styles?.link).toBeUndefined();
  });

  it("merges formatted HTML into the editor and retains the destination character style", async () => {
    const app = harness(2, 2);
    const read = vi.fn().mockResolvedValue([{
      types: ["text/plain", "text/html"],
      getType: async (type: string) => ({
        text: async () => type === "text/html"
          ? "<p><strong>World</strong></p>" : "World",
      }),
    }]);
    vi.stubGlobal("navigator", { clipboard: { read } });
    expect(await pasteFromSystemClipboard(app.deps, "merge")).toBe(true);
    const paragraph = getDocumentParagraphs(app.state.document)[0];
    const inserted = paragraph?.runs.find((run) => run.text.includes("World"));
    expect(inserted?.styles).toMatchObject({
      fontFamily: "Oasis Font", fontSize: 18, color: "#003399", bold: true,
    });
    expect(paragraph?.style?.align).toBe("center");
  });
});
