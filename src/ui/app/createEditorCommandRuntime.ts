import { createEffect } from "solid-js";
import type { BooleanStyleKey } from "@/ui/toolbarStyleState.js";
import type { EditorState } from "@/core/model.js";
import type { EditorLogger } from "@/utils/logger.js";
import type { OasisEditorClientController } from "@/app/client/OasisEditorClient.js";
import type { TranslateFn } from "@/i18n/index.js";
import { createAppCommandsController } from "./createAppCommandsController.js";
import { createEditorKeyboardBinding } from "./createEditorKeyboardBinding.js";
import { connectEditorClientHost } from "./connectEditorClientHost.js";
import { useEditorRuntimeBootstrap } from "./useEditorRuntimeBootstrap.js";
import type { createEditorDocumentRuntime } from "./createEditorDocumentRuntime.js";
import type { createEditorInteractionRuntime } from "./createEditorInteractionRuntime.js";
import type {
  OasisEditorAppDocumentProps,
  OasisEditorAppRuntimeProps,
} from "../OasisEditorAppProps.js";

type DocumentRuntime = ReturnType<typeof createEditorDocumentRuntime>;
type InteractionRuntime = ReturnType<typeof createEditorInteractionRuntime>;

interface LinkDialogSetter {
  (state: { isOpen: boolean; initialHref: string }): void;
}

export interface EditorCommandRuntimeDeps {
  document: DocumentRuntime;
  interaction: InteractionRuntime;
  state: EditorState;
  logger: EditorLogger;
  isReadOnly: () => boolean;
  focusInput: () => void;
  applyState: (next: EditorState) => void;
  getStateSnapshot: () => EditorState;
  cloneState: (state: EditorState) => EditorState;
  setFocused: (focused: boolean) => void;
  setInitialLoading: (loading: boolean) => void;
  getForcePlainTextPaste: () => boolean;
  setForcePlainTextPaste: (value: boolean) => void;
  locale: () => string;
  translator: TranslateFn;
  runtimeClient: OasisEditorClientController;
  runtimeOptions: () => OasisEditorAppRuntimeProps;
  documentOptions: () => OasisEditorAppDocumentProps;
  importInputRef: () => HTMLInputElement | undefined;
  imageInputRef: () => HTMLInputElement | undefined;
  setLinkDialog: LinkDialogSetter;
  setImageAltDialog: (state: { isOpen: boolean; initialAlt: string }) => void;
  setImageCaptionDialog: (state: {
    isOpen: boolean;
    initialCaption: string;
  }) => void;
}

/**
 * Phase C of the editor runtime: the command controller, the public runtime
 * bootstrap (plugins/toolbar/menu), the imperative client host wiring, the
 * runtime dispatch effect and the keyboard binding. Runs synchronously after
 * the document and interaction runtimes, preserving creation order. Reads the
 * earlier phases through their returned bags. Extracted from `OasisEditorApp`
 * (S1).
 */
export function createEditorCommandRuntime(deps: EditorCommandRuntimeDeps) {
  const { document: doc, interaction, runtimeClient } = deps;

  const { commandsController, keyboardCommandsController } =
    createAppCommandsController({
      state: deps.state,
      logger: deps.logger,
      applyState: deps.applyState,
      applyTransactionalState: doc.applyTransactionalState,
      clearPreferredColumn: doc.clearPreferredColumn,
      resetTransactionGrouping: doc.resetTransactionGrouping,
      focusInput: deps.focusInput,
      selectedImageRun: interaction.selectedImageRun,
      tableOps: interaction.tableOps,
      toolbarStyleState: interaction.styleController.toolbarStyleState,
      applyBooleanStyleCommand: (style: BooleanStyleKey) =>
        interaction.styleController.applyToolbarBooleanStyleCommand(style),
      locale: deps.locale,
      setLinkDialog: deps.setLinkDialog,
      setImageAltDialog: deps.setImageAltDialog,
      setImageCaptionDialog: deps.setImageCaptionDialog,
    });

  const {
    runtimeReady,
    runtimeEditor,
    commandStateOf,
    toolbarHost,
    toolbarRegistry,
    menuRegistry,
  } = useEditorRuntimeBootstrap({
    essentials: {
      state: () => deps.state,
      isReadOnly: deps.isReadOnly,
      forcePlainTextPaste: {
        get: deps.getForcePlainTextPaste,
        set: deps.setForcePlainTextPaste,
      },
      undoStack: doc.undoStack,
      redoStack: doc.redoStack,
      commandsController,
      keyboardCommandsController,
      historyActions: doc.historyActions,
      styleController: interaction.styleController,
      tableOps: interaction.tableOps,
      docIO: doc.docIO,
      importInputRef: deps.importInputRef,
      imageInputRef: deps.imageInputRef,
      selectedImageRun: interaction.selectedImageRun,
      selectionBoxes: doc.selectionBoxes,
      focusInput: deps.focusInput,
      applyState: deps.applyState,
      applyTransactionalState: doc.applyTransactionalState,
      findReplace: {
        setIsOpen: interaction.fr.setIsOpen,
      },
    },
    externalPlugins: deps.runtimeOptions().plugins,
    t: deps.translator,
    customizeToolbar: deps.runtimeOptions().customizeToolbar,
    customizeMenubar: deps.runtimeOptions().customizeMenubar,
    initialDocument: deps.getStateSnapshot().document,
    focusEditor: deps.focusInput,
    logger: deps.logger,
    onReady: (editor) => {
      runtimeClient.resolveReady(editor);
      deps.runtimeOptions().onReady?.(runtimeClient);
    },
    onSettled: () => {
      deps.setInitialLoading(false);
    },
    onError: (error) => runtimeClient.rejectReady(error),
  });

  connectEditorClientHost(runtimeClient, {
    runtimeReady,
    runtimeEditor,
    getStateSnapshot: deps.getStateSnapshot,
    cloneState: deps.cloneState,
    applyState: deps.applyState,
    resetEditorChromeState: doc.resetEditorChromeState,
    focusInput: deps.focusInput,
    setFocused: deps.setFocused,
    clearHistory: doc.clearHistory,
    getPersistence: () =>
      deps.documentOptions().persistence ?? doc.fallbackPersistence,
    docIO: doc.docIO,
  });

  createEffect(() => {
    if (!runtimeReady()) return;
    deps.state.document;
    deps.state.selection;
    deps.state.activeSectionIndex;
    deps.state.activeZone;
    const snapshot = deps.cloneState(deps.getStateSnapshot());
    runtimeEditor().dispatch(() => snapshot);
  });

  const { handleKeyDown } = createEditorKeyboardBinding({
    state: () => deps.state,
    isReadOnly: deps.isReadOnly,
    logger: deps.logger,
    focusInput: deps.focusInput,
    clearPreferredColumn: doc.clearPreferredColumn,
    resetTransactionGrouping: doc.resetTransactionGrouping,
    applyState: deps.applyState,
    applyTransactionalState: doc.applyTransactionalState,
    setForcePlainTextPaste: deps.setForcePlainTextPaste,
    selectedImageRun: interaction.selectedImageRun,
    commandsController: keyboardCommandsController,
    tableOps: interaction.tableOps,
    navigation: interaction.navigation,
    historyActions: doc.historyActions,
    styleController: interaction.styleController,
    findReplace: interaction.fr,
    runtimeEditor,
  });

  return {
    commandsController,
    runtimeReady,
    runtimeEditor,
    commandStateOf,
    toolbarHost,
    toolbarRegistry,
    menuRegistry,
    handleKeyDown,
  };
}
