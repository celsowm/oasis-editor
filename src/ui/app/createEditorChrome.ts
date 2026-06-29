import type { MergeKey } from "@/core/transactionMergeKeys.js";
import type { EditorSelection, EditorState } from "@/core/model.js";
import type { ToolbarStyleState } from "@/ui/toolbarStyleState.js";
import type { TranslateFn } from "@/i18n/index.js";
import type { EditorLogger } from "@/utils/logger.js";
import type { createEditorTableOperations } from "@/app/controllers/useEditorTableOperations.js";
import type { FontDialogInitialValues } from "@/ui/components/Dialogs/FontDialog.js";
import type { ParagraphDialogInitialValues } from "@/ui/components/Dialogs/ParagraphDialog.js";
import type { TablePropertiesDialogInitialValues } from "@/ui/components/Dialogs/TablePropertiesDialog.js";

import { createEditorFontOptions } from "./useEditorFontOptions.js";
import { createFontDialogBridge } from "./useFontDialogBridge.js";
import { createParagraphDialogBridge } from "./useParagraphDialogBridge.js";
import { createTablePropertiesDialogBridge } from "./useTablePropertiesDialogBridge.js";
import { createEditorContextMenuClipboard } from "./useEditorContextMenuClipboard.js";
import { createEditorTableContextMenuActions } from "./createEditorTableContextMenuActions.js";

type EditorTableOperations = ReturnType<typeof createEditorTableOperations>;

interface DialogState<TInitial> {
  isOpen: boolean;
  initial: TInitial;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

export interface EditorChromeDeps {
  state: () => EditorState;
  selection: () => EditorSelection;
  toolbarStyleState: () => ToolbarStyleState;
  isReadOnly: () => boolean;
  t: TranslateFn;
  logger: EditorLogger;
  setFontDialog: (state: DialogState<FontDialogInitialValues>) => void;
  setParagraphDialog: (
    state: DialogState<ParagraphDialogInitialValues>,
  ) => void;
  setTablePropertiesDialog: (
    state: DialogState<TablePropertiesDialogInitialValues>,
  ) => void;
  setContextMenu: (state: ContextMenuState) => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: MergeKey },
  ) => void;
  applyTableAwareParagraphEdit: (
    state: EditorState,
    edit: (state: EditorState) => EditorState,
  ) => EditorState;
  focusInput: () => void;
  promptForLink: () => void;
  tableOps: EditorTableOperations;
}

/**
 * Owns the editor "chrome": font option catalogues, the font/paragraph/table
 * dialog bridges and the context-menu clipboard wiring. Extracted from
 * `OasisEditorApp` so the composition root only creates and renders contexts
 * instead of mapping every dialog/menu callback by hand (S1).
 */
export function createEditorChrome(
  deps: EditorChromeDeps,
): ReturnType<typeof createEditorChromeImpl> {
  return createEditorChromeImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEditorChromeImpl(deps: EditorChromeDeps) {
  const {
    computeFontFamilyOptions,
    computeFontSizeOptions,
    loadLocalFontFamilyOptions,
  } = createEditorFontOptions({
    state: deps.state,
    toolbarStyleState: deps.toolbarStyleState,
  });

  const fontDialogBridge = createFontDialogBridge({
    toolbarStyleState: deps.toolbarStyleState,
    selection: deps.selection,
    isReadOnly: deps.isReadOnly,
    loadLocalFontFamilyOptions,
    setFontDialog: deps.setFontDialog,
    setContextMenu: deps.setContextMenu,
    clearPreferredColumn: deps.clearPreferredColumn,
    resetTransactionGrouping: deps.resetTransactionGrouping,
    applyTransactionalState: deps.applyTransactionalState,
    focusInput: deps.focusInput,
  });
  const openFontDialog = fontDialogBridge.openFontDialog;

  const paragraphDialogBridge = createParagraphDialogBridge({
    toolbarStyleState: deps.toolbarStyleState,
    isReadOnly: deps.isReadOnly,
    setParagraphDialog: deps.setParagraphDialog,
    setContextMenu: deps.setContextMenu,
    clearPreferredColumn: deps.clearPreferredColumn,
    resetTransactionGrouping: deps.resetTransactionGrouping,
    applyTransactionalState: deps.applyTransactionalState,
    focusInput: deps.focusInput,
  });
  const openParagraphDialog = paragraphDialogBridge.openParagraphDialog;

  const tablePropertiesDialogBridge = createTablePropertiesDialogBridge({
    state: deps.state,
    isReadOnly: deps.isReadOnly,
    setTablePropertiesDialog: deps.setTablePropertiesDialog,
    setContextMenu: deps.setContextMenu,
    clearPreferredColumn: deps.clearPreferredColumn,
    resetTransactionGrouping: deps.resetTransactionGrouping,
    applyTransactionalState: deps.applyTransactionalState,
    focusInput: deps.focusInput,
  });
  const openTablePropertiesDialog =
    tablePropertiesDialogBridge.openTablePropertiesDialog;

  const applyTableContextCommand = (
    producer: (current: EditorState) => EditorState,
    mergeKey: MergeKey,
  ): void => {
    deps.applyTransactionalState(producer, { mergeKey });
    deps.focusInput();
  };

  const contextMenuClipboard = createEditorContextMenuClipboard({
    state: deps.state,
    isReadOnly: deps.isReadOnly,
    t: deps.t,
    logger: deps.logger,
    setContextMenu: deps.setContextMenu,
    clearPreferredColumn: deps.clearPreferredColumn,
    resetTransactionGrouping: deps.resetTransactionGrouping,
    applyTransactionalState: deps.applyTransactionalState,
    applyTableAwareParagraphEdit: deps.applyTableAwareParagraphEdit,
    focusInput: deps.focusInput,
    promptForLink: deps.promptForLink,
    openFontDialog,
    openParagraphDialog,
    table: createEditorTableContextMenuActions({
      state: deps.state,
      tableOps: deps.tableOps,
      isInsideTable: tablePropertiesDialogBridge.isInsideTable,
      openTablePropertiesDialog,
      applyTableContextCommand,
    }),
  });

  return {
    computeFontFamilyOptions,
    computeFontSizeOptions,
    applyFontDialogValues: fontDialogBridge.applyFontDialogValues,
    applyParagraphDialogValues:
      paragraphDialogBridge.applyParagraphDialogValues,
    setParagraphDialogDefault: paragraphDialogBridge.setParagraphDialogDefault,
    applyTablePropertiesDialogValues:
      tablePropertiesDialogBridge.applyTablePropertiesDialogValues,
    buildContextMenuItems: contextMenuClipboard.buildContextMenuItems,
    handleEditorContextMenu: contextMenuClipboard.handleEditorContextMenu,
    closeContextMenu: contextMenuClipboard.closeContextMenu,
  };
}
