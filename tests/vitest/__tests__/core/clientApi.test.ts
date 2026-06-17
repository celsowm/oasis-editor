import { describe, expect, it, vi } from "vitest";
import { createOasisEditorClient } from "@/app/client/OasisEditorClient.js";
import { createInitialEditorState } from "@/core/editorState.js";
import { Editor } from "@/core/Editor.js";
import type { OasisPlugin } from "@/core/plugin.js";

describe("OasisEditorClient", () => {
  it("exposes commands, state, document and lifecycle events", async () => {
    const plugin: OasisPlugin = {
      name: "ClientApi",
      commands: {
        ping: {
          execute: (payload) => payload ?? "pong",
          refresh: () => ({ isEnabled: true, value: "ready" }),
        },
      },
    };
    const editor = await Editor.create({ plugins: [plugin] });
    const client = createOasisEditorClient();
    const state = createInitialEditorState();
    const onReady = vi.fn();
    const onChange = vi.fn();
    const onDocumentChange = vi.fn();
    const onSelectionChange = vi.fn();
    const dispose = vi.fn();
    const saveDocument = vi.fn(async () => {});
    const importDocx = vi.fn(async () => {});
    const exportDocx = vi.fn(async () => "docx");
    const exportPdf = vi.fn(async () => "pdf");
    const focus = vi.fn();
    const blur = vi.fn();
    const clearHistory = vi.fn();

    client.connectHost({
      getRuntimeEditor: () => editor,
      getState: () => state,
      getDocument: () => state.document,
      setDocument: (document) => {
        state.document = document;
      },
      resetDocument: () => {
        state.document = createInitialEditorState().document;
      },
      saveDocument,
      getSelection: () => state.selection,
      setSelection: (selection) => {
        state.selection = selection;
      },
      focus,
      blur,
      clearHistory,
      importDocx,
      exportDocx,
      exportPdf,
    });
    client.setDispose(dispose);
    client.on("ready", onReady);
    client.on("change", onChange);
    client.on("documentChange", onDocumentChange);
    client.on("selectionChange", onSelectionChange);

    client.resolveReady(editor);
    client.emit("change", state);
    client.emit("documentChange", state.document);
    client.emit("selectionChange", state.selection);

    await expect(client.ready).resolves.toBe(editor);
    expect(onReady).toHaveBeenCalledWith(editor);
    expect(onChange).toHaveBeenCalledWith(state);
    expect(onDocumentChange).toHaveBeenCalledWith(state.document);
    expect(onSelectionChange).toHaveBeenCalledWith(state.selection);
    expect(client.commands.canExecute("ping")).toBe(true);
    expect(client.commands.execute("ping", "payload")).toBe("payload");
    expect(client.commands.state("ping")).toEqual({
      isEnabled: true,
      isActive: false,
      value: "ready",
    });
    expect(client.getState()).toBe(state);
    expect(client.getDocument()).toBe(state.document);
    expect(client.getSelection()).toBe(state.selection);
    expect(client.document.get()).toBe(state.document);
    expect(client.document.isDirty()).toBe(true);
    client.document.markClean();
    expect(client.isDirty()).toBe(false);
    await client.save();
    expect(saveDocument).toHaveBeenCalledTimes(1);
    client.focusEditor();
    client.blurEditor();
    expect(focus).toHaveBeenCalledTimes(1);
    expect(blur).toHaveBeenCalledTimes(1);
    client.history.clear();
    expect(clearHistory).toHaveBeenCalledTimes(1);
    await expect(client.export.docx()).resolves.toBe("docx");
    await expect(client.export.pdf()).resolves.toBe("pdf");

    client.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);

    await editor.destroy();
  });
});
