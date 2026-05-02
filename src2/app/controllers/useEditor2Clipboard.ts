import {
  deleteBackward,
  getSelectedText,
  insertClipboardHtmlAtSelection,
  insertPlainTextAtSelection,
  parseEditor2ClipboardHtml,
  serializeEditor2SelectionToHtml,
} from "../../core/editorCommands.js";
import type { Editor2Position, Editor2State } from "../../core/model.js";
import { findImageFileFromTransfer } from "../../ui/clipboardImage.js";
import type { Editor2TransactionOptions } from "../../ui/editor2History.js";

export interface Editor2ClipboardDeps {
  state: () => Editor2State;
  isReadOnly: () => boolean;
  forcePlainTextPaste: () => boolean;
  setForcePlainTextPaste: (value: boolean) => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (
    transform: (state: Editor2State) => Editor2State,
    options?: Editor2TransactionOptions,
  ) => void;
  applyTableAwareParagraphEdit: (
    state: Editor2State,
    edit: (state: Editor2State) => Editor2State,
  ) => Editor2State;
  focusInput: () => void;
  insertImageFromFile: (file: File, position?: Editor2Position | null) => Promise<void>;
  resolvePositionAtSurfacePoint: (clientX: number, clientY: number) => Editor2Position | null;
}

export function createEditor2ClipboardController(deps: Editor2ClipboardDeps) {
  const handleCopy = (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    const text = getSelectedText(deps.state());
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    event.clipboardData?.setData("text/plain", text);
    event.clipboardData?.setData("text/html", serializeEditor2SelectionToHtml(deps.state()));
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
    event.clipboardData?.setData("text/html", serializeEditor2SelectionToHtml(deps.state()));
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
    if (html.trim().length > 0 && parseEditor2ClipboardHtml(html).length > 0) {
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