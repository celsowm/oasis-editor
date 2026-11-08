import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { paragraphOffsetToPosition } from "@/core/model.js";
import { buildEssentialsBrowser } from "@/ui/app/essentials/browser.js";
import { buildEssentialsGate } from "@/ui/app/essentials/gate.js";
import type { CreateEditorEssentialsPluginOptions } from "@/ui/app/essentials/types.js";

/** The browser adapter now also accepts the clipboard transaction boundary. */
const browserFor = (state: import("@/core/model.js").EditorState) =>
  buildEssentialsBrowser({
    state: () => state,
    isReadOnly: () => false,
    applyTransactionalState: () => {},
    tableOps: {
      applyTableAwareParagraphEdit: (current: import("@/core/model.js").EditorState) => current,
    } as CreateEditorEssentialsPluginOptions["tableOps"],
    clearPreferredColumn: () => {},
    resetTransactionGrouping: () => {},
    focusInput: () => {},
  });

const selected = () => {
  const paragraph = createEditorParagraph("Copied from Oasis");
  const state = createEditorStateFromDocument(createEditorDocument([paragraph]));
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 0),
      focus: paragraphOffsetToPosition(paragraph, 6),
    },
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, "execCommand");
  document.body.innerHTML = "";
});

describe("Ribbon model-based Copy", () => {
  it("is disabled for an empty editor selection", () => {
    const state = createEditorStateFromDocument(
      createEditorDocument([createEditorParagraph("hello")]),
    );
    expect(browserFor(state).hasSelection()).toBe(false);
  });

  it("copies the editor model selection even when a toolbar button holds focus", () => {
    const state = selected();
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();
    const commands = vi.fn(() => true);
    vi.stubGlobal("navigator", { clipboard: undefined });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: commands,
    });
    const browser = browserFor(state);
    expect(browser.hasSelection()).toBe(true);
    browser.copy();
    expect(commands).toHaveBeenCalledWith("copy");
    expect(document.activeElement).toBe(button);
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("uses the rich Clipboard API when available", async () => {
    const state = selected();
    const write = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { write } });
    vi.stubGlobal("ClipboardItem", class {
      constructor(public readonly data: Record<string, Blob>) {}
    });
    const browser = browserFor(state);
    browser.copy();
    expect(write).toHaveBeenCalledOnce();
    const item = write.mock.calls[0]?.[0]?.[0] as { data: Record<string, Blob> };
    expect(Object.keys(item.data).sort()).toEqual(["text/html", "text/plain"]);
    expect(item.data["text/plain"]?.size).toBe(6);
  });
});

describe("read-only command gates", () => {
  it("allows non-mutating actions but denies document edits", () => {
    const gate = buildEssentialsGate({
      isReadOnly: () => true,
    } as CreateEditorEssentialsPluginOptions);
    for (const command of ["copy", "find", "selectAll", "exportPdf", "toggleShowMargins"] as const) {
      expect(gate.isCommandEnabled(command)).toBe(true);
    }
    for (const command of ["insertTableOfContents", "acceptRevisions", "pageBreak"] as const) {
      expect(gate.isCommandEnabled(command)).toBe(false);
    }
  });
});
