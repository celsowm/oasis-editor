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
  setSelection,
} from "../core/editorCommands.js";
import {
  createEditorStateFromDocument,
} from "../core/editorState.js";
import { Editor } from "../core/Editor.js";
import {
  getDocumentParagraphs,
  findParagraphTableLocation,
  getActiveSectionIndex,
  paragraphOffsetToPosition,
  type EditorDocument,
  type EditorLayoutParagraph,
  type EditorPosition,
  type EditorState,
} from "../core/model.js";
import { isSelectionCollapsed, normalizeSelection } from "../core/selection.js";

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
import { Toolbar } from "./components/Toolbar/Toolbar.js";
import type { ToolbarRegistry } from "./components/Toolbar/registry/ToolbarRegistry.js";
import { DocumentShell } from "./shells/DocumentShell.js";
import { InlineShell } from "./shells/InlineShell.js";
import { BalloonShell } from "./shells/BalloonShell.js";
import { createEditorCommandsController } from "../app/controllers/EditorCommandsController.js";
import { createEditorKeyboardController } from "../app/controllers/useEditorKeyboard.js";
import { useEditorLayout } from "../app/controllers/useEditorLayout.js";
import {
  useEditorPersistence,
  type DocumentPersistence,
} from "../app/controllers/useEditorPersistence.js";
import { persistenceService } from "../app/services/PersistenceService.js";
import { useEditorFindReplace } from "../app/controllers/useEditorFindReplace.js";
import { createEditorTableOperations } from "../app/controllers/useEditorTableOperations.js";
import { createEditorImageOperations } from "../app/controllers/useEditorImageOperations.js";
import { createEditorDocumentIO } from "../app/controllers/useEditorDocumentIO.js";
import { createEditorStyleController } from "../app/controllers/useEditorStyle.js";
import { createEditorHistoryActions } from "../app/controllers/useEditorHistoryActions.js";
import { computeLayoutInvalidationFromTransaction } from "./layoutInvalidation.js";
import "./components/FindReplace/findReplace.css";
import { setLocale } from "../i18n/index.js";
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
import { useEditorRuntimePlugins } from "./app/useEditorRuntimePlugins.js";
import { createFontDialogBridge } from "./app/useFontDialogBridge.js";
import { createEditorContextMenuClipboard } from "./app/useEditorContextMenuClipboard.js";
import type { OasisPlugin } from "../core/plugin.js";
import { createEditorEssentialsRuntimePlugin } from "./app/createEditorEssentialsPlugin.js";
import { createRuntimeCommandHost } from "./app/createRuntimeCommandHost.js";
import { EditorDragLayers } from "./app/EditorDragLayers.js";
import { EditorDialogsLayer } from "./app/EditorDialogsLayer.js";
import { useEditorInteractionWiring } from "./app/useEditorInteractionWiring.js";
import { buildEditorViewProps } from "./app/buildEditorViewProps.js";

export interface OasisEditorLoadingOptions {
  label?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

export interface OasisEditorAppUiProps {
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
  loading?: boolean | OasisEditorLoadingOptions;
}

export interface OasisEditorAppDocumentProps {
  initialDocument?: EditorDocument;
  initialState?: EditorState;
  onStateChange?: (state: EditorState) => void;
  readOnly?: boolean;
  persistenceEnabled?: boolean;
  persistence?: DocumentPersistence;
  layoutMode?: "fast" | "wordParity";
}

export interface OasisEditorAppRuntimeProps {
  onReady?: () => void;
  plugins?: OasisPlugin[];
  /**
   * Customize the toolbar after the built-in preset and plugin contributions
   * load. Use the registry to add/insert/replace/remove/move items. Clients can
   * tailor the toolbar without forking.
   */
  customizeToolbar?: (registry: ToolbarRegistry) => void;
}

export interface OasisEditorAppProps {
  ui?: OasisEditorAppUiProps;
  document?: OasisEditorAppDocumentProps;
  runtime?: OasisEditorAppRuntimeProps;
}

export function OasisEditorApp(props: OasisEditorAppProps = {}) {
  const ui = () => props.ui ?? {};
  const documentOptions = () => props.document ?? {};
  const runtimeOptions = () => props.runtime ?? {};
  syncCanvasDebugApiVisibility();
  createEffect(() => {
    setLocale(ui().locale ?? "pt-BR");
  });
  const logger = createEditorLogger("app");
  const {
    state,
    commitState,
    getStateSnapshot,
  } = createEditorAppState({
    initialDocument: documentOptions().initialDocument,
    initialState: documentOptions().initialState,
  });
  const applyState = (nextState: EditorState) => {
    commitState(nextState);
  };

  const showChrome = () => ui().showChrome ?? true;
  const showTitleBar = () => ui().showTitleBar ?? true;
  const showMenubar = () => ui().showMenubar ?? true;
  const showToolbar = () => ui().showToolbar ?? true;
  const showOutline = () => ui().showOutline ?? true;
  const layoutMode = () => documentOptions().layoutMode ?? "fast";
  const useComposedShell = () =>
    ui().uiVariant === "docs" || (ui().shell ?? "document") !== "document";
  const isReadOnly = () => documentOptions().readOnly ?? false;
  const loadingOptions = (): OasisEditorLoadingOptions | undefined => {
    const loading = ui().loading;
    return typeof loading === "object" && loading !== null ? loading : undefined;
  };
  const loadingLabel = () => loadingOptions()?.label ?? "Loading oasis-editor...";

  const shellComponent = () => {
    const s = ui().shell ?? "document";
    if (s === "inline") return InlineShell;
    if (s === "balloon") return BalloonShell;
    return DocumentShell;
  };

  const focusController = createEditorFocusController();
  const focused = focusController.focused;
  const setFocused = focusController.setFocused;
  const focusInput = focusController.focusInput;
  const focusInputAfterPointerSelection = focusController.focusInputAfterPointerSelection;
  const [initialLoading, setInitialLoading] = createSignal(ui().loading !== false);
  const [undoStack, setUndoStack] = createSignal<EditorState[]>([]);
  const [redoStack, setRedoStack] = createSignal<EditorState[]>([]);
  const [localFontFamilyOptions, setLocalFontFamilyOptions] = createSignal<string[]>([]);

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
    {
      enabled: documentOptions().persistenceEnabled ?? false,
      persistence: documentOptions().persistence ?? persistenceService,
      logger,
    },
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
    documentOptions().onStateChange?.(cloneState(getStateSnapshot()));
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
  });

  const keyboardCommandsController = {
    ...commandsController,
    applyBooleanStyleCommand: (style: BooleanStyleKey) =>
      styleController.applyToolbarBooleanStyleCommand(style),
  };

  const essentialsPlugin = createEditorEssentialsRuntimePlugin({
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
  });

  const { runtimePlugins, toolbarRegistry, dispose: disposeRuntimePlugins } = useEditorRuntimePlugins({
    essentialsPlugin,
    externalPlugins: runtimeOptions().plugins,
    customizeToolbar: runtimeOptions().customizeToolbar,
  });

  const runtimeCommandHost = createRuntimeCommandHost({
    initialDocument: getStateSnapshot().document,
    runtimePlugins,
    focusEditor: focusInput,
    logger,
    onReady: runtimeOptions().onReady,
    onSettled: () => {
      setInitialLoading(false);
    },
  });
  const runtimeReady = runtimeCommandHost.runtimeReady;
  const runtimeEditor = runtimeCommandHost.runtimeEditor;
  const commandStateOf = runtimeCommandHost.commandStateOf;
  const toolbarHost = runtimeCommandHost.toolbarHost;

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
    executeCommand: (commandName, payload) => runtimeEditor().execute(commandName, payload),
    canExecuteCommand: (commandName) => runtimeEditor().canExecute(commandName),
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

  const handleImageMouseDown = (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const paragraph = getDocumentParagraphs(state.document).find((p) => p.id === paragraphId);
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
  };

  const handleImageResizeHandleMouseDown = (
    paragraphId: string,
    paragraphOffset: number,
    direction: ImageResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => {
    event.preventDefault();
    event.stopPropagation();
    imageOps.startImageResize(paragraphId, paragraphOffset, direction, event, state);
  };

  const renderComposedShell = () => {
    const Shell = shellComponent();
    return (
      <Shell
        state={state}
        toolbarHost={toolbarHost}
        persistenceStatus={persistenceStatus}
        toolbarRegistry={toolbarRegistry}
        showChrome={showChrome()}
        showTitleBar={showTitleBar()}
        showMenubar={showMenubar()}
        showToolbar={showToolbar()}
        showOutline={showOutline()}
        isReadOnly={isReadOnly()}
        measuredBlockHeights={() => measuredBlockHeights()}
        measuredParagraphLayouts={() => measuredParagraphLayouts()}
        viewportHeight={() => ui().viewportHeight}
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
    );
  };

  const computeFontFamilyOptions = (): string[] => {
    return collectFontFamilyOptions(state.document, styleController.toolbarStyleState(), localFontFamilyOptions());
  };

  const computeFontSizeOptions = (): number[] => {
    return collectFontSizeOptions(state.document, styleController.toolbarStyleState());
  };

  const loadLocalFontFamilyOptions = async () => {
    const maybeQueryLocalFonts = (globalThis as {
      queryLocalFonts?: () => Promise<Array<{ family?: string; fullName?: string }>>;
    }).queryLocalFonts;
    if (!maybeQueryLocalFonts || localFontFamilyOptions().length > 0) {
      return;
    }
    try {
      const fonts = await maybeQueryLocalFonts();
      const families = Array.from(
        new Set(
          fonts
            .map((font) => font.family?.trim() || font.fullName?.trim() || "")
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b));
      setLocalFontFamilyOptions(families);
    } catch {
      // Local font access is permission-gated; the fallback list remains available.
    }
  };

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
    layoutMode: layoutMode(),
    viewportHeight: ui().viewportHeight,
    className: ui().class,
    style: ui().style,
    selectionBoxes,
    selectedImageBox,
    caretBox,
    inputBox,
    hoveredRevision: revisionController.hoveredRevision,
    focused,
    showCaret: shouldShowCaret,
    importProgress: docIO.importProgress,
    focusController,
    handleImportDocx: docIO.handleImportDocx,
    handleInsertImage: docIO.handleInsertImage,
    surfaceEvents: surfaceEventsWithTextDrag,
    tableResize,
    tableDrag,
    revisionController,
    handleDrop,
    onEditorMouseDown,
    handleImageMouseDown,
    handleImageResizeHandleMouseDown,
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
    void runtimeCommandHost.initialize();
  });

  onCleanup(() => {
    void runtimeCommandHost.dispose();
    disposeRuntimePlugins();
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
        <Toolbar host={toolbarHost} registry={toolbarRegistry} />
      </Show>

      <EditorDialogsLayer
        dialogs={{
          linkDialog,
          setLinkDialog,
          imageAltDialog,
          setImageAltDialog,
          contextMenu,
          setContextMenu,
          fontDialog,
          setFontDialog,
        }}
        findReplace={fr}
        fontFamilyOptions={computeFontFamilyOptions}
        fontSizeOptions={computeFontSizeOptions}
        contextMenuItems={buildContextMenuItems}
        focusInput={focusInput}
        applyLinkCommand={commandsController.applyLinkCommand}
        applyImageAltCommand={commandsController.applyImageAltCommand}
        applyFontDialogValues={applyFontDialogValues}
        closeContextMenu={closeContextMenu}
      />

      <Show when={useComposedShell()}>
        {renderComposedShell()}
      </Show>

      <Show when={!useComposedShell()}>
      <div class="oasis-editor-main-container">
        <section class="oasis-editor-stage">
          <OasisEditorEditor
            state={() => state}
            layout={{
              ...editorLayoutProps,
              measuredBlockHeights: () => measuredBlockHeights(),
              measuredParagraphLayouts: () => measuredParagraphLayouts(),
              readOnly: isReadOnly(),
            }}
            overlays={{
              ...editorOverlayProps,
              toolbarHost,
              persistenceStatus,
              showFloatingTableToolbar: () =>
                !isReadOnly() && commandStateOf("tableContext").value !== null,
            }}
            refs={editorRefs}
            surfaceHandlers={editorSurfaceHandlers}
            inputHandlers={editorInputHandlers}
            fileHandlers={editorFileHandlers}
          />
        </section>
      </div>
      </Show>

      <EditorDragLayers
        state={state as EditorState}
        surfaceRef={surfaceRef()}
        tableResize={tableResize}
        imageOps={imageOps}
        tableDrag={tableDrag}
        textDrag={textDrag}
      />

      <Show when={initialLoading() || !runtimeReady()}>
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
