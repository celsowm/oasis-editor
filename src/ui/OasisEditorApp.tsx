import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
  For,
  type JSX,
} from "solid-js";
import { OasisEditorEditor } from "./OasisEditorEditor.js";
import { CaretOverlay } from "./components/CaretOverlay.js";
import { getCaretSlotRects } from "./caretGeometry.js";
import {
  applyEditorHistoryTransaction,
  createEmptyEditorHistoryState,
  resetEditorHistoryGrouping,
  takeEditorRedoStep,
  takeEditorUndoStep,
  type EditorTransactionOptions,
} from "./editorHistory.js";
import {
  measureParagraphLayoutFromRects,
  resolveClosestOffsetInMeasuredLayout,
} from "./layoutProjection.js";
import {
  collectParagraphCharRects,
  findNearestParagraphElement,
  getParagraphElements,
  resolvePositionAtPoint,
} from "./positionAtPoint.js";
import {
  getToolbarStyleState,
  type BooleanStyleKey,
  type ParagraphStyleKey,
  type ToolbarStyleState,
} from "./toolbarStyleState.js";
import {
  clearParagraphListAtSelection,
  deleteBackward,
  deleteForward,
  extendSelectionDown,
  extendSelectionLeft,
  extendSelectionRight,
  extendSelectionUp,
  getLinkAtSelection,
  getSelectedImageRun,
  getSelectedText,
  insertClipboardHtmlAtSelection,
  insertPlainTextAtSelection,
  insertTextAtSelection,
  insertImageAtSelection,
  insertFieldAtSelection,
  insertPageBreakAtSelection,
  insertSectionBreakAtSelection,
  updateSectionSettings,
  indentParagraphList,
  moveSelectionDown,
  moveSelectedImageToPosition,
  resizeSelectedImage,
  moveSelectionLeft,
  moveSelectionRight,
  moveSelectionUp,
  outdentParagraphList,
  parseEditorClipboardHtml,
  setParagraphStyle,
  setParagraphNamedStyle,
  setLinkAtSelection,
  setTableCellStyleValue,
  setTableStyleValue,
  setTableCellWidth,
  setTableCellBorders,
  toggleTrackChanges,
  acceptRevision,
  rejectRevision,
  acceptRevisionsInSelection,
  rejectRevisionsInSelection,
  setSelectedImageAlt,
  setSelection,
  splitListItemAtSelection,
  setParagraphListFormat,
  setParagraphListStartAt,
  setTextStyleValue,
  serializeEditorSelectionToHtml,
  splitBlockAtSelection,
  toggleParagraphList,
  toggleTextStyle,
} from "../core/editorCommands.js";
import {
  createEditorDocument,
  createEditorParagraph,
  createInitialEditorState,
  createEditorStateFromDocument,
} from "../core/editorState.js";
import {
  DEFAULT_EDITOR_PAGE_SETTINGS,
  normalizePageSettings,
  getDocumentPageSettings,
  getPageContentWidth,
  type EditorDocument,
  type EditorBlockNode,
  type EditorLayoutParagraph,
  type EditorParagraphNode,
  type EditorParagraphListStyle,
  type EditorTextRun,
  type EditorBorderStyle,
  type EditorNamedStyle,
  getParagraphLength,
  getParagraphs,
  getDocumentParagraphs,
  getParagraphById,
  getBlockParagraphs,
  getParagraphText,
  findParagraphLocation,
  findParagraphTableLocation,
  getActiveSectionIndex,
  getActiveZone,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
  type EditorParagraphStyle,
  type EditorPosition,
  type EditorRevision,
  type EditorSection,
  type EditorState,
  type EditorTextStyle,
} from "../core/model.js";
import { isSelectionCollapsed, normalizeSelection } from "../core/selection.js";
import { exportEditorDocumentToDocxBlob } from "../export/docx/exportEditorDocumentToDocx.js";
import { importDocxInWorker } from "../import/docx/importDocxInWorker.js";
import type { DocxImportStage } from "../import/docx/importDocxToEditorDocument.js";
import { createEditorLogger } from "../utils/logger.js";
import {
  markEnd,
  markStart,
  recordDuration,
  perfTimer,
  startLongTaskObserver,
  installGlobalReport,
  registerDomStatsSurface,
} from "../utils/performanceMetrics.js";
import type {
  CaretBox,
  InputBox,
  RevisionBox,
  SelectionBox,
  ImageResizeHandleDirection,
} from "./editorUiTypes.js";
import {
  cloneBlock,
  cloneDocumentBlock,
  cloneSection,
  cloneEditorState,
} from "../core/cloneState.js";
import {
  findNextWordBoundary,
  findPreviousWordBoundary,
  isWordCharacter,
  resolveWordSelection,
} from "../core/wordBoundaries.js";
import {
  getCaretRectAtOffset,
  getElementContentWidth,
  getEmptyBlockRect,
  getMaxInlineImageWidth,
  getParagraphBoundaryElement,
  hasUsableCharGeometry,
  resolveClickOffsetFromTarget,
} from "./domGeometry.js";
import {
  buildTableCellLayout,
  type TableCellLayoutEntry,
} from "../core/tableLayout.js";
import { findImageFileFromTransfer, readFileBuffer } from "./clipboardImage.js";
import { EditorToolbar } from "./components/Toolbar/EditorToolbar.js";
import { DocumentShell } from "./shells/DocumentShell.js";
import { InlineShell } from "./shells/InlineShell.js";
import { BalloonShell } from "./shells/BalloonShell.js";
import { createEditorCommandsController } from "../app/controllers/EditorCommandsController.js";
import { createEditorClipboardController } from "../app/controllers/useEditorClipboard.js";
import { createEditorKeyboardController } from "../app/controllers/useEditorKeyboard.js";
import { useEditorLayout, type LayoutInvalidation } from "../app/controllers/useEditorLayout.js";
import { useEditorPersistence } from "../app/controllers/useEditorPersistence.js";
import { useEditorFindReplace } from "../app/controllers/useEditorFindReplace.js";
import { createEditorTableOperations } from "../app/controllers/useEditorTableOperations.js";
import { createEditorImageOperations } from "../app/controllers/useEditorImageOperations.js";
import { createEditorTableResize } from "../app/controllers/useEditorTableResize.js";
import { createEditorTableDrag } from "../app/controllers/useEditorTableDrag.js";
import { cloneStyle } from "../core/commands/utils.js";
import { LinkDialog } from "./components/Dialogs/LinkDialog.js";
import { ImageAltDialog } from "./components/Dialogs/ImageAltDialog.js";
import { FindReplaceDialog } from "./components/FindReplace/FindReplaceDialog.js";
import "./components/FindReplace/findReplace.css";
import { startIconObserver, stopIconObserver } from "./utils/IconManager.js";
import type { EditorToolbarCtx } from "./components/Toolbar/types.js";
import { setLocale } from "../i18n/index.js";

function createSectionBoundaryParagraph(zone: "header" | "footer"): EditorParagraphNode {
  const paragraph = createEditorParagraph("");
  paragraph.style = { styleId: zone };
  return paragraph;
}

/**
 * Phase 3: Cheap diff between two editor states. Produces an explicit
 * `LayoutInvalidation` hint for the layout controller, so the layout effect
 * never has to walk every paragraph in the document on every keystroke.
 *
 * Worst case is still O(total chars) — same as the legacy signature loop
 * — but this is computed exactly once per transaction (vs once per Solid
 * reactive notification), and it does NOT participate in the reactive graph,
 * so it doesn't itself cause re-renders.
 *
 * Errs on the side of `dirtyAll` for any structural shape mismatch we can
 * detect cheaply, to avoid stale layout caches.
 */
function computeLayoutInvalidationFromTransaction(
  prev: EditorState,
  next: EditorState,
): LayoutInvalidation {
  if (prev === next || prev.document === next.document) {
    return {};
  }

  // Fast structural check: if any block's id at any position differs, mark
  // structureChanged. Don't try to be clever about partial reorderings.
  const prevBlockIds = prev.document.blocks.map((b) => b.id).join("|");
  const nextBlockIds = next.document.blocks.map((b) => b.id).join("|");
  let structureChanged = prevBlockIds !== nextBlockIds;

  if (!structureChanged && prev.document.sections && next.document.sections) {
    const prevSecs = prev.document.sections;
    const nextSecs = next.document.sections;
    if (prevSecs.length !== nextSecs.length) {
      structureChanged = true;
    } else {
      for (let i = 0; i < prevSecs.length; i += 1) {
        const a = prevSecs[i]!;
        const b = nextSecs[i]!;
        const aIds = [
          ...(a.header ?? []).map((x) => x.id),
          ...a.blocks.map((x) => x.id),
          ...(a.footer ?? []).map((x) => x.id),
        ].join("|");
        const bIds = [
          ...(b.header ?? []).map((x) => x.id),
          ...b.blocks.map((x) => x.id),
          ...(b.footer ?? []).map((x) => x.id),
        ].join("|");
        if (aIds !== bIds) {
          structureChanged = true;
          break;
        }
      }
    }
  } else if (Boolean(prev.document.sections) !== Boolean(next.document.sections)) {
    structureChanged = true;
  }

  if (structureChanged) {
    return { dirtyAll: true, structureChanged: true };
  }

  // Same block shape: compare paragraphs by id, find ones whose run text
  // or shape changed. This is the typing/backspace fast path.
  const prevParas = getParagraphs(prev);
  const nextParas = getParagraphs(next);
  const prevById = new Map<string, EditorParagraphNode>();
  for (const p of prevParas) prevById.set(p.id, p);

  const dirtyParagraphIds: string[] = [];
  for (const np of nextParas) {
    const pp = prevById.get(np.id);
    if (!pp) {
      dirtyParagraphIds.push(np.id);
      continue;
    }
    if (pp === np) {
      // Reference equality (rare with the current cloneState, but cheap to
      // check): nothing changed.
      continue;
    }
    if (pp.runs.length !== np.runs.length) {
      dirtyParagraphIds.push(np.id);
      continue;
    }
    let changed = false;
    for (let i = 0; i < pp.runs.length; i += 1) {
      const a = pp.runs[i]!;
      const b = np.runs[i]!;
      if (a === b) continue;
      if (a.id !== b.id || a.text !== b.text) {
        changed = true;
        break;
      }
      if (Boolean(a.image) !== Boolean(b.image) ||
          (a.image?.width ?? -1) !== (b.image?.width ?? -1) ||
          (a.image?.height ?? -1) !== (b.image?.height ?? -1)) {
        changed = true;
        break;
      }
    }
    if (changed) {
      dirtyParagraphIds.push(np.id);
    }
  }

  return { dirtyParagraphIds };
}

interface ActiveImageResize {
  paragraphId: string;
  paragraphOffset: number;
  startClientX: number;
  startWidth: number;
  startHeight: number;
  aspectRatio: number;
  initialState: EditorState;
}

interface ActiveImageDrag {
  paragraphId: string;
  paragraphOffset: number;
  startClientX: number;
  startClientY: number;
  dragging: boolean;
}

type ImportProgressPhase =
  | "reading-file"
  | DocxImportStage
  | "applying-editor-state"
  | "stabilizing-layout"
  | "done"
  | "error";

interface ImportProgressState {
  phase: ImportProgressPhase;
  progress: number;
  subProgress?: number;
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
}

type ValueStyleKey = "fontFamily" | "fontSize" | "color" | "highlight" | "link";

function DropCaret(props: {
  surfaceRef: HTMLDivElement | undefined;
  state: EditorState;
  targetPos: () => EditorPosition;
}) {
  const layout = createMemo(() => {
    const pos = props.targetPos();
    const surfaceRef = props.surfaceRef;
    if (!surfaceRef) return null;

    const charRects = collectParagraphCharRects(surfaceRef, pos.paragraphId);
    let viewportLeft = 0;
    let viewportTop = 0;
    let height = 28;

    if (charRects.length === 0) {
      const pElement = getParagraphBoundaryElement(surfaceRef, pos.paragraphId, "end");
      const fallbackRect = pElement ? (getEmptyBlockRect(pElement) ?? pElement.getBoundingClientRect()) : null;
      if (fallbackRect) {
        viewportLeft = fallbackRect.left;
        viewportTop = fallbackRect.top;
        height = fallbackRect.height || 28;
      }
    } else {
      const rects = getCaretSlotRects(charRects);
      const paragraphNode = getParagraphs(props.state).find((p) => p.id === pos.paragraphId);
      const paragraphOffset = paragraphNode ? positionToParagraphOffset(paragraphNode, pos) : 0;
      const slotIndex = Math.max(0, Math.min(paragraphOffset, rects.length - 1));
      const rect = rects[slotIndex];
      if (rect) {
        viewportLeft = rect.left;
        viewportTop = rect.top;
        height = Math.min(rect.height, 32);
      }
    }

    return { viewportLeft, viewportTop, height };
  });

  return (
    <Show when={layout()}>
      {(l) => (
        <CaretOverlay
          active={true}
          fixed={true}
          left={l().viewportLeft}
          top={l().viewportTop}
          height={l().height}
        />
      )}
    </Show>
  );
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
  const pageSettings = () => getDocumentPageSettings(state.document);
  const showChrome = () => props.showChrome ?? true;
  const showTitleBar = () => props.showTitleBar ?? true;
  const showMenubar = () => props.showMenubar ?? true;
  const showToolbar = () => props.showToolbar ?? true;
  const showOutline = () => props.showOutline ?? true;
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
  const [composing, setComposing] = createSignal(false);
  const [undoStack, setUndoStack] = createSignal<EditorState[]>([]);
  const [redoStack, setRedoStack] = createSignal<EditorState[]>([]);
  const [hoveredRevision, setHoveredRevision] =
    createSignal<RevisionBox | null>(null);
  const [pendingCaretTextStyle, setPendingCaretTextStyle] =
    createSignal<EditorTextStyle | undefined>(undefined);
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
  const [importProgress, setImportProgress] =
    createSignal<ImportProgressState | null>(null);
  let viewportRef: HTMLDivElement | undefined;
  let surfaceRef: HTMLDivElement | undefined;
  let textareaRef: HTMLTextAreaElement | undefined;
  let importInputRef: HTMLInputElement | undefined;
  let imageInputRef: HTMLInputElement | undefined;

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
    isImporting: () => importProgress()?.phase !== "done" && importProgress()?.phase !== "error" && importProgress() !== null,
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

  let dragAnchor: EditorPosition | null = null;
  let activeImageDrag: ActiveImageDrag | null = null;
  let activeImageResize: ActiveImageResize | null = null;
  let historyState = createEmptyEditorHistoryState();
  let suppressedInputText: string | null = null;
  let forcePlainTextPaste = false;
  const cloneState = cloneEditorState;

  const clearPendingCaretTextStyle = () => {
    setPendingCaretTextStyle(undefined);
  };

  const updatePendingCaretTextStyleValue = <K extends ValueStyleKey>(
    key: K,
    value: EditorTextStyle[K] | null,
  ) => {
    setPendingCaretTextStyle((current) => {
      const next = { ...(current ?? {}) } as Record<string, unknown>;
      if (value === null || value === undefined || value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return Object.keys(next).length > 0 ? (next as EditorTextStyle) : undefined;
    });
  };

  const updatePendingCaretBooleanStyle = (
    key: BooleanStyleKey,
    enabled: boolean,
  ) => {
    setPendingCaretTextStyle((current) => {
      const next = { ...(current ?? {}) } as Record<string, unknown>;
      next[key] = enabled;
      if (key === "superscript" && enabled) {
        next.subscript = false;
      }
      if (key === "subscript" && enabled) {
        next.superscript = false;
      }
      return next as EditorTextStyle;
    });
  };

  const applyState = (nextState: EditorState) => {
    commitState(nextState);
  };

  const applyHistoryState = (nextState: EditorState) => {
    commitState(cloneState(nextState));
  };

  const applySelectionPreservingStructure = (
    nextSelection: EditorState["selection"],
  ) => {
    applyState({
      ...stateSnapshot,
      document: {
        ...stateSnapshot.document,
        blocks: stateSnapshot.document.blocks.map(cloneBlock),
        sections: stateSnapshot.document.sections?.map(cloneSection),
      },
      selection: {
        anchor: { ...nextSelection.anchor },
        focus: { ...nextSelection.focus },
      },
    });
  };

  const applySelectionToStatePreservingStructure = (
    current: EditorState,
    nextSelection: EditorState["selection"],
  ): EditorState => ({
    ...current,
    document: {
      ...current.document,
      blocks: current.document.blocks.map(cloneBlock),
      sections: current.document.sections?.map(cloneSection),
    },
    selection: {
      anchor: { ...nextSelection.anchor },
      focus: { ...nextSelection.focus },
    },
  });

  createEffect(() => {
    state.document;
    state.selection;
    state.activeSectionIndex;
    state.activeZone;
    // Skip expensive deep-clone during import to avoid blocking the main thread
    if (importProgress()?.phase !== "done" && importProgress()?.phase !== "error" && importProgress() !== null) {
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

    // Phase 3: compute layout invalidation from the (prev, next) pair and
    // hand it to the layout controller BEFORE setState. The controller's
    // doc-wide signature createEffect is then short-circuited.
    const invalidation = perfTimer(
      "txn:invalidate",
      () => computeLayoutInvalidationFromTransaction(prev, next),
      0,
    );
    applyLayoutInvalidation(invalidation);

    perfTimer("txn:setState", () => commitState(next), 0);
  };

  const performUndo = () => {
    const step = takeEditorUndoStep(historyState, stateSnapshot);
    if (!step) {
      return;
    }

    historyState = step.history;
    setUndoStack(historyState.undoStack);
    setRedoStack(historyState.redoStack);
    clearPreferredColumn();
    applyHistoryState(step.nextState);
    focusInput();
  };

  const performRedo = () => {
    const step = takeEditorRedoStep(historyState, stateSnapshot);
    if (!step) {
      return;
    }

    historyState = step.history;
    setUndoStack(historyState.undoStack);
    setRedoStack(historyState.redoStack);
    clearPreferredColumn();
    applyHistoryState(step.nextState);
    focusInput();
  };

  const moveSelectedImageByParagraph = (direction: -1 | 1) => {
    const selectedImage = imageOps.getSelectedImageInfo(state);
    if (!selectedImage) {
      return false;
    }

    const paragraphs = getParagraphs(state);
    const sourceIndex = paragraphs.findIndex(
      (paragraph) => paragraph.id === selectedImage.paragraph.id,
    );
    if (sourceIndex < 0) {
      return false;
    }

    const targetIndex = sourceIndex + direction;
    if (targetIndex < 0 || targetIndex >= paragraphs.length) {
      const insertedParagraph = createEditorParagraph("");
      const nextState: EditorState = {
        document: {
          ...state.document,
          blocks:
            direction < 0
              ? [insertedParagraph, ...state.document.blocks]
              : [...state.document.blocks, insertedParagraph],
        },
        selection: {
          anchor: { ...state.selection.anchor },
          focus: { ...state.selection.focus },
        },
      };
      const targetPosition = paragraphOffsetToPosition(
        insertedParagraph,
        direction < 0 ? getParagraphLength(insertedParagraph) : 0,
      );
      applyTransactionalState(
        () => moveSelectedImageToPosition(nextState, targetPosition),
        {
          mergeKey: "moveImage",
        },
      );
      focusInput();
      return true;
    }

    const targetParagraph = paragraphs[targetIndex];
    const targetOffset =
      direction < 0 ? getParagraphLength(targetParagraph) : 0;

    applyTransactionalState(
      (current) =>
        moveSelectedImageToPosition(
          current,
          paragraphOffsetToPosition(targetParagraph, targetOffset),
        ),
      { mergeKey: "moveImage" },
    );
    focusInput();
    return true;
  };

  const toolbarStyleState = (): ToolbarStyleState => {
    const resolved = getToolbarStyleState(state);
    const pending = pendingCaretTextStyle();
    if (!isSelectionCollapsed(state.selection) || !pending) {
      return resolved;
    }

    return {
      ...resolved,
      bold: pending.bold ?? resolved.bold,
      italic: pending.italic ?? resolved.italic,
      underline: pending.underline ?? resolved.underline,
      strike: pending.strike ?? resolved.strike,
      superscript: pending.superscript ?? resolved.superscript,
      subscript: pending.subscript ?? resolved.subscript,
      fontFamily: pending.fontFamily ?? resolved.fontFamily,
      fontSize:
        pending.fontSize !== undefined && pending.fontSize !== null
          ? String(pending.fontSize)
          : resolved.fontSize,
      color: pending.color ?? resolved.color,
      highlight: pending.highlight ?? resolved.highlight,
      link: pending.link ?? resolved.link,
    };
  };

  const selectedImageRun = () => getSelectedImageRun(state);
  const selectedImageAlt = () => selectedImageRun()?.run.image?.alt ?? null;

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

  const isMeasuredParagraphLayoutCurrent = (
    paragraph: EditorParagraphNode,
    layout: EditorLayoutParagraph | undefined,
  ): layout is EditorLayoutParagraph => {
    if (!layout || layout.text !== getParagraphText(paragraph) || !surfaceRef) {
      return false;
    }

    const firstLine = layout.lines[0];
    if (!firstLine) {
      return false;
    }

    // Use the Range-API helper instead of querying [data-char-index] (which
    // is no longer present on text segments after the per-char-span removal).
    const caret = getCaretRectAtOffset(surfaceRef, paragraph.id, firstLine.startOffset);
    if (!caret) {
      return false;
    }

    return Math.abs(caret.top - firstLine.top) < 2;
  };

  const resolveParagraphClickOffset = (
    paragraph: EditorParagraphNode,
    event: MouseEvent,
  ): number => {
    const paragraphLength = getParagraphText(paragraph).length;

    // Fast path: click landed on a known segment span (text/tab/image).
    // This covers nearly all in-text clicks without touching layout caches.
    const segmentResult = resolveClickOffsetFromTarget(event.target, event.clientX);
    if (segmentResult && segmentResult.paragraphId === paragraph.id) {
      return Math.max(0, Math.min(paragraphLength, segmentResult.offset));
    }

    // Legacy atom path (kept for safety: phantom span and edge cases).
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
    const layout =
      isMeasuredParagraphLayoutCurrent(paragraph, cachedLayout) || !surfaceRef
        ? cachedLayout
        : measureParagraphLayoutFromRects(
            paragraph,
            collectParagraphCharRects(surfaceRef, paragraph.id),
          );

    return layout.text.length === 0
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

  const PHASE_RANGES: Record<ImportProgressPhase, [number, number]> = {
    "reading-file": [0, 8],
    "opening-docx": [8, 20],
    "parsing-document": [20, 72],
    "parsing-headers-footers": [72, 78],
    "applying-editor-state": [78, 88],
    "stabilizing-layout": [88, 98],
    done: [100, 100],
    error: [100, 100],
  };

  const computeProgress = (phase: ImportProgressPhase, subProgress?: number): number => {
    const [min, max] = PHASE_RANGES[phase];
    if (subProgress !== undefined && Number.isFinite(subProgress)) {
      return Math.round((min + (max - min) * Math.min(1, Math.max(0, subProgress))) * 10) / 10;
    }
    return max;
  };

  const setImportPhase = (phase: ImportProgressPhase, subProgress?: number) => {
    setImportProgress({
      phase,
      progress: computeProgress(phase, subProgress),
      subProgress,
    });
  };

  const clearImportProgressSoon = () => {
    globalThis.setTimeout(() => {
      setImportProgress((current) =>
        current?.phase === "done" || current?.phase === "error" ? null : current,
      );
    }, 1200);
  };

  const handleImportDocx = async (file: File | null) => {
    if (isReadOnly()) {
      return;
    }
    if (!file) {
      return;
    }

    const startedAt = performance.now();
    logger.info("import docx:start", { name: file.name, size: file.size });
    setImportPhase("reading-file");

    try {
      const readingStartedAt = performance.now();
      const arrayBuffer = await readFileBuffer(file);
      logger.info("import docx:phase", {
        phase: "reading-file",
        durationMs: Math.round((performance.now() - readingStartedAt) * 100) / 100,
      });

      let lastProgressStage: DocxImportStage | null = null;
      let lastProgressValue = -1;
      let lastProgressAt = 0;
      const document = await importDocxInWorker(arrayBuffer, {
        onProgress: (stage, subProgress) => {
          const now = performance.now();
          const roundedProgress =
            subProgress === undefined || !Number.isFinite(subProgress)
              ? undefined
              : Math.floor(subProgress * 100);
          const stageChanged = stage !== lastProgressStage;
          const progressChanged =
            roundedProgress !== undefined &&
            (lastProgressValue < 0 || roundedProgress - lastProgressValue >= 1);
          const timeElapsed = now - lastProgressAt >= 40;
          if (!stageChanged && !progressChanged && !timeElapsed) {
            return;
          }

          lastProgressStage = stage;
          lastProgressValue = roundedProgress ?? lastProgressValue;
          lastProgressAt = now;
          setImportPhase(stage, subProgress);
          const payload = { phase: stage, subProgress };
          if (stageChanged || subProgress === undefined || subProgress === 1) {
            logger.info("import docx:phase", payload);
          } else {
            logger.debug("import docx:phase", payload);
          }
        },
      });

      setImportPhase("applying-editor-state");
      resetEditorChromeState();
      applyState(createEditorStateFromDocument(document));

      const stabilizationStartedAt = performance.now();
      setImportPhase("stabilizing-layout");
      await stabilizeLayoutAfterImport();
      logger.info("import docx:phase", {
        phase: "stabilizing-layout",
        durationMs: Math.round((performance.now() - stabilizationStartedAt) * 100) / 100,
      });

      setImportPhase("done");
      logger.info("import docx:done", {
        blocks: document.blocks.length,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      });
      if (importInputRef) {
        importInputRef.value = "";
      }
      focusInput();
    } catch (error) {
      setImportPhase("error");
      logger.error("import docx:error", error);
      if (importInputRef) {
        importInputRef.value = "";
      }
    } finally {
      clearImportProgressSoon();
    }
  };

  const insertImageFromFile = async (
    file: File,
    position?: EditorPosition | null,
  ) => {
    logger.info(
      `image insert:start name="${file.name}" type=${file.type} size=${file.size}`,
    );
    const arrayBuffer = await readFileBuffer(file);
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        "",
      ),
    );
    const src = `data:${file.type};base64,${base64}`;

    const img = new Image();
    img.src = src;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    const naturalWidth = img.naturalWidth || 300;
    const naturalHeight = img.naturalHeight || 300;
    const maxWidth = getMaxInlineImageWidth(
      surfaceRef,
      state.document,
      state.selection.focus.paragraphId,
    );
    const scale = naturalWidth > maxWidth ? maxWidth / naturalWidth : 1;
    const width = Math.max(24, Math.round(naturalWidth * scale));
    const height = Math.max(24, Math.round(naturalHeight * scale));
    logger.info(
      `image insert:decoded natural=${naturalWidth}x${naturalHeight} fitted=${width}x${height} maxWidth=${maxWidth}`,
    );

    applyTransactionalState(
      (current) => {
        const targetState = position
          ? setSelection(current, { anchor: position, focus: position })
          : current;
        return insertImageAtSelection(targetState, { src, width, height });
      },
      { mergeKey: "insertImage" },
    );
    const sel = state.selection;
    logger.debug(
      `image insert:selection anchor=${sel.anchor.paragraphId}:${sel.anchor.runId}[${sel.anchor.offset}]`,
    );
  };

  const handleInsertImage = async (file: File | null) => {
    if (isReadOnly()) {
      return;
    }
    if (!file) return;

    await insertImageFromFile(file);

    if (imageInputRef) {
      imageInputRef.value = "";
    }
    focusInput();
  };

  const handleExportDocx = async () => {
    const blob = await exportEditorDocumentToDocxBlob(state.document);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "oasis-editor.docx";
    anchor.click();
    URL.revokeObjectURL(url);
    focusInput();
  };

  const tableOps = createEditorTableOperations({
    applyTransactionalState,
    applySelectionToStatePreservingStructure,
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

  onMount(() => {
    startIconObserver();
    startLongTaskObserver();
    installGlobalReport();
    registerDomStatsSurface(() => surfaceRef ?? null);
  });

  onCleanup(() => {
    onCleanupHook();
    stopDragging();
    imageOps.stopImageDrag();
    imageOps.stopImageResize();
    stopIconObserver();
  });

  const handleTextInput = (
    event: InputEvent & { currentTarget: HTMLTextAreaElement },
  ) => {
    markStart("input:text");
    if (isReadOnly()) {
      logger.debug(
        `input:readonly ignored value=${JSON.stringify(event.currentTarget.value)}`,
      );
      event.currentTarget.value = "";
      return;
    }
    const text = event.currentTarget.value;
    if (text.length === 0) {
      return;
    }

    if (composing()) {
      logger.debug(`input:composing buffer=${JSON.stringify(text)}`);
      return;
    }

    if (suppressedInputText !== null && text === suppressedInputText) {
      logger.debug(`input:suppressed text=${JSON.stringify(text)}`);
      suppressedInputText = null;
      event.currentTarget.value = "";
      return;
    }

    const sel = state.selection;
    const currentRun = getParagraphs(state)
      .find((p) => p.id === sel.anchor.paragraphId)
      ?.runs.find((r) => r.id === sel.anchor.runId);
    const runStyle = currentRun
      ? {
          bold: currentRun.styles?.bold,
          italic: currentRun.styles?.italic,
          underline: currentRun.styles?.underline,
        }
      : null;
    logger.info(
      `input:text ${JSON.stringify(text)} (len=${text.length}) at ${sel.anchor.paragraphId}:${sel.anchor.runId}[${sel.anchor.offset}] run:${JSON.stringify(runStyle)}`,
    );
    clearPreferredColumn();
    const pendingStyle = cloneStyle(pendingCaretTextStyle());
    applyTransactionalState(
      (current) =>
        tableOps.applyTableAwareParagraphEdit(current, (temp) =>
          insertTextAtSelection(temp, text, pendingStyle),
        ),
      {
        mergeKey: "insertText",
      },
    );
    event.currentTarget.value = "";
    focusInput();
    markEnd("input:text");
  };

  const handleCompositionStart = () => {
    logger.debug("input:composition start");
    setComposing(true);
  };

  const handleCompositionEnd = (
    event: CompositionEvent & { currentTarget: HTMLTextAreaElement },
  ) => {
    if (isReadOnly()) {
      event.currentTarget.value = "";
      setComposing(false);
      return;
    }
    const text = event.data ?? event.currentTarget.value;
    setComposing(false);

    if (text.length === 0) {
      event.currentTarget.value = "";
      return;
    }

    const sel = state.selection;
    logger.info(
      `input:composition end ${JSON.stringify(text)} (len=${text.length}) at ${sel.anchor.paragraphId}:${sel.anchor.runId}[${sel.anchor.offset}]`,
    );
    suppressedInputText = text;
    clearPreferredColumn();
    const pendingStyle = cloneStyle(pendingCaretTextStyle());
    applyTransactionalState(
      (current) =>
        tableOps.applyTableAwareParagraphEdit(current, (temp) =>
          insertTextAtSelection(temp, text, pendingStyle),
        ),
      {
        mergeKey: "insertText",
      },
    );
    event.currentTarget.value = "";
    focusInput();
  };

  const moveVerticalByBlock = (direction: -1 | 1) => {
    return moveVerticalSelection(direction, false);
  };

  const moveVerticalSelection = (direction: -1 | 1, extend: boolean) => {
    const paragraphs = getParagraphs(state);
    const currentIndex = paragraphs.findIndex(
      (paragraph) => paragraph.id === state.selection.focus.paragraphId,
    );
    if (currentIndex === -1) {
      return false;
    }

    let targetIndex = currentIndex + direction;
    const tableLocation = findParagraphTableLocation(
      state.document,
      state.selection.focus.paragraphId,
      getActiveSectionIndex(state),
    );
    if (tableLocation) {
      const activeSectionIndex = getActiveSectionIndex(state);
      const hasSections = state.document.sections && state.document.sections.length > 0;
      const section = hasSections ? state.document.sections![activeSectionIndex] : null;

      let targetBlocks: EditorBlockNode[] = [];
      if (section) {
        if (tableLocation.zone === "header") targetBlocks = section.header || [];
        else if (tableLocation.zone === "footer") targetBlocks = section.footer || [];
        else targetBlocks = section.blocks;
      } else {
        targetBlocks = state.document.blocks;
      }

      const block = targetBlocks[tableLocation.blockIndex];
      if (block && block.type === "table") {
        const tableLayout = buildTableCellLayout(block);
        const currentCell = tableLayout.find(
          (entry) =>
            entry.rowIndex === tableLocation.rowIndex &&
            entry.cellIndex === tableLocation.cellIndex,
        );
        if (currentCell) {
          const currentElementCandidates = surfaceRef
            ? Array.from(
                surfaceRef.querySelectorAll<HTMLElement>(
                  `[data-source-block-id="${block.id}"] [data-row-index="${tableLocation.rowIndex}"][data-cell-index="${tableLocation.cellIndex}"], ` +
                    `[data-block-id="${block.id}"] [data-row-index="${tableLocation.rowIndex}"][data-cell-index="${tableLocation.cellIndex}"]`,
                ),
              )
            : [];
          const currentElement =
            currentElementCandidates.find(
              (element) =>
                element.closest('[data-repeated-header="true"]') === null,
            ) ?? currentElementCandidates[0];
          const desiredX =
            preferredColumnX() ??
            (currentElement
              ? currentElement.getBoundingClientRect().left
              : caretBox().left);
          const candidateRows: number[] = [];
          for (
            let rowIndex = currentCell.visualRowIndex + direction;
            rowIndex >= 0 && rowIndex < block.rows.length;
            rowIndex += direction
          ) {
            candidateRows.push(rowIndex);
          }

          for (const rowIndex of candidateRows) {
            const rowCandidates = tableLayout.filter(
              (entry) =>
                entry.visualRowIndex === rowIndex &&
                entry.cell.blocks.length > 0 &&
                entry.cell.vMerge !== "continue",
            );
            if (rowCandidates.length === 0) {
              continue;
            }

            const scoredCandidates = rowCandidates
              .map((entry) => {
                const cellElementCandidates = surfaceRef
                  ? Array.from(
                      surfaceRef.querySelectorAll<HTMLElement>(
                        `[data-source-block-id="${block.id}"] [data-row-index="${entry.rowIndex}"][data-cell-index="${entry.cellIndex}"], ` +
                          `[data-block-id="${block.id}"] [data-row-index="${entry.rowIndex}"][data-cell-index="${entry.cellIndex}"]`,
                      ),
                    )
                  : [];
                const cellElement =
                  cellElementCandidates.find(
                    (element) =>
                      element.closest('[data-repeated-header="true"]') === null,
                  ) ?? cellElementCandidates[0];
                const rect = cellElement?.getBoundingClientRect();
                const left = rect?.left ?? desiredX;
                const right = rect?.right ?? desiredX;
                const distance =
                  desiredX < left
                    ? left - desiredX
                    : desiredX > right
                      ? desiredX - right
                      : 0;
                return { entry, distance };
              })
              .sort((left, right) => left.distance - right.distance);

            const candidate = scoredCandidates[0]?.entry;
            if (!candidate) {
              continue;
            }

            const targetId =
              direction < 0
                ? candidate.cell.blocks[candidate.cell.blocks.length - 1]!.id
                : candidate.cell.blocks[0]!.id;
            targetIndex = paragraphs.findIndex((p) => p.id === targetId);
            break;
          }
        } else {
          if (direction < 0) {
            const firstParaId = block.rows[0]?.cells[0]?.blocks[0]?.id;
            if (firstParaId) {
              targetIndex =
                paragraphs.findIndex((p) => p.id === firstParaId) - 1;
            }
          } else {
            const lastRow = block.rows[block.rows.length - 1];
            const lastCell = lastRow?.cells[lastRow.cells.length - 1];
            const lastParaId = lastCell?.blocks[lastCell.blocks.length - 1]?.id;
            if (lastParaId) {
              targetIndex =
                paragraphs.findIndex((p) => p.id === lastParaId) + 1;
            }
          }
        }
      }
    }

    if (targetIndex < 0 || targetIndex >= paragraphs.length) {
      return false;
    }

    const targetParagraph = paragraphs[targetIndex];
    const targetElement = surfaceRef
      ? getParagraphBoundaryElement(
          surfaceRef,
          targetParagraph.id,
          direction < 0 ? "end" : "start",
        )
      : null;
    const desiredX = preferredColumnX() ?? caretBox().left;

    let offset = 0;
    if (targetElement && surfaceRef) {
      const layout = measureParagraphLayoutFromRects(
        targetParagraph,
        collectParagraphCharRects(surfaceRef, targetParagraph.id),
      );
      const lines = layout.lines;
      const boundaryLine = direction < 0 ? lines[lines.length - 1] : lines[0];
      offset = boundaryLine?.slots.length
        ? boundaryLine.slots.reduce(
            (best, slot) =>
              Math.abs(
                desiredX +
                  (surfaceRef?.getBoundingClientRect().left ?? 0) -
                  slot.left,
              ) <
              Math.abs(
                desiredX +
                  (surfaceRef?.getBoundingClientRect().left ?? 0) -
                  best.left,
              )
                ? slot
                : best,
            boundaryLine.slots[0]!,
          ).offset
        : 0;
    } else {
      offset = Math.min(
        positionToParagraphOffset(targetParagraph, state.selection.focus),
        getParagraphText(targetParagraph).length,
      );
    }

    setPreferredColumnX(desiredX);
    resetTransactionGrouping();
    applyTransactionalState((current) =>
      setSelection(current, {
        anchor: extend
          ? current.selection.anchor
          : paragraphOffsetToPosition(targetParagraph, offset),
        focus: paragraphOffsetToPosition(targetParagraph, offset),
      }),
    );
    focusInput();
    return true;
  };

  const stopDragging = () => {
    dragAnchor = null;
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  };

  let imageDragCursorStyle: HTMLStyleElement | null = null;

  const showImageDragCursor = () => {
    if (imageDragCursorStyle) return;
    imageDragCursorStyle = document.createElement("style");
    imageDragCursorStyle.setAttribute("data-oasis-image-drag-cursor", "");
    imageDragCursorStyle.textContent =
      "*, *::before, *::after { cursor: grabbing !important; }";
    document.head.appendChild(imageDragCursorStyle);
  };

  const hideImageDragCursor = () => {
    if (imageDragCursorStyle) {
      imageDragCursorStyle.remove();
      imageDragCursorStyle = null;
    }
    document.body.style.cursor = "";
  };

  const handleWindowMouseMove = (event: MouseEvent) => {
    if (!dragAnchor) {
      return;
    }

    const position = resolvePositionAtSurfacePoint(
      event.clientX,
      event.clientY,
    );
    if (!position) {
      return;
    }

    applyState(
      setSelection(state, {
        anchor: dragAnchor,
        focus: position,
      }),
    );
    const sel = state.selection;
    const anchorLoc = (() => {
      const secIdx = getActiveSectionIndex(state);
      const loc = findParagraphTableLocation(
        state.document,
        dragAnchor!.paragraphId,
        secIdx,
      );
      return loc ? `b${loc.blockIndex}r${loc.rowIndex}c${loc.cellIndex}` : "";
    })();
    const focusLoc = (() => {
      const secIdx = getActiveSectionIndex(state);
      const loc = findParagraphTableLocation(
        state.document,
        sel.focus.paragraphId,
        secIdx,
      );
      return loc ? `b${loc.blockIndex}r${loc.rowIndex}c${loc.cellIndex}` : "";
    })();
    logger.debug(
      `selection:drag ${dragAnchor!.paragraphId}[${dragAnchor!.offset}]→${sel.focus.paragraphId}[${sel.focus.offset}] [${anchorLoc}→${focusLoc}]`,
    );
  };

  const handleWindowMouseUp = () => {
    const sel = state.selection;
    const anchorLoc = (() => {
      const secIdx = getActiveSectionIndex(state);
      const loc = findParagraphTableLocation(
        state.document,
        sel.anchor.paragraphId,
        secIdx,
      );
      return loc ? `b${loc.blockIndex}r${loc.rowIndex}c${loc.cellIndex}` : "";
    })();
    const focusLoc = (() => {
      const secIdx = getActiveSectionIndex(state);
      const loc = findParagraphTableLocation(
        state.document,
        sel.focus.paragraphId,
        secIdx,
      );
      return loc ? `b${loc.blockIndex}r${loc.rowIndex}c${loc.cellIndex}` : "";
    })();
    logger.info(
      `selection:end ${sel.anchor.paragraphId}[${sel.anchor.offset}]→${sel.focus.paragraphId}[${sel.focus.offset}] [${anchorLoc}→${focusLoc}]`,
    );
    stopDragging();
    focusInputAfterPointerSelection();
  };

  const moveSelectionToParagraphBoundary = (
    boundary: "start" | "end",
    extend: boolean,
  ) => {
    const targetParagraph = getParagraphs(state).find(
      (paragraph) => paragraph.id === state.selection.focus.paragraphId,
    );
    if (!targetParagraph) {
      return false;
    }

    const targetOffset =
      boundary === "start" ? 0 : getParagraphText(targetParagraph).length;
    const targetPosition = paragraphOffsetToPosition(
      targetParagraph,
      targetOffset,
    );
    clearPreferredColumn();
    applyState(
      setSelection(state, {
        anchor: extend ? state.selection.anchor : targetPosition,
        focus: targetPosition,
      }),
    );
    return true;
  };

  const moveSelectionToDocumentBoundary = (
    boundary: "start" | "end",
    extend: boolean,
  ) => {
    const paragraphs = getParagraphs(state);
    if (paragraphs.length === 0) {
      return false;
    }

    const targetParagraph =
      boundary === "start" ? paragraphs[0] : paragraphs[paragraphs.length - 1];
    const targetOffset =
      boundary === "start" ? 0 : getParagraphText(targetParagraph).length;
    const targetPosition = paragraphOffsetToPosition(
      targetParagraph,
      targetOffset,
    );
    clearPreferredColumn();
    applyState(
      setSelection(state, {
        anchor: extend ? state.selection.anchor : targetPosition,
        focus: targetPosition,
      }),
    );
    return true;
  };

  const moveSelectionByWord = (
    direction: "left" | "right",
    extend: boolean,
  ) => {
    const paragraphs = getParagraphs(state);
    const focusParagraphIndex = paragraphs.findIndex(
      (paragraph) => paragraph.id === state.selection.focus.paragraphId,
    );
    const focusParagraph = paragraphs[focusParagraphIndex];
    if (!focusParagraph) {
      return false;
    }

    const paragraphText = getParagraphText(focusParagraph);
    const focusOffset = state.selection.focus.offset;
    const paragraphLength = paragraphText.length;

    if (!extend && !isSelectionCollapsed(state.selection)) {
      clearPreferredColumn();
      applyState(
        direction === "left"
          ? moveSelectionLeft(state)
          : moveSelectionRight(state),
      );
      return true;
    }

    let targetParagraph = focusParagraph;
    let targetOffset = focusOffset;

    if (direction === "left") {
      if (focusOffset === 0 && focusParagraphIndex > 0) {
        targetParagraph = paragraphs[focusParagraphIndex - 1]!;
        targetOffset = getParagraphText(targetParagraph).length;
      } else {
        targetOffset = findPreviousWordBoundary(paragraphText, focusOffset);
      }
    } else {
      if (
        focusOffset === paragraphLength &&
        focusParagraphIndex < paragraphs.length - 1
      ) {
        targetParagraph = paragraphs[focusParagraphIndex + 1]!;
        targetOffset = 0;
      } else {
        targetOffset = findNextWordBoundary(paragraphText, focusOffset);
      }
    }

    const targetPosition = paragraphOffsetToPosition(
      targetParagraph,
      targetOffset,
    );
    clearPreferredColumn();
    applyState(
      setSelection(state, {
        anchor: extend ? state.selection.anchor : targetPosition,
        focus: targetPosition,
      }),
    );
    return true;
  };

  const handleSurfaceMouseDown = (
    event: MouseEvent,
    forceTransition = false,
  ) => {
    clearPendingCaretTextStyle();
    if (tableResize.handleMouseDown(event)) {
      return;
    }

    event.preventDefault();

    imageOps.stopImageDrag();
    imageOps.stopImageResize();

    const headerZone = (event.target as HTMLElement).closest(
      ".oasis-editor-page-header-zone",
    );
    const footerZone = (event.target as HTMLElement).closest(
      ".oasis-editor-page-footer-zone",
    );
    const targetZone = headerZone ? "header" : footerZone ? "footer" : "main";
    const isZoneTransition = targetZone !== state.activeZone;

    const paragraphElement = surfaceRef
      ? findPointerParagraphElement(
          event,
          (headerZone || footerZone || surfaceRef) as HTMLElement,
        )
      : null;

    if (!paragraphElement && !isZoneTransition) {
      focusInputAfterPointerSelection();
      return;
    }

    const paragraphId = paragraphElement?.dataset.paragraphId;
    const paragraph = paragraphId
      ? getDocumentParagraphs(state.document).find(
          (candidate) => candidate.id === paragraphId,
        )
      : undefined;

    if (!isZoneTransition && (!paragraphId || !paragraph || !surfaceRef)) {
      focusInputAfterPointerSelection();
      return;
    }

    clearPreferredColumn();
    resetTransactionGrouping();

    const applyWithZone = (
      newState: EditorState,
      targetPosition?: EditorPosition,
    ) => {
      if (isZoneTransition) {
        let updatedDocument = newState.document;
        let activeSectionIndex = state.activeSectionIndex ?? 0;

        // Upgrade to sections if missing
        if (
          !updatedDocument.sections ||
          updatedDocument.sections.length === 0
        ) {
          const headerParagraph = createSectionBoundaryParagraph("header");
          const footerParagraph = createSectionBoundaryParagraph("footer");
          updatedDocument = {
            ...updatedDocument,
            sections: [
              {
                id: "section:1",
                blocks: updatedDocument.blocks,
                pageSettings: normalizePageSettings(
                  updatedDocument.pageSettings ?? DEFAULT_EDITOR_PAGE_SETTINGS,
                ),
                header: [headerParagraph],
                footer: [footerParagraph],
              },
            ],
          };
          activeSectionIndex = 0;
        }

        const sections = updatedDocument.sections!;
        const section = sections[activeSectionIndex]!;

        // Ensure header/footer exist in the section
        let newHeader = section.header;
        let newFooter = section.footer;
        let zoneParagraph: EditorParagraphNode | null = null;

        if (targetZone === "header") {
          if (!newHeader || newHeader.length === 0) {
            zoneParagraph = createSectionBoundaryParagraph("header");
            newHeader = [zoneParagraph];
          } else {
            const firstBlock = newHeader[0];
            zoneParagraph =
              firstBlock.type === "paragraph"
                ? firstBlock
                : (getBlockParagraphs(firstBlock)[0] ?? null);
          }
        } else if (targetZone === "footer") {
          if (!newFooter || newFooter.length === 0) {
            zoneParagraph = createSectionBoundaryParagraph("footer");
            newFooter = [zoneParagraph];
          } else {
            const firstBlock = newFooter[0];
            zoneParagraph =
              firstBlock.type === "paragraph"
                ? firstBlock
                : (getBlockParagraphs(firstBlock)[0] ?? null);
          }
        }

        if (newHeader !== section.header || newFooter !== section.footer) {
          const newSections = [...sections];
          newSections[activeSectionIndex] = {
            ...section,
            header: newHeader,
            footer: newFooter,
          };
          updatedDocument = {
            ...updatedDocument,
            sections: newSections,
          };
        }

        const zonePosition = targetPosition
          ? targetPosition
          : zoneParagraph
            ? paragraphOffsetToPosition(zoneParagraph, 0)
            : newState.selection.anchor;

        applyState({
          ...newState,
          document: updatedDocument,
          selection: { anchor: zonePosition, focus: zonePosition },
          activeSectionIndex,
          activeZone: targetZone,
        });
      } else {
        applyState(newState);
      }
    };

    if (paragraph && surfaceRef) {
      const offset = resolveParagraphClickOffset(paragraph, event);
      const position = paragraphOffsetToPosition(paragraph, offset);

      if (event.shiftKey) {
        dragAnchor = state.selection.anchor;
        if (isZoneTransition) {
          applyWithZone(state, position);
        } else {
          applyWithZone(
            setSelection(state, {
              anchor: state.selection.anchor,
              focus: position,
            }),
          );
        }
      } else {
        dragAnchor = position;
        if (isZoneTransition) {
          applyWithZone(state, position);
        } else {
          applyWithZone({
            ...state,
            selection: {
              anchor: { ...position },
              focus: { ...position },
            },
          });
        }
      }
    } else if (isZoneTransition) {
      // Zone transition without a paragraph target
      applyWithZone(state);
    }

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    focusInputAfterPointerSelection();
  };

  const handleSurfaceDblClick = (event: MouseEvent) => {
    clearPendingCaretTextStyle();
    event.preventDefault();
    const headerZone = (event.target as HTMLElement).closest(
      ".oasis-editor-page-header-zone",
    );
    const footerZone = (event.target as HTMLElement).closest(
      ".oasis-editor-page-footer-zone",
    );
    const targetZone = headerZone ? "header" : footerZone ? "footer" : "main";

    if (targetZone !== state.activeZone) {
      handleSurfaceMouseDown(event, true);
    }
  };

  const handleParagraphMouseDown = (
    paragraphId: string,
    event: MouseEvent & { currentTarget: HTMLParagraphElement },
  ) => {
    clearPendingCaretTextStyle();
    event.preventDefault();
    event.stopPropagation();
    const paragraph = getParagraphById(state.document, paragraphId);
    if (!paragraph || !surfaceRef) {
      return;
    }

    const isHeaderClick =
      (event.target as HTMLElement).closest(
        ".oasis-editor-page-header-zone",
      ) !== null;
    const isFooterClick =
      (event.target as HTMLElement).closest(
        ".oasis-editor-page-footer-zone",
      ) !== null;
    const targetZone = isHeaderClick
      ? "header"
      : isFooterClick
        ? "footer"
        : "main";

    const isZoneTransition = targetZone !== state.activeZone;

    clearPreferredColumn();
    resetTransactionGrouping();

    imageOps.stopImageDrag();
    imageOps.stopImageResize();

    const applyWithZone = (
      newState: EditorState,
      targetPosition?: EditorPosition,
    ) => {
      if (isZoneTransition) {
        let updatedDocument = newState.document;
        let activeSectionIndex = state.activeSectionIndex ?? 0;

        // Upgrade to sections if missing
        if (
          !updatedDocument.sections ||
          updatedDocument.sections.length === 0
        ) {
          const headerParagraph = createSectionBoundaryParagraph("header");
          const footerParagraph = createSectionBoundaryParagraph("footer");
          updatedDocument = {
            ...updatedDocument,
            sections: [
              {
                id: "section:1",
                blocks: updatedDocument.blocks,
                pageSettings: normalizePageSettings(
                  updatedDocument.pageSettings ?? DEFAULT_EDITOR_PAGE_SETTINGS,
                ),
                header: [headerParagraph],
                footer: [footerParagraph],
              },
            ],
          };
          activeSectionIndex = 0;
        }

        const sections = updatedDocument.sections!;
        const section = sections[activeSectionIndex]!;

        // Ensure header/footer exist in the section
        let newHeader = section.header;
        let newFooter = section.footer;
        let zoneParagraph: EditorParagraphNode | null = null;

        if (targetZone === "header") {
          if (!newHeader || newHeader.length === 0) {
            zoneParagraph = createSectionBoundaryParagraph("header");
            newHeader = [zoneParagraph];
          } else {
            const firstBlock = newHeader[0];
            zoneParagraph =
              firstBlock.type === "paragraph"
                ? firstBlock
                : (getBlockParagraphs(firstBlock)[0] ?? null);
          }
        } else if (targetZone === "footer") {
          if (!newFooter || newFooter.length === 0) {
            zoneParagraph = createSectionBoundaryParagraph("footer");
            newFooter = [zoneParagraph];
          } else {
            const firstBlock = newFooter[0];
            zoneParagraph =
              firstBlock.type === "paragraph"
                ? firstBlock
                : (getBlockParagraphs(firstBlock)[0] ?? null);
          }
        }

        if (newHeader !== section.header || newFooter !== section.footer) {
          const newSections = [...sections];
          newSections[activeSectionIndex] = {
            ...section,
            header: newHeader,
            footer: newFooter,
          };
          updatedDocument = {
            ...updatedDocument,
            sections: newSections,
          };
        }

        const zonePosition = targetPosition
          ? targetPosition
          : zoneParagraph
            ? paragraphOffsetToPosition(zoneParagraph, 0)
            : newState.selection.anchor;

        applyState({
          ...newState,
          document: updatedDocument,
          selection: { anchor: zonePosition, focus: zonePosition },
          activeSectionIndex,
          activeZone: targetZone,
        });
      } else {
        applyState(newState);
      }
    };

    if (event.detail >= 3) {
      dragAnchor = null;
      const targetPos = paragraphOffsetToPosition(paragraph, 0);
      applyWithZone(
        setSelection(state, {
          anchor: targetPos,
          focus: paragraphOffsetToPosition(
            paragraph,
            getParagraphText(paragraph).length,
          ),
        }),
        targetPos,
      );
      stopDragging();
      focusInputAfterPointerSelection();
      return;
    }

    const offset = resolveParagraphClickOffset(paragraph, event);
    const position = paragraphOffsetToPosition(paragraph, offset);

    const cellLocation = findParagraphTableLocation(
      state.document,
      paragraphId,
      getActiveSectionIndex(state),
    );
    const anchorPosition = cellLocation
      ? (() => {
          const hasSections =
            state.document.sections && state.document.sections.length > 0;
          const section = hasSections
            ? state.document.sections![getActiveSectionIndex(state)]
            : null;

          let targetBlocks: EditorBlockNode[] = [];
          if (section) {
            if (cellLocation.zone === "header") targetBlocks = section.header || [];
            else if (cellLocation.zone === "footer")
              targetBlocks = section.footer || [];
            else targetBlocks = section.blocks;
          } else {
            targetBlocks = state.document.blocks;
          }

          const block = targetBlocks[cellLocation.blockIndex];
          const cellParagraph =
            block?.type === "table"
              ? block.rows[cellLocation.rowIndex]?.cells[cellLocation.cellIndex]
                  ?.blocks[0]
              : undefined;
          return cellParagraph
            ? paragraphOffsetToPosition(cellParagraph, 0)
            : position;
        })()
      : position;

    if (event.shiftKey) {
      dragAnchor = state.selection.anchor;
      applyWithZone(
        setSelection(state, {
          anchor: state.selection.anchor,
          focus: position,
        }),
      );
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
      focusInputAfterPointerSelection();
      return;
    }

    if (event.detail === 2) {
      const word = resolveWordSelection(getParagraphText(paragraph), offset);
      dragAnchor = null;
      const targetPos = paragraphOffsetToPosition(paragraph, word.start);
      applyWithZone(
        setSelection(state, {
          anchor: targetPos,
          focus: paragraphOffsetToPosition(paragraph, word.end),
        }),
        targetPos,
      );
      stopDragging();
      focusInputAfterPointerSelection();
      return;
    }

    dragAnchor = cellLocation ? anchorPosition : position;
    applyWithZone(
      {
        ...state,
        selection: {
          anchor: { ...position },
          focus: { ...position },
        },
      },
      position,
    );
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    focusInputAfterPointerSelection();
  };

  const handleRevisionMouseEnter = (revisionId: string, event: MouseEvent) => {
    const paragraphs = getParagraphs(state);
    let foundRevision: EditorRevision | undefined;
    for (const p of paragraphs) {
      for (const run of p.runs) {
        if (run.revision?.id === revisionId) {
          foundRevision = run.revision;
          break;
        }
      }
      if (foundRevision) break;
    }

    if (!foundRevision) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const surfaceRect = surfaceRef?.getBoundingClientRect();

    if (!surfaceRect) return;

    setHoveredRevision({
      revisionId: foundRevision.id,
      author: foundRevision.author,
      date: foundRevision.date,
      type: foundRevision.type,
      left: rect.left - surfaceRect.left,
      top: rect.top - surfaceRect.top,
    });
  };

  const handleRevisionMouseLeave = () => {
    setHoveredRevision(null);
  };

  const onEditorMouseDown = (event: MouseEvent) => {
    clearPendingCaretTextStyle();
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
      insertImageFromFile,
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
    toolbarStyleState,
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
      applyToolbarBooleanStyleCommand(style),
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
    moveSelectionByWord,
    moveSelectionToDocumentBoundary,
    moveSelectionToParagraphBoundary,
    moveSelectedImageByParagraph,
    performUndo,
    performRedo,
    moveVerticalSelection,
    moveVerticalByBlock,
    resolveAdjacentTableCellPosition: tableOps.resolveAdjacentTableCellPosition,
    applySelectionPreservingStructure,
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
      clearPendingCaretTextStyle();
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

  const tableSelectionLabel = (): string | null => {
    const normalized = normalizeSelection(state);
    if (normalized.isCollapsed) {
      return null;
    }

    const anchorLocation = findParagraphTableLocation(
      state.document,
      state.selection.anchor.paragraphId,
      getActiveSectionIndex(state),
    );
    const focusLocation = findParagraphTableLocation(
      state.document,
      state.selection.focus.paragraphId,
      getActiveSectionIndex(state),
    );
    if (
      !anchorLocation ||
      !focusLocation ||
      anchorLocation.blockIndex !== focusLocation.blockIndex ||
      (anchorLocation.rowIndex === focusLocation.rowIndex &&
        anchorLocation.cellIndex === focusLocation.cellIndex)
    ) {
      return null;
    }

    const count = selectionBoxes().length;
    if (count === 0) {
      return null;
    }

    return `Table selection: ${count} cell${count === 1 ? "" : "s"}`;
  };

  const isInsideTable = (): boolean => {
    return !!findParagraphTableLocation(
      state.document,
      state.selection.focus.paragraphId,
      getActiveSectionIndex(state),
    );
  };

  const selectionCollapsed = (): boolean =>
    isSelectionCollapsed(state.selection);

  createEffect(() => {
    if (!selectionCollapsed()) {
      clearPendingCaretTextStyle();
    }
  });

  const applyToolbarValueStyleCommand = <K extends ValueStyleKey>(
    key: K,
    value: EditorTextStyle[K] | null,
  ) => {
    if (selectionCollapsed()) {
      logger.info(`setPendingStyle:${key}=${JSON.stringify(value)}`);
      clearPreferredColumn();
      resetTransactionGrouping();
      updatePendingCaretTextStyleValue(key, value);
      focusInput();
      return;
    }

    commandsController.applyValueStyleCommand(key, value);
  };

  const applyToolbarBooleanStyleCommand = (key: BooleanStyleKey) => {
    if (selectionCollapsed()) {
      const nextValue = !toolbarStyleState()[key];
      logger.info(`setPendingStyle:${key}=${JSON.stringify(nextValue)}`);
      clearPreferredColumn();
      resetTransactionGrouping();
      updatePendingCaretBooleanStyle(key, nextValue);
      focusInput();
      return;
    }

    commandsController.applyBooleanStyleCommand(key);
  };

  const toolbarCtx = {
    state,
    undoStack,
    redoStack,
    persistenceStatus,
    importInputRef: () => importInputRef,
    imageInputRef: () => imageInputRef,
    toolbarStyleState,
    selectionCollapsed,
    selectedImageRun,
    tableSelectionLabel,
    tableActionRestrictionLabel: tableOps.tableActionRestrictionLabel,
    isInsideTable,
    handleExportDocx,
    toggleFindReplace: (open?: boolean) => {
      fr.setIsOpen(open ?? !fr.isOpen());
    },
    performUndo,
    performRedo,
    focusInput,
    debugToolbarEvent: (control: string, eventName: string, payload?: unknown) => {
      logger.info(`toolbar:${control}:${eventName}`, payload);
    },
    clearPreferredColumn,
    resetTransactionGrouping,
    applyTransactionalState,
    applyTableAwareParagraphEdit: tableOps.applyTableAwareParagraphEdit,
    ...commandsController,
    applyBooleanStyleCommand: applyToolbarBooleanStyleCommand,
    applyValueStyleCommand: applyToolbarValueStyleCommand,
    canMergeSelectedTable: tableOps.canMergeSelectedTable,
    canMergeSelectedTableCells: tableOps.canMergeSelectedTableCells,
    canMergeSelectedTableRows: tableOps.canMergeSelectedTableRows,
    canSplitSelectedTable: tableOps.canSplitSelectedTable,
    canSplitSelectedTableCell: tableOps.canSplitSelectedTableCell,
    canSplitSelectedTableCellVertically:
      tableOps.canSplitSelectedTableCellVertically,
    canEditSelectedTableColumn: tableOps.canEditSelectedTableColumn,
    canEditSelectedTableRow: tableOps.canEditSelectedTableRow,
    mergeSelectedTable: (current: EditorState) => {
      const result = tableOps.mergeSelectedTable(current);
      if (result !== current) logger.info("tableOp:mergeSelectedTable");
      return result;
    },
    mergeSelectedTableCells: (current: EditorState) => {
      const result = tableOps.mergeSelectedTableCells(current);
      if (result !== current) logger.info("tableOp:mergeSelectedTableCells");
      return result;
    },
    mergeSelectedTableRows: (current: EditorState) => {
      const result = tableOps.mergeSelectedTableRows(current);
      if (result !== current) logger.info("tableOp:mergeSelectedTableRows");
      return result;
    },
    splitSelectedTable: (current: EditorState) => {
      const result = tableOps.splitSelectedTable(current);
      if (result !== current) logger.info("tableOp:splitSelectedTable");
      return result;
    },
    splitSelectedTableCell: (current: EditorState) => {
      const result = tableOps.splitSelectedTableCell(current);
      if (result !== current) logger.info("tableOp:splitSelectedTableCell");
      return result;
    },
    splitSelectedTableCellVertically: (current: EditorState) => {
      const result = tableOps.splitSelectedTableCellVertically(current);
      if (result !== current)
        logger.info("tableOp:splitSelectedTableCellVertically");
      return result;
    },
    insertSelectedTableColumn: (current: EditorState, direction: -1 | 1) => {
      const result = tableOps.insertSelectedTableColumn(current, direction);
      if (result !== current)
        logger.info(`tableOp:insertSelectedTableColumn dir=${direction}`);
      return result;
    },
    insertSelectedTableRow: (current: EditorState, direction: -1 | 1) => {
      const result = tableOps.insertSelectedTableRow(current, direction);
      if (result !== current)
        logger.info(`tableOp:insertSelectedTableRow dir=${direction}`);
      return result;
    },
    deleteSelectedTableColumn: (current: EditorState) => {
      const result = tableOps.deleteSelectedTableColumn(current);
      if (result !== current) logger.info("tableOp:deleteSelectedTableColumn");
      return result;
    },
    deleteSelectedTableRow: (current: EditorState) => {
      const result = tableOps.deleteSelectedTableRow(current);
      if (result !== current) logger.info("tableOp:deleteSelectedTableRow");
      return result;
    },
    insertTableCommand: tableOps.insertTableCommand,
  } as unknown as EditorToolbarCtx;

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
        toolbarCtx={toolbarCtx}
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
          !isReadOnly() && tableSelectionLabel() !== null
        }
        caretBox={() => caretBox()}
        inputBox={() => inputBox()}
        hoveredRevision={() => hoveredRevision()}
        focused={() => focused()}
        importProgress={() => importProgress()}
        showCaret={shouldShowCaret}
        class={props.class}
        style={props.style}
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
          handleImportDocx(e.currentTarget.files?.[0] ?? null)
        }
        onImageInputChange={(e: Event & { currentTarget: HTMLInputElement }) =>
          handleInsertImage(e.currentTarget.files?.[0] ?? null)
        }
        onDragOver={(event: DragEvent) => event.preventDefault()}
        onDrop={handleDrop}
        onEditorMouseDown={onEditorMouseDown}
        onSurfaceMouseDown={handleSurfaceMouseDown}
        onSurfaceMouseMove={tableResize.handleMouseMove}
        onSurfaceDblClick={handleSurfaceDblClick}
        onParagraphMouseDown={handleParagraphMouseDown}
        onRevisionMouseEnter={handleRevisionMouseEnter}
        onRevisionMouseLeave={handleRevisionMouseLeave}
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
        onCompositionEnd={handleCompositionEnd}
        onCompositionStart={handleCompositionStart}
        onCopy={handleCopy}
        onCut={handleCut}
        onInput={handleTextInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    );
  };

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
        <EditorToolbar ctx={toolbarCtx} />
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
            toolbarCtx={() => toolbarCtx}
            showFloatingTableToolbar={() =>
              !isReadOnly() && tableSelectionLabel() !== null
            }
            caretBox={() => caretBox()}
            inputBox={() => inputBox()}
            hoveredRevision={() => hoveredRevision()}
            focused={() => focused()}
            importProgress={() => importProgress()}
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
              handleImportDocx(e.currentTarget.files?.[0] ?? null)
            }
            onImageInputChange={(e) =>
              handleInsertImage(e.currentTarget.files?.[0] ?? null)
            }
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            onEditorMouseDown={onEditorMouseDown}
            onSurfaceMouseDown={handleSurfaceMouseDown}
            onSurfaceMouseMove={tableResize.handleMouseMove}
            onSurfaceDblClick={handleSurfaceDblClick}
            onParagraphMouseDown={handleParagraphMouseDown}
            onRevisionMouseEnter={handleRevisionMouseEnter}
            onRevisionMouseLeave={handleRevisionMouseLeave}
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
            onCompositionEnd={handleCompositionEnd}
            onCompositionStart={handleCompositionStart}
            onCopy={handleCopy}
            onCut={handleCut}
            onInput={handleTextInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />
        </section>
      </div>
      </Show>

      {/* Drag/resize overlays must render in BOTH the legacy and composed-shell
          layouts, otherwise the dashed resize guide and ghost previews silently
          disappear when the composed shell is active. */}
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
