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
  createInitialEditorState,
  createEditorStateFromDocument,
} from "../core/editorState.js";
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
  resolveCanvasSurfaceHitAtPoint,
  type SurfaceHit,
} from "./canvas/CanvasHitTestService.js";
import { buildCanvasLayoutSnapshot } from "./canvas/CanvasLayoutSnapshot.js";
import {
  recordCanvasDebugHit,
  recordCanvasDebugLayoutSnapshot,
  recordCanvasDebugSelection,
  syncCanvasDebugApiVisibility,
} from "./canvas/CanvasDebug.js";

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
  const initialEditorState = props.initialState
    ? cloneEditorState(props.initialState)
    : props.initialDocument
      ? createEditorStateFromDocument(props.initialDocument)
      : createInitialEditorState();

  let stateSnapshot: EditorState = initialEditorState;
  const [stateAccessor, setStateSignal] = createSignal<EditorState>(initialEditorState);

  const state = new Proxy({} as EditorState, {
    get(_, prop) {
      const current = stateAccessor() as unknown;
      if (current === null || (typeof current !== "object" && typeof current !== "function")) {
        return undefined;
      }
      return Reflect.get(current as object, prop);
    },
    has(_, prop) {
      const current = stateAccessor() as unknown;
      if (current === null || (typeof current !== "object" && typeof current !== "function")) {
        return false;
      }
      return Reflect.has(current as object, prop);
    },
    ownKeys(_) {
      const current = stateAccessor() as unknown;
      if (current === null || (typeof current !== "object" && typeof current !== "function")) {
        return [];
      }
      return Reflect.ownKeys(current as object);
    },
    getOwnPropertyDescriptor(_, prop) {
      const current = stateAccessor() as unknown;
      if (current === null || (typeof current !== "object" && typeof current !== "function")) {
        return {
          configurable: true,
          enumerable: true,
        };
      }
      return {
        ...Reflect.getOwnPropertyDescriptor(current as object, prop),
        configurable: true,
        enumerable: true
      };
    }
  });

  const commitState = (next: EditorState) => {
    stateSnapshot = next;
    setStateSignal(next);
  };
  const applyState = (nextState: EditorState) => {
    commitState(nextState);
  };

  const focusInput = () => {
    setFocused(true);
    queueMicrotask(() => {
      textareaRef?.focus({ preventScroll: true });
      if (textareaRef) {
        textareaRef.selectionStart = textareaRef.value.length;
        textareaRef.selectionEnd = textareaRef.value.length;
      }
    });
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

  const [focused, setFocused] = createSignal(false);
  const [initialLoading, setInitialLoading] = createSignal(props.loading !== false);
  const [undoStack, setUndoStack] = createSignal<EditorState[]>([]);
  const [redoStack, setRedoStack] = createSignal<EditorState[]>([]);

  const [linkDialog, setLinkDialog] = createSignal<{
    isOpen: boolean;
    initialHref: string;
  }>({
    isOpen: false,
    initialHref: "",
  });
  const [imageAltDialog, setImageAltDialog] = createSignal<{
    isOpen: boolean;
    initialAlt: string;
  }>({
    isOpen: false,
    initialAlt: "",
  });

  const [contextMenu, setContextMenu] = createSignal<{
    isOpen: boolean;
    x: number;
    y: number;
  }>({ isOpen: false, x: 0, y: 0 });

  const [fontDialog, setFontDialog] = createSignal<{
    isOpen: boolean;
    initial: FontDialogInitialValues;
  }>({
    isOpen: false,
    initial: {
      fontFamily: "",
      fontSize: "",
      color: "",
      bold: false,
      italic: false,
      underline: false,
      strike: false,
    },
  });

  let viewportRef: HTMLDivElement | undefined;
  let surfaceRef: HTMLDivElement | undefined;
  let textareaRef: HTMLTextAreaElement | undefined;
  let importInputRef: HTMLInputElement | undefined;
  let imageInputRef: HTMLInputElement | undefined;
  type CanvasSnapshotCache = {
    snapshot: ReturnType<typeof buildCanvasLayoutSnapshot>;
    documentRef: EditorState["document"];
    measuredBlockHeightsRef: Record<string, number>;
    measuredParagraphLayoutsRef: Record<string, EditorLayoutParagraph>;
    layoutModeValue: "fast" | "wordParity";
    surfaceRef: HTMLDivElement;
    viewportScrollTop: number;
    viewportScrollLeft: number;
    surfaceClientWidth: number;
    surfaceClientHeight: number;
    windowWidth: number;
    windowHeight: number;
  };
  let canvasSnapshotCache: CanvasSnapshotCache | null = null;

  const docIO = createEditorDocumentIO({
    state: () => state,
    applyState,
    applyTransactionalState: (producer, options) => applyTransactionalState(producer, options),
    isReadOnly,
    surfaceRef: () => surfaceRef ?? null,
    stabilizeLayoutAfterImport: async () => {
      await stabilizeLayoutAfterImport();
    },
    resetEditorChromeState: () => resetEditorChromeState(),
    focusInput,
    logger,
  });

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
    surfaceRef: () => surfaceRef,
    viewportRef: () => viewportRef,
    isImporting: () => docIO.importProgress()?.phase !== "done" && docIO.importProgress()?.phase !== "error" && docIO.importProgress() !== null,
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
    stateSnapshot: () => stateSnapshot,
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
    if (docIO.importProgress()?.phase !== "done" && docIO.importProgress()?.phase !== "error" && docIO.importProgress() !== null) {
      return;
    }
    props.onStateChange?.(cloneState(stateSnapshot));
  });

  const resetTransactionGrouping = () => {
    historyState = resetEditorHistoryGrouping(historyState);
  };

  const applyTransactionalState = (
    producer: (current: EditorState) => EditorState,
    options?: EditorTransactionOptions,
  ) => {
    const prev = stateSnapshot;
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

  const focusInputAfterPointerSelection = () => {
    setFocused(true);
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        textareaRef?.focus({ preventScroll: true });
        if (textareaRef) {
          textareaRef.selectionStart = textareaRef.value.length;
          textareaRef.selectionEnd = textareaRef.value.length;
        }
      });
    });
  };

  const resolveSurfaceHitAtPoint = (
    clientX: number,
    clientY: number,
    _context: { forDrag?: boolean } = {},
  ): SurfaceHit | null => {
    if (!surfaceRef) return null;



    const currentMeasuredBlockHeights = measuredBlockHeights();
    const currentMeasuredParagraphLayouts = measuredParagraphLayouts();
    const currentLayoutMode = layoutMode();
    const viewportScrollTop = viewportRef?.scrollTop ?? 0;
    const viewportScrollLeft = viewportRef?.scrollLeft ?? 0;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const shouldReuseSnapshot =
      canvasSnapshotCache &&
      canvasSnapshotCache.documentRef === (state as EditorState).document &&
      canvasSnapshotCache.measuredBlockHeightsRef === currentMeasuredBlockHeights &&
      canvasSnapshotCache.measuredParagraphLayoutsRef === currentMeasuredParagraphLayouts &&
      canvasSnapshotCache.layoutModeValue === currentLayoutMode &&
      canvasSnapshotCache.surfaceRef === surfaceRef &&
      canvasSnapshotCache.viewportScrollTop === viewportScrollTop &&
      canvasSnapshotCache.viewportScrollLeft === viewportScrollLeft &&
      canvasSnapshotCache.surfaceClientWidth === surfaceRef.clientWidth &&
      canvasSnapshotCache.surfaceClientHeight === surfaceRef.clientHeight &&
      canvasSnapshotCache.windowWidth === windowWidth &&
      canvasSnapshotCache.windowHeight === windowHeight;
    const snapshot = shouldReuseSnapshot
      ? canvasSnapshotCache!.snapshot
      : buildCanvasLayoutSnapshot({
          surface: surfaceRef,
          state: state as EditorState,
          measuredBlockHeights: currentMeasuredBlockHeights,
          measuredParagraphLayouts: currentMeasuredParagraphLayouts,
          layoutMode: currentLayoutMode,
        });
    if (!shouldReuseSnapshot) {
      canvasSnapshotCache = {
        snapshot,
        documentRef: (state as EditorState).document,
        measuredBlockHeightsRef: currentMeasuredBlockHeights,
        measuredParagraphLayoutsRef: currentMeasuredParagraphLayouts,
        layoutModeValue: currentLayoutMode,
        surfaceRef,
        viewportScrollTop,
        viewportScrollLeft,
        surfaceClientWidth: surfaceRef.clientWidth,
        surfaceClientHeight: surfaceRef.clientHeight,
        windowWidth,
        windowHeight,
      };
    }
    recordCanvasDebugLayoutSnapshot(snapshot);
    if (!snapshot) {
      recordCanvasDebugHit(null);
      return null;
    }

    const hit = resolveCanvasSurfaceHitAtPoint({
      snapshot,
      state: state as EditorState,
      clientX,
      clientY,
    });
    recordCanvasDebugHit(hit);
    return hit;
  };

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

  const imageOps = createEditorImageOperations({
    state,
    surfaceRef: () => surfaceRef,
    resolvePositionAtSurfacePoint: (clientX, clientY) =>
      resolveSurfaceHitAtPoint(clientX, clientY)?.position ?? null,
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
    surfaceRef: () => surfaceRef,
    viewportRef: () => viewportRef,
  });

  const resolvePositionAtSurfacePoint = (
    clientX: number,
    clientY: number,
  ): EditorPosition | null => {
    return resolveSurfaceHitAtPoint(clientX, clientY)?.position ?? null;
  };

  const tableDrag = createEditorTableDrag({
    state: () => state,
    applyTransactionalState,
    resolvePositionAtSurfacePoint,
    focusInput,
  });

  const revisionController = createEditorRevisionController({
    state: () => state,
    surfaceRef: () => surfaceRef ?? null,
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
    surfaceRef: () => surfaceRef ?? null,
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

  const toolbarController = createEditorToolbarController({
    state: () => state,
    undoStack,
    redoStack,
    persistenceStatus,
    importInputRef: () => importInputRef,
    imageInputRef: () => imageInputRef,
    styleController,
    commandsController,
    tableOps,
    docIO,
    historyActions,
    selectionBoxes: () => selectionBoxes(),
    selectedImageRun,
    toggleFindReplace: (open) => fr.setIsOpen(open ?? !fr.isOpen()),
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
          viewportRef = element;
        }}
        onSurfaceRef={(element: HTMLDivElement) => {
          surfaceRef = element;
        }}
        onTextareaRef={(element: HTMLTextAreaElement) => {
          textareaRef = element;
        }}
        onImportInputRef={(element: HTMLInputElement) => {
          importInputRef = element;
        }}
        onImageInputRef={(element: HTMLInputElement) => {
          imageInputRef = element;
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
    const values = new Set<string>([
      "Arial",
      "Calibri, sans-serif",
      "Calibri Light, sans-serif",
      "Georgia",
      "Inter",
      "Times New Roman",
      "Courier New",
    ]);
    for (const style of Object.values(state.document?.styles ?? {})) {
      const fontFamily = (style as any).textStyle?.fontFamily?.trim?.();
      if (fontFamily) values.add(fontFamily);
    }
    const current = styleController.toolbarStyleState().fontFamily.trim();
    if (current) values.add(current);
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  };

  const computeFontSizeOptions = (): number[] => {
    const values = new Set<number>([8, 9, 10, 11, 12, 14, 15, 16, 18, 20, 24, 28, 32, 36, 48, 72]);
    for (const style of Object.values(state.document?.styles ?? {})) {
      const fontSize = (style as any).textStyle?.fontSize;
      if (typeof fontSize === "number" && Number.isFinite(fontSize)) values.add(fontSize);
    }
    const current = Number(styleController.toolbarStyleState().fontSize);
    if (Number.isFinite(current) && current > 0) values.add(current);
    return Array.from(values).sort((a, b) => a - b);
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
    registerDomStatsSurface(() => surfaceRef ?? null);
    requestAnimationFrame(() => {
      setInitialLoading(false);
      props.onReady?.();
    });
  });

  onCleanup(() => {
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
              viewportRef = element;
            }}
            onSurfaceRef={(element) => {
              surfaceRef = element;
            }}
            onTextareaRef={(element) => {
              textareaRef = element;
            }}
            onImportInputRef={(element) => {
              importInputRef = element;
            }}
            onImageInputRef={(element) => {
              imageInputRef = element;
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
            surfaceRef={surfaceRef}
            state={state as EditorState}
            targetPos={pos}
          />
        )}
      </Show>

      <Show when={imageOps.dragging() && imageOps.dropTargetPos()}>
        {(pos) => (
          <DropCaret
            surfaceRef={surfaceRef}
            state={state as EditorState}
            targetPos={pos}
          />
        )}
      </Show>

      <Show when={textDrag.dragging() && textDrag.dropTargetPos()}>
        {(pos) => (
          <DropCaret
            surfaceRef={surfaceRef}
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
