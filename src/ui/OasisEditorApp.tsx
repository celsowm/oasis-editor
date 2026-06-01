import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from "solid-js";
import { OasisEditorEditor } from "./OasisEditorEditor.js";
import {
  applyEditorHistoryTransaction,
  createEmptyEditorHistoryState,
  resetEditorHistoryGrouping,
  type EditorTransactionOptions,
} from "./editorHistory.js";
import {
  type BooleanStyleKey,
} from "./toolbarStyleState.js";
import {
  getSelectedImageRun,
  insertPageBreakAtSelection,
  insertTextAtSelection,
  setSelection,
  splitBlockAtSelection,
} from "../core/editorCommands.js";
import {
  createEditorStateFromDocument,
} from "../core/editorState.js";
import { Editor } from "../core/Editor.js";
import {
  getDocumentParagraphs,
  getParagraphById,
  getParagraphText,
  findParagraphTableLocation,
  getActiveSectionIndex,
  paragraphOffsetToPosition,
  type EditorDocument,
  type EditorLayoutParagraph,
  type EditorParagraphNode,
  type EditorPosition,
  type EditorState,
} from "../core/model.js";
import { isSelectionCollapsed } from "../core/selection.js";

import { createEditorLogger } from "../utils/logger.js";
import {
  markEnd,
  markStart,
  perfTimer,
  startLongTaskObserver,
  installGlobalReport,
  registerDomStatsSurface,
} from "../utils/performanceMetrics.js";
import type {
  ImageResizeHandleDirection,
} from "./editorUiTypes.js";
import {
  cloneEditorState,
} from "../core/cloneState.js";
import { EditorToolbar } from "./components/Toolbar/EditorToolbar.js";
import { DocumentShell } from "./shells/DocumentShell.js";
import { InlineShell } from "./shells/InlineShell.js";
import { BalloonShell } from "./shells/BalloonShell.js";
import { createEditorCommandsController } from "../app/controllers/EditorCommandsController.js";
import { createEditorClipboardController } from "../app/controllers/useEditorClipboard.js";
import { createEditorKeyboardController } from "../app/controllers/useEditorKeyboard.js";
import { useEditorLayout } from "../app/controllers/useEditorLayout.js";
import { useEditorPersistence } from "../app/controllers/useEditorPersistence.js";
import { useEditorFindReplace } from "../app/controllers/useEditorFindReplace.js";
import { createEditorTableOperations } from "../app/controllers/useEditorTableOperations.js";
import { createEditorImageOperations } from "../app/controllers/useEditorImageOperations.js";
import { createEditorTableResize } from "../app/controllers/useEditorTableResize.js";
import { createEditorTableDrag } from "../app/controllers/useEditorTableDrag.js";
import { createEditorSurfaceEvents } from "../app/controllers/useEditorSurfaceEvents.js";
import { createEditorTextInput } from "../app/controllers/useEditorTextInput.js";
import { createEditorTextDrag } from "../app/controllers/useEditorTextDrag.js";
import { createEditorNavigation } from "../app/controllers/useEditorNavigation.js";
import { createEditorDocumentIO } from "../app/controllers/useEditorDocumentIO.js";
import { createEditorRevisionController } from "../app/controllers/useEditorRevision.js";
import { createEditorStyleController } from "../app/controllers/useEditorStyle.js";
import { createEditorHistoryActions } from "../app/controllers/useEditorHistoryActions.js";
import { createEditorToolbarController } from "../app/controllers/useEditorToolbar.js";
import { computeLayoutInvalidationFromTransaction } from "./layoutInvalidation.js";
import { DropCaret } from "./components/DropCaret.js";
import { LinkDialog } from "./components/Dialogs/LinkDialog.js";
import { ImageAltDialog } from "./components/Dialogs/ImageAltDialog.js";
import { FontDialog, type FontDialogInitialValues } from "./components/Dialogs/FontDialog.js";
import { FindReplaceDialog } from "./components/FindReplace/FindReplaceDialog.js";
import { ContextMenu, type ContextMenuItem } from "./components/ContextMenu/ContextMenu.js";
import "./components/FindReplace/findReplace.css";
import {
  getSelectedText as getEditorSelectedText,
  serializeEditorSelectionToHtml,
  insertClipboardHtmlAtSelection,
  insertPlainTextAtSelection,
  parseEditorClipboardHtml,
  deleteBackward,
  setTextStyleValue,
  toggleTextStyle,
} from "../core/editorCommands.js";
import { setLocale, t } from "../i18n/index.js";
import { startIconObserver, stopIconObserver } from "./utils/IconManager.js";
import {
  recordCanvasDebugSelection,
  syncCanvasDebugApiVisibility,
} from "./canvas/CanvasDebug.js";
import {
  computeFontFamilyOptions as collectFontFamilyOptions,
  computeFontSizeOptions as collectFontSizeOptions,
} from "./app/fontOptions.js";
import { createEditorFocusController } from "./app/useEditorFocus.js";
import { createEditorDialogs } from "./app/useEditorDialogs.js";
import { createEditorAppState } from "./app/useEditorAppState.js";
import { createCanvasSurfaceHitResolver } from "./app/useCanvasSurfaceHitResolver.js";
import { createEssentialsPlugin } from "../plugins/internal/createEssentialsPlugin.js";

export interface OasisEditorLoadingOptions {
  label?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

export interface OasisEditorAppProps {
  showChrome?: boolean;
  shell?: "document" | "inline" | "balloon";
  uiVariant?: "classic" | "docs";
  showTitleBar?: boolean;
  showMenubar?: boolean;
  showToolbar?: boolean;
  showOutline?: boolean;
  locale?: "pt-BR" | "en";
  viewportHeight?: number | string;
  class?: string;
  style?: JSX.CSSProperties;
  initialDocument?: EditorDocument;
  initialState?: EditorState;
  onStateChange?: (state: EditorState) => void;
  readOnly?: boolean;
  persistenceEnabled?: boolean;
  layoutMode?: "fast" | "wordParity";
  loading?: boolean | OasisEditorLoadingOptions;
  onReady?: () => void;
}

export function OasisEditorApp(props: OasisEditorAppProps = {}) {
  syncCanvasDebugApiVisibility();
  createEffect(() => {
    setLocale(props.locale ?? "pt-BR");
  });
  const logger = createEditorLogger("app");
  const {
    state,
    setStateSignal,
    commitState,
    getStateSnapshot,
  } = createEditorAppState(props);
  const applyState = (nextState: EditorState) => {
    commitState(nextState);
  };

  const showChrome = () => props.showChrome ?? true;
  const showTitleBar = () => props.showTitleBar ?? true;
  const showMenubar = () => props.showMenubar ?? true;
  const showToolbar = () => props.showToolbar ?? true;
  const showOutline = () => props.showOutline ?? true;
  const layoutMode = () => props.layoutMode ?? "fast";
  const useComposedShell = () =>
    props.uiVariant === "docs" || (props.shell ?? "document") !== "document";
  const isReadOnly = () => props.readOnly ?? false;
  const loadingOptions = () =>
    typeof props.loading === "object" ? props.loading : undefined;
  const loadingLabel = () => loadingOptions()?.label ?? "Loading oasis-editor...";

  const shellComponent = () => {
    const s = props.shell ?? "document";
    if (s === "inline") return InlineShell;
    if (s === "balloon") return BalloonShell;
    return DocumentShell;
  };

  const focusController = createEditorFocusController();
  const focused = focusController.focused;
  const setFocused = focusController.setFocused;
  const focusInput = focusController.focusInput;
  const focusInputAfterPointerSelection = focusController.focusInputAfterPointerSelection;
  const [initialLoading, setInitialLoading] = createSignal(props.loading !== false);
  const [undoStack, setUndoStack] = createSignal<EditorState[]>([]);
  const [redoStack, setRedoStack] = createSignal<EditorState[]>([]);

  const {
    linkDialog,
    setLinkDialog,
    imageAltDialog,
    setImageAltDialog,
    contextMenu,
    setContextMenu,
    fontDialog,
    setFontDialog,
  } = createEditorDialogs();

  const viewportRef = () => focusController.viewportRef;
  const surfaceRef = () => focusController.surfaceRef;
  const textareaRef = () => focusController.textareaRef;
  const importInputRef = () => focusController.importInputRef;
  const imageInputRef = () => focusController.imageInputRef;
  const docIO = createEditorDocumentIO({
    state: () => state,
    applyState,
    applyTransactionalState: (producer, options) => applyTransactionalState(producer, options),
    isReadOnly,
    surfaceRef: () => surfaceRef() ?? null,
    stabilizeLayoutAfterImport: async () => {
      await stabilizeLayoutAfterImport();
    },
    resetEditorChromeState: () => resetEditorChromeState(),
    focusInput,
    logger,
  });
  const isImportInProgress = () =>
    docIO.importProgress()?.phase !== "done" &&
    docIO.importProgress()?.phase !== "error" &&
    docIO.importProgress() !== null;

  const {
    measuredBlockHeights,
    measuredParagraphLayouts,
    inputBox,
    selectionBoxes,
    selectedImageBox,
    caretBox,
    preferredColumnX,
    setPreferredColumnX,
    clearPreferredColumn,
    stabilizeLayoutAfterImport,
    setMeasuredBlockHeights,
    setMeasuredParagraphLayouts,
    applyInvalidation: applyLayoutInvalidation,
    onCleanupHook,
  } = useEditorLayout({
    state,
    surfaceRef,
    viewportRef,
    isImporting: isImportInProgress,
    layoutMode: layoutMode(),
  });

  const { status: persistenceStatus } = useEditorPersistence(
    state,
    (loadedDoc) => {
      logger.info("persistence:loaded", { docId: loadedDoc.id });
      const nextState = createEditorStateFromDocument(loadedDoc);
      commitState(nextState);
      resetEditorChromeState();
    },
    { enabled: props.persistenceEnabled ?? false },
  );

  let historyState = createEmptyEditorHistoryState();
  let forcePlainTextPaste = false;
  const cloneState = cloneEditorState;

  const applyHistoryState = (nextState: EditorState) => {
    commitState(cloneState(nextState));
  };

  const historyActions = createEditorHistoryActions({
    state: () => state,
    stateSnapshot: getStateSnapshot,
    applyHistoryState,
    applyTransactionalState: (producer, options) => applyTransactionalState(producer, options),
    focusInput,
    clearPreferredColumn,
    imageOps: () => imageOps,
    updateHistoryState: (updater) => {
      historyState = updater(historyState);
      setUndoStack(historyState.undoStack);
      setRedoStack(historyState.redoStack);
    },
    getHistoryState: () => historyState,
  });

  createEffect(() => {
    state.document;
    state.selection;
    state.activeSectionIndex;
    state.activeZone;
    recordCanvasDebugSelection(state as EditorState);
    if (isImportInProgress()) {
      return;
    }
    props.onStateChange?.(cloneState(getStateSnapshot()));
  });

  const resetTransactionGrouping = () => {
    historyState = resetEditorHistoryGrouping(historyState);
  };

  const applyTransactionalState = (
    producer: (current: EditorState) => EditorState,
    options?: EditorTransactionOptions,
  ) => {
    const prev = getStateSnapshot();
    const next = perfTimer("txn:produce", () => producer(prev), 0);
    if (next === prev) {
      return;
    }

    historyState = applyEditorHistoryTransaction(
      historyState,
      prev,
      next,
      options,
    );
    setUndoStack(historyState.undoStack);
    setRedoStack(historyState.redoStack);

    const invalidation = perfTimer(
      "txn:invalidate",
      () => computeLayoutInvalidationFromTransaction(prev, next),
      0,
    );
    applyLayoutInvalidation(invalidation);

    perfTimer("txn:setState", () => commitState(next), 0);
  };

  const selectedImageRun = () => getSelectedImageRun(state);

  const canvasHitResolver = createCanvasSurfaceHitResolver({
    state: () => state as EditorState,
    surfaceRef: () => surfaceRef() ?? null,
    viewportRef: () => viewportRef() ?? null,
    measuredBlockHeights,
    measuredParagraphLayouts,
    layoutMode,
  });
  const resolveSurfaceHitAtPoint = canvasHitResolver.resolveSurfaceHitAtPoint;

  const fr = useEditorFindReplace({
    state,
    applyState,
    applyTransactionalState,
    focusInput,
  });

  const resetEditorChromeState = () => {
    clearPreferredColumn();
    resetTransactionGrouping();
    setMeasuredBlockHeights({});
    setMeasuredParagraphLayouts({});
    setUndoStack([]);
    setRedoStack([]);
  };

  const tableOps = createEditorTableOperations({
    applyTransactionalState,
    applySelectionToStatePreservingStructure: (current, nextSelection) => ({
      ...current,
      document: cloneEditorState(current).document, 
      selection: nextSelection,
    }),
    focusInput,
    logger,
  });

  const resolvePositionAtSurfacePoint = (
    clientX: number,
    clientY: number,
  ): EditorPosition | null => {
    return resolveSurfaceHitAtPoint(clientX, clientY)?.position ?? null;
  };

  const imageOps = createEditorImageOperations({
    state,
    surfaceRef,
    resolvePositionAtSurfacePoint,
    applyState,
    applyTransactionalState,
    updateHistoryState: (updater) => {
      historyState = updater(historyState);
      setUndoStack(historyState.undoStack);
      setRedoStack(historyState.redoStack);
    },
    focusInput,
    cloneState,
    logger,
  });

  const tableResize = createEditorTableResize({
    state: () => state,
    applyTransactionalState,
    surfaceRef,
    viewportRef,
  });

  const tableDrag = createEditorTableDrag({
    state: () => state,
    applyTransactionalState,
    resolvePositionAtSurfacePoint,
    focusInput,
  });

  const revisionController = createEditorRevisionController({
    state: () => state,
    surfaceRef: () => surfaceRef() ?? null,
  });

  const styleController = createEditorStyleController({
    state: () => state,
    commandsController: () => commandsController,
    clearPreferredColumn,
    resetTransactionGrouping,
    focusInput,
    logger,
  });

  const textDrag = createEditorTextDrag({
    state: () => state,
    isReadOnly,
    resolveSurfaceHitAtPoint,
    applyTransactionalState,
    applyTableAwareParagraphEdit: tableOps.applyTableAwareParagraphEdit,
    clearPreferredColumn,
    resetTransactionGrouping,
    focusInputAfterPointerSelection,
    logger,
  });

  const surfaceEventsWithTextDrag = createEditorSurfaceEvents({
    state: () => state,
    applyState,
    tableResize,
    imageOps,
    clearPendingCaretTextStyle: styleController.clearPendingCaretTextStyle,
    clearPreferredColumn,
    resetTransactionGrouping,
    focusInputAfterPointerSelection,
    resolveSurfaceHitAtPoint,
    getParagraphById,
    textDrag: {
      tryStartTextDrag: textDrag.tryStartTextDrag,
    },
    logger,
  });

  const textInput = createEditorTextInput({
    state: () => state,
    isReadOnly,
    logger,
    clearPreferredColumn,
    pendingCaretTextStyle: styleController.pendingCaretTextStyle,
    applyTransactionalState,
    applyTableAwareParagraphEdit: tableOps.applyTableAwareParagraphEdit,
    focusInput,
  });

  const navigation = createEditorNavigation({
    state: () => state,
    applyState,
    applyTransactionalState,
    surfaceRef: () => surfaceRef() ?? null,
    caretBox: () => caretBox(),
    preferredColumnX: () => preferredColumnX(),
    setPreferredColumnX,
    clearPreferredColumn,
    resetTransactionGrouping,
    focusInput,
  });

  const onEditorMouseDown = (event: MouseEvent) => {
    // Preserve the current selection on right-click so the user can copy/cut
    // from the selected text via the context menu.
    if (event.button !== 0) {
      return;
    }
    styleController.clearPendingCaretTextStyle();
    event.preventDefault();
    focusInput();
  };

  const { handleCopy, handleCut, handlePaste, handleDrop } =
    createEditorClipboardController({
      state: () => state,
      isReadOnly,
      forcePlainTextPaste: () => forcePlainTextPaste,
      setForcePlainTextPaste: (value) => {
        forcePlainTextPaste = value;
      },
      clearPreferredColumn,
      resetTransactionGrouping,
      applyTransactionalState,
      applyTableAwareParagraphEdit: tableOps.applyTableAwareParagraphEdit,
      focusInput,
      insertImageFromFile: docIO.insertImageFromFile,
      resolvePositionAtSurfacePoint,
    });

  const commandsController = createEditorCommandsController({
    state,
    logger,
    applyState,
    applyTransactionalState,
    applySelectionAwareTextCommand: tableOps.applySelectionAwareTextCommand,
    applySelectionAwareParagraphCommand:
      tableOps.applySelectionAwareParagraphCommand,
    applyTableAwareParagraphEdit: tableOps.applyTableAwareParagraphEdit,
    focusInput,
    clearPreferredColumn,
    resetTransactionGrouping,
    toolbarStyleState: styleController.toolbarStyleState,
    selectionCollapsed: () => isSelectionCollapsed(state.selection),
    selectedImageRun,
    openLinkDialog: (initialHref) =>
      setLinkDialog({ isOpen: true, initialHref }),
    openImageAltDialog: (initialAlt) =>
      setImageAltDialog({ isOpen: true, initialAlt }),
  });

  const runtimeEditor = new Editor({
    doc: getStateSnapshot().document,
    plugins: [
      createEssentialsPlugin({
        isCommandEnabled: (commandName) =>
          !isReadOnly() &&
          (commandName !== "insertFootnote" || commandsController.canInsertFootnoteCommand()),
        selectAll: () => {
          const paragraphs = getDocumentParagraphs(state.document);
          if (paragraphs.length === 0) return false;
          const firstParagraph = paragraphs[0]!;
          const lastParagraph = paragraphs[paragraphs.length - 1]!;
          clearPreferredColumn();
          applyState(
            setSelection(state, {
              anchor: paragraphOffsetToPosition(firstParagraph, 0),
              focus: paragraphOffsetToPosition(lastParagraph, getParagraphText(lastParagraph).length),
            }),
          );
          focusInput();
          return true;
        },
        editImageAlt: () => {
          if (!selectedImageRun()) return false;
          commandsController.promptForImageAlt();
          return true;
        },
        insertFootnote: () => (commandsController.applyInsertFootnoteCommand(), true),
        pastePlainText: () => {
          forcePlainTextPaste = true;
          focusInput();
          return true;
        },
        bold: () => (keyboardCommandsController.applyBooleanStyleCommand("bold"), true),
        italic: () => (keyboardCommandsController.applyBooleanStyleCommand("italic"), true),
        underline: () => (keyboardCommandsController.applyBooleanStyleCommand("underline"), true),
        strike: () => (keyboardCommandsController.applyBooleanStyleCommand("strike"), true),
        superscript: () => (keyboardCommandsController.applyBooleanStyleCommand("superscript"), true),
        subscript: () => (keyboardCommandsController.applyBooleanStyleCommand("subscript"), true),
        link: () => (commandsController.promptForLink(), true),
        alignLeft: () => (commandsController.applyParagraphStyleCommand("align", "left"), true),
        alignCenter: () => (commandsController.applyParagraphStyleCommand("align", "center"), true),
        alignRight: () => (commandsController.applyParagraphStyleCommand("align", "right"), true),
        alignJustify: () => (commandsController.applyParagraphStyleCommand("align", "justify"), true),
        orderedList: () => (commandsController.applyParagraphListCommand("ordered"), true),
        bulletList: () => (commandsController.applyParagraphListCommand("bullet"), true),
        find: () => (fr.setIsOpen(true), true),
        replace: () => (fr.setIsOpen(true), true),
        toggleTrackChanges: () => (commandsController.applyToggleTrackChangesCommand(), true),
        acceptRevisions: () => (commandsController.applyAcceptRevisionsCommand(), true),
        rejectRevisions: () => (commandsController.applyRejectRevisionsCommand(), true),
        toggleShowMargins: () => (commandsController.applyToggleShowMarginsCommand(), true),
        toggleShowParagraphMarks: () => (commandsController.applyToggleShowParagraphMarksCommand(), true),
        undo: () => (historyActions.performUndo(), true),
        redo: () => (historyActions.performRedo(), true),
        pageBreak: () => {
          clearPreferredColumn();
          resetTransactionGrouping();
          applyTransactionalState((current) =>
            tableOps.applyTableAwareParagraphEdit(current, (temp) => insertPageBreakAtSelection(temp)),
          );
          focusInput();
          return true;
        },
        lineBreak: () => {
          clearPreferredColumn();
          resetTransactionGrouping();
          applyTransactionalState((current) =>
            tableOps.applyTableAwareParagraphEdit(current, (temp) => insertTextAtSelection(temp, "\n")),
          );
          focusInput();
          return true;
        },
        splitBlock: () => {
          if (commandsController.handleListEnter()) return true;
          clearPreferredColumn();
          resetTransactionGrouping();
          applyTransactionalState((current) =>
            tableOps.applyTableAwareParagraphEdit(current, (temp) => splitBlockAtSelection(temp)),
          );
          focusInput();
          return true;
        },
      }),
    ],
  });

  const toolbarController = createEditorToolbarController({
    state: () => state,
    undoStack,
    redoStack,
    persistenceStatus,
    importInputRef,
    imageInputRef,
    styleController,
    commandsController,
    tableOps,
    docIO,
    historyActions,
    selectionBoxes: () => selectionBoxes(),
    selectedImageRun,
    toggleFindReplace: (open) => fr.setIsOpen(open ?? !fr.isOpen()),
    executeCommand: (commandName, payload) => runtimeEditor.execute(commandName, payload),
    canExecuteCommand: (commandName) => runtimeEditor.canExecute(commandName),
    focusInput,
    clearPreferredColumn,
    resetTransactionGrouping,
    applyTransactionalState,
    logger,
  });

  const keyboardCommandsController = {
    ...commandsController,
    applyBooleanStyleCommand: (style: BooleanStyleKey) =>
      styleController.applyToolbarBooleanStyleCommand(style),
  };

  const { handleKeyDown: rawHandleKeyDown } = createEditorKeyboardController({
    state: () => state,
    isReadOnly,
    clearPreferredColumn,
    resetTransactionGrouping,
    applyState,
    applyTransactionalState,
    applyTableAwareParagraphEdit: tableOps.applyTableAwareParagraphEdit,
    applySelectionAwareParagraphCommand:
      tableOps.applySelectionAwareParagraphCommand,
    focusInput,
    commandsController: keyboardCommandsController,
    selectedImageRun,
    setForcePlainTextPaste: (value) => {
      forcePlainTextPaste = value;
    },
    moveSelectionByWord: navigation.moveSelectionByWord,
    moveSelectionToDocumentBoundary: navigation.moveSelectionToDocumentBoundary,
    moveSelectionToParagraphBoundary: navigation.moveSelectionToParagraphBoundary,
    moveSelectedImageByParagraph: historyActions.moveSelectedImageByParagraph,
    performUndo: historyActions.performUndo,
    performRedo: historyActions.performRedo,
    moveVerticalSelection: navigation.moveVerticalSelection,
    moveVerticalByBlock: navigation.moveVerticalByBlock,
    resolveAdjacentTableCellPosition: tableOps.resolveAdjacentTableCellPosition,
    applySelectionPreservingStructure: historyActions.applySelectionPreservingStructure,
    toggleFindReplace: (open) => {
      fr.setIsOpen(open ?? !fr.isOpen());
    },
    toggleReplace: (open) => {
      fr.setIsOpen(open ?? !fr.isOpen());
    },
    executeCommand: (commandName, payload) => runtimeEditor.execute(commandName, payload),
    canExecuteCommand: (commandName) => runtimeEditor.canExecute(commandName),
  });

  const handleKeyDown = (
    event: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
  ) => {
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "Escape",
      ].includes(event.key)
    ) {
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
    const sel = state.selection;
    logger.debug(
      `key:down ${combo} at ${sel.anchor.paragraphId}:${sel.anchor.runId}[${sel.anchor.offset}]`,
    );
    markStart("input-to-layout");
    rawHandleKeyDown(event);
    markEnd("input-to-layout");
  };

  const shouldShowCaret = () => {
    if (!caretBox().visible || !isSelectionCollapsed(state.selection)) {
      return false;
    }
    const anchorLoc = findParagraphTableLocation(
      state.document,
      state.selection.anchor.paragraphId,
      getActiveSectionIndex(state),
    );
    const focusLoc = findParagraphTableLocation(
      state.document,
      state.selection.focus.paragraphId,
      getActiveSectionIndex(state),
    );
    const inTableSelection =
      anchorLoc &&
      focusLoc &&
      anchorLoc.blockIndex === focusLoc.blockIndex &&
      (anchorLoc.rowIndex !== focusLoc.rowIndex ||
        anchorLoc.cellIndex !== focusLoc.cellIndex);
    return !inTableSelection;
  };

  const renderComposedShell = () => {
    const Shell = shellComponent();
    return (
      <Shell
        state={state}
        setState={setStateSignal}
        toolbarCtx={toolbarController.toolbarCtx}
        showChrome={showChrome()}
        showTitleBar={showTitleBar()}
        showMenubar={showMenubar()}
        showToolbar={showToolbar()}
        showOutline={showOutline()}
        isReadOnly={isReadOnly()}
        measuredBlockHeights={() => measuredBlockHeights()}
        measuredParagraphLayouts={() => measuredParagraphLayouts()}
        viewportHeight={() => props.viewportHeight}
        selectionBoxes={() => selectionBoxes()}
        selectedImageBox={() => selectedImageBox()}
        showFloatingTableToolbar={() =>
          !isReadOnly() && toolbarController.tableSelectionLabel() !== null
        }
        caretBox={() => caretBox()}
        inputBox={() => inputBox()}
        hoveredRevision={revisionController.hoveredRevision}
        focused={() => focused()}
        importProgress={() => docIO.importProgress()}
        showCaret={shouldShowCaret}
        class={props.class}
        style={props.style}
        layoutMode={layoutMode()}

        onViewportRef={(element: HTMLDivElement) => {
          focusController.viewportRef = element;
        }}
        onSurfaceRef={(element: HTMLDivElement) => {
          focusController.surfaceRef = element;
        }}
        onTextareaRef={(element: HTMLTextAreaElement) => {
          focusController.textareaRef = element;
        }}
        onImportInputRef={(element: HTMLInputElement) => {
          focusController.importInputRef = element;
        }}
        onImageInputRef={(element: HTMLInputElement) => {
          focusController.imageInputRef = element;
        }}
        onImportInputChange={(e: Event & { currentTarget: HTMLInputElement }) =>
          docIO.handleImportDocx(e.currentTarget.files?.[0] ?? null)
        }
        onImageInputChange={(e: Event & { currentTarget: HTMLInputElement }) =>
          docIO.handleInsertImage(e.currentTarget.files?.[0] ?? null)
        }
        onDragOver={(event: DragEvent) => event.preventDefault()}
        onDrop={handleDrop}
        onEditorMouseDown={onEditorMouseDown}
        onSurfaceMouseDown={surfaceEventsWithTextDrag.handleSurfaceMouseDown}
        onSurfaceClick={surfaceEventsWithTextDrag.handleSurfaceClick}
        onSurfaceMouseMove={tableResize.handleMouseMove}
        onSurfaceDblClick={surfaceEventsWithTextDrag.handleSurfaceDblClick}
        onParagraphMouseDown={surfaceEventsWithTextDrag.handleParagraphMouseDown}
        onRevisionMouseEnter={revisionController.handleRevisionMouseEnter}
        onRevisionMouseLeave={revisionController.handleRevisionMouseLeave}
        onImageMouseDown={(paragraphId: string, paragraphOffset: number, event: MouseEvent & { currentTarget: HTMLElement }) => {
          event.preventDefault();
          event.stopPropagation();

          const paragraph = getDocumentParagraphs(state.document).find(
            (p) => p.id === paragraphId,
          );
          if (paragraph) {
            applyState(
              setSelection(state, {
                anchor: paragraphOffsetToPosition(paragraph, paragraphOffset),
                focus: paragraphOffsetToPosition(paragraph, paragraphOffset + 1),
              }),
            );
          }

          imageOps.startImageDrag(paragraphId, paragraphOffset, event);
          focusInputAfterPointerSelection();
        }}
        onImageResizeHandleMouseDown={(paragraphId: string, paragraphOffset: number, direction: ImageResizeHandleDirection, event: MouseEvent & { currentTarget: HTMLElement }) => {
          event.preventDefault();
          event.stopPropagation();
          imageOps.startImageResize(paragraphId, paragraphOffset, direction, event, state);
        }}
        onTableDragHandleMouseDown={tableDrag.handleMouseDown}
        onInputBlur={() => setFocused(false)}
        onInputFocus={() => setFocused(true)}
        onCompositionEnd={textInput.handleCompositionEnd}
        onCompositionStart={textInput.handleCompositionStart}
        onCopy={handleCopy}
        onCut={handleCut}
        onInput={textInput.handleTextInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onEditorContextMenu={handleEditorContextMenu}
      />
    );
  };

  const computeFontFamilyOptions = (): string[] => {
    return collectFontFamilyOptions(state.document, styleController.toolbarStyleState());
  };

  const computeFontSizeOptions = (): number[] => {
    return collectFontSizeOptions(state.document, styleController.toolbarStyleState());
  };

  const openFontDialog = () => {
    const ts = styleController.toolbarStyleState();
    setFontDialog({
      isOpen: true,
      initial: {
        fontFamily: ts.fontFamily ?? "",
        fontSize: ts.fontSize ?? "",
        color: ts.color ?? "",
        bold: Boolean(ts.bold),
        italic: Boolean(ts.italic),
        underline: Boolean(ts.underline),
        strike: Boolean(ts.strike),
      },
    });
    setContextMenu({ isOpen: false, x: 0, y: 0 });
  };

  const applyFontDialogValues = (
    values: {
      fontFamily: string | null;
      fontSize: number | null;
      color: string | null;
      bold: boolean;
      italic: boolean;
      underline: boolean;
      strike: boolean;
    },
    original: FontDialogInitialValues,
  ) => {
    if (isReadOnly()) return;
    if (isSelectionCollapsed(state.selection)) {
      focusInput();
      return;
    }

    clearPreferredColumn();
    resetTransactionGrouping();

    applyTransactionalState((current) => {
      let next = current;
      if (values.fontFamily !== (original.fontFamily || null)) {
        next = setTextStyleValue(next, "fontFamily", values.fontFamily);
      }
      if (values.fontSize !== (original.fontSize ? Number(original.fontSize) : null)) {
        next = setTextStyleValue(next, "fontSize", values.fontSize);
      }
      if ((values.color ?? "") !== (original.color ?? "")) {
        next = setTextStyleValue(next, "color", values.color);
      }
      if (values.bold !== Boolean(original.bold)) {
        next = toggleTextStyle(next, "bold");
      }
      if (values.italic !== Boolean(original.italic)) {
        next = toggleTextStyle(next, "italic");
      }
      if (values.underline !== Boolean(original.underline)) {
        next = toggleTextStyle(next, "underline");
      }
      if (values.strike !== Boolean(original.strike)) {
        next = toggleTextStyle(next, "strike");
      }
      return next;
    }, { mergeKey: "font-dialog" });

    focusInput();
  };

  const programmaticCopy = async () => {
    const text = getEditorSelectedText(state);
    if (!text) return;
    const html = serializeEditorSelectionToHtml(state);
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([text], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch (err) {
      logger.warn?.("contextMenu:copy:failed", { error: String(err) });
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* ignore */
      }
    }
  };

  const programmaticCut = async () => {
    if (isReadOnly()) return;
    const text = getEditorSelectedText(state);
    if (!text) return;
    await programmaticCopy();
    clearPreferredColumn();
    resetTransactionGrouping();
    applyTransactionalState((current) =>
      tableOps.applyTableAwareParagraphEdit(current, (temp) => deleteBackward(temp)),
    );
    focusInput();
  };

  const programmaticPaste = async () => {
    if (isReadOnly()) return;
    let html = "";
    let text = "";
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes("text/html")) {
            const blob = await item.getType("text/html");
            html = await blob.text();
          }
          if (item.types.includes("text/plain")) {
            const blob = await item.getType("text/plain");
            text = await blob.text();
          }
        }
      } else if (navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText();
      }
    } catch (err) {
      logger.warn?.("contextMenu:paste:failed", { error: String(err) });
      try {
        text = await navigator.clipboard.readText();
      } catch {
        return;
      }
    }

    if (html.trim() && parseEditorClipboardHtml(html).length > 0) {
      clearPreferredColumn();
      resetTransactionGrouping();
      applyTransactionalState((current) =>
        tableOps.applyTableAwareParagraphEdit(current, (temp) =>
          insertClipboardHtmlAtSelection(temp, html),
        ),
      );
      focusInput();
      return;
    }

    if (text) {
      clearPreferredColumn();
      resetTransactionGrouping();
      applyTransactionalState((current) =>
        tableOps.applyTableAwareParagraphEdit(current, (temp) =>
          insertPlainTextAtSelection(temp, text),
        ),
      );
      focusInput();
    }
  };

  const buildContextMenuItems = (): ContextMenuItem[] => {
    const hasSelection = !isSelectionCollapsed(state.selection);
    const readOnly = isReadOnly();
    return [
      {
        id: "cut",
        label: t("contextmenu.cut"),
        icon: "scissors",
        shortcut: "Ctrl+X",
        disabled: readOnly || !hasSelection,
        testId: "editor-context-menu-cut",
        onSelect: () => {
          void programmaticCut();
        },
      },
      {
        id: "copy",
        label: t("contextmenu.copy"),
        icon: "copy",
        shortcut: "Ctrl+C",
        disabled: !hasSelection,
        testId: "editor-context-menu-copy",
        onSelect: () => {
          void programmaticCopy();
        },
      },
      {
        id: "paste",
        label: t("contextmenu.paste"),
        icon: "clipboard",
        shortcut: "Ctrl+V",
        disabled: readOnly,
        testId: "editor-context-menu-paste",
        onSelect: () => {
          void programmaticPaste();
        },
      },
      { id: "sep1", type: "separator" },
      {
        id: "link",
        label: t("contextmenu.link"),
        icon: "link",
        disabled: readOnly || !hasSelection,
        testId: "editor-context-menu-link",
        onSelect: () => {
          commandsController.promptForLink();
        },
      },
      {
        id: "font",
        label: t("contextmenu.font"),
        icon: "type",
        disabled: readOnly || !hasSelection,
        testId: "editor-context-menu-font",
        onSelect: () => {
          openFontDialog();
        },
      },
    ];
  };

  const handleEditorContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    setContextMenu({ isOpen: true, x: event.clientX, y: event.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, x: 0, y: 0 });
  };

  onMount(() => {
    startIconObserver();
    startLongTaskObserver();
    installGlobalReport();
    registerDomStatsSurface(() => surfaceRef() ?? null);
    requestAnimationFrame(() => {
      setInitialLoading(false);
      props.onReady?.();
    });
  });

  onCleanup(() => {
    runtimeEditor.destroy();
    onCleanupHook();
    surfaceEventsWithTextDrag.stopDragging();
    textDrag.stopDrag();
    imageOps.stopImageDrag();
    imageOps.stopImageResize();
    stopIconObserver();
  });

  return (
    <div
      classList={{
        "oasis-editor-shell": true,
        "oasis-editor-app": true,
        "oasis-editor-docs": useComposedShell(),
        "oasis-editor-read-only": isReadOnly(),
      }}
    >
      <Show when={!useComposedShell() && showChrome() && showToolbar()}>
        <EditorToolbar ctx={toolbarController.toolbarCtx} />
      </Show>

      <LinkDialog
        isOpen={linkDialog().isOpen}
        initialHref={linkDialog().initialHref}
        onClose={() => {
          setLinkDialog({ ...linkDialog(), isOpen: false });
          focusInput();
        }}
        onConfirm={(href) =>
          commandsController.applyLinkCommand(href.trim() || null)
        }
      />

      <ImageAltDialog
        isOpen={imageAltDialog().isOpen}
        initialAlt={imageAltDialog().initialAlt}
        onClose={() => {
          setImageAltDialog({ ...imageAltDialog(), isOpen: false });
          focusInput();
        }}
        onConfirm={(alt) => commandsController.applyImageAltCommand(alt.trim())}
      />

      <FindReplaceDialog fr={fr} />

      <FontDialog
        isOpen={fontDialog().isOpen}
        initial={fontDialog().initial}
        familyOptions={computeFontFamilyOptions()}
        sizeOptions={computeFontSizeOptions()}
        onClose={() => {
          setFontDialog({ ...fontDialog(), isOpen: false });
          focusInput();
        }}
        onApply={applyFontDialogValues}
      />

      <ContextMenu
        isOpen={contextMenu().isOpen}
        x={contextMenu().x}
        y={contextMenu().y}
        items={buildContextMenuItems()}
        onClose={closeContextMenu}
      />

      <Show when={useComposedShell()}>
        {renderComposedShell()}
      </Show>

      <Show when={!useComposedShell()}>
      <div class="oasis-editor-main-container">
        <section class="oasis-editor-stage">
          <OasisEditorEditor
            state={() => state}
            measuredBlockHeights={() => measuredBlockHeights()}
            measuredParagraphLayouts={() => measuredParagraphLayouts()}
            selectionBoxes={() => selectionBoxes()}
            selectedImageBox={() => selectedImageBox()}
            toolbarCtx={() => toolbarController.toolbarCtx}
            showFloatingTableToolbar={() =>
              !isReadOnly() && toolbarController.tableSelectionLabel() !== null
            }
            caretBox={() => caretBox()}
            inputBox={() => inputBox()}
            hoveredRevision={revisionController.hoveredRevision}
            focused={() => focused()}
            importProgress={() => docIO.importProgress()}
            layoutMode={layoutMode()}
            viewportHeight={props.viewportHeight}
            class={props.class}
            style={props.style}
            readOnly={isReadOnly()}
            showCaret={shouldShowCaret}
            onViewportRef={(element) => {
              focusController.viewportRef = element;
            }}
            onSurfaceRef={(element) => {
              focusController.surfaceRef = element;
            }}
            onTextareaRef={(element) => {
              focusController.textareaRef = element;
            }}
            onImportInputRef={(element) => {
              focusController.importInputRef = element;
            }}
            onImageInputRef={(element) => {
              focusController.imageInputRef = element;
            }}
            onImportInputChange={(e) =>
              docIO.handleImportDocx(e.currentTarget.files?.[0] ?? null)
            }
            onImageInputChange={(e) =>
              docIO.handleInsertImage(e.currentTarget.files?.[0] ?? null)
            }
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            onEditorMouseDown={onEditorMouseDown}
            onSurfaceMouseDown={surfaceEventsWithTextDrag.handleSurfaceMouseDown}
            onSurfaceClick={surfaceEventsWithTextDrag.handleSurfaceClick}
            onSurfaceMouseMove={tableResize.handleMouseMove}
            onSurfaceDblClick={surfaceEventsWithTextDrag.handleSurfaceDblClick}
            onParagraphMouseDown={surfaceEventsWithTextDrag.handleParagraphMouseDown}
            onRevisionMouseEnter={revisionController.handleRevisionMouseEnter}
            onRevisionMouseLeave={revisionController.handleRevisionMouseLeave}
            onImageMouseDown={(paragraphId, paragraphOffset, event) => {
              event.preventDefault();
              event.stopPropagation();

              const paragraph = getDocumentParagraphs(state.document).find(
                (p) => p.id === paragraphId,
              );
              if (paragraph) {
                applyState(
                  setSelection(state, {
                    anchor: paragraphOffsetToPosition(
                      paragraph,
                      paragraphOffset,
                    ),
                    focus: paragraphOffsetToPosition(
                      paragraph,
                      paragraphOffset + 1,
                    ),
                  }),
                );
              }

              imageOps.startImageDrag(paragraphId, paragraphOffset, event);
              focusInputAfterPointerSelection();
            }}
            onImageResizeHandleMouseDown={(
              paragraphId,
              paragraphOffset,
              direction,
              event,
            ) => {
              event.preventDefault();
              event.stopPropagation();
              imageOps.startImageResize(
                paragraphId,
                paragraphOffset,
                direction,
                event,
                state,
              );
            }}
            onTableDragHandleMouseDown={tableDrag.handleMouseDown}
            onInputBlur={() => setFocused(false)}
            onInputFocus={() => setFocused(true)}
            onCompositionEnd={textInput.handleCompositionEnd}
            onCompositionStart={textInput.handleCompositionStart}
            onCopy={handleCopy}
            onCut={handleCut}
            onInput={textInput.handleTextInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onEditorContextMenu={handleEditorContextMenu}
          />
        </section>
      </div>
      </Show>

      <Show when={tableResize.resizing()}>
        {(resizing) => (
          <div
            class="oasis-editor-table-resize-guide"
            classList={{
              "oasis-editor-table-resize-guide-column": resizing().type === "column",
              "oasis-editor-table-resize-guide-row": resizing().type === "row",
            }}
            style={{
              ...(resizing().type === "column"
                ? {
                    left: `${resizing().currentPos}px`,
                    top: `${resizing().guideBounds.top}px`,
                    width: "0px",
                    height: `${resizing().guideBounds.height}px`,
                  }
                : {
                    left: `${resizing().guideBounds.left}px`,
                    top: `${resizing().currentPos}px`,
                    width: `${resizing().guideBounds.width}px`,
                    height: "0px",
                  }),
            }}
          />
        )}
      </Show>

      <Show when={imageOps.dragging() && imageOps.draggedImageInfo()}>
        {(info) => (
          <img
            src={info().src}
            class="oasis-editor-image-ghost"
            style={{
              width: `${info().width}px`,
              height: `${info().height}px`,
              left: `${imageOps.mousePos().x - info().offsetX}px`,
              top: `${imageOps.mousePos().y - info().offsetY}px`,
            }}
          />
        )}
      </Show>

      <Show when={tableDrag.dragging() && tableDrag.draggedTableInfo()}>
        {(info) => (
          <div
            class="oasis-editor-table-ghost"
            style={{
              width: `${info().width}px`,
              height: `${info().height}px`,
              left: `${tableDrag.mousePos().x - info().offsetX}px`,
              top: `${tableDrag.mousePos().y - info().offsetY}px`,
            }}
          />
        )}
      </Show>

      <Show when={tableDrag.dragging() && tableDrag.dropTargetPos()}>
        {(pos) => (
          <DropCaret
            surfaceRef={surfaceRef()}
            state={state as EditorState}
            targetPos={pos}
          />
        )}
      </Show>

      <Show when={imageOps.dragging() && imageOps.dropTargetPos()}>
        {(pos) => (
          <DropCaret
            surfaceRef={surfaceRef()}
            state={state as EditorState}
            targetPos={pos}
          />
        )}
      </Show>

      <Show when={textDrag.dragging() && textDrag.dropTargetPos()}>
        {(pos) => (
          <DropCaret
            surfaceRef={surfaceRef()}
            state={state as EditorState}
            targetPos={pos}
            pointerPos={textDrag.pointerPos}
            caretViewport={textDrag.caretViewport}
          />
        )}
      </Show>

      <Show when={initialLoading()}>
        <div
          class={["oasis-editor-loading", loadingOptions()?.class]
            .filter(Boolean)
            .join(" ")}
          style={loadingOptions()?.style}
          role="status"
          aria-live="polite"
        >
          <div class="oasis-editor-loading-text">{loadingLabel()}</div>
        </div>
      </Show>
    </div>
  );
}
