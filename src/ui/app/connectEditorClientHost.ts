import type {
  EditorDocument,
  EditorState,
} from "@/core/model.js";
import {
  createEditorStateFromDocument,
  createInitialEditorState,
} from "@/core/editorState.js";
import type { OasisEditorClientController } from "@/app/client/OasisEditorClient.js";
import type { createEditorDocumentIO } from "@/app/controllers/useEditorDocumentIO.js";
import type { useEditorRuntimeBootstrap } from "./useEditorRuntimeBootstrap.js";

type RuntimeEditorAccessor = ReturnType<
  typeof useEditorRuntimeBootstrap
>["runtimeEditor"];

type EditorDocumentIO = ReturnType<typeof createEditorDocumentIO>;

export interface ConnectEditorClientHostDeps {
  runtimeReady: () => boolean;
  runtimeEditor: RuntimeEditorAccessor;
  getStateSnapshot: () => EditorState;
  cloneState: (state: EditorState) => EditorState;
  applyState: (next: EditorState) => void;
  resetEditorChromeState: () => void;
  focusInput: () => void;
  setFocused: (focused: boolean) => void;
  clearHistory: () => void;
  getPersistence: () => {
    saveDocument: (document: EditorDocument) => Promise<void> | void;
  };
  docIO: Pick<
    EditorDocumentIO,
    "handleImportFile" | "handleExportDocx" | "handleExportPdf"
  >;
}

/**
 * Wires the imperative `OasisEditorClient` host surface (get/set document,
 * selection, save, focus, import/export) onto the editor's state and IO
 * controllers. Pure callback wiring with no reactive ownership, extracted from
 * `OasisEditorApp` so the composition root no longer hosts the public client
 * adapter inline (S1).
 */
export function connectEditorClientHost(
  controller: OasisEditorClientController,
  deps: ConnectEditorClientHostDeps,
): void {
  const snapshot = () => deps.cloneState(deps.getStateSnapshot());

  controller.connectHost({
    getRuntimeEditor: () =>
      deps.runtimeReady() ? deps.runtimeEditor() : null,
    getState: () => snapshot(),
    getDocument: () => snapshot().document,
    setDocument: (document) => {
      deps.applyState(createEditorStateFromDocument(document));
      deps.resetEditorChromeState();
      deps.focusInput();
    },
    resetDocument: () => {
      deps.applyState(createInitialEditorState());
      deps.resetEditorChromeState();
      deps.focusInput();
    },
    saveDocument: async () => {
      await deps.getPersistence().saveDocument(snapshot().document);
    },
    getSelection: () => snapshot().selection,
    setSelection: (selection) => {
      deps.applyState({
        ...snapshot(),
        selection,
      });
      deps.focusInput();
    },
    focus: () => deps.focusInput(),
    blur: () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      deps.setFocused(false);
    },
    clearHistory: () => deps.clearHistory(),
    importDocx: (file) => deps.docIO.handleImportFile(file),
    exportDocx: () => deps.docIO.handleExportDocx(),
    exportPdf: () => deps.docIO.handleExportPdf(),
  });
}
