import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import { type EditorState } from "@/core/model.js";

import { createEditorLogger } from "@/utils/logger.js";
import {
  startLongTaskObserver,
  installGlobalReport,
  registerDomStatsSurface,
} from "@/utils/performanceMetrics.js";
import { cloneEditorState } from "@/core/cloneState.js";
import { Toolbar } from "./components/Toolbar/Toolbar.js";
import { createAppCommandsController } from "./app/createAppCommandsController.js";
import { createEditorKeyboardBinding } from "./app/createEditorKeyboardBinding.js";
import "./components/FindReplace/findReplace.css";
import { createTranslator } from "@/i18n/index.js";
import { I18nProvider } from "@/i18n/I18nContext.js";
import { startIconObserver, stopIconObserver } from "./utils/IconManager.js";
import { syncCanvasDebugApiVisibility } from "./canvas/CanvasDebug.js";
import {
  applyStoredPreciseFontPreference,
  isLocalFontAccessSupported,
} from "./app/localFontAccess.js";
import { getWelcomeSeen } from "@/app/services/userPreferences.js";
import { createEditorFocusController } from "./app/useEditorFocus.js";
import { createEditorDialogs } from "./app/useEditorDialogs.js";
import { createEditorAppState } from "./app/useEditorAppState.js";
import { createEditorZoom } from "./app/editorZoom.js";
import { createEditorChrome } from "./app/createEditorChrome.js";
import { useEditorRuntimeBootstrap } from "./app/useEditorRuntimeBootstrap.js";
import { createEditorUiOptions } from "./app/useEditorUiOptions.js";
import { computeShouldShowCaret } from "./app/shouldShowCaret.js";
import { EditorDragLayers } from "./app/EditorDragLayers.js";
import { EditorDialogsLayer } from "./app/EditorDialogsLayer.js";
import { buildEditorViewProps } from "./app/buildEditorViewProps.js";
import { EditorWorkspace } from "./app/EditorWorkspace.js";
import { EDITOR_SCROLL_PADDING_PX } from "./editorLayoutConstants.js";
import { OasisEditorLoading } from "./OasisEditorLoading.js";
import { WelcomeOverlay } from "./components/WelcomeOverlay.js";
import { createOasisEditorClient } from "@/app/client/OasisEditorClient.js";
import { connectEditorClientHost } from "./app/connectEditorClientHost.js";
import { createEditorDocumentRuntime } from "./app/createEditorDocumentRuntime.js";
import { createEditorInteractionRuntime } from "./app/createEditorInteractionRuntime.js";

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
  // Per-instance translator: reads this editor's locale signal, so two editors
  // on the same page translate independently. Provided via I18nProvider below.
  const translator = createTranslator(() => ui().locale ?? "pt-BR");
  const logger = createEditorLogger("app");
  const { state, commitState, getStateSnapshot } = createEditorAppState({
    initialDocument: documentOptions().initialDocument,
    initialState: documentOptions().initialState,
  });
  const applyState = (nextState: EditorState) => {
    commitState(nextState);
  };
  const cloneState = cloneEditorState;
  let forcePlainTextPaste = false;

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

  // Single source of truth for document zoom. The factor scales the shared
  // document layer (canvas + overlays) via CSS transform and feeds the geometry
  // controllers so hit-testing/navigation stay correct off 100%.
  const zoom = createEditorZoom();

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
  const {
    docIO,
    isImportInProgress,
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
    applyLayoutInvalidation,
    onCleanupHook,
    fallbackPersistence,
    persistenceStatus,
    undoStack,
    redoStack,
    applyTransactionalState,
    applyHistoryState,
    resetTransactionGrouping,
    updateHistoryState,
    getHistoryState,
    clearHistory,
    historyActions,
    resetEditorChromeState,
  } = createEditorDocumentRuntime({
    documentOptions,
    logger,
    runtimeClient,
    state,
    commitState,
    getStateSnapshot,
    applyState,
    cloneState,
    isReadOnly,
    focusInput,
    surfaceRef,
    viewportRef,
    zoomFactor: zoom.zoomFactor,
    getImageOps: () => interaction.imageOps,
  });

  const interaction = createEditorInteractionRuntime({
    state: state as EditorState,
    logger,
    isReadOnly,
    applyState,
    cloneState,
    focusInput,
    focusInputAfterPointerSelection,
    surfaceRef,
    viewportRef,
    zoomFactor: zoom.zoomFactor,
    insertImageFromFile: docIO.insertImageFromFile,
    getForcePlainTextPaste: () => forcePlainTextPaste,
    setForcePlainTextPaste: (value) => {
      forcePlainTextPaste = value;
    },
    getCommandsController: () => commandsController,
    applyTransactionalState,
    clearPreferredColumn,
    resetTransactionGrouping,
    updateHistoryState,
    caretBox,
    preferredColumnX,
    setPreferredColumnX,
    measuredBlockHeights,
    measuredParagraphLayouts,
  });
  const {
    selectedImageRun,
    layoutOptionsOverlay,
    fr,
    resolveSurfaceHitAtPoint,
    resolvePositionAtSurfacePoint,
    tableOps,
    imageOps,
    textBoxOps,
    styleController,
    onEditorMouseDown,
    tableResize,
    tableDrag,
    revisionController,
    textDrag,
    surfaceEventsWithTextDrag,
    textInput,
    navigation,
    handleCopy,
    handleCut,
    handlePaste,
    handleDrop,
  } = interaction;

  const { commandsController, keyboardCommandsController } =
    createAppCommandsController({
      state,
      logger,
      applyState,
      applyTransactionalState,
      clearPreferredColumn,
      resetTransactionGrouping,
      focusInput,
      selectedImageRun,
      tableOps,
      toolbarStyleState: styleController.toolbarStyleState,
      applyBooleanStyleCommand: styleController.applyToolbarBooleanStyleCommand,
      locale: () => ui().locale ?? "pt-BR",
      setLinkDialog,
      setImageAltDialog,
      setImageCaptionDialog,
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
    t: translator,
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

  connectEditorClientHost(runtimeClient, {
    runtimeReady,
    runtimeEditor,
    getStateSnapshot,
    cloneState,
    applyState,
    resetEditorChromeState,
    focusInput,
    setFocused,
    clearHistory,
    getPersistence: () => documentOptions().persistence ?? fallbackPersistence,
    docIO,
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

  const { handleKeyDown } = createEditorKeyboardBinding({
    state: () => state,
    isReadOnly,
    logger,
    focusInput,
    clearPreferredColumn,
    resetTransactionGrouping,
    applyState,
    applyTransactionalState,
    setForcePlainTextPaste: (value) => {
      forcePlainTextPaste = value;
    },
    selectedImageRun,
    commandsController: keyboardCommandsController,
    tableOps,
    navigation,
    historyActions,
    styleController,
    findReplace: fr,
    runtimeEditor,
  });

  const shouldShowCaret = () =>
    computeShouldShowCaret(state as EditorState, caretBox());

  const {
    computeFontFamilyOptions,
    computeFontSizeOptions,
    applyFontDialogValues,
    applyParagraphDialogValues,
    applyTablePropertiesDialogValues,
    buildContextMenuItems,
    handleEditorContextMenu,
    closeContextMenu,
  } = createEditorChrome({
    state: () => state,
    selection: () => state.selection,
    toolbarStyleState: styleController.toolbarStyleState,
    isReadOnly,
    t: translator,
    logger,
    setFontDialog,
    setParagraphDialog,
    setTablePropertiesDialog,
    setContextMenu,
    clearPreferredColumn,
    resetTransactionGrouping,
    applyTransactionalState,
    applyTableAwareParagraphEdit: tableOps.applyTableAwareParagraphEdit,
    focusInput,
    promptForLink: commandsController.promptForLink,
    tableOps,
  });

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
    zoomPercent: zoom.zoomPercent,
    setZoomPercent: zoom.setZoomPercent,
    zoomFactor: zoom.zoomFactor,
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
    <I18nProvider translator={translator}>
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
    </I18nProvider>
  );
}
