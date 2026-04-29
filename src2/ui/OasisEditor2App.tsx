import { createEffect, createSignal, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { EditorSurface } from "./components/EditorSurface.js";
import { CaretOverlay } from "./components/CaretOverlay.js";
import { SelectionOverlay } from "./components/SelectionOverlay.js";
import { getCaretSlotRects } from "./caretGeometry.js";
import {
  measureParagraphLayoutFromRects,
  resolveClosestOffsetInMeasuredLayout,
} from "./layoutProjection.js";
import {
  deleteBackward,
  deleteForward,
  extendSelectionDown,
  extendSelectionLeft,
  extendSelectionRight,
  extendSelectionUp,
  getSelectedText,
  insertPlainTextAtSelection,
  insertTextAtSelection,
  insertImageAtSelection,
  insertTableAtSelection,
  moveSelectionDown,
  moveSelectionLeft,
  moveSelectionRight,
  moveSelectionUp,
  setParagraphStyle,
  setSelection,
  setTextStyleValue,
  splitBlockAtSelection,
  toggleParagraphList,
  toggleTextStyle,
} from "../core/editorCommands.js";
import { createEditor2Document, createInitialEditor2State, createEditor2StateFromDocument } from "../core/editorState.js";
import {
  type Editor2Document,
  type Editor2BlockNode,
  type Editor2ParagraphNode,
  type Editor2ParagraphListStyle,
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
  type Editor2ParagraphStyle,
  type Editor2Position,
  type Editor2State,
  type Editor2TextStyle,
} from "../core/model.js";
import { isSelectionCollapsed, normalizeSelection } from "../core/selection.js";
import { exportEditor2DocumentToDocxBlob } from "../export/docx/exportEditor2DocumentToDocx.js";
import { importDocxToEditor2Document } from "../import/docx/importDocxToEditor2Document.js";

interface InputBox {
  left: number;
  top: number;
  height: number;
}

interface CaretBox extends InputBox {
  visible: boolean;
}

interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface TransactionOptions {
  mergeKey?: string;
}

type BooleanStyleKey =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "superscript"
  | "subscript";

type ValueStyleKey = "fontFamily" | "fontSize" | "color" | "highlight";
type ParagraphStyleKey =
  | "align"
  | "spacingBefore"
  | "spacingAfter"
  | "lineHeight"
  | "indentLeft"
  | "indentRight"
  | "indentFirstLine"
  | "pageBreakBefore"
  | "keepWithNext";

interface ToolbarStyleState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  superscript: boolean;
  subscript: boolean;
  fontFamily: string;
  fontSize: string;
  color: string;
  highlight: string;
  align: string;
  lineHeight: string;
  spacingBefore: string;
  spacingAfter: string;
  indentLeft: string;
  indentFirstLine: string;
  listKind: string;
  pageBreakBefore: boolean;
  keepWithNext: boolean;
}

async function readFileBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }

  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) {
        resolve(result);
        return;
      }
      reject(new Error("Failed to read file as ArrayBuffer."));
    };
    reader.readAsArrayBuffer(file);
  });
}

function collectCharRects(blockElement: HTMLElement): Array<{
  left: number;
  right: number;
  top: number;
  bottom: number;
  height: number;
}> {
  return Array.from(blockElement.querySelectorAll<HTMLElement>("[data-char-index]")).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
    };
  });
}

function resolveClickOffset(
  event: MouseEvent & { currentTarget: HTMLParagraphElement },
  layoutParagraph: ReturnType<typeof measureParagraphLayoutFromRects>,
): number {
  if (layoutParagraph.text.length === 0) {
    return 0;
  }
  return Math.max(
    0,
    Math.min(
      layoutParagraph.text.length,
      resolveClosestOffsetInMeasuredLayout(layoutParagraph, event.clientX, event.clientY),
    ),
  );
}

function isWordCharacter(char: string): boolean {
  return /[\p{L}\p{N}_]/u.test(char);
}

function resolveWordSelection(text: string, offset: number): { start: number; end: number } {
  if (text.length === 0) {
    return { start: 0, end: 0 };
  }

  const clampedOffset = Math.max(0, Math.min(offset, text.length));
  const index =
    clampedOffset === text.length ? Math.max(0, clampedOffset - 1) : clampedOffset;
  const charAtIndex = text[index];

  if (!charAtIndex || !isWordCharacter(charAtIndex)) {
    return {
      start: clampedOffset,
      end: Math.min(text.length, clampedOffset + 1),
    };
  }

  let start = index;
  let end = index + 1;

  while (start > 0 && isWordCharacter(text[start - 1])) {
    start -= 1;
  }

  while (end < text.length && isWordCharacter(text[end])) {
    end += 1;
  }

  return { start, end };
}

function selectionOverlapsRun(
  runStart: number,
  runEnd: number,
  selectionStart: number,
  selectionEnd: number,
): boolean {
  return Math.max(runStart, selectionStart) < Math.min(runEnd, selectionEnd);
}

function getSelectedRunStyles(state: Editor2State): Editor2TextStyle[] {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return [];
  }

  const styles: Editor2TextStyle[] = [];
  const paragraphs = getParagraphs(state);

  for (let paragraphIndex = normalized.startIndex; paragraphIndex <= normalized.endIndex; paragraphIndex += 1) {
    const paragraph = paragraphs[paragraphIndex];
    if (!paragraph) {
      continue;
    }

    const selectionStart = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
    const selectionEnd =
      paragraphIndex === normalized.endIndex ? normalized.endParagraphOffset : getParagraphText(paragraph).length;

    let runStart = 0;
    for (const run of paragraph.runs) {
      const runEnd = runStart + run.text.length;
      if (selectionOverlapsRun(runStart, runEnd, selectionStart, selectionEnd)) {
        styles.push(run.styles ?? {});
      }
      runStart = runEnd;
    }
  }

  return styles;
}

function areAllBooleanStylesEnabled(styles: Editor2TextStyle[], key: BooleanStyleKey): boolean {
  return styles.length > 0 && styles.every((style) => Boolean(style[key]));
}

function resolveUniformStyleValue<K extends ValueStyleKey>(
  styles: Editor2TextStyle[],
  key: K,
): string {
  if (styles.length === 0) {
    return "";
  }

  const first = styles[0]?.[key];
  if (first === undefined || first === null || first === "") {
    return styles.every((style) => {
      const current = style[key];
      return current === undefined || current === null || current === "";
    })
      ? ""
      : "";
  }

  const serialized = String(first);
  return styles.every((style) => String(style[key] ?? "") === serialized) ? serialized : "";
}

function getSelectedParagraphStyles(state: Editor2State): Editor2ParagraphStyle[] {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  return paragraphs
    .slice(normalized.startIndex, normalized.endIndex + 1)
    .map((paragraph) => paragraph.style ?? {});
}

function resolveUniformParagraphStyleValue<K extends ParagraphStyleKey>(
  styles: Editor2ParagraphStyle[],
  key: K,
): string {
  if (styles.length === 0) {
    return "";
  }

  const first = styles[0]?.[key];
  if (first === undefined || first === null) {
    return styles.every((style) => {
      const current = style[key];
      return current === undefined || current === null;
    })
      ? ""
      : "";
  }

  const serialized = String(first);
  return styles.every((style) => String(style[key] ?? "") === serialized) ? serialized : "";
}

function resolveUniformParagraphFlag(
  styles: Editor2ParagraphStyle[],
  key: "pageBreakBefore" | "keepWithNext",
): boolean {
  return styles.length > 0 && styles.every((style) => style[key] === true);
}

function resolveUniformListKind(paragraphs: ReturnType<typeof getParagraphs>): string {
  if (paragraphs.length === 0) {
    return "";
  }

  const firstKind = paragraphs[0]?.list?.kind;
  if (!firstKind) {
    return paragraphs.every((paragraph) => paragraph.list?.kind === undefined) ? "" : "";
  }

  return paragraphs.every((paragraph) => paragraph.list?.kind === firstKind) ? firstKind : "";
}

export function OasisEditor2App() {
  const [state, setState] = createStore<Editor2State>(createInitialEditor2State());
  const [focused, setFocused] = createSignal(false);
  const [composing, setComposing] = createSignal(false);
  const [measuredBlockHeights, setMeasuredBlockHeights] = createSignal<Record<string, number>>({});
  const [inputBox, setInputBox] = createSignal<InputBox>({ left: 0, top: 0, height: 28 });
  const [preferredColumnX, setPreferredColumnX] = createSignal<number | null>(null);
  const [undoStack, setUndoStack] = createSignal<Editor2State[]>([]);
  const [redoStack, setRedoStack] = createSignal<Editor2State[]>([]);
  const [selectionBoxes, setSelectionBoxes] = createSignal<SelectionBox[]>([]);
  const [caretBox, setCaretBox] = createSignal<CaretBox>({
    left: 0,
    top: 0,
    height: 28,
    visible: false,
  });
  let surfaceRef: HTMLDivElement | undefined;
  let textareaRef: HTMLTextAreaElement | undefined;
  let importInputRef: HTMLInputElement | undefined;
  let imageInputRef: HTMLInputElement | undefined;
  let syncRequestId = 0;
  let dragAnchor: Editor2Position | null = null;
  let lastTransactionMeta: { mergeKey: string; timestamp: number } | null = null;
  let suppressedInputText: string | null = null;
  const booleanButtons: Array<{ key: BooleanStyleKey; label: string; testId: string }> = [
    { key: "bold", label: "B", testId: "editor-2-toolbar-bold" },
    { key: "italic", label: "I", testId: "editor-2-toolbar-italic" },
    { key: "underline", label: "U", testId: "editor-2-toolbar-underline" },
    { key: "strike", label: "S", testId: "editor-2-toolbar-strike" },
    { key: "superscript", label: "Sup", testId: "editor-2-toolbar-superscript" },
    { key: "subscript", label: "Sub", testId: "editor-2-toolbar-subscript" },
  ];
  const alignButtons: Array<{
    value: NonNullable<Editor2ParagraphStyle["align"]>;
    label: string;
    testId: string;
  }> = [
    { value: "left", label: "L", testId: "editor-2-toolbar-align-left" },
    { value: "center", label: "C", testId: "editor-2-toolbar-align-center" },
    { value: "right", label: "R", testId: "editor-2-toolbar-align-right" },
    { value: "justify", label: "J", testId: "editor-2-toolbar-align-justify" },
  ];
  const listButtons: Array<{ kind: NonNullable<Editor2ParagraphListStyle["kind"]>; label: string; testId: string }> = [
    { kind: "bullet", label: "• List", testId: "editor-2-toolbar-list-bullet" },
    { kind: "ordered", label: "1. List", testId: "editor-2-toolbar-list-ordered" },
  ];

  const cloneDocumentBlock = (block: Editor2BlockNode): Editor2BlockNode =>
    block.type === "paragraph"
      ? {
          ...block,
          runs: block.runs.map((run) => ({ ...run })),
          style: block.style ? { ...block.style } : undefined,
          list: block.list ? { ...block.list } : undefined,
        }
      : {
          ...block,
          rows: block.rows.map((row) => ({
            ...row,
            cells: row.cells.map((cell) => ({
              ...cell,
              blocks: cell.blocks.map((paragraph) => ({
                ...paragraph,
                runs: paragraph.runs.map((run) => ({ ...run })),
                style: paragraph.style ? { ...paragraph.style } : undefined,
                list: paragraph.list ? { ...paragraph.list } : undefined,
              })),
            })),
          })),
        };

  const cloneState = (source: Editor2State): Editor2State => ({
    document: {
      ...source.document,
      blocks: source.document.blocks.map(cloneDocumentBlock),
    },
    selection: {
      anchor: { ...source.selection.anchor },
      focus: { ...source.selection.focus },
    },
  });

  const applyState = (nextState: Editor2State) => {
    setState(nextState);
  };

  const applyHistoryState = (nextState: Editor2State) => {
    setState(cloneState(nextState));
  };

  const applySelectionPreservingStructure = (
    nextSelection: Editor2State["selection"],
  ) => {
    applyState({
      document: {
        ...state.document,
        blocks: state.document.blocks.map(cloneDocumentBlock),
      },
      selection: {
        anchor: { ...nextSelection.anchor },
        focus: { ...nextSelection.focus },
      },
    });
  };

  const applySelectionToStatePreservingStructure = (
    current: Editor2State,
    nextSelection: Editor2State["selection"],
  ): Editor2State => ({
    document: {
      ...current.document,
      blocks: current.document.blocks.map(cloneDocumentBlock),
    },
    selection: {
      anchor: { ...nextSelection.anchor },
      focus: { ...nextSelection.focus },
    },
  });

  const resolveTableCellRangeSelection = (
    current: Editor2State,
  ): Editor2State["selection"] | null => {
    const anchorLocation = findParagraphTableLocation(current.document, current.selection.anchor.paragraphId);
    const focusLocation = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (
      !anchorLocation ||
      !focusLocation ||
      anchorLocation.blockIndex !== focusLocation.blockIndex ||
      (anchorLocation.rowIndex === focusLocation.rowIndex &&
        anchorLocation.cellIndex === focusLocation.cellIndex)
    ) {
      return null;
    }

    const tableBlock = current.document.blocks[anchorLocation.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return null;
    }

    const compareCellLocations = (
      left: NonNullable<typeof anchorLocation>,
      right: NonNullable<typeof focusLocation>,
    ) => {
      if (left.rowIndex !== right.rowIndex) {
        return left.rowIndex - right.rowIndex;
      }
      if (left.cellIndex !== right.cellIndex) {
        return left.cellIndex - right.cellIndex;
      }
      return left.paragraphIndex - right.paragraphIndex;
    };

    const startLocation =
      compareCellLocations(anchorLocation, focusLocation) <= 0 ? anchorLocation : focusLocation;
    const endLocation =
      compareCellLocations(anchorLocation, focusLocation) <= 0 ? focusLocation : anchorLocation;

    const startParagraph =
      tableBlock.rows[startLocation.rowIndex]?.cells[startLocation.cellIndex]?.blocks[0];
    const endCell = tableBlock.rows[endLocation.rowIndex]?.cells[endLocation.cellIndex];
    const endParagraph = endCell?.blocks[endCell.blocks.length - 1];
    if (!startParagraph || !endParagraph) {
      return null;
    }

    return {
      anchor: paragraphOffsetToPosition(startParagraph, 0),
      focus: paragraphOffsetToPosition(endParagraph, getParagraphText(endParagraph).length),
    };
  };

  const withExpandedTableCellSelection = (current: Editor2State): Editor2State => {
    const expandedSelection = resolveTableCellRangeSelection(current);
    if (!expandedSelection) {
      return current;
    }

    return applySelectionToStatePreservingStructure(current, expandedSelection);
  };

  const applySelectionAwareTextCommand = (
    command: (current: Editor2State) => Editor2State,
  ) => {
    applyTransactionalState((current) => command(withExpandedTableCellSelection(current)));
  };

  const applySelectionAwareParagraphCommand = (
    command: (current: Editor2State) => Editor2State,
  ) => {
    applyTransactionalState((current) => command(withExpandedTableCellSelection(current)));
  };

  const resetTransactionGrouping = () => {
    lastTransactionMeta = null;
  };

  const applyTransactionalState = (
    producer: (current: Editor2State) => Editor2State,
    options?: TransactionOptions,
  ) => {
    const previous = cloneState(state);
    const next = producer(state);
    if (JSON.stringify(previous) === JSON.stringify(next)) {
      return;
    }

    const now = Date.now();
    const canMerge =
      options?.mergeKey !== undefined &&
      lastTransactionMeta?.mergeKey === options.mergeKey &&
      now - lastTransactionMeta.timestamp < 1000;

    if (!canMerge) {
      setUndoStack((stack) => [...stack, previous]);
    }

    setRedoStack([]);
    lastTransactionMeta = options?.mergeKey ? { mergeKey: options.mergeKey, timestamp: now } : null;
    applyState(next);
  };

  const clearPreferredColumn = () => {
    setPreferredColumnX(null);
  };

  const selectionCollapsed = () => isSelectionCollapsed(state.selection);

  const toolbarStyleState = (): ToolbarStyleState => {
    const styles = getSelectedRunStyles(state);
    const paragraphStyles = getSelectedParagraphStyles(state);

    return {
      bold: areAllBooleanStylesEnabled(styles, "bold"),
      italic: areAllBooleanStylesEnabled(styles, "italic"),
      underline: areAllBooleanStylesEnabled(styles, "underline"),
      strike: areAllBooleanStylesEnabled(styles, "strike"),
      superscript: areAllBooleanStylesEnabled(styles, "superscript"),
      subscript: areAllBooleanStylesEnabled(styles, "subscript"),
      fontFamily: resolveUniformStyleValue(styles, "fontFamily"),
      fontSize: resolveUniformStyleValue(styles, "fontSize"),
      color: resolveUniformStyleValue(styles, "color"),
      highlight: resolveUniformStyleValue(styles, "highlight"),
      align: resolveUniformParagraphStyleValue(paragraphStyles, "align"),
      lineHeight: resolveUniformParagraphStyleValue(paragraphStyles, "lineHeight"),
      spacingBefore: resolveUniformParagraphStyleValue(paragraphStyles, "spacingBefore"),
      spacingAfter: resolveUniformParagraphStyleValue(paragraphStyles, "spacingAfter"),
      indentLeft: resolveUniformParagraphStyleValue(paragraphStyles, "indentLeft"),
      indentFirstLine: resolveUniformParagraphStyleValue(paragraphStyles, "indentFirstLine"),
      listKind: resolveUniformListKind(getParagraphs(state).slice(normalizeSelection(state).startIndex, normalizeSelection(state).endIndex + 1)),
      pageBreakBefore: resolveUniformParagraphFlag(paragraphStyles, "pageBreakBefore"),
      keepWithNext: resolveUniformParagraphFlag(paragraphStyles, "keepWithNext"),
    };
  };

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

  const resetEditorChromeState = () => {
    clearPreferredColumn();
    resetTransactionGrouping();
    setMeasuredBlockHeights({});
    setUndoStack([]);
    setRedoStack([]);
  };

  const syncMeasuredBlockHeights = (): boolean => {
    if (!surfaceRef) {
      return false;
    }

    const nextHeights: Record<string, number> = {};
    const blockElements =
      surfaceRef.querySelectorAll<HTMLElement>("[data-block-id]");

    for (const element of blockElements) {
      const blockId = element.dataset.blockId;
      if (!blockId) {
        continue;
      }
      nextHeights[blockId] = element.getBoundingClientRect().height;
    }

    const currentHeights = measuredBlockHeights();
    const currentKeys = Object.keys(currentHeights);
    const nextKeys = Object.keys(nextHeights);
    const changed =
      currentKeys.length !== nextKeys.length ||
      nextKeys.some((key) => Math.abs((currentHeights[key] ?? 0) - nextHeights[key]!) > 0.5);

    if (changed) {
      setMeasuredBlockHeights(nextHeights);
    }
    return changed;
  };

  const applyBooleanStyleCommand = (key: BooleanStyleKey) => {
    if (selectionCollapsed()) {
      return;
    }

    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareTextCommand((current) => toggleTextStyle(current, key));
    focusInput();
  };

  const applyValueStyleCommand = <K extends ValueStyleKey>(
    key: K,
    value: Editor2TextStyle[K] | null,
  ) => {
    if (selectionCollapsed()) {
      return;
    }

    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareTextCommand((current) => setTextStyleValue(current, key, value));
    focusInput();
  };

  const applyParagraphStyleCommand = <K extends ParagraphStyleKey>(
    key: K,
    value: Editor2ParagraphStyle[K] | null,
  ) => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareParagraphCommand((current) => setParagraphStyle(current, key, value));
    focusInput();
  };

  const toggleParagraphFlagCommand = (key: "pageBreakBefore" | "keepWithNext") => {
    const nextValue = !toolbarStyleState()[key];
    applyParagraphStyleCommand(key, nextValue ? true : null);
  };

  const applyParagraphListCommand = (kind: NonNullable<Editor2ParagraphListStyle["kind"]>) => {
    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareParagraphCommand((current) => toggleParagraphList(current, kind));
    focusInput();
  };

  const handleImportDocx = async (file: File | null) => {
    if (!file) {
      return;
    }

    const arrayBuffer = await readFileBuffer(file);
    const document = await importDocxToEditor2Document(arrayBuffer);
    resetEditorChromeState();
    applyState(createEditor2StateFromDocument(document));
    if (importInputRef) {
      importInputRef.value = "";
    }
    focusInput();
  };

  const handleInsertImage = async (file: File | null) => {
    if (!file) return;

    const arrayBuffer = await readFileBuffer(file);
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    const src = `data:${file.type};base64,${base64}`;

    const img = new Image();
    img.src = src;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    const width = img.naturalWidth || 300;
    const height = img.naturalHeight || 300;

    applyTransactionalState(
      (current) => insertImageAtSelection(current, { src, width, height }),
      { mergeKey: "insertImage" }
    );

    if (imageInputRef) {
      imageInputRef.value = "";
    }
    focusInput();
  };

  const handleExportDocx = async () => {
    const blob = await exportEditor2DocumentToDocxBlob(state.document);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "oasis-editor-2.docx";
    anchor.click();
    URL.revokeObjectURL(url);
    focusInput();
  };

  const syncInputBox = () => {
    if (!surfaceRef) {
      setSelectionBoxes([]);
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    const surfaceRect = surfaceRef.getBoundingClientRect();
    const paragraphs = getParagraphs(state);
    const normalized = normalizeSelection(state);
    const nextSelectionBoxes: SelectionBox[] = [];

    const anchorLocation = findParagraphTableLocation(state.document, state.selection.anchor.paragraphId);
    const focusLocation = findParagraphTableLocation(state.document, state.selection.focus.paragraphId);

    const isTableSelection = anchorLocation && focusLocation && 
      anchorLocation.blockIndex === focusLocation.blockIndex &&
      (anchorLocation.rowIndex !== focusLocation.rowIndex || anchorLocation.cellIndex !== focusLocation.cellIndex);

    if (isTableSelection) {
      const minRow = Math.min(anchorLocation.rowIndex, focusLocation.rowIndex);
      const maxRow = Math.max(anchorLocation.rowIndex, focusLocation.rowIndex);
      const minCol = Math.min(anchorLocation.cellIndex, focusLocation.cellIndex);
      const maxCol = Math.max(anchorLocation.cellIndex, focusLocation.cellIndex);

      const tableBlock = state.document.blocks[anchorLocation.blockIndex];
      const tableId = tableBlock?.id;
      if (tableId) {
        const tableElement = surfaceRef.querySelector<HTMLElement>(`[data-block-id="${tableId}"]`);
        if (tableElement) {
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              const cellElement = tableElement.querySelector<HTMLElement>(`[data-row-index="${r}"][data-cell-index="${c}"]`);
              if (cellElement) {
                const cellRect = cellElement.getBoundingClientRect();
                nextSelectionBoxes.push({
                  left: cellRect.left - surfaceRect.left,
                  top: cellRect.top - surfaceRect.top,
                  width: cellRect.width,
                  height: cellRect.height,
                });
              }
            }
          }
        }
      }
    } else if (!normalized.isCollapsed) {
      for (let paragraphIndex = normalized.startIndex; paragraphIndex <= normalized.endIndex; paragraphIndex += 1) {
        const paragraph = paragraphs[paragraphIndex];
        if (!paragraph) {
          continue;
        }

        const paragraphElement = surfaceRef.querySelector<HTMLElement>(
          `[data-paragraph-id="${paragraph.id}"]`,
        );
        if (!paragraphElement) {
          continue;
        }

        const paragraphText = getParagraphText(paragraph);
        const charRects = collectCharRects(paragraphElement);
        const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
        const endOffset =
          paragraphIndex === normalized.endIndex ? normalized.endParagraphOffset : paragraphText.length;

        if (charRects.length === 0) {
          const paragraphRect = paragraphElement.getBoundingClientRect();
          nextSelectionBoxes.push({
            left: paragraphRect.left - surfaceRect.left,
            top: paragraphRect.top - surfaceRect.top,
            width: Math.max(12, paragraphRect.width || 12),
            height: paragraphRect.height || 28,
          });
          continue;
        }

        const layout = measureParagraphLayoutFromRects(paragraph, charRects);
        for (const line of layout.lines) {
          const lineStart = Math.max(startOffset, line.startOffset);
          const lineEnd = Math.min(endOffset, line.endOffset);
          if (lineStart >= lineEnd) {
            continue;
          }

          const startSlot = line.slots.find((slot) => slot.offset === lineStart);
          const endSlot = line.slots.find((slot) => slot.offset === lineEnd);
          if (!startSlot || !endSlot) {
            continue;
          }

          nextSelectionBoxes.push({
            left: startSlot.left - surfaceRect.left,
            top: line.top - surfaceRect.top,
            width: Math.max(1, endSlot.left - startSlot.left),
            height: line.height,
          });
        }
      }
    }

    setSelectionBoxes(nextSelectionBoxes);

    const selectedParagraph = surfaceRef.querySelector<HTMLElement>(
      `[data-paragraph-id="${state.selection.focus.paragraphId}"]`,
    );
    if (!selectedParagraph) {
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    const charRects = collectCharRects(selectedParagraph);
    const selectedParagraphNode =
      paragraphs.find((paragraph) => paragraph.id === state.selection.focus.paragraphId) ?? paragraphs[0];
    let left = 0;
    let top = 0;
    let height = 28;

    if (charRects.length === 0) {
      const paragraphRect = selectedParagraph.getBoundingClientRect();
      left = paragraphRect.left - surfaceRect.left;
      top = paragraphRect.top - surfaceRect.top;
      height = paragraphRect.height || 28;
    } else {
      const layout = measureParagraphLayoutFromRects(selectedParagraphNode, charRects);
      const slots =
        layout.lines.length > 0
          ? layout.lines.flatMap((line, lineIndex) =>
              lineIndex === layout.lines.length - 1 ? line.slots : line.slots.slice(0, -1),
            )
          : getCaretSlotRects(charRects).map((slot, offset) => ({
              paragraphId: selectedParagraphNode.id,
              offset,
              left: slot.left,
              top: slot.top,
              height: slot.height,
            }));
      const focusOffset = positionToParagraphOffset(selectedParagraphNode, state.selection.focus);
      const slotIndex = Math.max(0, Math.min(focusOffset, slots.length - 1));
      const slot = slots[slotIndex];
      left = slot.left - surfaceRect.left;
      top = slot.top - surfaceRect.top;
      height = slot.height;
    }

    setInputBox({
      left,
      top,
      height,
    });
    setCaretBox({
      left,
      top,
      height,
      visible: true,
    });
  };

  const requestInputBoxSync = () => {
    const requestId = ++syncRequestId;
    queueMicrotask(() => {
      if (requestId !== syncRequestId) {
        return;
      }
      const heightsChanged = syncMeasuredBlockHeights();
      if (heightsChanged) {
        queueMicrotask(() => {
          if (requestId !== syncRequestId) {
            return;
          }
          syncInputBox();
        });
        return;
      }
      syncInputBox();
    });
  };

  createEffect(() => {
    state.selection.anchor.paragraphId;
    state.selection.anchor.runId;
    state.selection.anchor.offset;
    state.selection.focus.paragraphId;
    state.selection.focus.runId;
    state.selection.focus.offset;
    getParagraphs(state)
      .map((paragraph) => paragraph.runs.map((run) => run.text).join(""))
      .join("\n");
    requestInputBoxSync();
  });

  onCleanup(() => {
    syncRequestId += 1;
    stopDragging();
  });

  const handleTextInput = (event: InputEvent & { currentTarget: HTMLTextAreaElement }) => {
    const text = event.currentTarget.value;
    if (text.length === 0) {
      return;
    }

    if (composing()) {
      return;
    }

    if (suppressedInputText !== null && text === suppressedInputText) {
      suppressedInputText = null;
      event.currentTarget.value = "";
      return;
    }

    clearPreferredColumn();
    applyTransactionalState((current) => applyTableAwareParagraphEdit(current, (temp) => insertTextAtSelection(temp, text)), {
      mergeKey: "insertText",
    });
    event.currentTarget.value = "";
    focusInput();
  };

  const handleCompositionStart = () => {
    setComposing(true);
  };

  const handleCompositionEnd = (event: CompositionEvent & { currentTarget: HTMLTextAreaElement }) => {
    const text = event.data ?? event.currentTarget.value;
    setComposing(false);

    if (text.length === 0) {
      event.currentTarget.value = "";
      return;
    }

    suppressedInputText = text;
    clearPreferredColumn();
    applyTransactionalState((current) => applyTableAwareParagraphEdit(current, (temp) => insertTextAtSelection(temp, text)), {
      mergeKey: "insertText",
    });
    event.currentTarget.value = "";
    focusInput();
  };

  const handleCopy = (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    const text = getSelectedText(state);
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    event.clipboardData?.setData("text/plain", text);
  };

  const handleCut = (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    const text = getSelectedText(state);
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    event.clipboardData?.setData("text/plain", text);
    clearPreferredColumn();
    resetTransactionGrouping();
    applyTransactionalState((current) => applyTableAwareParagraphEdit(current, (temp) => deleteBackward(temp)));
    focusInput();
  };

  const handlePaste = (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    clearPreferredColumn();
    resetTransactionGrouping();
    applyTransactionalState((current) => applyTableAwareParagraphEdit(current, (temp) => insertPlainTextAtSelection(temp, text)));
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
    const tableLocation = findParagraphTableLocation(state.document, state.selection.focus.paragraphId);
    if (tableLocation) {
      const block = state.document.blocks[tableLocation.blockIndex];
      if (block && block.type === "table") {
        const nextRowIndex = tableLocation.rowIndex + direction;
        if (nextRowIndex >= 0 && nextRowIndex < block.rows.length) {
          const nextRow = block.rows[nextRowIndex];
          const nextCell = nextRow?.cells[Math.min(tableLocation.cellIndex, (nextRow?.cells.length ?? 1) - 1)];
          if (nextCell && nextCell.blocks.length > 0) {
            const targetId = direction < 0
              ? nextCell.blocks[nextCell.blocks.length - 1]!.id
              : nextCell.blocks[0]!.id;
            targetIndex = paragraphs.findIndex((p) => p.id === targetId);
          }
        } else {
          if (direction < 0) {
            const firstParaId = block.rows[0]?.cells[0]?.blocks[0]?.id;
            if (firstParaId) {
              targetIndex = paragraphs.findIndex((p) => p.id === firstParaId) - 1;
            }
          } else {
            const lastRow = block.rows[block.rows.length - 1];
            const lastCell = lastRow?.cells[lastRow.cells.length - 1];
            const lastParaId = lastCell?.blocks[lastCell.blocks.length - 1]?.id;
            if (lastParaId) {
              targetIndex = paragraphs.findIndex((p) => p.id === lastParaId) + 1;
            }
          }
        }
      }
    }

    if (targetIndex < 0 || targetIndex >= paragraphs.length) {
      return false;
    }

    const targetParagraph = paragraphs[targetIndex];
    const targetElement = surfaceRef?.querySelector<HTMLElement>(
      `[data-paragraph-id="${targetParagraph.id}"]`,
    );
    const desiredX = preferredColumnX() ?? caretBox().left;

    let offset = 0;
    if (targetElement) {
      const layout = measureParagraphLayoutFromRects(targetParagraph, collectCharRects(targetElement));
      const lines = layout.lines;
      const boundaryLine = direction < 0 ? lines[lines.length - 1] : lines[0];
      offset =
        boundaryLine?.slots.length
          ? boundaryLine.slots.reduce(
              (best, slot) =>
                Math.abs(desiredX + (surfaceRef?.getBoundingClientRect().left ?? 0) - slot.left) <
                Math.abs(desiredX + (surfaceRef?.getBoundingClientRect().left ?? 0) - best.left)
                  ? slot
                  : best,
              boundaryLine.slots[0]!,
            ).offset
          : 0;
    } else {
      offset = Math.min(positionToParagraphOffset(targetParagraph, state.selection.focus), getParagraphText(targetParagraph).length);
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

  const resolvePositionAtPoint = (clientX: number, clientY: number): Editor2Position | null => {
    const target = document.elementFromPoint(clientX, clientY);
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    // If hovering over a table cell, return first char position of that cell
    const cellElement = target.closest<HTMLElement>("td[data-cell-index]");
    if (cellElement) {
      const rowIndex = Number(cellElement.dataset.rowIndex ?? -1);
      const cellIndex = Number(cellElement.dataset.cellIndex ?? -1);
      if (rowIndex >= 0 && cellIndex >= 0) {
        for (const block of state.document.blocks) {
          if (block.type !== "table") continue;
          const row = block.rows[rowIndex];
          const cell = row?.cells[cellIndex];
          const paragraph = cell?.blocks[0];
          if (paragraph) {
            return paragraphOffsetToPosition(paragraph, 0);
          }
        }
      }
    }

    const paragraphElement = target.closest<HTMLElement>("[data-paragraph-id]");
    if (!paragraphElement) {
      return null;
    }

    const paragraphId = paragraphElement.dataset.paragraphId;
    if (!paragraphId) {
      return null;
    }

    const paragraph = getParagraphs(state).find((candidate) => candidate.id === paragraphId);
    if (!paragraph) {
      return null;
    }

    return paragraphOffsetToPosition(
      paragraph,
      resolveClosestOffsetInMeasuredLayout(
        measureParagraphLayoutFromRects(paragraph, collectCharRects(paragraphElement)),
        clientX,
        clientY,
      ),
    );
  };

  const stopDragging = () => {
    dragAnchor = null;
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  };

  const handleWindowMouseMove = (event: MouseEvent) => {
    if (!dragAnchor) {
      return;
    }

    const position = resolvePositionAtPoint(event.clientX, event.clientY);
    if (!position) {
      return;
    }

    applyState(
      setSelection(state, {
        anchor: dragAnchor,
        focus: position,
      }),
    );
  };

  const handleWindowMouseUp = () => {
    stopDragging();
    focusInput();
  };

  const resolveAdjacentTableCellPosition = (
    document: Editor2Document,
    paragraphId: string,
    delta: -1 | 1,
  ): Editor2Position | null => {
    for (const block of document.blocks) {
      if (block.type !== "table") {
        continue;
      }

      const cells = block.rows.flatMap((row) => row.cells);
      const currentCellIndex = cells.findIndex((cell) =>
        cell.blocks.some((paragraph) => paragraph.id === paragraphId),
      );
      if (currentCellIndex === -1) {
        continue;
      }

      const nextCell = cells[currentCellIndex + delta];
      if (!nextCell) {
        return null;
      }

      const targetParagraph = nextCell.blocks[0];
      if (!targetParagraph) {
        return null;
      }

      return paragraphOffsetToPosition(targetParagraph, 0);
    }

    return null;
  };

  const findParagraphTableLocation = (document: Editor2Document, paragraphId: string) => {
    for (let blockIndex = 0; blockIndex < document.blocks.length; blockIndex += 1) {
      const block = document.blocks[blockIndex]!;
      if (block.type !== "table") {
        continue;
      }

      for (let rowIndex = 0; rowIndex < block.rows.length; rowIndex += 1) {
        const row = block.rows[rowIndex]!;
        for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
          const cell = row.cells[cellIndex]!;
          const paragraphIndex = cell.blocks.findIndex((paragraph) => paragraph.id === paragraphId);
          if (paragraphIndex !== -1) {
            return { blockIndex, rowIndex, cellIndex, paragraphIndex };
          }
        }
      }
    }

    return null;
  };

  const applyTableAwareParagraphEdit = (
    current: Editor2State,
    edit: (tempState: Editor2State) => Editor2State,
  ): Editor2State => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (!location || current.selection.anchor.paragraphId !== current.selection.focus.paragraphId) {
      return edit(current);
    }

    const nextBlocks = current.document.blocks.map(cloneDocumentBlock);
    const tableBlock = nextBlocks[location.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return edit(current);
    }

    const targetParagraph =
      tableBlock.rows[location.rowIndex]?.cells[location.cellIndex]?.blocks[location.paragraphIndex];
    if (!targetParagraph) {
      return edit(current);
    }

    const tempState: Editor2State = {
      document: createEditor2Document([targetParagraph]),
      selection: {
        anchor: { ...current.selection.anchor },
        focus: { ...current.selection.focus },
      },
    };
    const tempResult = edit(tempState);
    const replacementParagraphs = tempResult.document.blocks.filter(
      (block): block is Editor2ParagraphNode => block.type === "paragraph",
    );

    tableBlock.rows[location.rowIndex]!.cells[location.cellIndex]!.blocks.splice(
      location.paragraphIndex,
      1,
      ...replacementParagraphs,
    );

    return {
      document: {
        ...current.document,
        blocks: nextBlocks,
      },
      selection: tempResult.selection,
    };
  };

  const handleKeyDown = (event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a" && !event.altKey) {
      event.preventDefault();
      const paragraphs = getParagraphs(state);
      if (paragraphs.length === 0) {
        return;
      }

      const firstParagraph = paragraphs[0];
      const lastParagraph = paragraphs[paragraphs.length - 1];
      clearPreferredColumn();
      applyState(
        setSelection(state, {
          anchor: paragraphOffsetToPosition(firstParagraph, 0),
          focus: paragraphOffsetToPosition(lastParagraph, getParagraphText(lastParagraph).length),
        }),
      );
      focusInput();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const lowerKey = event.key.toLowerCase();
      if (lowerKey === "b" || lowerKey === "i" || lowerKey === "u") {
        event.preventDefault();
        clearPreferredColumn();
        resetTransactionGrouping();
        applySelectionAwareTextCommand((current) =>
          toggleTextStyle(
            current,
            lowerKey === "b" ? "bold" : lowerKey === "i" ? "italic" : "underline",
          ),
        );
        focusInput();
        return;
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.altKey) {
      event.preventDefault();
      if (event.shiftKey) {
        const nextRedoStack = redoStack();
        if (nextRedoStack.length === 0) {
          return;
        }
        const next = nextRedoStack[nextRedoStack.length - 1];
        setRedoStack((stack) => stack.slice(0, -1));
        setUndoStack((stack) => [...stack, cloneState(state)]);
        clearPreferredColumn();
        resetTransactionGrouping();
        applyHistoryState(next);
        focusInput();
        return;
      }

      const nextUndoStack = undoStack();
      if (nextUndoStack.length === 0) {
        return;
      }
      const next = nextUndoStack[nextUndoStack.length - 1];
      setUndoStack((stack) => stack.slice(0, -1));
      setRedoStack((stack) => [...stack, cloneState(state)]);
      clearPreferredColumn();
      resetTransactionGrouping();
      applyHistoryState(next);
      focusInput();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y" && !event.altKey) {
      event.preventDefault();
      const nextRedoStack = redoStack();
      if (nextRedoStack.length === 0) {
        return;
      }
      const next = nextRedoStack[nextRedoStack.length - 1];
      setRedoStack((stack) => stack.slice(0, -1));
      setUndoStack((stack) => [...stack, cloneState(state)]);
      clearPreferredColumn();
      resetTransactionGrouping();
      applyHistoryState(next);
      focusInput();
      return;
    }

    switch (event.key) {
      case "Enter":
        event.preventDefault();
        clearPreferredColumn();
        resetTransactionGrouping();
        applyTransactionalState((current) => applyTableAwareParagraphEdit(current, (temp) => splitBlockAtSelection(temp)));
        focusInput();
        return;
      case "Backspace":
        event.preventDefault();
        clearPreferredColumn();
        resetTransactionGrouping();
        applyTransactionalState((current) => applyTableAwareParagraphEdit(current, (temp) => deleteBackward(temp)));
        event.currentTarget.value = "";
        focusInput();
        return;
      case "Delete":
        event.preventDefault();
        clearPreferredColumn();
        resetTransactionGrouping();
        applyTransactionalState((current) => applyTableAwareParagraphEdit(current, (temp) => deleteForward(temp)));
        event.currentTarget.value = "";
        focusInput();
        return;
      case "Tab": {
        const nextPosition = resolveAdjacentTableCellPosition(
          state.document,
          state.selection.focus.paragraphId,
          event.shiftKey ? -1 : 1,
        );
        if (nextPosition) {
          event.preventDefault();
          clearPreferredColumn();
          resetTransactionGrouping();
          applySelectionPreservingStructure({
            anchor: nextPosition,
            focus: nextPosition,
          });
          focusInput();
          return;
        }
        break;
      }
      case "ArrowLeft":
        event.preventDefault();
        resetTransactionGrouping();
        if (event.shiftKey) {
          clearPreferredColumn();
          applyState(extendSelectionLeft(state));
        } else {
          clearPreferredColumn();
          applyState(moveSelectionLeft(state));
        }
        focusInput();
        return;
      case "ArrowRight":
        event.preventDefault();
        resetTransactionGrouping();
        if (event.shiftKey) {
          clearPreferredColumn();
          applyState(extendSelectionRight(state));
        } else {
          clearPreferredColumn();
          applyState(moveSelectionRight(state));
        }
        focusInput();
        return;
      case "ArrowUp":
        event.preventDefault();
        resetTransactionGrouping();
        if (event.shiftKey) {
          if (!moveVerticalSelection(-1, true)) {
            applyState(extendSelectionUp(state));
            focusInput();
          }
        } else if (!moveVerticalByBlock(-1)) {
          applyState(moveSelectionUp(state));
          focusInput();
        }
        return;
      case "ArrowDown":
        event.preventDefault();
        resetTransactionGrouping();
        if (event.shiftKey) {
          if (!moveVerticalSelection(1, true)) {
            applyState(extendSelectionDown(state));
            focusInput();
          }
        } else if (!moveVerticalByBlock(1)) {
          applyState(moveSelectionDown(state));
          focusInput();
        }
        return;
      default:
        return;
    }
  };

  return (
    <div class="oasis-editor-2-app">
      <header class="oasis-editor-2-header">
        <p class="oasis-editor-2-eyebrow">oasis-editor-2</p>
        <h1 class="oasis-editor-2-title">Minimal editor</h1>
        <p class="oasis-editor-2-copy">
          Block model, collapsed caret, Solid render tree, and a transparent textarea as the only
          keyboard transport.
        </p>
      </header>

      <section class="oasis-editor-2-toolbar" onMouseDown={(event) => event.preventDefault()}>
        <div class="oasis-editor-2-toolbar-group">
          <button
            type="button"
            class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
            data-testid="editor-2-toolbar-export-docx"
            onClick={() => void handleExportDocx()}
          >
            Export DOCX
          </button>
          <button
            type="button"
            class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
            data-testid="editor-2-toolbar-import-docx"
            onClick={() => importInputRef?.click()}
          >
            Import DOCX
          </button>
          <button
            type="button"
            class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
            data-testid="editor-2-toolbar-insert-image"
            onClick={() => imageInputRef?.click()}
          >
            Insert Image
          </button>
          <button
            type="button"
            class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
            data-testid="editor-2-toolbar-insert-table"
            onClick={() => {
              applyTransactionalState(
                (current) => insertTableAtSelection(current, 3, 3),
                { mergeKey: "insertTable" }
              );
              focusInput();
            }}
          >
            Insert Table
          </button>
          {booleanButtons.map((button) => (
            <button
              type="button"
              class="oasis-editor-2-tool-button"
              classList={{
                "oasis-editor-2-tool-button-active": toolbarStyleState()[button.key],
              }}
              data-testid={button.testId}
              disabled={selectionCollapsed()}
              onClick={() => applyBooleanStyleCommand(button.key)}
            >
              {button.label}
            </button>
          ))}
        </div>

        <div class="oasis-editor-2-toolbar-group">
          {alignButtons.map((button) => (
            <button
              type="button"
              class="oasis-editor-2-tool-button"
              classList={{
                "oasis-editor-2-tool-button-active": toolbarStyleState().align === button.value,
              }}
              data-testid={button.testId}
              onClick={() => applyParagraphStyleCommand("align", button.value)}
            >
              {button.label}
            </button>
          ))}
        </div>

        <div class="oasis-editor-2-toolbar-group">
          {listButtons.map((button) => (
            <button
              type="button"
              class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
              classList={{
                "oasis-editor-2-tool-button-active": toolbarStyleState().listKind === button.kind,
              }}
              data-testid={button.testId}
              onClick={() => applyParagraphListCommand(button.kind)}
            >
              {button.label}
            </button>
          ))}
        </div>

        <div class="oasis-editor-2-toolbar-group">
          <button
            type="button"
            class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
            classList={{
              "oasis-editor-2-tool-button-active": toolbarStyleState().pageBreakBefore,
            }}
            data-testid="editor-2-toolbar-page-break-before"
            onClick={() => toggleParagraphFlagCommand("pageBreakBefore")}
          >
            Page Break
          </button>
          <button
            type="button"
            class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
            classList={{
              "oasis-editor-2-tool-button-active": toolbarStyleState().keepWithNext,
            }}
            data-testid="editor-2-toolbar-keep-with-next"
            onClick={() => toggleParagraphFlagCommand("keepWithNext")}
          >
            Keep Next
          </button>
        </div>

        <div class="oasis-editor-2-toolbar-group">
          <select
            class="oasis-editor-2-tool-select"
            data-testid="editor-2-toolbar-font-family"
            disabled={selectionCollapsed()}
            value={toolbarStyleState().fontFamily}
            onChange={(event) =>
              applyValueStyleCommand("fontFamily", event.currentTarget.value || null)
            }
          >
            <option value="">Font</option>
            <option value="Georgia">Georgia</option>
            <option value="Inter">Inter</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
          </select>

          <select
            class="oasis-editor-2-tool-select oasis-editor-2-tool-select-small"
            data-testid="editor-2-toolbar-font-size"
            disabled={selectionCollapsed()}
            value={toolbarStyleState().fontSize}
            onChange={(event) =>
              applyValueStyleCommand(
                "fontSize",
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
          >
            <option value="">Size</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="24">24</option>
            <option value="28">28</option>
          </select>

          <label class="oasis-editor-2-tool-color">
            <span>Text</span>
            <input
              type="color"
              class="oasis-editor-2-tool-color-input"
              data-testid="editor-2-toolbar-color"
              disabled={selectionCollapsed()}
              value={toolbarStyleState().color || "#111827"}
              onInput={(event) => applyValueStyleCommand("color", event.currentTarget.value)}
            />
          </label>

          <label class="oasis-editor-2-tool-color">
            <span>Mark</span>
            <input
              type="color"
              class="oasis-editor-2-tool-color-input"
              data-testid="editor-2-toolbar-highlight"
              disabled={selectionCollapsed()}
              value={toolbarStyleState().highlight || "#fef08a"}
              onInput={(event) => applyValueStyleCommand("highlight", event.currentTarget.value)}
            />
          </label>
        </div>

        <div class="oasis-editor-2-toolbar-group">
          <label class="oasis-editor-2-tool-metric">
            <span>Line</span>
            <input
              type="number"
              class="oasis-editor-2-tool-number"
              data-testid="editor-2-toolbar-line-height"
              min="1"
              step="0.1"
              value={toolbarStyleState().lineHeight}
              onChange={(event) =>
                applyParagraphStyleCommand(
                  "lineHeight",
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
            />
          </label>

          <label class="oasis-editor-2-tool-metric">
            <span>Before</span>
            <input
              type="number"
              class="oasis-editor-2-tool-number"
              data-testid="editor-2-toolbar-spacing-before"
              min="0"
              step="1"
              value={toolbarStyleState().spacingBefore}
              onChange={(event) =>
                applyParagraphStyleCommand(
                  "spacingBefore",
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
            />
          </label>

          <label class="oasis-editor-2-tool-metric">
            <span>After</span>
            <input
              type="number"
              class="oasis-editor-2-tool-number"
              data-testid="editor-2-toolbar-spacing-after"
              min="0"
              step="1"
              value={toolbarStyleState().spacingAfter}
              onChange={(event) =>
                applyParagraphStyleCommand(
                  "spacingAfter",
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
            />
          </label>

          <label class="oasis-editor-2-tool-metric">
            <span>Indent</span>
            <input
              type="number"
              class="oasis-editor-2-tool-number"
              data-testid="editor-2-toolbar-indent-left"
              min="0"
              step="1"
              value={toolbarStyleState().indentLeft}
              onChange={(event) =>
                applyParagraphStyleCommand(
                  "indentLeft",
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
            />
          </label>

          <label class="oasis-editor-2-tool-metric">
            <span>First</span>
            <input
              type="number"
              class="oasis-editor-2-tool-number"
              data-testid="editor-2-toolbar-indent-first-line"
              step="1"
              value={toolbarStyleState().indentFirstLine}
              onChange={(event) =>
                applyParagraphStyleCommand(
                  "indentFirstLine",
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
            />
          </label>
        </div>
      </section>

      <section class="oasis-editor-2-stage">
        <div
          ref={surfaceRef}
          class="oasis-editor-2-editor"
          data-testid="editor-2-editor"
          onMouseDown={(event) => {
            event.preventDefault();
            focusInput();
          }}
        >
          <EditorSurface
            state={() => state}
            measuredBlockHeights={() => measuredBlockHeights()}
            onSurfaceMouseDown={(event) => {
              event.preventDefault();
              focusInput();
            }}
            onParagraphMouseDown={(paragraphId, event) => {
              event.preventDefault();
              const paragraph = getParagraphs(state).find((candidate) => candidate.id === paragraphId);
              if (!paragraph) {
                return;
              }
              clearPreferredColumn();
              resetTransactionGrouping();
              const offset = resolveClickOffset(
                event,
                measureParagraphLayoutFromRects(paragraph, collectCharRects(event.currentTarget)),
              );
              const position = paragraphOffsetToPosition(paragraph, offset);

              // For table cells, anchor to the cell's first char position so
              // dragging produces a proper cell-level selection
              const cellLocation = findParagraphTableLocation(state.document, paragraphId);
              const anchorPosition = cellLocation
                ? (() => {
                    const block = state.document.blocks[cellLocation.blockIndex];
                    const cellParagraph = block?.type === "table"
                      ? block.rows[cellLocation.rowIndex]?.cells[cellLocation.cellIndex]?.blocks[0]
                      : undefined;
                    return cellParagraph ? paragraphOffsetToPosition(cellParagraph, 0) : position;
                  })()
                : position;

              if (event.shiftKey) {
                dragAnchor = state.selection.anchor;
                applyState(
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
                applyState(
                  setSelection(state, {
                    anchor: paragraphOffsetToPosition(paragraph, 0),
                    focus: paragraphOffsetToPosition(paragraph, getParagraphText(paragraph).length),
                  }),
                );
                stopDragging();
                focusInput();
                return;
              }

              if (event.detail === 2) {
                const word = resolveWordSelection(getParagraphText(paragraph), offset);
                dragAnchor = null;
                applyState(
                  setSelection(state, {
                    anchor: paragraphOffsetToPosition(paragraph, word.start),
                    focus: paragraphOffsetToPosition(paragraph, word.end),
                  }),
                );
                stopDragging();
                focusInput();
                return;
              }

              dragAnchor = cellLocation ? anchorPosition : position;
              applyState(
                setSelection(state, {
                  anchor: position,
                  focus: position,
                }),
              );
              window.addEventListener("mousemove", handleWindowMouseMove);
              window.addEventListener("mouseup", handleWindowMouseUp);
              focusInput();
            }}
          />

          {!isSelectionCollapsed(state.selection) ? <SelectionOverlay boxes={selectionBoxes()} /> : null}

          {caretBox().visible && isSelectionCollapsed(state.selection) && (() => {
            const anchorLoc = findParagraphTableLocation(state.document, state.selection.anchor.paragraphId);
            const focusLoc = findParagraphTableLocation(state.document, state.selection.focus.paragraphId);
            const inTableSelection = anchorLoc && focusLoc &&
              anchorLoc.blockIndex === focusLoc.blockIndex &&
              (anchorLoc.rowIndex !== focusLoc.rowIndex || anchorLoc.cellIndex !== focusLoc.cellIndex);
            return !inTableSelection;
          })() ? (
            <CaretOverlay
              active={focused()}
              left={caretBox().left}
              top={caretBox().top}
              height={caretBox().height}
            />
          ) : null}

          <textarea
            ref={textareaRef}
            aria-label="Editor input"
            autocomplete="off"
            autocapitalize="off"
            class="oasis-editor-2-input"
            data-testid="editor-2-input"
            spellcheck={false}
            value=""
            style={{
              left: `${inputBox().left}px`,
              top: `${inputBox().top}px`,
              height: `${inputBox().height}px`,
              "pointer-events": "none",
            }}
            onBlur={() => setFocused(false)}
            onCompositionEnd={handleCompositionEnd}
            onCompositionStart={handleCompositionStart}
            onCopy={handleCopy}
            onCut={handleCut}
            onFocus={() => setFocused(true)}
            onInput={handleTextInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />
          <input
            ref={importInputRef}
            accept=".docx"
            data-testid="editor-2-import-docx-input"
            style={{ display: "none" }}
            type="file"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              void handleImportDocx(file);
            }}
          />
          <input
            ref={imageInputRef}
            accept="image/png, image/jpeg, image/gif"
            data-testid="editor-2-insert-image-input"
            style={{ display: "none" }}
            type="file"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              void handleInsertImage(file);
            }}
          />
        </div>
      </section>
    </div>
  );
}
