import type { EssentialsBrowserCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";
import { createEditorClipboardActions } from "../createEditorClipboardActions.js";

/** Ribbon and context-menu actions share this editor's clipboard feedback. */
export function buildEssentialsBrowser(
  options: Pick<
    CreateEditorEssentialsPluginOptions,
    | "state"
    | "isReadOnly"
    | "applyTransactionalState"
    | "tableOps"
    | "clearPreferredColumn"
    | "resetTransactionGrouping"
    | "focusInput"
    | "clipboardActions"
  >,
): EssentialsBrowserCapability {
  const actions =
    options.clipboardActions ??
    createEditorClipboardActions({
      state: options.state,
      isReadOnly: options.isReadOnly,
      applyTransactionalState: options.applyTransactionalState,
      applyTableAwareParagraphEdit:
        options.tableOps.applyTableAwareParagraphEdit,
      clearPreferredColumn: options.clearPreferredColumn,
      resetTransactionGrouping: options.resetTransactionGrouping,
      focusInput: options.focusInput,
    });
  return {
    // Without the browser API, the action offers the native keyboard path.
    canCut: (): boolean => true,
    canPaste: (): boolean => true,
    hasSelection: actions.hasSelection,
    copy: (): void => {
      void actions.copy();
    },
    cut: (): void => {
      void actions.cut();
    },
    paste: (): void => {
      void actions.paste("rich");
    },
    pasteAsPlainText: (): void => {
      void actions.paste("text");
    },
    pasteMergeFormatting: (): void => {
      void actions.paste("merge");
    },
  };
}
