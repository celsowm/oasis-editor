import type { EditorState } from "@/core/model.js";
import type { SelectedImageRun } from "@/core/commands/image.js";
import type { EditorLogger } from "@/utils/logger.js";
import type { EditorTransactionPort } from "@/app/controllers/controllerPorts.js";
import type { EditorKeyboardDeps } from "@/app/controllers/EditorKeyboardDeps.js";
import { createEditorKeyboardController } from "@/app/controllers/useEditorKeyboard.js";
import type { createEditorTableOperations } from "@/app/controllers/useEditorTableOperations.js";
import type { createEditorNavigation } from "@/app/controllers/useEditorNavigation.js";
import type { createEditorHistoryActions } from "@/app/controllers/useEditorHistoryActions.js";
import type { useEditorRuntimeBootstrap } from "./useEditorRuntimeBootstrap.js";
import { markEnd, markStart } from "@/utils/performanceMetrics.js";

type EditorTableOperations = ReturnType<typeof createEditorTableOperations>;
type EditorNavigation = ReturnType<typeof createEditorNavigation>;
type EditorHistoryActions = ReturnType<typeof createEditorHistoryActions>;
type RuntimeEditorAccessor = ReturnType<
  typeof useEditorRuntimeBootstrap
>["runtimeEditor"];

const NAVIGATION_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Escape",
];

export interface EditorKeyboardBindingDeps {
  state: () => EditorState;
  isReadOnly: () => boolean;
  logger: EditorLogger;
  focusInput: () => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyState: (next: EditorState) => void;
  applyTransactionalState: EditorTransactionPort["applyTransactionalState"];
  setForcePlainTextPaste: (value: boolean) => void;
  selectedImageRun: () => SelectedImageRun | null;
  commandsController: EditorKeyboardDeps["commandsController"];
  tableOps: EditorTableOperations;
  navigation: EditorNavigation;
  historyActions: EditorHistoryActions;
  styleController: { clearPendingCaretTextStyle: () => void };
  findReplace: { isOpen: () => boolean; setIsOpen: (open: boolean) => void };
  runtimeEditor: RuntimeEditorAccessor;
}

/**
 * Assembles the keyboard controller dependency bag from the editor's cohesive
 * collaborators (transaction, navigation, history, table, find/replace, command
 * runtime) and wraps the raw handler with caret-style reset, structured logging
 * and the input-to-layout perf mark. Extracted from `OasisEditorApp` so the
 * composition root no longer hand-wires 26 keyboard callbacks inline (S1).
 */
export function createEditorKeyboardBinding(deps: EditorKeyboardBindingDeps) {
  const {
    state,
    isReadOnly,
    logger,
    focusInput,
    clearPreferredColumn,
    resetTransactionGrouping,
    applyState,
    applyTransactionalState,
    setForcePlainTextPaste,
    selectedImageRun,
    commandsController,
    tableOps,
    navigation,
    historyActions,
    styleController,
    findReplace,
    runtimeEditor,
  } = deps;

  const { handleKeyDown: rawHandleKeyDown } = createEditorKeyboardController({
    state,
    isReadOnly,
    clearPreferredColumn,
    resetTransactionGrouping,
    applyState,
    applyTransactionalState,
    applyTableAwareParagraphEdit: tableOps.applyTableAwareParagraphEdit,
    applySelectionAwareParagraphCommand:
      tableOps.applySelectionAwareParagraphCommand,
    focusInput,
    commandsController,
    selectedImageRun,
    setForcePlainTextPaste,
    moveSelectionByWord: navigation.moveSelectionByWord,
    moveSelectionToDocumentBoundary: navigation.moveSelectionToDocumentBoundary,
    moveSelectionToParagraphBoundary:
      navigation.moveSelectionToParagraphBoundary,
    moveSelectedImageByParagraph: historyActions.moveSelectedImageByParagraph,
    performUndo: historyActions.performUndo,
    performRedo: historyActions.performRedo,
    moveVerticalSelection: navigation.moveVerticalSelection,
    moveVerticalByBlock: navigation.moveVerticalByBlock,
    resolveAdjacentTableCellPosition: tableOps.resolveAdjacentTableCellPosition,
    applySelectionPreservingStructure:
      historyActions.applySelectionPreservingStructure,
    toggleFindReplace: (open) => {
      findReplace.setIsOpen(open ?? !findReplace.isOpen());
    },
    toggleReplace: (open) => {
      findReplace.setIsOpen(open ?? !findReplace.isOpen());
    },
    executeCommand: (commandName, payload) =>
      runtimeEditor().commands.execute(commandName, payload),
    canExecuteCommand: (commandName) =>
      runtimeEditor().commands.canExecute(commandName),
  });

  const handleKeyDown = (
    event: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
  ) => {
    if (NAVIGATION_KEYS.includes(event.key)) {
      styleController.clearPendingCaretTextStyle();
    }
    const mods = [
      event.ctrlKey ? "Ctrl" : null,
      event.metaKey ? "Meta" : null,
      event.altKey ? "Alt" : null,
      event.shiftKey ? "Shift" : null,
    ]
      .filter(Boolean)
      .join("+");
    const combo = mods ? `${mods}+${event.key}` : event.key;
    const sel = state().selection;
    logger.debug(
      `key:down ${combo} at ${sel.anchor.paragraphId}:${sel.anchor.runId}[${sel.anchor.offset}]`,
    );
    markStart("input-to-layout");
    rawHandleKeyDown(event);
    markEnd("input-to-layout");
  };

  return { handleKeyDown };
}
