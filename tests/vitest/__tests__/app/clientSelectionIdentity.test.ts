import { describe, expect, it, vi } from "vitest";
import { createOasisEditorClient } from "@/app/client/OasisEditorClient.js";
import { createEditorStateFromParagraphRuns } from "@/core/editorState.js";
import { cloneEditorState } from "@/core/cloneState.js";
import {
  getDocumentParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { connectEditorClientHost } from "@/ui/app/connectEditorClientHost.js";

describe("client selection-only updates", () => {
  it("retains the immutable document while copying incoming selection positions", () => {
    let state = createEditorStateFromParagraphRuns([[{ text: "Example" }]]);
    const initialDocument = state.document;
    const p = getDocumentParagraphs(initialDocument)[0]!;
    const focus = vi.fn();
    const client = createOasisEditorClient();
    connectEditorClientHost(client, {
      runtimeReady: () => false,
      runtimeEditor: () => ({}) as never,
      getStateSnapshot: () => state,
      cloneState: cloneEditorState,
      applyState: (next) => {
        state = next;
      },
      resetEditorChromeState: vi.fn(),
      focusInput: focus,
      setFocused: vi.fn(),
      clearHistory: vi.fn(),
      getPersistence: () => ({ saveDocument: vi.fn() }),
      docIO: {
        handleImportFile: vi.fn(),
        handleExportDocx: vi.fn(),
        handleExportPdf: vi.fn(),
        exportDocxBlob: vi.fn(),
        exportPdfBlob: vi.fn(),
      },
    });
    const selection = {
      anchor: paragraphOffsetToPosition(p, 1),
      focus: paragraphOffsetToPosition(p, 4),
    };
    client.selection.set(selection);
    expect(state.document).toBe(initialDocument);
    expect(state.selection).toEqual(selection);
    expect(state.selection).not.toBe(selection);
    expect(state.selection.anchor).not.toBe(selection.anchor);
    selection.anchor.offset = 0;
    expect(state.selection.anchor.offset).toBe(1);
    expect(client.document.version()).toBe(0);
    expect(client.document.isDirty()).toBe(false);
    expect(client.document.get()).not.toBe(initialDocument);
    expect(focus).toHaveBeenCalledOnce();
  });
});
