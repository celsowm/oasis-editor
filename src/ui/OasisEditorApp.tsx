import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { type BooleanStyleKey } from "./toolbarStyleState.js";
import {
  getSelectedImageRun,
  getSelectedImageWrapPreset,
  getSelectedTextBoxRun,
  getSelectedTextBoxWrapPreset,
  isSelectedImageFixedPosition,
  isSelectedTextBoxFixedPosition,
  setSelectedImageFixedPosition,
  setImageWrapPolygon,
  setSelectedImageWrapPreset,
  setSelectedTextBoxFixedPosition,
  setSelectedTextBoxWrapPreset,
} from "../core/editorCommands.js";
import type { WrapPreset } from "../core/commands/floatingLayout.js";
import { resolveImageSrc } from "../core/model.js";
import { getCachedCanvasImage } from "./canvas/canvasImageCache.js";
import { traceImageAlphaContour } from "./canvas/imageContour.js";
import type { LayoutOptionsOverlay } from "./editorUiTypes.js";
import {
  createEditorStateFromDocument,
  createInitialEditorState,
} from "../core/editorState.js";
import { type EditorPosition, type EditorState } from "../core/model.js";
import { isSelectionCollapsed } from "../core/selection.js";

import { createEditorLogger } from "../utils/logger.js";
import {
  markEnd,
  markStart,
  startLongTaskObserver,
  installGlobalReport,
  registerDomStatsSurface,
} from "../utils/performanceMetrics.js";
import { cloneEditorState } from "../core/cloneState.js";
import { Toolbar } from "./components/Toolbar/Toolbar.js";
import { createEditorCommandsController } from "../app/controllers/EditorCommandsController.js";
import { createEditorKeyboardController } from "../app/controllers/useEditorKeyboard.js";
import { useEditorLayout } from "../app/controllers/useEditorLayout.js";
import { useEditorPersistence } from "../app/controllers/useEditorPersistence.js";
import { persistenceService } from "../app/services/PersistenceService.js";
import { useEditorFindReplace } from "../app/controllers/useEditorFindReplace.js";
import { createEditorTableOperations } from "../app/controllers/useEditorTableOperations.js";
import { createEditorImageOperations } from "../app/controllers/useEditorImageOperations.js";
import { createEditorTextBoxOperations } from "../app/controllers/useEditorTextBoxOperations.js";
import { createEditorDocumentIO } from "../app/controllers/useEditorDocumentIO.js";
import { createEditorStyleController } from "../app/controllers/useEditorStyle.js";
import { createEditorHistoryActions } from "../app/controllers/useEditorHistoryActions.js";
import "./components/FindReplace/findReplace.css";
import { setLocale } from "../i18n/index.js";
import { startIconObserver, stopIconObserver } from "./utils/IconManager.js";
import {
  recordCanvasDebugSelection,
  syncCanvasDebugApiVisibility,
} from "./canvas/CanvasDebug.js";
import { createEditorFontOptions } from "./app/useEditorFontOptions.js";
import {
  applyStoredPreciseFontPreference,
  isLocalFontAccessSupported,
} from "./app/localFontAccess.js";
import { getWelcomeSeen } from "../app/services/userPreferences.js";
import { createEditorFocusController } from "./app/useEditorFocus.js";
import { createEditorDialogs } from "./app/useEditorDialogs.js";
import { createEditorAppState } from "./app/useEditorAppState.js";
import { createCanvasSurfaceHitResolver } from "./app/useCanvasSurfaceHitResolver.js";
import { createFontDialogBridge } from "./app/useFontDialogBridge.js";
import { createParagraphDialogBridge } from "./app/useParagraphDialogBridge.js";
import { createTablePropertiesDialogBridge } from "./app/useTablePropertiesDialogBridge.js";
import { createEditorContextMenuClipboard } from "./app/useEditorContextMenuClipboard.js";
import { useEditorRuntimeBootstrap } from "./app/useEditorRuntimeBootstrap.js";
import { createEditorUiOptions } from "./app/useEditorUiOptions.js";
import { computeShouldShowCaret } from "./app/shouldShowCaret.js";
import { EditorDragLayers } from "./app/EditorDragLayers.js";
import { EditorDialogsLayer } from "./app/EditorDialogsLayer.js";
import { useEditorInteractionWiring } from "./app/useEditorInteractionWiring.js";
import { buildEditorViewProps } from "./app/buildEditorViewProps.js";
import { EditorWorkspace } from "./app/EditorWorkspace.js";
import { useEditorTransactions } from "./app/useEditorTransactions.js";
import { EDITOR_SCROLL_PADDING_PX } from "./editorLayoutConstants.js";
import { OasisEditorLoading } from "./OasisEditorLoading.js";
import { WelcomeOverlay } from "./components/WelcomeOverlay.js";
import { createOasisEditorClient } from "../app/client/OasisEditorClient.js";

import type { OasisEditorAppProps } from "./OasisEditorAppProps.js";
export type {
  OasisEditorLoadingOptions,
  OasisEditorAppUiProps,
  OasisEditorAppDocumentProps,
  OasisEditorAppRuntimeProps,
  OasisEditorAppProps,
  ToolbarLayoutMode,
  ToolbarViewMode,
} from "./OasisEditorAppProps.js";

export function OasisEditorApp(props: OasisEditorAppProps = {}) {
  const runtimeClient = props.runtime?.client ?? createOasisEditorClient();
  const ui = () => props.ui ?? {};
  const documentOptions = () => props.document ?? {};
  const runtimeOptions = () => props.runtime ?? {};
  syncCanvasDebugApiVisibility();
  createEffect(() => {
    setLocale(ui().locale ?? "pt-BR");
  });
  const logger = createEditorLogger("app");
  const { state, commitState, getStateSnapshot } = createEditorAppState({
    initialDocument: documentOptions().initialDocument,
    initialState: documentOptions().initialState,
  });
  const applyState = (nextState: EditorState) => {
    commitState(nextState);
  };

  const {
    showChrome,
    showTitleBar,
    showMenubar,
    showToolbar,
    showOutline,
    toolbarView,
    toolbarLayout,
    isReadOnly,
    useComposedShell,
    loadingOptions,
    loadingLabel,
    shellComponent,
  } = createEditorUiOptions({ ui, documentOptions });

  const focusController = createEditorFocusController();
  const focused = focusController.focused;
  const setFocused = focusController.setFocused;
  const focusInput = focusController.focusInput;
  const focusInputAfterPointerSelection =
    focusController.focusInputAfterPointerSelection;
  const [initialLoading, setInitialLoading] = createSignal(
    ui().loading !== false,
  );

  const {
    linkDialog,
    setLinkDialog,
    imageAltDialog,
    setImageAltDialog,
    imageCaptionDialog,
    setImageCaptionDialog,
    contextMenu,
    setContextMenu,
    fontDialog,
    setFontDialog,
    paragraphDialog,
    setParagraphDialog,
    tablePropertiesDialog,
    setTablePropertiesDialog,
  } = createEditorDialogs();

  // First-use precise-fonts welcome overlay (rendered inside the editor shell).
  const [welcomeOpen, setWelcomeOpen] = createSignal(false);

  const viewportRef = () => focusController.viewportRef;
  const surfaceRef = () => focusController.surfaceRef;
  const importInputRef = () => focusController.importInputRef;
  const imageInputRef = () => focusController.imageInputRef;
  const docIO = createEditorDocumentIO({
    state: () => state,
    applyState,
    applyTransactionalState: (producer, options) =>
      applyTransactionalState(producer, options),
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
    commentHighlights,
    selectedImageBox,
    selectedTextBoxBox,
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
  });

  const { status: persistenceStatus } = useEditorPersistence(
    state,
    (loadedDoc) => {
      logger.info("persistence:loaded", { docId: loadedDoc.id });
      const nextState = createEditorStateFromDocument(loadedDoc);
      commitState(nextState);
      resetEditorChromeState();
    },
    {
      enabled: documentOptions().persistenceEnabled ?? false,
      persistence: documentOptions().persistence ?? persistenceService,
      logger,
    },
  );

  let forcePlainTextPaste = false;
  const cloneState = cloneEditorState;

  const transactions = useEditorTransactions({
    stateSnapshot: getStateSnapshot,
    commitState,
    cloneState,
    applyLayoutInvalidation,
  });
  const {
    undoStack,
    redoStack,
    applyTransactionalState,
    applyHistoryState,
    resetTransactionGrouping,
    updateHistoryState,
    getHistoryState,
    clearHistory,
  } = transactions;

  const historyActions = createEditorHistoryActions({
    state: () => state,
    stateSnapshot: getStateSnapshot,
    applyHistoryState,
    applyTransactionalState,
    focusInput,
    clearPreferredColumn,
    imageOps: () => imageOps,
    updateHistoryState,
    getHistoryState,
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
    const snapshot = cloneState(getStateSnapshot());
    documentOptions().onStateChange?.(snapshot);
    runtimeClient.emit("change", snapshot);
    runtimeClient.emit("documentChange", snapshot.document);
    runtimeClient.emit("selectionChange", snapshot.selection);
  });

  const selectedImageRun = () => getSelectedImageRun(state);
  const selectedTextBoxRun = () => getSelectedTextBoxRun(state);

  const layoutOptionsTarget = (): "image" | "textBox" | null => {
    if (selectedImageRun()) return "image";
    if (selectedTextBoxRun()) return "textBox";
    return null;
  };

  const applyLayoutOptionPatch = (
    mergeKey: string,
    apply: (current: EditorState, target: "image" | "textBox") => EditorState,
  ) => {
    const target = layoutOptionsTarget();
    if (!target) return;
    resetTransactionGrouping();
    applyTransactionalState((current) => apply(current, target), { mergeKey });
    focusInput();
  };

  // After switching an image to tight/through, auto-trace its alpha contour (if
  // it has none yet) and store it. Mirrors the async-font → relayout pattern.
  const ensureImageWrapContour = (runId: string, src: string) => {
    const resolved = resolveImageSrc(state.document, src);
    const applyContour = (img: HTMLImageElement) => {
      const polygon = traceImageAlphaContour(img);
      applyTransactionalState(
        (current) => setImageWrapPolygon(current, runId, polygon),
        { mergeKey: "layoutWrapPolygon" },
      );
    };
    const img = getCachedCanvasImage(resolved, () => {
      if (img.naturalWidth > 0) applyContour(img);
    });
    if (img.complete && img.naturalWidth > 0) {
      applyContour(img);
    }
  };

  const layoutOptionsOverlay: LayoutOptionsOverlay = {
    target: layoutOptionsTarget,
    preset: () => {
      const target = layoutOptionsTarget();
      if (target === "image") return getSelectedImageWrapPreset(state);
      if (target === "textBox") return getSelectedTextBoxWrapPreset(state);
      return null;
    },
    fixedPosition: () => {
      const target = layoutOptionsTarget();
      if (target === "image") return isSelectedImageFixedPosition(state);
      if (target === "textBox") return isSelectedTextBoxFixedPosition(state);
      return false;
    },
    setPreset: (preset: WrapPreset) => {
      applyLayoutOptionPatch("layoutWrapPreset", (current, target) =>
        target === "image"
          ? setSelectedImageWrapPreset(current, preset)
          : setSelectedTextBoxWrapPreset(current, preset),
      );
      if (preset === "tight" || preset === "through") {
        const selected = getSelectedImageRun(state);
        const image = selected?.run.image;
        if (image && !image.wrapPolygon) {
          ensureImageWrapContour(selected!.run.id, image.src);
        }
      }
    },
    setFixedPosition: (fixed: boolean) =>
      applyLayoutOptionPatch("layoutFixedPosition", (current, target) =>
        target === "image"
          ? setSelectedImageFixedPosition(current, fixed)
          : setSelectedTextBoxFixedPosition(current, fixed),
      ),
  };

  const canvasHitResolver = createCanvasSurfaceHitResolver({
    state: () => state as EditorState,
    surfaceRef: () => surfaceRef() ?? null,
    viewportRef: () => viewportRef() ?? null,
    measuredBlockHeights,
    measuredParagraphLayouts,
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
    setMeasuredBlockHeights({});
    setMeasuredParagraphLayouts({});
    clearHistory();
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
    updateHistoryState,
    focusInput,
    focusInputAfterPointerSelection,
    cloneState,
    logger,
  });

  const textBoxOps = createEditorTextBoxOperations({
    state,
    surfaceRef,
    applyState,
    updateHistoryState,
    focusInput,
    cloneState,
    logger,
  });

  const styleController = createEditorStyleController({
    state: () => state,
    commandsController: () => commandsController,
    clearPreferredColumn,
    resetTransactionGrouping,
    focusInput,
    logger,
  });

  const {
    tableResize,
    tableDrag,
    revisionController,
    textDrag,
    surfaceEvents: surfaceEventsWithTextDrag,
    textInput,
    navigation,
    handleCopy,
    handleCut,
    handlePaste,
    handleDrop,
  } = useEditorInteractionWiring({
    state,
    applyState,
    applyTransactionalState,
    isReadOnly,
    logger,
    focusInput,
    focusInputAfterPointerSelection,
    clearPreferredColumn,
    resetTransactionGrouping,
    surfaceRef,
    viewportRef,
    caretBox: () => caretBox(),
    preferredColumnX: () => preferredColumnX(),
    setPreferredColumnX,
    resolveSurfaceHitAtPoint,
    resolvePositionAtSurfacePoint,
    tableOps,
    imageOps,
    styleController,
    getForcePlainTextPaste: () => forcePlainTextPaste,
    setForcePlainTextPaste: (value) => {
      forcePlainTextPaste = value;
    },
    insertImageFromFile: docIO.insertImageFromFile,
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
    openImageCaptionDialog: (initialCaption) =>
      setImageCaptionDialog({ isOpen: true, initialCaption }),
    imageCaptionLabel: () =>
      (ui().locale ?? "pt-BR").startsWith("en") ? "Figure" : "Figura",
  });

  const keyboardCommandsController = {
    ...commandsController,
    applyBooleanStyleCommand: (style: BooleanStyleKey) =>
      styleController.applyToolbarBooleanStyleCommand(style),
  };

  const {
    runtimeReady,
    runtimeEditor,
    commandStateOf,
    toolbarHost,
    toolbarRegistry,
    menuRegistry,
  } = useEditorRuntimeBootstrap({
    essentials: {
      state: () => state,
      isReadOnly,
      forcePlainTextPaste: {
        get: () => forcePlainTextPaste,
        set: (value) => {
          forcePlainTextPaste = value;
        },
      },
      undoStack,
      redoStack,
      commandsController,
      keyboardCommandsController,
      historyActions,
      styleController,
      tableOps,
      docIO,
      importInputRef,
      imageInputRef,
      selectedImageRun,
      selectionBoxes,
      focusInput,
      applyState,
      applyTransactionalState,
      findReplace: {
        setIsOpen: fr.setIsOpen,
      },
    },
    externalPlugins: runtimeOptions().plugins,
    customizeToolbar: runtimeOptions().customizeToolbar,
    customizeMenubar: runtimeOptions().customizeMenubar,
    initialDocument: getStateSnapshot().document,
    focusEditor: focusInput,
    logger,
    onReady: (editor) => {
      runtimeClient.resolveReady(editor);
      runtimeOptions().onReady?.(runtimeClient);
    },
    onSettled: () => {
      setInitialLoading(false);
    },
    onError: (error) => runtimeClient.rejectReady(error),
  });

  runtimeClient.connectHost({
    getRuntimeEditor: () => (runtimeReady() ? runtimeEditor() : null),
    getState: () => cloneState(getStateSnapshot()),
    getDocument: () => cloneState(getStateSnapshot()).document,
    setDocument: (document) => {
      applyState(createEditorStateFromDocument(document));
      resetEditorChromeState();
      focusInput();
    },
    resetDocument: () => {
      applyState(createInitialEditorState());
      resetEditorChromeState();
      focusInput();
    },
    saveDocument: async () => {
      const persistence = documentOptions().persistence ?? persistenceService;
      await persistence.saveDocument(cloneState(getStateSnapshot()).document);
    },
    getSelection: () => cloneState(getStateSnapshot()).selection,
    setSelection: (selection) => {
      applyState({
        ...cloneState(getStateSnapshot()),
        selection,
      });
      focusInput();
    },
    focus: () => focusInput(),
    blur: () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setFocused(false);
    },
    clearHistory: () => clearHistory(),
    importDocx: (file) => docIO.handleImportFile(file),
    exportDocx: () => docIO.handleExportDocx(),
    exportPdf: () => docIO.handleExportPdf(),
  });

  createEffect(() => {
    if (!runtimeReady()) return;
    state.document;
    state.selection;
    state.activeSectionIndex;
    state.activeZone;
    const snapshot = cloneState(getStateSnapshot());
    runtimeEditor().dispatch(() => snapshot);
  });

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
      fr.setIsOpen(open ?? !fr.isOpen());
    },
    toggleReplace: (open) => {
      fr.setIsOpen(open ?? !fr.isOpen());
    },
    executeCommand: (commandName, payload) =>
      runtimeEditor().commands.execute(commandName, payload),
    canExecuteCommand: (commandName) =>
      runtimeEditor().commands.canExecute(commandName),
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

  const shouldShowCaret = () =>
    computeShouldShowCaret(state as EditorState, caretBox());

  const {
    computeFontFamilyOptions,
    computeFontSizeOptions,
    loadLocalFontFamilyOptions,
  } = createEditorFontOptions({
    state: () => state,
    toolbarStyleState: styleController.toolbarStyleState,
  });

  const fontDialogBridge = createFontDialogBridge({
    toolbarStyleState: styleController.toolbarStyleState,
    selection: () => state.selection,
    isReadOnly,
    loadLocalFontFamilyOptions,
    setFontDialog,
    setContextMenu,
    clearPreferredColumn,
    resetTransactionGrouping,
    applyTransactionalState,
    focusInput,
  });
  const openFontDialog = fontDialogBridge.openFontDialog;
  const applyFontDialogValues = fontDialogBridge.applyFontDialogValues;

  const paragraphDialogBridge = createParagraphDialogBridge({
    toolbarStyleState: styleController.toolbarStyleState,
    isReadOnly,
    setParagraphDialog,
    setContextMenu,
    clearPreferredColumn,
    resetTransactionGrouping,
    applyTransactionalState,
    focusInput,
  });
  const openParagraphDialog = paragraphDialogBridge.openParagraphDialog;
  const applyParagraphDialogValues =
    paragraphDialogBridge.applyParagraphDialogValues;

  const tablePropertiesDialogBridge = createTablePropertiesDialogBridge({
    state: () => state,
    isReadOnly,
    setTablePropertiesDialog,
    setContextMenu,
    clearPreferredColumn,
    resetTransactionGrouping,
    applyTransactionalState,
    focusInput,
  });
  const openTablePropertiesDialog =
    tablePropertiesDialogBridge.openTablePropertiesDialog;
  const applyTablePropertiesDialogValues =
    tablePropertiesDialogBridge.applyTablePropertiesDialogValues;
  const applyTableContextCommand = (
    producer: (current: EditorState) => EditorState,
    mergeKey: string,
  ) => {
    applyTransactionalState(producer, { mergeKey });
    focusInput();
  };

  const contextMenuClipboard = createEditorContextMenuClipboard({
    state: () => state,
    isReadOnly,
    logger,
    setContextMenu,
    clearPreferredColumn,
    resetTransactionGrouping,
    applyTransactionalState,
    applyTableAwareParagraphEdit: tableOps.applyTableAwareParagraphEdit,
    focusInput,
    promptForLink: commandsController.promptForLink,
    openFontDialog,
    openParagraphDialog,
    table: {
      isInsideTable: tablePropertiesDialogBridge.isInsideTable,
      canMerge: () => tableOps.canMergeSelectedTable(state),
      canSplit: () => tableOps.canSplitSelectedTable(state),
      canEditColumn: () => tableOps.canEditSelectedTableColumn(state),
      canEditRow: () => tableOps.canEditSelectedTableRow(state),
      openProperties: () => openTablePropertiesDialog("table"),
      openBordersAndShading: () => openTablePropertiesDialog("cell"),
      merge: () =>
        applyTableContextCommand(
          (current) => tableOps.mergeSelectedTable(current),
          "mergeTable",
        ),
      split: () =>
        applyTableContextCommand(
          (current) => tableOps.splitSelectedTable(current),
          "splitTable",
        ),
      insertColumnBefore: () =>
        applyTableContextCommand(
          (current) => tableOps.insertSelectedTableColumn(current, -1),
          "insertTableColumn",
        ),
      insertColumnAfter: () =>
        applyTableContextCommand(
          (current) => tableOps.insertSelectedTableColumn(current, 1),
          "insertTableColumn",
        ),
      deleteColumn: () =>
        applyTableContextCommand(
          (current) => tableOps.deleteSelectedTableColumn(current),
          "deleteTableColumn",
        ),
      insertRowBefore: () =>
        applyTableContextCommand(
          (current) => tableOps.insertSelectedTableRow(current, -1),
          "insertTableRow",
        ),
      insertRowAfter: () =>
        applyTableContextCommand(
          (current) => tableOps.insertSelectedTableRow(current, 1),
          "insertTableRow",
        ),
      deleteRow: () =>
        applyTableContextCommand(
          (current) => tableOps.deleteSelectedTableRow(current),
          "deleteTableRow",
        ),
    },
  });
  const buildContextMenuItems = contextMenuClipboard.buildContextMenuItems;
  const handleEditorContextMenu = contextMenuClipboard.handleEditorContextMenu;
  const closeContextMenu = contextMenuClipboard.closeContextMenu;

  const {
    layout: editorLayoutProps,
    overlays: editorOverlayProps,
    refs: editorRefs,
    surfaceHandlers: editorSurfaceHandlers,
    inputHandlers: editorInputHandlers,
    fileHandlers: editorFileHandlers,
  } = buildEditorViewProps({
    viewportHeight: ui().viewportHeight,
    className: ui().class,
    style: ui().style,
    selectionBoxes,
    commentHighlights,
    selectedImageBox,
    selectedTextBoxBox,
    layoutOptions: layoutOptionsOverlay,
    caretBox,
    inputBox,
    hoveredRevision: revisionController.hoveredRevision,
    focused,
    showCaret: shouldShowCaret,
    importProgress: docIO.importProgress,
    focusController,
    handleImportFile: docIO.handleImportFile,
    handleInsertImage: docIO.handleInsertImage,
    surfaceEvents: surfaceEventsWithTextDrag,
    tableResize,
    tableDrag,
    revisionController,
    handleDrop,
    onEditorMouseDown,
    handleImageMouseDown: imageOps.handleImageMouseDown,
    handleImageResizeHandleMouseDown: imageOps.handleImageResizeHandleMouseDown,
    handleTextBoxResizeHandleMouseDown:
      textBoxOps.handleTextBoxResizeHandleMouseDown,
    handleImageRotateHandleMouseDown: imageOps.handleImageRotateHandleMouseDown,
    handleTextBoxRotateHandleMouseDown:
      textBoxOps.handleTextBoxRotateHandleMouseDown,
    handleEditorContextMenu,
    textInput,
    setFocused,
    handleCopy,
    handleCut,
    handlePaste,
    handleKeyDown,
  });

  onMount(() => {
    startIconObserver();
    startLongTaskObserver();
    installGlobalReport();
    registerDomStatsSurface(() => surfaceRef() ?? null);

    // Re-apply a previously granted precise-font preference silently (no prompt),
    // otherwise offer it once via the welcome dialog when the browser supports
    // the Local Font Access API.
    void applyStoredPreciseFontPreference();
    if (!getWelcomeSeen() && isLocalFontAccessSupported()) {
      setWelcomeOpen(true);
    }
  });

  onCleanup(() => {
    onCleanupHook();
    surfaceEventsWithTextDrag.stopDragging();
    textDrag.stopDrag();
    imageOps.stopImageDrag();
    imageOps.stopImageResize();
    textBoxOps.stopTextBoxResize();
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
      style={{
        // Single source of truth for the horizontal page gutter: the same TS
        // constant drives both the editor shell width (pageWidth + 2 * gutter)
        // and the scroll-content padding the page is centered within. CSS only
        // consumes it via var(--oasis-editor-gutter-x).
        "--oasis-editor-gutter-x": `${EDITOR_SCROLL_PADDING_PX}px`,
      }}
    >
      <Show when={!useComposedShell() && showChrome() && showToolbar()}>
        <Toolbar
          host={toolbarHost}
          registry={toolbarRegistry}
          view={toolbarView()}
          layout={toolbarLayout()}
        />
      </Show>

      <EditorDialogsLayer
        dialogs={{
          linkDialog,
          setLinkDialog,
          imageAltDialog,
          setImageAltDialog,
          imageCaptionDialog,
          setImageCaptionDialog,
          contextMenu,
          setContextMenu,
          fontDialog,
          setFontDialog,
          paragraphDialog,
          setParagraphDialog,
          tablePropertiesDialog,
          setTablePropertiesDialog,
        }}
        findReplace={fr}
        fontFamilyOptions={computeFontFamilyOptions}
        fontSizeOptions={computeFontSizeOptions}
        contextMenuItems={buildContextMenuItems}
        focusInput={focusInput}
        applyLinkCommand={commandsController.applyLinkCommand}
        applyImageAltCommand={commandsController.applyImageAltCommand}
        applyImageCaptionCommand={commandsController.applyImageCaptionCommand}
        applyFontDialogValues={applyFontDialogValues}
        applyParagraphDialogValues={applyParagraphDialogValues}
        applyTablePropertiesDialogValues={applyTablePropertiesDialogValues}
        closeContextMenu={closeContextMenu}
      />

      <EditorWorkspace
        useComposedShell={useComposedShell}
        shellComponent={shellComponent}
        state={() => state}
        toolbarHost={toolbarHost}
        runtimeEditor={runtimeEditor}
        persistenceStatus={persistenceStatus}
        toolbarRegistry={toolbarRegistry}
        menuRegistry={menuRegistry}
        showChrome={showChrome}
        showTitleBar={showTitleBar}
        showMenubar={showMenubar}
        showToolbar={showToolbar}
        showOutline={showOutline}
        toolbarView={toolbarView}
        toolbarLayout={toolbarLayout}
        isReadOnly={isReadOnly}
        viewportHeight={() => ui().viewportHeight}
        measuredBlockHeights={measuredBlockHeights}
        measuredParagraphLayouts={measuredParagraphLayouts}
        showFloatingTableToolbar={() =>
          !isReadOnly() && commandStateOf("tableContext").value !== null
        }
        layout={editorLayoutProps}
        overlays={editorOverlayProps}
        refs={editorRefs}
        surfaceHandlers={editorSurfaceHandlers}
        inputHandlers={editorInputHandlers}
        fileHandlers={editorFileHandlers}
      />

      <EditorDragLayers
        state={state as EditorState}
        surfaceRef={surfaceRef()}
        tableResize={tableResize}
        imageOps={imageOps}
        tableDrag={tableDrag}
        textDrag={textDrag}
      />

      <Show when={initialLoading() || !runtimeReady()}>
        <OasisEditorLoading
          label={loadingLabel()}
          class={loadingOptions()?.class}
          style={loadingOptions()?.style}
        />
      </Show>

      <WelcomeOverlay
        isOpen={welcomeOpen() && !initialLoading() && runtimeReady()}
        onClose={() => setWelcomeOpen(false)}
      />
    </div>
  );
}
