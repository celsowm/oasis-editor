import {
  deleteBackward,
  getSelectedText,
  insertClipboardHtmlAtSelection,
  insertPlainTextAtSelection,
  parseEditorClipboardHtml,
  serializeEditorSelectionToHtml,
} from "../../core/editorCommands.js";
import type { EditorPosition, EditorState } from "../../core/model.js";
import { findImageFileFromTransfer } from "../../ui/clipboardImage.js";
import type { EditorTransactionOptions } from "../../ui/editorHistory.js";

export interface EditorClipboardDeps {
  state: () => EditorState;
  isReadOnly: () => boolean;
  forcePlainTextPaste: () => boolean;
  setForcePlainTextPaste: (value: boolean) => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (
    transform: (state: EditorState) => EditorState,
    options?: EditorTransactionOptions,
  ) => void;
  applyTableAwareParagraphEdit: (
    state: EditorState,
    edit: (state: EditorState) => EditorState,
  ) => EditorState;
  focusInput: () => void;
  insertImageFromFile: (file: File, position?: EditorPosition | null) => Promise<void>;
  resolvePositionAtSurfacePoint: (clientX: number, clientY: number) => EditorPosition | null;
}

export function createEditorClipboardController(deps: EditorClipboardDeps) {
  const handleCopy = (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    const text = getSelectedText(deps.state());
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    event.clipboardData?.setData("text/plain", text);
    event.clipboardData?.setData("text/html", serializeEditorSelectionToHtml(deps.state()));
  };

  const handleCut = (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    if (deps.isReadOnly()) {
      event.preventDefault();
      return;
    }
    const text = getSelectedText(deps.state());
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    event.clipboardData?.setData("text/plain", text);
    event.clipboardData?.setData("text/html", serializeEditorSelectionToHtml(deps.state()));
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();
    deps.applyTransactionalState((current) =>
      deps.applyTableAwareParagraphEdit(current, (temp) => deleteBackward(temp)),
    );
    deps.focusInput();
  };

  const handlePaste = (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    if (deps.isReadOnly()) {
      event.preventDefault();
      return;
    }
    if (deps.forcePlainTextPaste()) {
      deps.setForcePlainTextPaste(false);
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (text.length === 0) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState((current) =>
        deps.applyTableAwareParagraphEdit(current, (temp) =>
          insertPlainTextAtSelection(temp, text),
        ),
      );
      event.currentTarget.value = "";
      deps.focusInput();
      return;
    }

    const imageFile = findImageFileFromTransfer(event.clipboardData);
    if (imageFile) {
      event.preventDefault();
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      void deps.insertImageFromFile(imageFile);
      event.currentTarget.value = "";
      deps.focusInput();
      return;
    }

    const html = event.clipboardData?.getData("text/html") ?? "";
    if (html.trim().length > 0 && parseEditorClipboardHtml(html).length > 0) {
      event.preventDefault();
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState((current) =>
        deps.applyTableAwareParagraphEdit(current, (temp) =>
          insertClipboardHtmlAtSelection(temp, html),
        ),
      );
      event.currentTarget.value = "";
      deps.focusInput();
      return;
    }

    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();
    deps.applyTransactionalState((current) =>
      deps.applyTableAwareParagraphEdit(current, (temp) =>
        insertPlainTextAtSelection(temp, text),
      ),
    );
    event.currentTarget.value = "";
    deps.focusInput();
  };

  const handleDrop = (event: DragEvent) => {
    if (deps.isReadOnly()) {
      event.preventDefault();
      return;
    }
    const imageFile = findImageFileFromTransfer(event.dataTransfer);
    if (!imageFile) {
      return;
    }

    event.preventDefault();
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();
    const position =
      deps.resolvePositionAtSurfacePoint(event.clientX, event.clientY) ??
      deps.state().selection.focus;
    void deps.insertImageFromFile(imageFile, position);
    deps.focusInput();
  };

  return {
    handleCopy,
    handleCut,
    handlePaste,
    handleDrop,
  };
}