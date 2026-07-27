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
    const paragraph = state.document.sections[0]!.blocks[0]!;
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
    const id = state.document.sections[0]!.blocks[0]!.id;
    const result = await client.edit.apply({ operations: [{ op: "replaceText", target: { nodeId: id }, text: "changed" }, { op: "replaceText", target: { nodeId: "missing" }, text: "boom" }] });
    expect(result.ok).toBe(false);
    expect(client.query.getText()).toBe("stable");
  });
});
