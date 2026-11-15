import { describe, expect, it } from "vitest";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import { createDocument, createParagraph } from "@/app/client/publicDocumentApi.js";
import { createOasisEditorClient } from "@/app/client/OasisEditorClient.js";

describe("OasisEditorClient public editing", () => {
  it("applies edits with versions and rejects stale writes", async () => {
    let state = createEditorStateFromDocument(createDocument({ blocks: [createParagraph("before")] }));
    const client = createOasisEditorClient();
    client.connectHost({
      getRuntimeEditor: () => null,
      getState: () => state,
      getDocument: () => state.document,
      setDocument: (document) => { state = createEditorStateFromDocument(document); },
      applyTransactionalState: (producer) => { state = producer(state); },
      resetDocument: () => undefined,
      saveDocument: async () => undefined,
      getSelection: () => state.selection,
      setSelection: (selection) => { state = { ...state, selection }; },
      focus: () => undefined,
      blur: () => undefined,
      clearHistory: () => undefined,
      importDocx: async () => undefined,
      exportDocx: async () => undefined,
      exportPdf: async () => undefined,
      exportDocxBlob: async () => new Blob(),
      exportPdfBlob: async () => new Blob(),
    });
    const paragraph = state.document.sections?.[0]?.blocks[0];
    if (!paragraph) throw new Error("Expected paragraph");
    const applied = await client.edit.apply({ expectedVersion: 0, operations: [{ op: "replaceText", target: { nodeId: paragraph.id }, text: "after" }] });
    expect(applied.ok).toBe(true);
    expect(client.document.version()).toBe(1);
    const conflict = await client.edit.apply({ expectedVersion: 0, operations: [{ op: "replaceText", target: { nodeId: paragraph.id }, text: "stale" }] });
    expect(conflict).toMatchObject({ ok: false, error: { code: "DOCUMENT_VERSION_CONFLICT", actualVersion: 1 } });
  });

  it("does not mutate state when any operation fails", async () => {
    let state = createEditorStateFromDocument(createDocument({ blocks: [createParagraph("stable")] }));
    const client = createOasisEditorClient();
    client.connectHost({ getRuntimeEditor: () => null, getState: () => state, getDocument: () => state.document, setDocument: (document) => { state = createEditorStateFromDocument(document); }, applyTransactionalState: (producer) => { state = producer(state); }, resetDocument: () => undefined, saveDocument: async () => undefined, getSelection: () => state.selection, setSelection: () => undefined, focus: () => undefined, blur: () => undefined, clearHistory: () => undefined, importDocx: async () => undefined, exportDocx: async () => undefined, exportPdf: async () => undefined, exportDocxBlob: async () => new Blob(), exportPdfBlob: async () => new Blob() });
    const id = state.document.sections?.[0]?.blocks[0]?.id;
    if (!id) throw new Error("Expected document block");
    const result = await client.edit.apply({ operations: [{ op: "replaceText", target: { nodeId: id }, text: "changed" }, { op: "replaceText", target: { nodeId: "missing" }, text: "boom" }] });
    expect(result.ok).toBe(false);
    expect(client.query.getText()).toBe("stable");
  });

  it("buffers UI, document, and focus calls before connectHost and safely ignores calls after dispose", () => {
    const client = createOasisEditorClient();
    const initialDoc = createDocument({ blocks: [createParagraph("queued")] });

    expect(() => {
      client.ui.setReadOnly(true);
      client.ui.toolbar.setVisible(false);
      client.ui.zoom.set(120);
      client.document.load(initialDoc);
      client.focus.focus();
    }).not.toThrow();

    expect(client.ui.state()).toEqual({ readOnly: true, showToolbar: false });
    expect(client.document.isDirty()).toBe(false);
    expect(client.getDocument()).toBe(initialDoc);

    let state = createEditorStateFromDocument(createDocument({ blocks: [createParagraph("empty")] }));
    let uiState = {};
    let zoom = 100;
    let focused = false;

    client.connectHost({
      getRuntimeEditor: () => null,
      getState: () => state,
      getDocument: () => state.document,
      setDocument: (document) => {
        state = createEditorStateFromDocument(document);
      },
      resetDocument: () => undefined,
      saveDocument: async () => undefined,
      getSelection: () => state.selection,
      setSelection: () => undefined,
      focus: () => {
        focused = true;
      },
      blur: () => {
        focused = false;
      },
      clearHistory: () => undefined,
      importDocx: async () => undefined,
      exportDocx: async () => undefined,
      exportPdf: async () => undefined,
      exportDocxBlob: async () => new Blob(),
      exportPdfBlob: async () => new Blob(),
      getUiState: () => uiState,
      updateUiState: (patch) => {
        uiState = { ...uiState, ...patch };
        return uiState;
      },
      getZoom: () => zoom,
      setZoom: (value) => {
        zoom = value;
      },
    });

    expect(uiState).toEqual({ readOnly: true, showToolbar: false });
    expect(zoom).toBe(120);
    expect(focused).toBe(true);
    expect(client.query.getText()).toBe("queued");
    expect(client.document.isDirty()).toBe(false);

    client.dispose();
    expect(() => {
      client.ui.setReadOnly(false);
      client.document.load(createDocument({ blocks: [createParagraph("after-dispose")] }));
      client.focus.blur();
    }).not.toThrow();
    expect(uiState).toEqual({ readOnly: true, showToolbar: false });
    expect(focused).toBe(true);
  });
});
