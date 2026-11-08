import { getSelectedText } from "@/core/commands/selection.js";
import type { EssentialsBrowserCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";
import { canReadSystemClipboard, pasteFromSystemClipboard } from "../clipboardPaste.js";
import { canWriteSystemClipboard, cutEditorSelection, writeEditorSelectionToClipboard } from "../clipboardWrite.js";

/**
 * Copies the editor's *model selection*, not the DOM selection of the button
 * that currently holds focus. Keyboard copy through the editor input continues
 * to use useEditorClipboard, preserving its existing rich-clipboard behavior.
 */
export function buildEssentialsBrowser(
  options: Pick<CreateEditorEssentialsPluginOptions,
    | "state" | "isReadOnly" | "applyTransactionalState" | "tableOps"
    | "clearPreferredColumn" | "resetTransactionGrouping" | "focusInput"
  >,
): EssentialsBrowserCapability {
  const state = options.state;
  const pasteDeps = {
    state,
    isReadOnly: options.isReadOnly,
    applyTransactionalState: options.applyTransactionalState,
    applyTableAwareParagraphEdit: options.tableOps.applyTableAwareParagraphEdit,
    clearPreferredColumn: options.clearPreferredColumn,
    resetTransactionGrouping: options.resetTransactionGrouping,
    focusInput: options.focusInput,
  };
  const selectedText = (): string => getSelectedText(state());

  return {
    canCut: canWriteSystemClipboard,
    cut: (): void => { void cutEditorSelection(pasteDeps); },
    canPaste: canReadSystemClipboard,
    paste: (): void => { void pasteFromSystemClipboard(pasteDeps, "rich"); },
    pasteAsPlainText: (): void => { void pasteFromSystemClipboard(pasteDeps, "text"); },
    hasSelection: (): boolean => selectedText().length > 0,
    copy: (): void => {
      void writeEditorSelectionToClipboard(state());
    },
  };
}
