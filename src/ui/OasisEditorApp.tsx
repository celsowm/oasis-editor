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
import { resolvePositionAtPoint } from "./positionAtPoint.js";
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
import { FindReplaceDialog } from "./components/FindReplace/FindReplaceDialog.js";
import "./components/FindReplace/findReplace.css";
import { startIconObserver, stopIconObserver } from "./utils/IconManager.js";
import { setLocale } from "../i18n/index.js";
import {
  resolveCanvasSurfaceHitAtPointWithFallback,
  type SurfaceHit,
} from "./canvas/CanvasHitTestService.js";
import { buildCanvasLayoutSnapshot } from "./canvas/CanvasLayoutSnapshot.js";
import {
  recordCanvasDebugFallbackEvent,
  recordCanvasDebugHit,
  recordCanvasDebugLayoutSnapshot,
  syncCanvasDebugApiVisibility,
} from "./canvas/CanvasDebug.js";

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
      return Reflect.get(stateAccessor(), prop);
    },
    has(_, prop) {
      return Reflect.has(stateAccessor(), prop);
    },
    ownKeys(_) {
      return Reflect.ownKeys(stateAccessor());
    },
    getOwnPropertyDescriptor(_, prop) {
      return {
        ...Reflect.getOwnPropertyDescriptor(stateAccessor(), prop),
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

  const shellComponent = () => {
    const s = props.shell ?? "document";
    if (s === "inline") return InlineShell;
    if (s === "balloon") return BalloonShell;
    return DocumentShell;
  };

  const [focused, setFocused] = createSignal(false);
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
    geometrySource: "canvas",
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

  const processEnv = (globalThis as any)?.process?.env ?? {};
  const viteEnv = (import.meta as any)?.env ?? {};
  const isWordParityStrict = () =>
    processEnv.OASIS_WORD_PARITY_STRICT === "1" ||
    processEnv.OASIS_WORD_PARITY_USE_NODE_LAYOUT === "1" ||
    viteEnv.VITE_OASIS_WORD_PARITY_STRICT === "1";
  const isCanvasDomFallbackEnabled = () =>
    !isWordParityStrict() &&
    (processEnv.OASIS_CANVAS_GEOMETRY_FALLBACK === "1" ||
      viteEnv.VITE_OASIS_CANVAS_GEOMETRY_FALLBACK === "1");

  const resolvePositionAtSurfacePointLegacy = (
    clientX: number,
    clientY: number,
  ): EditorPosition | null =>
    surfaceRef
      ? resolvePositionAtPoint({
          clientX,
          clientY,
          surface: surfaceRef,
          state: state as EditorState,
          documentLike: document,
        })
      : null;

  const resolveZoneAtPoint = (clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY);
    const el = target instanceof HTMLElement ? target : null;
    if (el?.closest(".oasis-editor-page-header-zone")) return "header" as const;
    if (el?.closest(".oasis-editor-page-footer-zone")) return "footer" as const;
    return "main" as const;
  };

  const resolveSurfaceHitAtPoint = (
    clientX: number,
    clientY: number,
    context: { forDrag?: boolean } = {},
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

    const hit = resolveCanvasSurfaceHitAtPointWithFallback({
      snapshot,
      state: state as EditorState,
      clientX,
      clientY,
      allowDomFallback: !context.forDrag && isCanvasDomFallbackEnabled(),
      resolveDomFallbackPosition: resolvePositionAtSurfacePointLegacy,
      onFallbackUsed: (reason, details) => {
        recordCanvasDebugFallbackEvent(reason, details);
        logger.info("canvas:fallback-hit-test", {
          reason,
          ...details,
        });
      },
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

  const surfaceEvents = createEditorSurfaceEvents({
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
        onSurfaceMouseDown={surfaceEvents.handleSurfaceMouseDown}
        onSurfaceMouseMove={tableResize.handleMouseMove}
        onSurfaceDblClick={surfaceEvents.handleSurfaceDblClick}
        onParagraphMouseDown={surfaceEvents.handleParagraphMouseDown}
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
      />
    );
  };

  onMount(() => {
    startIconObserver();
    startLongTaskObserver();
    installGlobalReport();
    registerDomStatsSurface(() => surfaceRef ?? null);
  });

  onCleanup(() => {
    onCleanupHook();
    surfaceEvents.stopDragging();
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
            onSurfaceMouseDown={surfaceEvents.handleSurfaceMouseDown}
            onSurfaceMouseMove={tableResize.handleMouseMove}
            onSurfaceDblClick={surfaceEvents.handleSurfaceDblClick}
            onParagraphMouseDown={surfaceEvents.handleParagraphMouseDown}
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
              [resizing().type === "column" ? "left" : "top"]: `${resizing().currentPos}px`,
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
    </div>
  );
}
