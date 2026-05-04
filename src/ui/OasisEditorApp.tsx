import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Show,
  For,
  type JSX,
} from "solid-js";
import { createStore } from "solid-js/store";
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
import { importDocxToEditorDocument } from "../import/docx/importDocxToEditorDocument.js";
import { createEditorLogger } from "../utils/logger.js";
import type {
  CaretBox,
  InputBox,
  RevisionBox,
  SelectionBox,
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
  getElementContentWidth,
  getEmptyBlockRect,
  getMaxInlineImageWidth,
  getParagraphBoundaryElement,
  hasUsableCharGeometry,
} from "./domGeometry.js";
import {
  buildTableCellLayout,
  type TableCellLayoutEntry,
} from "../core/tableLayout.js";
import { resolveClickOffset } from "./tableUiUtils.js";
import { findImageFileFromTransfer, readFileBuffer } from "./clipboardImage.js";
import { EditorToolbar } from "./components/Toolbar/EditorToolbar.js";
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
import { LinkDialog } from "./components/Dialogs/LinkDialog.js";
import { ImageAltDialog } from "./components/Dialogs/ImageAltDialog.js";
import { FindReplaceDialog } from "./components/FindReplace/FindReplaceDialog.js";
import "./components/FindReplace/findReplace.css";
import { startIconObserver, stopIconObserver } from "./utils/IconManager.js";
import type { EditorToolbarCtx } from "./components/Toolbar/types.js";

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

export interface OasisEditorAppProps {
  showChrome?: boolean;
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

export function OasisEditorApp(props: OasisEditorAppProps = {}) {
  const logger = createEditorLogger("app");
  const [state, setState] = createStore<EditorState>(
    props.initialState
      ? cloneEditorState(props.initialState)
      : props.initialDocument
        ? createEditorStateFromDocument(props.initialDocument)
        : createInitialEditorState(),
  );
  const pageSettings = () => getDocumentPageSettings(state.document);
  const showChrome = () => props.showChrome ?? true;
  const isReadOnly = () => props.readOnly ?? false;
  const [focused, setFocused] = createSignal(false);
  const [composing, setComposing] = createSignal(false);
  const [undoStack, setUndoStack] = createSignal<EditorState[]>([]);
  const [redoStack, setRedoStack] = createSignal<EditorState[]>([]);
  const [hoveredRevision, setHoveredRevision] =
    createSignal<RevisionBox | null>(null);
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

  const {
    measuredBlockHeights,
    measuredParagraphLayouts,
    inputBox,
    selectionBoxes,
    caretBox,
    preferredColumnX,
    setPreferredColumnX,
    clearPreferredColumn,
    requestInputBoxSync,
    syncMeasuredLayoutMetrics,
    syncInputBox,
    setMeasuredBlockHeights,
    setMeasuredParagraphLayouts,
    onCleanupHook,
  } = useEditorLayout({
    state,
    surfaceRef: () => surfaceRef,
    viewportRef: () => viewportRef,
  });

  const { status: persistenceStatus } = useEditorPersistence(
    state,
    (loadedDoc) => {
      logger.info("persistence:loaded", { docId: loadedDoc.id });
      const nextState = createEditorStateFromDocument(loadedDoc);
      setState(nextState);
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
  const cloneState = (source: EditorState): EditorState =>
    cloneEditorState({
      ...source,
      document: {
        ...source.document,
        blocks: source.document.blocks.map(cloneBlock),
        sections: source.document.sections?.map(cloneSection),
      },
    });

  const applyState = (nextState: EditorState) => {
    setState(nextState);
  };

  const applyHistoryState = (nextState: EditorState) => {
    setState(cloneState(nextState));
  };

  const applySelectionPreservingStructure = (
    nextSelection: EditorState["selection"],
  ) => {
    applyState({
      ...state,
      document: {
        ...state.document,
        blocks: state.document.blocks.map(cloneBlock),
        sections: state.document.sections?.map(cloneSection),
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
    props.onStateChange?.(cloneState(state));
  });

  const resetTransactionGrouping = () => {
    historyState = resetEditorHistoryGrouping(historyState);
  };

  const applyTransactionalState = (
    producer: (current: EditorState) => EditorState,
    options?: EditorTransactionOptions,
  ) => {
    const previous = cloneState(state);
    const next = producer(state);
    if (JSON.stringify(previous) === JSON.stringify(next)) {
      return;
    }

    historyState = applyEditorHistoryTransaction(
      historyState,
      previous,
      next,
      options,
    );
    setUndoStack(historyState.undoStack);
    setRedoStack(historyState.redoStack);
    applyState(next);
  };

  const performUndo = () => {
    const step = takeEditorUndoStep(historyState, cloneState(state));
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
    const step = takeEditorRedoStep(historyState, cloneState(state));
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
    return getToolbarStyleState(state);
  };

  const selectedImageRun = () => getSelectedImageRun(state);
  const selectedImageAlt = () => selectedImageRun()?.run.image?.alt ?? null;

  const focusInput = () => {
    setFocused(true);
    queueMicrotask(() => {
      textareaRef?.focus();
      if (textareaRef) {
        textareaRef.selectionStart = textareaRef.value.length;
        textareaRef.selectionEnd = textareaRef.value.length;
      }
    });
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

  const handleImportDocx = async (file: File | null) => {
    if (isReadOnly()) {
      return;
    }
    if (!file) {
      return;
    }

    logger.info("import docx:start", { name: file.name, size: file.size });
    const arrayBuffer = await readFileBuffer(file);
    const document = await importDocxToEditorDocument(arrayBuffer);
    resetEditorChromeState();
    applyState(createEditorStateFromDocument(document));
    logger.info("import docx:done", { blocks: document.blocks.length });
    if (importInputRef) {
      importInputRef.value = "";
    }
    focusInput();
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
    applyTransactionalState(
      (current) =>
        tableOps.applyTableAwareParagraphEdit(current, (temp) =>
          insertTextAtSelection(temp, text),
        ),
      {
        mergeKey: "insertText",
      },
    );
    event.currentTarget.value = "";
    focusInput();
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
    applyTransactionalState(
      (current) =>
        tableOps.applyTableAwareParagraphEdit(current, (temp) =>
          insertTextAtSelection(temp, text),
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
    focusInput();
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
      ? findNearestParagraphElement(
          (headerZone || footerZone || surfaceRef) as HTMLElement,
          event.clientX,
          event.clientY,
        )
      : null;

    if (!paragraphElement && !isZoneTransition) {
      focusInput();
      return;
    }

    const paragraphId = paragraphElement?.dataset.paragraphId;
    const paragraph = paragraphId
      ? getDocumentParagraphs(state.document).find(
          (candidate) => candidate.id === paragraphId,
        )
      : undefined;

    if (!isZoneTransition && (!paragraphId || !paragraph || !surfaceRef)) {
      focusInput();
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
          const headerParagraph = createEditorParagraph("");
          const footerParagraph = createEditorParagraph("");
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
            zoneParagraph = createEditorParagraph("");
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
            zoneParagraph = createEditorParagraph("");
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
      const layout = measureParagraphLayoutFromRects(
        paragraph,
        collectParagraphCharRects(surfaceRef, paragraph.id),
      );
      const offset =
        layout.text.length === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                layout.text.length,
                resolveClosestOffsetInMeasuredLayout(
                  layout,
                  event.clientX,
                  event.clientY,
                ),
              ),
            );
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
          applyWithZone(
            setSelection(state, {
              anchor: position,
              focus: position,
            }),
          );
        }
      }
    } else if (isZoneTransition) {
      // Zone transition without a paragraph target
      applyWithZone(state);
    }

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    focusInput();
  };

  const handleSurfaceDblClick = (event: MouseEvent) => {
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
    event.preventDefault();
    event.stopPropagation();
    const paragraph = getDocumentParagraphs(state.document).find(
      (candidate) => candidate.id === paragraphId,
    );
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
    const offset = resolveClickOffset(
      event,
      measureParagraphLayoutFromRects(
        paragraph,
        collectParagraphCharRects(surfaceRef, paragraph.id),
      ),
    );
    const position = paragraphOffsetToPosition(paragraph, offset);

    imageOps.stopImageDrag();
    imageOps.stopImageResize();

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
          const headerParagraph = createEditorParagraph("");
          const footerParagraph = createEditorParagraph("");
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
            zoneParagraph = createEditorParagraph("");
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
            zoneParagraph = createEditorParagraph("");
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
      focusInput();
      return;
    }

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
      focusInput();
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
      focusInput();
      return;
    }

    dragAnchor = cellLocation ? anchorPosition : position;
    applyWithZone(
      setSelection(state, {
        anchor: position,
        focus: position,
      }),
      position,
    );
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    focusInput();
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
    commandsController,
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
    rawHandleKeyDown(event);
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
    performUndo,
    performRedo,
    focusInput,
    clearPreferredColumn,
    resetTransactionGrouping,
    applyTransactionalState,
    applyTableAwareParagraphEdit: tableOps.applyTableAwareParagraphEdit,
    ...commandsController,
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

  return (
    <div
      classList={{
        "oasis-editor-shell": true,
        "oasis-editor-app": true,
        "oasis-editor-read-only": isReadOnly(),
      }}
    >
      <Show when={showChrome()}>
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
            viewportHeight={props.viewportHeight}
            class={props.class}
            style={props.style}
            readOnly={isReadOnly()}
            showCaret={() => {
              if (
                !caretBox().visible ||
                !isSelectionCollapsed(state.selection)
              ) {
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
            }}
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
              focusInput();
            }}
            onImageResizeHandleMouseDown={(
              paragraphId,
              paragraphOffset,
              event,
            ) => {
              event.preventDefault();
              event.stopPropagation();
              imageOps.startImageResize(
                paragraphId,
                paragraphOffset,
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

        <FindReplaceDialog fr={fr} />

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
          {(pos) => {
            const charRects = surfaceRef ? collectParagraphCharRects(surfaceRef, pos().paragraphId) : [];
            const rects = getCaretSlotRects(charRects);
            const rect = rects[pos().offset] || rects[rects.length - 1];
            return (
              <CaretOverlay
                active={true}
                left={rect?.left ?? 0}
                top={rect?.top ?? 0}
                height={rect?.height ?? 28}
              />
            );
          }}
        </Show>
      </div>
    </div>
  );
}
