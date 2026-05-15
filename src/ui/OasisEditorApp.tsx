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
  measureParagraphLayoutFromRects,
  resolveClosestOffsetInMeasuredLayout,
} from "./layoutProjection.js";
import {
  collectParagraphCharRects,
  findNearestParagraphElement,
  resolvePositionAtPoint,
} from "./positionAtPoint.js";
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
import {
  getCaretRectAtOffset,
  resolveClickOffsetFromTarget,
} from "./domGeometry.js";
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
import type { IRenderingEngine } from "../core/engine.js";
import { canvasEngine } from "./engines/canvasEngine.js";

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
  engine?: IRenderingEngine;
}

export function OasisEditorApp(props: OasisEditorAppProps = {}) {
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
  const selectedEngine = (): IRenderingEngine => {
    if (props.engine) {
      return props.engine;
    }
    if (typeof HTMLCanvasElement === "undefined") {
      throw new Error(
        "Canvas renderer is required. Inject an engine explicitly if you need a non-canvas fallback.",
      );
    }
    return canvasEngine;
  };

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

  const resolveParagraphClickOffset = (
    paragraph: EditorParagraphNode,
    event: MouseEvent,
  ): number => {
    const paragraphLength = getParagraphText(paragraph).length;
    const segmentResult = resolveClickOffsetFromTarget(event.target, event.clientX);
    if (segmentResult && segmentResult.paragraphId === paragraph.id) {
      return Math.max(0, Math.min(paragraphLength, segmentResult.offset));
    }

    const directChar =
      (event.target as HTMLElement).closest<HTMLElement>("[data-char-index]") ?? null;
    if (directChar) {
      const charIndex = Number(directChar.dataset.charIndex);
      if (Number.isFinite(charIndex)) {
        const rect = directChar.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const computed = event.clientX <= midX ? charIndex : charIndex + 1;
        return Math.max(0, Math.min(paragraphLength, computed));
      }
    }

    const cachedLayout = measuredParagraphLayouts()[paragraph.id];
    const isCurrent = cachedLayout && cachedLayout.text === getParagraphText(paragraph) && surfaceRef && (() => {
      const firstLine = cachedLayout.lines[0];
      if (!firstLine) return false;
      const caret = getCaretRectAtOffset(surfaceRef, paragraph.id, firstLine.startOffset);
      return caret && Math.abs(caret.top - firstLine.top) < 2;
    })();

    const layout = isCurrent || !surfaceRef
        ? cachedLayout
        : measureParagraphLayoutFromRects(
            paragraph,
            collectParagraphCharRects(surfaceRef, paragraph.id),
          );

    return !layout || layout.text.length === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            layout.text.length,
            resolveClosestOffsetInMeasuredLayout(layout, event.clientX, event.clientY),
          ),
        );
  };

  const findPointerParagraphElement = (
    event: MouseEvent,
    root: HTMLElement,
  ): HTMLElement | null => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const direct = target?.closest<HTMLElement>("[data-paragraph-id]") ?? null;
    if (direct && root.contains(direct)) {
      return direct;
    }

    const elementAtPoint = document.elementFromPoint(event.clientX, event.clientY);
    const hitParagraph =
      elementAtPoint instanceof HTMLElement
        ? elementAtPoint.closest<HTMLElement>("[data-paragraph-id]")
        : null;
    if (hitParagraph && root.contains(hitParagraph)) {
      return hitParagraph;
    }

    const page = target?.closest<HTMLElement>('[data-testid="editor-page"]');
    const scopedRoot = page && root.contains(page) ? page : root;
    return findNearestParagraphElement(scopedRoot, event.clientX, event.clientY);
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
    surfaceRef: () => surfaceRef ?? null,
    tableResize,
    imageOps,
    clearPendingCaretTextStyle: styleController.clearPendingCaretTextStyle,
    clearPreferredColumn,
    resetTransactionGrouping,
    focusInputAfterPointerSelection,
    resolvePositionAtSurfacePoint,
    resolveParagraphClickOffset,
    findPointerParagraphElement,
    getDocumentParagraphs,
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
        engine={selectedEngine()}
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
            engine={selectedEngine()}
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
