import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { type EditorState, EditorSelection } from "@/core/model.js";

import { createEditorLogger } from "@/utils/logger.js";
import {
  startLongTaskObserver,
  installGlobalReport,
  registerDomStatsSurface,
} from "@/utils/performanceMetrics.js";
import { cloneEditorState } from "@/core/cloneState.js";
import { Toolbar } from "./components/Toolbar/Toolbar.js";
import "./components/FindReplace/findReplace.css";
import { createTranslator, type Locale } from "@/i18n/index.js";
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
import { createEditorDocumentRuntime } from "./app/createEditorDocumentRuntime.js";
import { createEditorInteractionRuntime } from "./app/createEditorInteractionRuntime.js";
import { createEditorCommandRuntime } from "./app/createEditorCommandRuntime.js";

import type { OasisEditorAppProps } from "./OasisEditorAppProps.js";
import type {
  OasisEditorAppUiProps,
  OasisEditorAppDocumentProps,
  OasisEditorAppRuntimeProps,
} from "@/ui/OasisEditorAppProps.js";
import { JSX } from "solid-js";

export type {
  OasisEditorLoadingOptions,
  OasisEditorAppUiProps,
  OasisEditorAppDocumentProps,
  OasisEditorAppRuntimeProps,
  OasisEditorAppProps,
  ToolbarLayoutMode,
  ToolbarViewMode,
} from "./OasisEditorAppProps.js";

export function OasisEditorApp(props: OasisEditorAppProps = {}): JSX.Element {
  const runtimeClient = props.runtime?.client ?? createOasisEditorClient();
  const ui = (): OasisEditorAppUiProps => props.ui ?? {};
  const documentOptions = (): OasisEditorAppDocumentProps =>
    props.document ?? {};
  const runtimeOptions = (): OasisEditorAppRuntimeProps => props.runtime ?? {};
  syncCanvasDebugApiVisibility();
  // Per-instance translator: reads this editor's locale signal, so two editors
  // on the same page translate independently. Provided via I18nProvider below.
  const translator = createTranslator(
    (): Locale => (ui().locale ?? "pt-BR") as Locale,
  );
  const logger = createEditorLogger("app");
  const { state, commitState, getStateSnapshot } = createEditorAppState({
    initialDocument: documentOptions().initialDocument,
    initialState: documentOptions().initialState,
  });
  const applyState = (nextState: EditorState): void => {
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

  const viewportRef = (): HTMLDivElement | undefined =>
    focusController.viewportRef;
  const surfaceRef = (): HTMLDivElement | undefined =>
    focusController.surfaceRef;
  const importInputRef = (): HTMLInputElement | undefined =>
    focusController.importInputRef;
  const imageInputRef = (): HTMLInputElement | undefined =>
    focusController.imageInputRef;
  const documentRuntime = createEditorDocumentRuntime({
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
  const {
    docIO,
    measuredBlockHeights,
    measuredParagraphLayouts,
    documentLayout,
    canvasSnapshotProvider,
    inputBox,
    selectionBoxes,
    commentHighlights,
    selectedImageBox,
    selectedTextBoxBox,
    caretBox,
    preferredColumnX,
    setPreferredColumnX,
    clearPreferredColumn,
    onCleanupHook,
    persistenceStatus,
    applyTransactionalState,
    resetTransactionGrouping,
    updateHistoryState,
  } = documentRuntime;

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
    getForcePlainTextPaste: (): boolean => forcePlainTextPaste,
    setForcePlainTextPaste: (value): void => {
      forcePlainTextPaste = value;
    },
    getCommandsController: () => commandRuntime.commandsController,
    applyTransactionalState,
    clearPreferredColumn,
    resetTransactionGrouping,
    updateHistoryState,
    caretBox,
    preferredColumnX,
    setPreferredColumnX,
    measuredBlockHeights,
    measuredParagraphLayouts,
    documentLayout,
    canvasSnapshotProvider,
  });
  const {
    layoutOptionsOverlay,
    fr,
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
    handleCopy,
    handleCut,
    handlePaste,
    handleDrop,
  } = interaction;

  const commandRuntime = createEditorCommandRuntime({
    document: documentRuntime,
    interaction,
    state: state as EditorState,
    logger,
    isReadOnly,
    focusInput,
    applyState,
    getStateSnapshot,
    cloneState,
    setFocused,
    setInitialLoading,
    getForcePlainTextPaste: (): boolean => forcePlainTextPaste,
    setForcePlainTextPaste: (value): void => {
      forcePlainTextPaste = value;
    },
    locale: (): Locale => (ui().locale ?? "pt-BR") as Locale,
    translator,
    runtimeClient,
    runtimeOptions,
    documentOptions,
    importInputRef,
    imageInputRef,
    setLinkDialog,
    setImageAltDialog,
    setImageCaptionDialog,
  });
  const {
    commandsController,
    runtimeReady,
    runtimeEditor,
    commandStateOf,
    toolbarHost,
    toolbarRegistry,
    menuRegistry,
    handleKeyDown,
  } = commandRuntime;

  const shouldShowCaret = (): boolean =>
    computeShouldShowCaret(state as EditorState, caretBox());

  const {
    computeFontFamilyOptions,
    computeFontSizeOptions,
    applyFontDialogValues,
    applyParagraphDialogValues,
    setParagraphDialogDefault,
    applyTablePropertiesDialogValues,
    buildContextMenuItems,
    handleEditorContextMenu,
    closeContextMenu,
  } = createEditorChrome({
    state: (): EditorState => state,
    selection: (): EditorSelection => state.selection,
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
    layout: {
      documentLayout,
      viewportHeight: ui().viewportHeight,
      className: ui().class,
      style: ui().style,
      zoomPercent: zoom.zoomPercent,
      setZoomPercent: zoom.setZoomPercent,
      zoomFactor: zoom.zoomFactor,
    },
    overlays: {
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
    },
    refs: { focusController },
    files: {
      handleImportFile: docIO.handleImportFile,
      handleInsertImage: docIO.handleInsertImage,
    },
    surface: {
      surfaceEvents: surfaceEventsWithTextDrag,
      tableResize,
      tableDrag,
      revisionController,
      handleDrop,
      onEditorMouseDown,
      handleImageMouseDown: imageOps.handleImageMouseDown,
      handleImageResizeHandleMouseDown:
        imageOps.handleImageResizeHandleMouseDown,
      handleTextBoxResizeHandleMouseDown:
        textBoxOps.handleTextBoxResizeHandleMouseDown,
      handleImageRotateHandleMouseDown:
        imageOps.handleImageRotateHandleMouseDown,
      handleTextBoxRotateHandleMouseDown:
        textBoxOps.handleTextBoxRotateHandleMouseDown,
      handleEditorContextMenu,
    },
    input: {
      textInput,
      setFocused,
      handleCopy,
      handleCut,
      handlePaste,
      handleKeyDown,
    },
  });

  onMount((): void => {
    startIconObserver();
    startLongTaskObserver();
    installGlobalReport();
    registerDomStatsSurface((): HTMLDivElement | null => surfaceRef() ?? null);

    // Re-apply a previously granted precise-font preference silently (no prompt),
    // otherwise offer it once via the welcome dialog when the browser supports
    // the Local Font Access API.
    void applyStoredPreciseFontPreference();
    if (!getWelcomeSeen() && isLocalFontAccessSupported()) {
      setWelcomeOpen(true);
    }
  });

  onCleanup((): void => {
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
          setParagraphDialogDefault={setParagraphDialogDefault}
          applyTablePropertiesDialogValues={applyTablePropertiesDialogValues}
          closeContextMenu={closeContextMenu}
        />

        <EditorWorkspace
          useComposedShell={useComposedShell}
          shellComponent={shellComponent}
          runtime={{
            state: (): EditorState => state,
            toolbarHost,
            runtimeEditor,
            persistenceStatus,
            toolbarRegistry,
            menuRegistry,
            showFloatingTableToolbar: (): boolean =>
              !isReadOnly() && commandStateOf("tableContext").value !== null,
          }}
          chrome={{
            showChrome,
            showTitleBar,
            showMenubar,
            showToolbar,
            showOutline,
            toolbarView,
            toolbarLayout,
          }}
          view={{
            isReadOnly,
            viewportHeight: (): number | string | undefined =>
              ui().viewportHeight,
            measuredBlockHeights,
            measuredParagraphLayouts,
            documentLayout,
            layout: editorLayoutProps,
            overlays: editorOverlayProps,
            refs: editorRefs,
            surfaceHandlers: editorSurfaceHandlers,
            inputHandlers: editorInputHandlers,
            fileHandlers: editorFileHandlers,
          }}
        />

        <EditorDragLayers
          state={state as EditorState}
          surfaceRef={surfaceRef()}
          documentLayout={documentLayout}
          snapshotProvider={canvasSnapshotProvider}
          zoomFactor={zoom.zoomFactor}
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
          onClose={(): false => setWelcomeOpen(false)}
        />
      </div>
    </I18nProvider>
  );
}
