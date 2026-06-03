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
  setParagraphStyle,
  setTableCellBorders,
  setTableCellStyleValue,
  setTableCellWidth,
  setTableStyleValue,
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
  type EditorBorderStyle,
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
import type { ToolbarHost } from "./components/Toolbar/state/createToolbarApi.js";
import type { ToolbarRegistry } from "./components/Toolbar/registry/ToolbarRegistry.js";
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
import { computeLayoutInvalidationFromTransaction } from "./layoutInvalidation.js";
import { DropCaret } from "./components/DropCaret.js";
import { LinkDialog } from "./components/Dialogs/LinkDialog.js";
import { ImageAltDialog } from "./components/Dialogs/ImageAltDialog.js";
import { FontDialog } from "./components/Dialogs/FontDialog.js";
import { FindReplaceDialog } from "./components/FindReplace/FindReplaceDialog.js";
import { ContextMenu } from "./components/ContextMenu/ContextMenu.js";
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
import { createEssentialsPlugin } from "../plugins/internal/createEssentialsPlugin.js";
import { commandRefName, resolveCommandRef, type CommandRef } from "../core/commands/CommandRef.js";
import type { OasisPlugin } from "../core/plugin.js";

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
    { enabled: documentOptions().persistenceEnabled ?? false, logger },
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

  const essentialsPlugin = createEssentialsPlugin({
        isCommandEnabled: (commandName) =>
          !isReadOnly() &&
          (commandName !== "insertFootnote" || commandsController.canInsertFootnoteCommand()),
        styleState: () => styleController.toolbarStyleState(),
        documentStyles: () =>
          Object.values(state.document?.styles ?? {}).map((style) => ({
            id: style.id,
            name: style.name,
            fontFamily: style.textStyle?.fontFamily?.trim() || undefined,
            fontSize:
              typeof style.textStyle?.fontSize === "number" ? style.textStyle.fontSize : undefined,
          })),
        canUndo: () => undoStack().length > 0,
        canRedo: () => redoStack().length > 0,
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
        setFontFamily: (value) => (
          styleController.applyToolbarValueStyleCommand("fontFamily", value), true
        ),
        setFontSize: (value) => (
          styleController.applyToolbarValueStyleCommand("fontSize", value), true
        ),
        setColor: (value) => (
          styleController.applyToolbarValueStyleCommand("color", value), true
        ),
        setHighlight: (value) => (
          styleController.applyToolbarValueStyleCommand("highlight", value), true
        ),
        setStyleId: (value) => (commandsController.handleStyleChange(value), true),
        io: {
          exportDocx: () => void docIO.handleExportDocx(),
          exportPdf: () => void docIO.handleExportPdf(),
          importDocx: () => importInputRef()?.click(),
          insertImage: () => imageInputRef()?.click(),
        },
        linkOps: {
          prompt: () => commandsController.promptForLink(),
          remove: () => commandsController.removeLinkCommand(),
          canPrompt: () =>
            !isSelectionCollapsed(state.selection) ||
            Boolean(styleController.toolbarStyleState().link),
        },
        imageAlt: {
          prompt: () => commandsController.promptForImageAlt(),
          isSelected: () => Boolean(selectedImageRun()),
        },
        browserActions: {
          print: () => window.print(),
          copy: () => {
            document.execCommand("copy");
          },
        },
        paragraph: {
          togglePageBreakBefore: () =>
            commandsController.toggleParagraphFlagCommand("pageBreakBefore"),
          toggleKeepWithNext: () =>
            commandsController.toggleParagraphFlagCommand("keepWithNext"),
          setSpacingAfter: (v) => commandsController.applyParagraphStyleCommand("spacingAfter", v),
          setSpacingBefore: (v) => commandsController.applyParagraphStyleCommand("spacingBefore", v),
          setIndentLeft: (v) => commandsController.applyParagraphStyleCommand("indentLeft", v),
          setIndentFirstLine: (v) =>
            commandsController.applyParagraphStyleCommand("indentFirstLine", v),
          setIndentHanging: (v) =>
            commandsController.applyParagraphStyleCommand("indentHanging", v),
          setShading: (v) => commandsController.applyParagraphStyleCommand("shading", v),
          applyBorders: () => {
            const border: EditorBorderStyle = { width: 1, type: "solid", color: "#000000" };
            applyTransactionalState(
              (current) => {
                let next = setParagraphStyle(current, "borderTop", border);
                next = setParagraphStyle(next, "borderRight", border);
                next = setParagraphStyle(next, "borderBottom", border);
                next = setParagraphStyle(next, "borderLeft", border);
                return next;
              },
              { mergeKey: "paraBorders" },
            );
            focusInput();
          },
          setLineHeight: (v) => commandsController.applyParagraphStyleCommand("lineHeight", v),
          setListFormat: (format) =>
            commandsController.handleListFormatChange(
              format as Parameters<typeof commandsController.handleListFormatChange>[0],
            ),
          setListStartAt: (n) => commandsController.handleListStartAtChange(n),
          outdent: () => void commandsController.handleListTab("outdent"),
          indent: () => void commandsController.handleListTab("indent"),
        },
        setUnderlineStyle: (v) =>
          (
            styleController.applyToolbarValueStyleCommand as (
              key: "underlineStyle",
              value: string | null,
            ) => void
          )("underlineStyle", v),
        section: {
          isLandscape: () => {
            const idx = getActiveSectionIndex(state);
            const section = state.document.sections?.[idx] ?? state.document;
            return section?.pageSettings?.orientation === "landscape";
          },
          toggleOrientation: () => {
            const idx = getActiveSectionIndex(state);
            const section = state.document.sections?.[idx] ?? state.document;
            if (!section) return;
            const current = section.pageSettings?.orientation ?? "portrait";
            commandsController.applyUpdateSectionSettingsCommand(idx, {
              pageSettings: {
                ...section.pageSettings!,
                orientation: current === "portrait" ? "landscape" : "portrait",
              },
            });
          },
          breakNextPage: () => commandsController.applyInsertSectionBreakCommand("nextPage"),
          breakContinuous: () => commandsController.applyInsertSectionBreakCommand("continuous"),
        },
        table: (() => {
          const insideTable = () =>
            Boolean(
              findParagraphTableLocation(
                state.document,
                state.selection.focus.paragraphId,
                getActiveSectionIndex(state),
              ),
            );
          const apply = (
            producer: (current: EditorState) => EditorState,
            mergeKey: string,
          ) => {
            applyTransactionalState(producer, { mergeKey });
            focusInput();
          };
          const selectionLabel = (): string | null => {
            const normalized = normalizeSelection(state);
            if (normalized.isCollapsed) return null;
            const secIdx = getActiveSectionIndex(state);
            const anchorLoc = findParagraphTableLocation(
              state.document,
              state.selection.anchor.paragraphId,
              secIdx,
            );
            const focusLoc = findParagraphTableLocation(
              state.document,
              state.selection.focus.paragraphId,
              secIdx,
            );
            if (
              !anchorLoc ||
              !focusLoc ||
              anchorLoc.blockIndex !== focusLoc.blockIndex ||
              (anchorLoc.rowIndex === focusLoc.rowIndex &&
                anchorLoc.cellIndex === focusLoc.cellIndex)
            ) {
              return null;
            }
            const count = selectionBoxes().length;
            if (count === 0) return null;
            return `Table selection: ${count} cell${count === 1 ? "" : "s"}`;
          };
          return {
            insideTable,
            selectionLabel,
            canMerge: () => tableOps.canMergeSelectedTable(state),
            canSplit: () => tableOps.canSplitSelectedTable(state),
            canEditColumn: () => tableOps.canEditSelectedTableColumn(state),
            canEditRow: () => tableOps.canEditSelectedTableRow(state),
            merge: () => apply((c) => tableOps.mergeSelectedTable(c), "mergeTable"),
            split: () => apply((c) => tableOps.splitSelectedTable(c), "splitTable"),
            insertColumnBefore: () =>
              apply((c) => tableOps.insertSelectedTableColumn(c, -1), "insertTableColumn"),
            insertColumnAfter: () =>
              apply((c) => tableOps.insertSelectedTableColumn(c, 1), "insertTableColumn"),
            deleteColumn: () =>
              apply((c) => tableOps.deleteSelectedTableColumn(c), "deleteTableColumn"),
            insertRowBefore: () =>
              apply((c) => tableOps.insertSelectedTableRow(c, -1), "insertTableRow"),
            insertRowAfter: () =>
              apply((c) => tableOps.insertSelectedTableRow(c, 1), "insertTableRow"),
            deleteRow: () => apply((c) => tableOps.deleteSelectedTableRow(c), "deleteTableRow"),
            cellShading: (color: string | null) =>
              apply((c) => setTableCellStyleValue(c, "shading", color || null), "tableShading"),
            cellBorders: () =>
              apply(
                (c) => setTableCellBorders(c, { width: 1, type: "solid", color: "#64748b" }),
                "tableBorders",
              ),
            cellNoBorders: () =>
              apply(
                (c) => setTableCellBorders(c, { width: 0, type: "none", color: "transparent" }),
                "tableBorders",
              ),
            width100: () => apply((c) => setTableStyleValue(c, "width", "100%"), "tableWidth"),
            alignLeft: () =>
              apply((c) => setTableCellStyleValue(c, "horizontalAlign", "left"), "tableAlign"),
            alignCenter: () =>
              apply((c) => setTableCellStyleValue(c, "horizontalAlign", "center"), "tableAlign"),
            alignRight: () =>
              apply((c) => setTableCellStyleValue(c, "horizontalAlign", "right"), "tableAlign"),
            setCellWidth: (width: string) =>
              apply((c) => setTableCellWidth(c, width), "tableCellWidth"),
            insert: (rows: number, cols: number) => tableOps.insertTableCommand(rows, cols),
          };
        })(),
      });

  const [runtimeReady, setRuntimeReady] = createSignal(false);
  const initialRuntimeEditor = new Editor({
    doc: getStateSnapshot().document,
    plugins: [],
  });
  const [runtimeEditor, setRuntimeEditor] = createSignal(initialRuntimeEditor);

  const { runtimePlugins, toolbarRegistry, dispose: disposeRuntimePlugins } = useEditorRuntimePlugins({
    essentialsPlugin,
    externalPlugins: runtimeOptions().plugins,
    customizeToolbar: runtimeOptions().customizeToolbar,
  });

  const commandStateOf = (commandRef: CommandRef) => {
    const commandName = commandRefName(commandRef);
    const cmd = runtimeEditor().commands.get(commandName);
    if (!cmd) {
      return { isEnabled: false, isActive: false, value: undefined };
    }
    const refreshed = cmd.refresh?.() ?? { isEnabled: true };
    return {
      isEnabled: refreshed.isEnabled !== false,
      isActive: Boolean(refreshed.isActive),
      value: refreshed.value,
    };
  };

  /** Narrow host the data-driven toolbar consumes — purely the command registry. */
  const toolbarHost = (): ToolbarHost => ({
    commands: {
      execute: (command, payload) => {
        const resolved = resolveCommandRef(command, payload);
        return runtimeEditor().execute(resolved.name, resolved.payload);
      },
      canExecute: (command, payload) => {
        const resolved = resolveCommandRef(command, payload);
        return runtimeEditor().canExecute(resolved.name, resolved.payload);
      },
      state: commandStateOf,
    },
    focusEditor: focusInput,
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

  const editorLayoutProps = {
    layoutMode: layoutMode(),
    viewportHeight: ui().viewportHeight,
    class: ui().class,
    style: ui().style,
  };

  const editorOverlayProps = {
    selectionBoxes: () => selectionBoxes(),
    selectedImageBox: () => selectedImageBox(),
    caretBox: () => caretBox(),
    inputBox: () => inputBox(),
    hoveredRevision: revisionController.hoveredRevision,
    focused: () => focused(),
    showCaret: shouldShowCaret,
    importProgress: () => docIO.importProgress(),
  };

  const editorRefs = {
    onViewportRef: (element: HTMLDivElement) => {
      focusController.viewportRef = element;
    },
    onSurfaceRef: (element: HTMLDivElement) => {
      focusController.surfaceRef = element;
    },
    onTextareaRef: (element: HTMLTextAreaElement) => {
      focusController.textareaRef = element;
    },
    onImportInputRef: (element: HTMLInputElement) => {
      focusController.importInputRef = element;
    },
    onImageInputRef: (element: HTMLInputElement) => {
      focusController.imageInputRef = element;
    },
  };

  const editorFileHandlers = {
    onImportInputChange: (e: Event & { currentTarget: HTMLInputElement }) =>
      docIO.handleImportDocx(e.currentTarget.files?.[0] ?? null),
    onImageInputChange: (e: Event & { currentTarget: HTMLInputElement }) =>
      docIO.handleInsertImage(e.currentTarget.files?.[0] ?? null),
  };

  const editorSurfaceHandlers = {
    onDragOver: (event: DragEvent) => event.preventDefault(),
    onDrop: handleDrop,
    onEditorMouseDown,
    onSurfaceMouseDown: surfaceEventsWithTextDrag.handleSurfaceMouseDown,
    onSurfaceClick: surfaceEventsWithTextDrag.handleSurfaceClick,
    onSurfaceMouseMove: tableResize.handleMouseMove,
    onSurfaceDblClick: surfaceEventsWithTextDrag.handleSurfaceDblClick,
    onParagraphMouseDown: surfaceEventsWithTextDrag.handleParagraphMouseDown,
    onImageMouseDown: handleImageMouseDown,
    onImageResizeHandleMouseDown: handleImageResizeHandleMouseDown,
    onTableDragHandleMouseDown: tableDrag.handleMouseDown,
    onRevisionMouseEnter: revisionController.handleRevisionMouseEnter,
    onRevisionMouseLeave: revisionController.handleRevisionMouseLeave,
    onEditorContextMenu: (event: MouseEvent) => handleEditorContextMenu(event),
  };

  const editorInputHandlers = {
    onInputBlur: () => setFocused(false),
    onInputFocus: () => setFocused(true),
    onCompositionEnd: textInput.handleCompositionEnd,
    onCompositionStart: textInput.handleCompositionStart,
    onCopy: handleCopy,
    onCut: handleCut,
    onInput: textInput.handleTextInput,
    onKeyDown: handleKeyDown,
    onPaste: handlePaste,
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

  let runtimeDisposed = false;

  onMount(() => {
    startIconObserver();
    startLongTaskObserver();
    installGlobalReport();
    registerDomStatsSurface(() => surfaceRef() ?? null);
    void (async () => {
      try {
        const initializedRuntimeEditor = await Editor.create({
          doc: getStateSnapshot().document,
          plugins: runtimePlugins,
        });
        if (runtimeDisposed) {
          await initializedRuntimeEditor.destroy();
          return;
        }

        const previousRuntimeEditor = runtimeEditor();
        setRuntimeEditor(initializedRuntimeEditor);
        await previousRuntimeEditor.destroy();
        setRuntimeReady(true);

        requestAnimationFrame(() => {
          setInitialLoading(false);
          runtimeOptions().onReady?.();
        });
      } catch (error) {
        logger.error("runtime:init failed", error);
        setInitialLoading(false);
      }
    })();
  });

  onCleanup(() => {
    runtimeDisposed = true;
    void runtimeEditor().destroy();
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
