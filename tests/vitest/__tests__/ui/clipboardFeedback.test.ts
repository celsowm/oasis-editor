import { createRoot } from "solid-js";
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
} from "@/core/model.js";
import type { EditorState } from "@/core/model.js";
import { createEditorClipboardActions } from "@/ui/app/createEditorClipboardActions.js";
import { createEditorClipboardController } from "@/app/controllers/useEditorClipboard.js";
import type { ClipboardPasteDeps } from "@/ui/app/clipboardPaste.js";
function harness() {
  const p = createEditorParagraphFromRuns([
    {
      text: "destination",
      styles: { fontFamily: "Arial", fontSize: 18, color: "#003399" },
    },
  ]);
  p.style = { align: "center" };
  let state: EditorState = createEditorStateFromDocument(
    createEditorDocument([p]),
  );
  state = {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(p, 0),
      focus: paragraphOffsetToPosition(p, 11),
    },
  };
  const transact = vi.fn((edit: (s: EditorState) => EditorState) => {
    state = edit(state);
  });
  const deps: ClipboardPasteDeps = {
    state: () => state,
    isReadOnly: () => false,
    applyTransactionalState: transact,
    applyTableAwareParagraphEdit: (s, edit) => edit(s),
    clearPreferredColumn: vi.fn(),
    resetTransactionGrouping: vi.fn(),
    focusInput: vi.fn(),
  };
  const actions = createEditorClipboardActions(deps);
  const native = createEditorClipboardController({
    ...deps,
    forcePlainTextPaste: () => false,
    setForcePlainTextPaste: vi.fn(),
    consumePasteMode: actions.consumePasteMode,
    onNativeClipboardSuccess: actions.dismiss,
    insertImageFromFile: vi.fn(),
    resolvePositionAtSurfacePoint: () => null,
  });
  const paste = (text: string, html: string) => {
    const event = {
      clipboardData: {
        getData: (type: string) => (type === "text/html" ? html : text),
        files: [],
        items: [],
        types: ["text/html", "text/plain"],
      },
      currentTarget: { value: "" },
      preventDefault: vi.fn(),
    };
    native.handlePaste(event as never);
  };
  return {
    actions,
    native,
    paste,
    transact,
    deps,
    get state() {
      return state;
    },
    replace: () => {
      state = { ...state, document: { ...state.document } };
    },
    text: () =>
      getDocumentParagraphs(state.document).map(getParagraphText).join("\n"),
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "execCommand");
});
describe("clipboard failure feedback and keyboard recovery", () => {
  it("distinguishes denied, empty and image-only reads without a mutation", async () => {
    const app = harness();
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    expect(await app.actions.paste()).toBe(false);
    expect(app.actions.notice()?.issue).toBe("access-denied");
    vi.stubGlobal("navigator", { clipboard: { readText: async () => "" } });
    expect(await app.actions.paste()).toBe(false);
    expect(app.actions.notice()?.issue).toBe("empty");
    vi.stubGlobal("navigator", {
      clipboard: { read: async () => [{ types: ["image/png"] }] },
    });
    expect(await app.actions.paste()).toBe(false);
    expect(app.actions.notice()?.issue).toBe("unsupported");
    expect(app.transact).not.toHaveBeenCalled();
    expect(app.text()).toBe("destination");
  });
  it.each(["text", "merge"] as const)(
    "recovers %s paste through the native event with the requested formatting",
    async (mode) => {
      const app = harness();
      vi.stubGlobal("navigator", { clipboard: undefined });
      const before = app.state;
      expect(await app.actions.paste(mode)).toBe(false);
      expect(app.state).toBe(before);
      app.paste(
        "source",
        '<p style="text-align:right"><strong style="font-family:Georgia;font-size:30px;color:#ff0000">source</strong></p>',
      );
      expect(app.text()).toBe("source");
      const p = getDocumentParagraphs(app.state.document)[0]!;
      const run = p.runs.find((r) => r.text.includes("source"))!;
      if (mode === "merge") {
        expect(run.styles).toMatchObject({
          fontFamily: "Arial",
          fontSize: 18,
          color: "#003399",
          bold: true,
        });
        expect(p.style?.align).toBe("center");
      } else expect(run.styles?.bold).not.toBe(true);
      expect(app.actions.notice()).toBeUndefined();
      expect(app.transact).toHaveBeenCalledOnce();
    },
  );
  it("expires the requested paste option after a document replacement or dismissal", async () => {
    const app = harness();
    vi.stubGlobal("navigator", { clipboard: undefined });
    await app.actions.paste("merge");
    app.replace();
    expect(app.actions.consumePasteMode()).toBeUndefined();
    await app.actions.paste("text");
    app.actions.dismiss();
    expect(app.actions.consumePasteMode()).toBeUndefined();
  });
  it("does not let an older failed read overwrite the newer result", async () => {
    const app = harness();
    let reject!: (error: Error) => void;
    vi.stubGlobal("navigator", {
      clipboard: {
        readText: () =>
          new Promise((_, r) => {
            reject = r;
          }),
      },
    });
    const old = app.actions.paste("text");
    vi.stubGlobal("navigator", { clipboard: { readText: async () => "" } });
    await app.actions.paste("rich");
    reject(new Error("late denial"));
    await old;
    expect(app.actions.notice()?.issue).toBe("empty");
  });
  it("does not delete an old Cut target after another clipboard action supersedes it", async () => {
    const app = harness();
    let resolve!: () => void;
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: () =>
          new Promise<void>((r) => {
            resolve = r;
          }),
      },
    });
    const pending = app.actions.cut();
    vi.stubGlobal("navigator", { clipboard: { writeText: async () => {} } });
    expect(await app.actions.copy()).toBe(true);
    resolve();
    expect(await pending).toBe(false);
    expect(app.text()).toBe("destination");
    expect(app.transact).not.toHaveBeenCalled();
  });
  it("cancels a pending mutation when its editor is disposed", async () => {
    const app = harness();
    let dispose!: () => void;
    const actions = createRoot((cleanup) => {
      dispose = cleanup;
      return createEditorClipboardActions(app.deps);
    });
    let resolve!: (text: string) => void;
    vi.stubGlobal("navigator", {
      clipboard: {
        readText: () =>
          new Promise<string>((r) => {
            resolve = r;
          }),
      },
    });
    const pending = actions.paste("text");
    dispose();
    resolve("source");
    expect(await pending).toBe(false);
    expect(app.text()).toBe("destination");
    expect(app.transact).not.toHaveBeenCalled();
    expect(actions.notice()).toBeUndefined();
  });
  it("keeps notices and pending paste options local to each editor", async () => {
    const first = harness();
    const second = harness();
    vi.stubGlobal("navigator", { clipboard: undefined });
    await first.actions.paste("merge");
    expect(first.actions.notice()?.issue).toBe("access-denied");
    expect(second.actions.notice()).toBeUndefined();
    expect(second.actions.consumePasteMode()).toBeUndefined();
    expect(first.actions.consumePasteMode()).toBe("merge");
    expect(first.actions.consumePasteMode()).toBeUndefined();
  });
  it("a denied Cut and native Cut without writable event data both retain text", async () => {
    const app = harness();
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    });
    expect(await app.actions.cut()).toBe(false);
    expect(app.actions.notice()).toMatchObject({
      action: "cut",
      issue: "access-denied",
    });
    app.native.handleCut({
      clipboardData: null,
      preventDefault: vi.fn(),
    } as never);
    app.native.handleCut({
      clipboardData: {
        setData: () => {
          throw new Error("denied");
        },
      },
      preventDefault: vi.fn(),
    } as never);
    expect(app.text()).toBe("destination");
    expect(app.transact).not.toHaveBeenCalled();
  });
});
