import type { EditorDocument, EditorState, EditorSelection } from "@/core/model.js";
import {
  createEditorStateFromDocument,
  createInitialEditorState,
} from "@/core/editorState.js";
import type { OasisEditorClientController } from "@/app/client/OasisEditorClient.js";
import type { createEditorDocumentIO } from "@/app/controllers/useEditorDocumentIO.js";
import type { useEditorRuntimeBootstrap } from "./useEditorRuntimeBootstrap.js";
import type { Editor } from "@/core/Editor.js";

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
  const snapshot = (): EditorState => deps.cloneState(deps.getStateSnapshot());

  controller.connectHost({
    getRuntimeEditor: (): Editor | null => (deps.runtimeReady() ? deps.runtimeEditor() : null),
    getState: (): EditorState => snapshot(),
    getDocument: (): EditorDocument => snapshot().document,
    setDocument: (document): void => {
      deps.applyState(createEditorStateFromDocument(document));
      deps.resetEditorChromeState();
      deps.focusInput();
    },
    resetDocument: (): void => {
      deps.applyState(createInitialEditorState());
      deps.resetEditorChromeState();
      deps.focusInput();
    },
    saveDocument: async (): Promise<void> => {
      await deps.getPersistence().saveDocument(snapshot().document);
    },
    getSelection: (): EditorSelection => snapshot().selection,
    setSelection: (selection): void => {
      deps.applyState({
        ...snapshot(),
        selection,
      });
      deps.focusInput();
    },
    focus: (): void => deps.focusInput(),
    blur: (): void => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      deps.setFocused(false);
    },
    clearHistory: (): void => deps.clearHistory(),
    importDocx: (file): Promise<void> => deps.docIO.handleImportFile(file),
    exportDocx: (): Promise<unknown> => Promise.resolve(deps.docIO.handleExportDocx()),
    exportPdf: (): Promise<unknown> => Promise.resolve(deps.docIO.handleExportPdf()),
  });
}
