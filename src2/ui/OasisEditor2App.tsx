import { createEffect, createSignal, onCleanup, Show, type JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { OasisEditor2Editor } from "./OasisEditor2Editor.js";
import { getCaretSlotRects } from "./caretGeometry.js";
import {
  applyEditor2HistoryTransaction,
  createEmptyEditor2HistoryState,
  resetEditor2HistoryGrouping,
  takeEditor2RedoStep,
  takeEditor2UndoStep,
  type Editor2TransactionOptions,
} from "./editor2History.js";
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
  insertTableAtSelection,
  indentParagraphList,
  moveSelectionDown,
  moveSelectedImageToPosition,
  resizeSelectedImage,
  moveSelectionLeft,
  moveSelectionRight,
  moveSelectionUp,
  outdentParagraphList,
  parseEditor2ClipboardHtml,
  setParagraphStyle,
  setLinkAtSelection,
  setSelectedImageAlt,
  setSelection,
  splitListItemAtSelection,
  setTextStyleValue,
  serializeEditor2SelectionToHtml,
  splitBlockAtSelection,
  toggleParagraphList,
  toggleTextStyle,
} from "../core/editorCommands.js";
import {
  createEditor2Document,
  createEditor2Paragraph,
  createEditor2TableCell,
  createEditor2TableRow,
  createInitialEditor2State,
  createEditor2StateFromDocument,
} from "../core/editorState.js";
import {
  getDocumentPageSettings,
  getPageContentWidth,
  type Editor2Document,
  type Editor2BlockNode,
  type Editor2LayoutParagraph,
  type Editor2ParagraphNode,
  type Editor2ParagraphListStyle,
  type Editor2TableCellNode,
  type Editor2TableNode,
  type Editor2TableRowNode,
  getParagraphLength,
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
import { createEditor2Logger } from "../utils/logger.js";
import type { CaretBox, InputBox, SelectionBox } from "./editorUiTypes.js";

interface TableCellLayoutEntry {
  rowIndex: number;
  cellIndex: number;
  visualRowIndex: number;
  visualColumnIndex: number;
  rowSpan: number;
  colSpan: number;
  cell: Editor2TableCellNode;
}

interface ActiveImageResize {
  paragraphId: string;
  paragraphOffset: number;
  startClientX: number;
  startWidth: number;
  startHeight: number;
  aspectRatio: number;
  initialState: Editor2State;
}

interface ActiveImageDrag {
  paragraphId: string;
  paragraphOffset: number;
  startClientX: number;
  startClientY: number;
  dragging: boolean;
}

export interface OasisEditor2AppProps {
  showChrome?: boolean;
  viewportHeight?: number | string;
  class?: string;
  style?: JSX.CSSProperties;
  initialDocument?: Editor2Document;
  initialState?: Editor2State;
  onStateChange?: (state: Editor2State) => void;
  readOnly?: boolean;
}

const DEFAULT_MAX_INSERTED_IMAGE_WIDTH = 624;

function cloneEditor2State(source: Editor2State): Editor2State {
  return {
    document: {
      ...source.document,
      blocks: source.document.blocks.map((block) =>
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
                  colSpan: cell.colSpan ?? undefined,
                  rowSpan: cell.rowSpan ?? undefined,
                  vMerge: cell.vMerge ?? undefined,
                  blocks: cell.blocks.map((paragraph) => ({
                    ...paragraph,
                    runs: paragraph.runs.map((run) => ({ ...run })),
                    style: paragraph.style ? { ...paragraph.style } : undefined,
                    list: paragraph.list ? { ...paragraph.list } : undefined,
                  })),
                })),
              })),
            },
      ),
    },
    selection: {
      anchor: { ...source.selection.anchor },
      focus: { ...source.selection.focus },
    },
  };
}

function getElementContentWidth(element: HTMLElement | null | undefined): number {
  if (!element) {
    return DEFAULT_MAX_INSERTED_IMAGE_WIDTH;
  }

  const rect = element.getBoundingClientRect();
  const computed = window.getComputedStyle(element);
  const paddingLeft = Number.parseFloat(computed.paddingLeft || "0") || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight || "0") || 0;
  const contentWidth = rect.width - paddingLeft - paddingRight;

  if (!Number.isFinite(contentWidth) || contentWidth <= 0) {
    return DEFAULT_MAX_INSERTED_IMAGE_WIDTH;
  }

  return Math.max(24, Math.floor(contentWidth));
}

function getMaxInlineImageWidth(
  surface: HTMLDivElement | undefined,
  document: Editor2Document,
  paragraphId?: string,
): number {
  if (!surface) {
    return getPageContentWidth(getDocumentPageSettings(document));
  }

  const contentSurface =
    surface.querySelector<HTMLDivElement>('[data-testid="editor-2-surface"]') ?? surface;
  if (paragraphId) {
    const paragraphElement = contentSurface.querySelector<HTMLElement>(
      `[data-paragraph-id="${paragraphId}"]`,
    );
    const cellElement = paragraphElement?.closest<HTMLElement>("td.oasis-editor-2-table-cell");
    if (cellElement) {
      return getElementContentWidth(cellElement);
    }
  }

  return getElementContentWidth(contentSurface);
}

type ValueStyleKey = "fontFamily" | "fontSize" | "color" | "highlight" | "link";

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

function findImageFileFromTransfer(
  transfer: Pick<DataTransfer, "files" | "items"> | null | undefined,
): File | null {
  if (!transfer) {
    return null;
  }

  for (const item of Array.from(transfer.items ?? [])) {
    if (item.kind !== "file") {
      continue;
    }

    const file = item.getAsFile();
    if (file && file.type.startsWith("image/")) {
      return file;
    }
  }

  for (const file of Array.from(transfer.files ?? [])) {
    if (file.type.startsWith("image/")) {
      return file;
    }
  }

  return null;
}

function getEmptyBlockRect(blockElement: HTMLElement): DOMRect | null {
  return blockElement.querySelector<HTMLElement>('[data-testid="editor-2-empty-char"]')?.getBoundingClientRect() ?? null;
}

function getParagraphBoundaryElement(
  surface: HTMLElement,
  paragraphId: string,
  boundary: "start" | "end",
): HTMLElement | null {
  const elements = getParagraphElements(surface, paragraphId);
  if (elements.length === 0) {
    return null;
  }
  return boundary === "start" ? elements[0]! : elements[elements.length - 1]!;
}

function hasUsableCharGeometry(
  charRects: Array<{
    left: number;
    right: number;
    top: number;
    bottom: number;
    height: number;
  }>,
): boolean {
  return charRects.some((rect) => rect.right > rect.left || rect.height > 0 || rect.bottom > rect.top);
}

function buildTableCellLayout(table: Editor2TableNode): TableCellLayoutEntry[] {
  const occupiedColumns: number[] = [];
  const entries: TableCellLayoutEntry[] = [];

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex];
    let visualColumnIndex = 0;

    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
      while (occupiedColumns[visualColumnIndex] > 0) {
        visualColumnIndex += 1;
      }

      const cell = row.cells[cellIndex];
      if (cell.vMerge === "continue") {
        continue;
      }

      const colSpan = Math.max(1, cell.colSpan ?? 1);
      const rowSpan = Math.max(1, cell.rowSpan ?? 1);
      entries.push({
        rowIndex,
        cellIndex,
        visualRowIndex: rowIndex,
        visualColumnIndex,
        rowSpan,
        colSpan,
        cell,
      });

      for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
        occupiedColumns[visualColumnIndex + colOffset] = Math.max(
          occupiedColumns[visualColumnIndex + colOffset] ?? 0,
          rowSpan,
        );
      }

      visualColumnIndex += colSpan;
    }

    for (let columnIndex = 0; columnIndex < occupiedColumns.length; columnIndex += 1) {
      if (occupiedColumns[columnIndex] > 0) {
        occupiedColumns[columnIndex] -= 1;
      }
    }
  }

  return entries;
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

function findPreviousWordBoundary(text: string, offset: number): number {
  if (text.length === 0) {
    return 0;
  }

  let index = Math.max(0, Math.min(offset, text.length));
  if (index === 0) {
    return 0;
  }

  if (isWordCharacter(text[index - 1] ?? "")) {
    while (index > 0 && isWordCharacter(text[index - 1] ?? "")) {
      index -= 1;
    }
    return index;
  }

  while (index > 0 && !isWordCharacter(text[index - 1] ?? "")) {
    index -= 1;
  }

  while (index > 0 && isWordCharacter(text[index - 1] ?? "")) {
    index -= 1;
  }

  return index;
}

function findNextWordBoundary(text: string, offset: number): number {
  if (text.length === 0) {
    return 0;
  }

  let index = Math.max(0, Math.min(offset, text.length));
  if (index >= text.length) {
    return text.length;
  }

  if (isWordCharacter(text[index] ?? "")) {
    while (index < text.length && isWordCharacter(text[index] ?? "")) {
      index += 1;
    }
    while (index < text.length && !isWordCharacter(text[index] ?? "")) {
      index += 1;
    }
    return index;
  }

  while (index < text.length && !isWordCharacter(text[index] ?? "")) {
    index += 1;
  }

  return index;
}

export function OasisEditor2App(props: OasisEditor2AppProps = {}) {
  const logger = createEditor2Logger("app");
  const [state, setState] = createStore<Editor2State>(
    props.initialState
      ? cloneEditor2State(props.initialState)
      : props.initialDocument
        ? createEditor2StateFromDocument(props.initialDocument)
        : createInitialEditor2State(),
  );
  const pageSettings = () => getDocumentPageSettings(state.document);
  const showChrome = () => props.showChrome ?? true;
  const isReadOnly = () => props.readOnly ?? false;
  const [focused, setFocused] = createSignal(false);
  const [composing, setComposing] = createSignal(false);
  const [measuredBlockHeights, setMeasuredBlockHeights] = createSignal<Record<string, number>>({});
  const [measuredParagraphLayouts, setMeasuredParagraphLayouts] = createSignal<Record<string, Editor2LayoutParagraph>>({});
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
  let viewportRef: HTMLDivElement | undefined;
  let surfaceRef: HTMLDivElement | undefined;
  let textareaRef: HTMLTextAreaElement | undefined;
  let importInputRef: HTMLInputElement | undefined;
  let imageInputRef: HTMLInputElement | undefined;
  let syncRequestId = 0;
  let dragAnchor: Editor2Position | null = null;
  let activeImageDrag: ActiveImageDrag | null = null;
  let activeImageResize: ActiveImageResize | null = null;
  let historyState = createEmptyEditor2HistoryState();
  let suppressedInputText: string | null = null;
  let forcePlainTextPaste = false;
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
              colSpan: cell.colSpan ?? undefined,
              rowSpan: cell.rowSpan ?? undefined,
              vMerge: cell.vMerge ?? undefined,
              blocks: cell.blocks.map((paragraph) => ({
                ...paragraph,
                runs: paragraph.runs.map((run) => ({ ...run })),
                style: paragraph.style ? { ...paragraph.style } : undefined,
                list: paragraph.list ? { ...paragraph.list } : undefined,
              })),
            })),
          })),
        };

  const cloneState = (source: Editor2State): Editor2State =>
    cloneEditor2State({
      ...source,
      document: {
        ...source.document,
        blocks: source.document.blocks.map(cloneDocumentBlock),
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

  createEffect(() => {
    props.onStateChange?.(cloneState(state));
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

    const tableLayout = buildTableCellLayout(tableBlock);
    const anchorCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === anchorLocation.rowIndex && entry.cellIndex === anchorLocation.cellIndex,
    );
    const focusCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === focusLocation.rowIndex && entry.cellIndex === focusLocation.cellIndex,
    );
    if (!anchorCell || !focusCell) {
      return null;
    }

    const compareCellLocations = (
      left: TableCellLayoutEntry,
      right: TableCellLayoutEntry,
    ) => {
      if (left.visualRowIndex !== right.visualRowIndex) {
        return left.visualRowIndex - right.visualRowIndex;
      }
      if (left.visualColumnIndex !== right.visualColumnIndex) {
        return left.visualColumnIndex - right.visualColumnIndex;
      }
      return 0;
    };

    const startLocation = compareCellLocations(anchorCell, focusCell) <= 0 ? anchorLocation : focusLocation;
    const endLocation = compareCellLocations(anchorCell, focusCell) <= 0 ? focusLocation : anchorLocation;

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

  const resolveHorizontalTableCellRange = (
    current: Editor2State,
  ): {
    blockIndex: number;
    rowIndex: number;
    startCellIndex: number;
    endCellIndex: number;
  } | null => {
    const anchorLocation = findParagraphTableLocation(current.document, current.selection.anchor.paragraphId);
    const focusLocation = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (
      !anchorLocation ||
      !focusLocation ||
      anchorLocation.blockIndex !== focusLocation.blockIndex
    ) {
      return null;
    }

    const tableBlock = current.document.blocks[anchorLocation.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return null;
    }

    const tableLayout = buildTableCellLayout(tableBlock);
    const anchorCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === anchorLocation.rowIndex && entry.cellIndex === anchorLocation.cellIndex,
    );
    const focusCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === focusLocation.rowIndex && entry.cellIndex === focusLocation.cellIndex,
    );
    if (!anchorCell || !focusCell) {
      return null;
    }

    const compareCellLocations = (
      left: TableCellLayoutEntry,
      right: TableCellLayoutEntry,
    ) => {
      if (left.visualRowIndex !== right.visualRowIndex) {
        return left.visualRowIndex - right.visualRowIndex;
      }
      if (left.visualColumnIndex !== right.visualColumnIndex) {
        return left.visualColumnIndex - right.visualColumnIndex;
      }
      return 0;
    };

    const startLocation = compareCellLocations(anchorCell, focusCell) <= 0 ? anchorLocation : focusLocation;
    const endLocation = compareCellLocations(anchorCell, focusCell) <= 0 ? focusLocation : anchorLocation;

    if (anchorCell.visualRowIndex !== focusCell.visualRowIndex) {
      return null;
    }

    if (compareCellLocations(anchorCell, focusCell) === 0) {
      return null;
    }

    return {
      blockIndex: anchorLocation.blockIndex,
      rowIndex: startLocation.rowIndex,
      startCellIndex: startLocation.cellIndex,
      endCellIndex: endLocation.cellIndex,
    };
  };

  const canMergeSelectedTableCells = (current: Editor2State): boolean => {
    const range = resolveHorizontalTableCellRange(current);
    return Boolean(range && range.endCellIndex > range.startCellIndex);
  };

  const canSplitSelectedTableCell = (current: Editor2State): boolean => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (!location) {
      return false;
    }

    const block = current.document.blocks[location.blockIndex];
    if (!block || block.type !== "table") {
      return false;
    }

    const cell = block.rows[location.rowIndex]?.cells[location.cellIndex];
    return Boolean((cell?.colSpan ?? 1) > 1);
  };

  const resolveVerticalTableCellRange = (
    current: Editor2State,
  ): {
    blockIndex: number;
    startRowIndex: number;
    endRowIndex: number;
    cellIndex: number;
  } | null => {
    const anchorLocation = findParagraphTableLocation(current.document, current.selection.anchor.paragraphId);
    const focusLocation = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (
      !anchorLocation ||
      !focusLocation ||
      anchorLocation.blockIndex !== focusLocation.blockIndex ||
      anchorLocation.cellIndex !== focusLocation.cellIndex
    ) {
      return null;
    }

    const tableBlock = current.document.blocks[anchorLocation.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return null;
    }

    const tableLayout = buildTableCellLayout(tableBlock);
    const anchorCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === anchorLocation.rowIndex && entry.cellIndex === anchorLocation.cellIndex,
    );
    const focusCell = tableLayout.find(
      (entry) =>
        entry.rowIndex === focusLocation.rowIndex && entry.cellIndex === focusLocation.cellIndex,
    );
    if (!anchorCell || !focusCell) {
      return null;
    }

    const startRowIndex = Math.min(anchorCell.visualRowIndex, focusCell.visualRowIndex);
    const endRowIndex = Math.max(anchorCell.visualRowIndex, focusCell.visualRowIndex);
    if (startRowIndex === endRowIndex) {
      return null;
    }

    return {
      blockIndex: anchorLocation.blockIndex,
      startRowIndex,
      endRowIndex,
      cellIndex: anchorLocation.cellIndex,
    };
  };

  const canMergeSelectedTableRows = (current: Editor2State): boolean => {
    const range = resolveVerticalTableCellRange(current);
    if (!range) {
      return false;
    }

    const tableBlock = current.document.blocks[range.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return false;
    }

    for (let rowIndex = range.startRowIndex; rowIndex <= range.endRowIndex; rowIndex += 1) {
      const cell = tableBlock.rows[rowIndex]?.cells[range.cellIndex];
      if (!cell || cell.vMerge === "continue" || cell.blocks.length !== 1) {
        return false;
      }
    }

    return true;
  };

  const canMergeSelectedTable = (current: Editor2State): boolean => {
    return canMergeSelectedTableCells(current) || canMergeSelectedTableRows(current);
  };

  const canSplitSelectedTableCellVertically = (current: Editor2State): boolean => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (!location) {
      return false;
    }

    const block = current.document.blocks[location.blockIndex];
    if (!block || block.type !== "table") {
      return false;
    }

    const cell = block.rows[location.rowIndex]?.cells[location.cellIndex];
    return Boolean((cell?.rowSpan ?? 1) > 1 && cell?.vMerge === "restart");
  };

  const canSplitSelectedTable = (current: Editor2State): boolean => {
    return canSplitSelectedTableCell(current) || canSplitSelectedTableCellVertically(current);
  };

  const mergeSelectedTableCells = (current: Editor2State): Editor2State => {
    const range = resolveHorizontalTableCellRange(current);
    if (!range) {
      return current;
    }

    const blocks = current.document.blocks.map(cloneDocumentBlock);
    const tableBlock = blocks[range.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    const row = tableBlock.rows[range.rowIndex];
    if (!row) {
      return current;
    }

    const selectedCells = row.cells.slice(range.startCellIndex, range.endCellIndex + 1);
    if (selectedCells.length < 2) {
      return current;
    }

    const mergedCell = {
      ...selectedCells[0]!,
      colSpan: selectedCells.reduce((sum, cell) => sum + Math.max(1, cell.colSpan ?? 1), 0),
      blocks: selectedCells.flatMap((cell) => cell.blocks.map((paragraph) => cloneDocumentBlock(paragraph))) as Editor2ParagraphNode[],
    };

    row.cells.splice(range.startCellIndex, selectedCells.length, mergedCell);

    const nextParagraph = mergedCell.blocks[0];
    if (!nextParagraph) {
      return current;
    }

    return {
      document: {
        ...current.document,
        blocks,
      },
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const mergeSelectedTableRows = (current: Editor2State): Editor2State => {
    const range = resolveVerticalTableCellRange(current);
    if (!range) {
      return current;
    }

    const blocks = current.document.blocks.map(cloneDocumentBlock);
    const tableBlock = blocks[range.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    const selectedCells: Array<NonNullable<typeof tableBlock.rows[number]["cells"][number]>> = [];
    for (let rowIndex = range.startRowIndex; rowIndex <= range.endRowIndex; rowIndex += 1) {
      const row = tableBlock.rows[rowIndex];
      const cell = row?.cells[range.cellIndex];
      if (!row || !cell || cell.vMerge === "continue" || cell.blocks.length !== 1) {
        return current;
      }
      selectedCells.push(cell);
    }

    if (selectedCells.length < 2) {
      return current;
    }

    const mergedColSpan = Math.max(1, selectedCells[0]!.colSpan ?? 1);
    if (!selectedCells.every((cell) => Math.max(1, cell.colSpan ?? 1) === mergedColSpan)) {
      return current;
    }

    const mergedCell = {
      ...selectedCells[0]!,
      rowSpan: selectedCells.length,
      vMerge: "restart" as const,
      blocks: selectedCells.flatMap((cell) =>
        cell.blocks.map((paragraph) => cloneDocumentBlock(paragraph)),
      ) as Editor2ParagraphNode[],
    };
    tableBlock.rows[range.startRowIndex]!.cells[range.cellIndex] = mergedCell;

    for (let rowIndex = range.startRowIndex + 1; rowIndex <= range.endRowIndex; rowIndex += 1) {
      const placeholder = createEditor2TableCell([createEditor2Paragraph("")], mergedColSpan);
      placeholder.blocks = [];
      placeholder.vMerge = "continue";
      tableBlock.rows[rowIndex]!.cells[range.cellIndex] = placeholder;
    }

    const nextParagraph = mergedCell.blocks[0];
    if (!nextParagraph) {
      return current;
    }

    return {
      document: {
        ...current.document,
        blocks,
      },
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const mergeSelectedTable = (current: Editor2State): Editor2State => {
    if (canMergeSelectedTableCells(current)) {
      return mergeSelectedTableCells(current);
    }

    if (canMergeSelectedTableRows(current)) {
      return mergeSelectedTableRows(current);
    }

    return current;
  };

  const splitSelectedTableCellVertically = (current: Editor2State): Editor2State => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (!location) {
      return current;
    }

    const blocks = current.document.blocks.map(cloneDocumentBlock);
    const tableBlock = blocks[location.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    const cell = tableBlock.rows[location.rowIndex]?.cells[location.cellIndex];
    const span = Math.max(1, cell?.rowSpan ?? 1);
    if (!cell || span <= 1 || cell.vMerge !== "restart") {
      return current;
    }

    cell.rowSpan = undefined;
    cell.vMerge = undefined;

    const preservedColSpan = Math.max(1, cell.colSpan ?? 1);

    for (let offset = 1; offset < span; offset += 1) {
      const row = tableBlock.rows[location.rowIndex + offset];
      if (!row) {
        break;
      }
      const replacement = createEditor2TableCell([createEditor2Paragraph("")], preservedColSpan);
      row.cells[location.cellIndex] = replacement;
    }

    const nextParagraph = cell.blocks[0];
    if (!nextParagraph) {
      return current;
    }

    return {
      document: {
        ...current.document,
        blocks,
      },
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const splitSelectedTable = (current: Editor2State): Editor2State => {
    if (canSplitSelectedTableCell(current)) {
      return splitSelectedTableCell(current);
    }

    if (canSplitSelectedTableCellVertically(current)) {
      return splitSelectedTableCellVertically(current);
    }

    return current;
  };

  const hasHorizontalSpans = (table: Editor2TableNode): boolean =>
    table.rows.some((row) => row.cells.some((cell) => Math.max(1, cell.colSpan ?? 1) > 1));

  const hasVerticalSpans = (table: Editor2TableNode): boolean =>
    table.rows.some((row) =>
      row.cells.some((cell) => Math.max(1, cell.rowSpan ?? 1) > 1 || cell.vMerge !== undefined),
    );

  const hasMixedSpans = (table: Editor2TableNode): boolean =>
    hasHorizontalSpans(table) && hasVerticalSpans(table);

  const getRowVisualWidth = (row: Editor2TableRowNode): number =>
    row.cells.reduce((sum, cell) => sum + Math.max(1, cell.colSpan ?? 1), 0);

  const getTableVisualWidth = (table: Editor2TableNode): number =>
    table.rows.reduce((max, row) => Math.max(max, getRowVisualWidth(row)), 0);

  const findCellAtVisualColumn = (
    row: Editor2TableRowNode,
    visualColumn: number,
  ): Editor2TableCellNode | null => {
    let visualCursor = 0;
    for (const cell of row.cells) {
      const span = Math.max(1, cell.colSpan ?? 1);
      if (visualColumn >= visualCursor && visualColumn < visualCursor + span) {
        return cell;
      }
      visualCursor += span;
    }

    return null;
  };

  const findFirstNavigableParagraphInTable = (table: Editor2TableNode): Editor2ParagraphNode | null => {
    for (const row of table.rows) {
      for (const cell of row.cells) {
        if (cell.vMerge === "continue") {
          continue;
        }
        const paragraph = cell.blocks[0];
        if (paragraph) {
          return paragraph;
        }
      }
    }

    return null;
  };

  const isSimpleTable = (table: Editor2TableNode): boolean =>
    table.rows.every((row) =>
      row.cells.every(
        (cell) =>
          Math.max(1, cell.colSpan ?? 1) === 1 &&
          Math.max(1, cell.rowSpan ?? 1) === 1 &&
          cell.vMerge === undefined,
      ),
    );

  const canEditSelectedTableRow = (current: Editor2State): boolean => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (!location) {
      return false;
    }

    const block = current.document.blocks[location.blockIndex];
    return Boolean(block && block.type === "table");
  };

  const canEditSelectedTableColumn = (current: Editor2State): boolean => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (!location) {
      return false;
    }

    const block = current.document.blocks[location.blockIndex];
    if (!block || block.type !== "table") {
      return false;
    }

    return getTableVisualWidth(block) > 1;
  };

  const insertSelectedTableRow = (current: Editor2State, direction: -1 | 1): Editor2State => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (!location) {
      return current;
    }

    const blocks = current.document.blocks.map(cloneDocumentBlock);
    const tableBlock = blocks[location.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    const sourceRow = tableBlock.rows[location.rowIndex];
    if (!sourceRow) {
      return current;
    }

    const insertIndex = Math.max(
      0,
      Math.min(tableBlock.rows.length, location.rowIndex + (direction > 0 ? 1 : 0)),
    );
    let blankRow: Editor2TableRowNode;
    if (hasVerticalSpans(tableBlock)) {
      const tableLayout = buildTableCellLayout(tableBlock);
      const selectedEntry = tableLayout.find(
        (layoutEntry) =>
          layoutEntry.rowIndex === location.rowIndex && layoutEntry.cellIndex === location.cellIndex,
      );
      const sourceEntries = tableLayout.filter((layoutEntry) => layoutEntry.rowIndex === location.rowIndex);
      const templateEntries =
        sourceEntries.length > 0
          ? sourceEntries
          : tableLayout.filter((layoutEntry) => layoutEntry.rowIndex === Math.max(0, location.rowIndex - 1));
      blankRow = createEditor2TableRow(
        templateEntries.map((layoutEntry) => {
          const spanningEntry = tableLayout.find(
            (candidate) =>
              candidate.visualColumnIndex === layoutEntry.visualColumnIndex &&
              candidate.visualRowIndex < insertIndex &&
              candidate.visualRowIndex + candidate.rowSpan > insertIndex,
          );
          if (spanningEntry) {
            spanningEntry.cell.rowSpan = Math.max(1, spanningEntry.cell.rowSpan ?? 1) + 1;
            spanningEntry.cell.vMerge = "restart";
            const placeholder = createEditor2TableCell(
              [createEditor2Paragraph("")],
              layoutEntry.colSpan,
            );
            placeholder.blocks = [];
            placeholder.vMerge = "continue";
            return placeholder;
          }

          return createEditor2TableCell([createEditor2Paragraph("")], layoutEntry.colSpan);
        }),
      );
      tableBlock.rows.splice(insertIndex, 0, blankRow);

      const targetVisualColumn = selectedEntry?.visualColumnIndex ?? location.cellIndex;
      const targetCell = findCellAtVisualColumn(blankRow, targetVisualColumn);
      const nextParagraph =
        targetCell?.blocks[0] ??
        blankRow.cells.find((cell) => cell.vMerge !== "continue" && cell.blocks[0])?.blocks[0] ??
        findFirstNavigableParagraphInTable(tableBlock);
      if (!nextParagraph) {
        return {
          document: {
            ...current.document,
            blocks,
          },
          selection: current.selection,
        };
      }

      return {
        document: {
          ...current.document,
          blocks,
        },
        selection: {
          anchor: paragraphOffsetToPosition(nextParagraph, 0),
          focus: paragraphOffsetToPosition(nextParagraph, 0),
        },
      };
    } else {
      blankRow = createEditor2TableRow(
        sourceRow.cells.map((cell) =>
          createEditor2TableCell(
            [createEditor2Paragraph("")],
            Math.max(1, cell.colSpan ?? 1),
          ),
        ),
      );
      tableBlock.rows.splice(insertIndex, 0, blankRow);

      const targetCell = blankRow.cells[Math.min(location.cellIndex, blankRow.cells.length - 1)];
      const nextParagraph =
        targetCell?.blocks[0] ??
        blankRow.cells.find((cell) => cell.vMerge !== "continue" && cell.blocks[0])?.blocks[0] ??
        findFirstNavigableParagraphInTable(tableBlock);
      if (!nextParagraph) {
        return {
          document: {
            ...current.document,
            blocks,
          },
          selection: current.selection,
        };
      }

      return {
        document: {
          ...current.document,
          blocks,
        },
        selection: {
          anchor: paragraphOffsetToPosition(nextParagraph, 0),
          focus: paragraphOffsetToPosition(nextParagraph, 0),
        },
      };
    }
  };

  const deleteSelectedTableRow = (current: Editor2State): Editor2State => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (!location) {
      return current;
    }

    const blocks = current.document.blocks.map(cloneDocumentBlock);
    const tableBlock = blocks[location.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    if (tableBlock.rows.length <= 1) {
      return current;
    }

    const rowToDelete = tableBlock.rows[location.rowIndex];
    if (!rowToDelete) {
      return current;
    }

    const blockedByRestartCell = rowToDelete.cells.some(
      (cell) => cell.vMerge !== "continue" && Math.max(1, cell.rowSpan ?? 1) > 1,
    );
    if (blockedByRestartCell) {
      return current;
    }

    const selectedEntry = hasVerticalSpans(tableBlock)
      ? buildTableCellLayout(tableBlock).find(
          (layoutEntry) =>
            layoutEntry.rowIndex === location.rowIndex &&
            layoutEntry.cellIndex === location.cellIndex,
        )
      : null;

    if (hasVerticalSpans(tableBlock)) {
      const tableLayout = buildTableCellLayout(tableBlock);
      for (const entry of tableLayout) {
        if (
          entry.visualRowIndex < location.rowIndex &&
          entry.visualRowIndex + entry.rowSpan > location.rowIndex
        ) {
          entry.cell.rowSpan = Math.max(1, entry.cell.rowSpan ?? 1) - 1;
          if (entry.cell.rowSpan <= 1) {
            entry.cell.rowSpan = undefined;
            entry.cell.vMerge = undefined;
          } else {
            entry.cell.vMerge = "restart";
          }
        }
      }
    }

    tableBlock.rows.splice(location.rowIndex, 1);

    const nextRow = tableBlock.rows[Math.min(location.rowIndex, tableBlock.rows.length - 1)];
    const targetCell = nextRow
      ? findCellAtVisualColumn(
          nextRow,
          Math.min(
            selectedEntry?.visualColumnIndex ?? location.cellIndex,
            Math.max(0, getRowVisualWidth(nextRow) - 1),
          ),
        )
      : null;
    const nextParagraph = targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
    if (!nextParagraph) {
      return {
        document: {
          ...current.document,
          blocks,
        },
        selection: current.selection,
      };
    }

    return {
      document: {
        ...current.document,
        blocks,
      },
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const insertSelectedTableColumn = (current: Editor2State, direction: -1 | 1): Editor2State => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (!location) {
      return current;
    }

    const blocks = current.document.blocks.map(cloneDocumentBlock);
    const tableBlock = blocks[location.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    if (hasHorizontalSpans(tableBlock)) {
      const tableLayout = buildTableCellLayout(tableBlock);
      const selectedEntry = tableLayout.find(
        (entry) =>
          entry.rowIndex === location.rowIndex && entry.cellIndex === location.cellIndex,
      );
      const insertVisualColumn =
        (selectedEntry?.visualColumnIndex ?? location.cellIndex) +
        (direction > 0 ? Math.max(1, selectedEntry?.colSpan ?? 1) : 0);

      for (const row of tableBlock.rows) {
        const nextCells: Editor2TableCellNode[] = [];
        let visualCursor = 0;
        let inserted = false;

        for (const cell of row.cells) {
          const span = Math.max(1, cell.colSpan ?? 1);
          if (!inserted && insertVisualColumn <= visualCursor) {
            nextCells.push(createEditor2TableCell([createEditor2Paragraph("")]));
            inserted = true;
          }

          if (!inserted && visualCursor < insertVisualColumn && insertVisualColumn < visualCursor + span) {
            nextCells.push({
              ...cell,
              colSpan: span + 1,
            });
            inserted = true;
          } else {
            nextCells.push(cell);
          }

          visualCursor += span;
        }

        if (!inserted) {
          nextCells.push(createEditor2TableCell([createEditor2Paragraph("")]));
        }

        row.cells = nextCells;
      }

      const targetRow = tableBlock.rows[location.rowIndex];
      const targetCell = targetRow ? findCellAtVisualColumn(targetRow, insertVisualColumn) : null;
      const nextParagraph = targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
      if (!nextParagraph) {
        return {
          document: {
            ...current.document,
            blocks,
          },
          selection: current.selection,
        };
      }

      return {
        document: {
          ...current.document,
          blocks,
        },
        selection: {
          anchor: paragraphOffsetToPosition(nextParagraph, 0),
          focus: paragraphOffsetToPosition(nextParagraph, 0),
        },
      };
    }

    const insertIndex = Math.max(
      0,
      Math.min(tableBlock.rows[0]?.cells.length ?? 0, location.cellIndex + (direction > 0 ? 1 : 0)),
    );

    for (const row of tableBlock.rows) {
      row.cells.splice(
        insertIndex,
        0,
        createEditor2TableCell([createEditor2Paragraph("")]),
      );
    }

    const targetRow = tableBlock.rows[location.rowIndex];
    const targetCell = targetRow?.cells[insertIndex];
    const nextParagraph = targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
    if (!nextParagraph) {
      return {
        document: {
          ...current.document,
          blocks,
        },
        selection: current.selection,
      };
    }

    return {
      document: {
        ...current.document,
        blocks,
      },
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const deleteSelectedTableColumn = (current: Editor2State): Editor2State => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (!location) {
      return current;
    }

    const blocks = current.document.blocks.map(cloneDocumentBlock);
    const tableBlock = blocks[location.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    if (getTableVisualWidth(tableBlock) <= 1) {
      return current;
    }

    if (hasHorizontalSpans(tableBlock)) {
      const tableLayout = buildTableCellLayout(tableBlock);
      const selectedEntry = tableLayout.find(
        (entry) =>
          entry.rowIndex === location.rowIndex && entry.cellIndex === location.cellIndex,
      );
      const deleteVisualColumn = selectedEntry?.visualColumnIndex ?? location.cellIndex;

      for (const row of tableBlock.rows) {
        const nextCells: Editor2TableCellNode[] = [];
        let visualCursor = 0;

        for (const cell of row.cells) {
          const span = Math.max(1, cell.colSpan ?? 1);
          if (deleteVisualColumn >= visualCursor && deleteVisualColumn < visualCursor + span) {
            if (span > 1) {
              nextCells.push({
                ...cell,
                colSpan: span - 1 > 1 ? span - 1 : undefined,
              });
            }
          } else {
            nextCells.push(cell);
          }

          visualCursor += span;
        }

        row.cells = nextCells;
      }

      const targetRow = tableBlock.rows[location.rowIndex];
      const targetCell =
        targetRow &&
        findCellAtVisualColumn(
          targetRow,
          Math.min(deleteVisualColumn, Math.max(0, getRowVisualWidth(targetRow) - 1)),
        );
      const nextParagraph = targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
      if (!nextParagraph) {
        return {
          document: {
            ...current.document,
            blocks,
          },
          selection: current.selection,
        };
      }

      return {
        document: {
          ...current.document,
          blocks,
        },
        selection: {
          anchor: paragraphOffsetToPosition(nextParagraph, 0),
          focus: paragraphOffsetToPosition(nextParagraph, 0),
        },
      };
    }

    if (tableBlock.rows[0]?.cells.length <= 1) {
      return current;
    }

    for (const row of tableBlock.rows) {
      row.cells.splice(location.cellIndex, 1);
    }

    const targetRow = tableBlock.rows[location.rowIndex];
    const targetCell = targetRow?.cells[Math.min(location.cellIndex, targetRow.cells.length - 1)];
    const nextParagraph = targetCell?.blocks[0] ?? findFirstNavigableParagraphInTable(tableBlock);
    if (!nextParagraph) {
      return {
        document: {
          ...current.document,
          blocks,
        },
        selection: current.selection,
      };
    }

    return {
      document: {
        ...current.document,
        blocks,
      },
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
    };
  };

  const splitSelectedTableCell = (current: Editor2State): Editor2State => {
    const location = findParagraphTableLocation(current.document, current.selection.focus.paragraphId);
    if (!location) {
      return current;
    }

    const blocks = current.document.blocks.map(cloneDocumentBlock);
    const tableBlock = blocks[location.blockIndex];
    if (!tableBlock || tableBlock.type !== "table") {
      return current;
    }

    const row = tableBlock.rows[location.rowIndex];
    const cell = row?.cells[location.cellIndex];
    const span = Math.max(1, cell?.colSpan ?? 1);
    if (!row || !cell || span <= 1) {
      return current;
    }

    const nextCells = [
      {
        ...cell,
        colSpan: 1,
        blocks: cell.blocks.map((paragraph) => cloneDocumentBlock(paragraph)) as Editor2ParagraphNode[],
      },
      ...Array.from({ length: span - 1 }, () => createEditor2TableCell([createEditor2Paragraph("")])),
    ];

    row.cells.splice(location.cellIndex, 1, ...nextCells);

    const nextParagraph = nextCells[0]?.blocks[0];
    if (!nextParagraph) {
      return current;
    }

    return {
      document: {
        ...current.document,
        blocks,
      },
      selection: {
        anchor: paragraphOffsetToPosition(nextParagraph, 0),
        focus: paragraphOffsetToPosition(nextParagraph, 0),
      },
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

  const getSelectedImageInfo = (current: Editor2State) => {
    const normalized = normalizeSelection(current);
    if (
      normalized.isCollapsed ||
      normalized.startIndex !== normalized.endIndex ||
      normalized.endParagraphOffset - normalized.startParagraphOffset !== 1
    ) {
      return null;
    }

    const paragraph = getParagraphs(current)[normalized.startIndex];
    if (!paragraph) {
      return null;
    }

    let offset = 0;
    for (const run of paragraph.runs) {
      const startOffset = offset;
      offset += run.text.length;
      if (
        run.image &&
        run.text.length === 1 &&
        startOffset === normalized.startParagraphOffset
      ) {
        return {
          paragraph,
          run,
          startOffset,
          width: run.image.width,
          height: run.image.height,
        };
      }
    }

    return null;
  };

  const resetTransactionGrouping = () => {
    historyState = resetEditor2HistoryGrouping(historyState);
  };

  const applyTransactionalState = (
    producer: (current: Editor2State) => Editor2State,
    options?: Editor2TransactionOptions,
  ) => {
    const previous = cloneState(state);
    const next = producer(state);
    if (JSON.stringify(previous) === JSON.stringify(next)) {
      return;
    }

    historyState = applyEditor2HistoryTransaction(historyState, previous, next, options);
    setUndoStack(historyState.undoStack);
    setRedoStack(historyState.redoStack);
    applyState(next);
  };

  const clearPreferredColumn = () => {
    setPreferredColumnX(null);
  };

  const performUndo = () => {
    const step = takeEditor2UndoStep(historyState, cloneState(state));
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
    const step = takeEditor2RedoStep(historyState, cloneState(state));
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
    const selectedImage = getSelectedImageInfo(state);
    if (!selectedImage) {
      return false;
    }

    const paragraphs = getParagraphs(state);
    const sourceIndex = paragraphs.findIndex((paragraph) => paragraph.id === selectedImage.paragraph.id);
    if (sourceIndex < 0) {
      return false;
    }

    const targetIndex = sourceIndex + direction;
    if (targetIndex < 0 || targetIndex >= paragraphs.length) {
      const insertedParagraph = createEditor2Paragraph("");
      const nextState: Editor2State = {
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
      applyTransactionalState(() => moveSelectedImageToPosition(nextState, targetPosition), {
        mergeKey: "moveImage",
      });
      focusInput();
      return true;
    }

    const targetParagraph = paragraphs[targetIndex];
    const targetOffset = direction < 0 ? getParagraphLength(targetParagraph) : 0;

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

  const selectionCollapsed = () => isSelectionCollapsed(state.selection);

  const toolbarStyleState = (): ToolbarStyleState => {
    return getToolbarStyleState(state);
  };

  const selectedImageRun = () => getSelectedImageRun(state);
  const selectedImageAlt = () => selectedImageRun()?.run.image?.alt ?? null;

  const tableSelectionLabel = (): string | null => {
    const normalized = normalizeSelection(state);
    if (normalized.isCollapsed) {
      return null;
    }

    const anchorLocation = findParagraphTableLocation(state.document, state.selection.anchor.paragraphId);
    const focusLocation = findParagraphTableLocation(state.document, state.selection.focus.paragraphId);
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

  const tableActionRestrictionLabel = (): string | null => {
    return null;
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
    setMeasuredParagraphLayouts({});
    setUndoStack([]);
    setRedoStack([]);
  };

  const syncMeasuredLayoutMetrics = (): boolean => {
    if (!surfaceRef) {
      return false;
    }

    const nextHeights: Record<string, number> = {};
    const nextParagraphLayouts: Record<string, Editor2LayoutParagraph> = {};
    const blockElements =
      surfaceRef.querySelectorAll<HTMLElement>("[data-block-id]");
    const paragraphsById = new Map(getParagraphs(state).map((paragraph) => [paragraph.id, paragraph] as const));

    for (const element of blockElements) {
      const blockId = element.dataset.blockId;
      if (!blockId) {
        continue;
      }
      nextHeights[blockId] = element.getBoundingClientRect().height;
    }

    for (const [paragraphId, paragraph] of paragraphsById) {
      const charRects = collectParagraphCharRects(surfaceRef, paragraphId);
      if (charRects.length === 0 || !hasUsableCharGeometry(charRects)) {
        continue;
      }
      nextParagraphLayouts[paragraphId] = measureParagraphLayoutFromRects(paragraph, charRects);
    }

    const currentHeights = measuredBlockHeights();
    const currentKeys = Object.keys(currentHeights);
    const nextKeys = Object.keys(nextHeights);
    const heightsChanged =
      currentKeys.length !== nextKeys.length ||
      nextKeys.some((key) => Math.abs((currentHeights[key] ?? 0) - nextHeights[key]!) > 0.5);

    if (heightsChanged) {
      setMeasuredBlockHeights(nextHeights);
    }

    const currentParagraphLayouts = measuredParagraphLayouts();
    const currentParagraphIds = Object.keys(currentParagraphLayouts);
    const nextParagraphIds = Object.keys(nextParagraphLayouts);
    const paragraphLayoutsChanged =
      currentParagraphIds.length !== nextParagraphIds.length ||
      nextParagraphIds.some((paragraphId) => {
        const previous = currentParagraphLayouts[paragraphId];
        const next = nextParagraphLayouts[paragraphId]!;
        if (!previous) {
          return true;
        }
        if (previous.lines.length !== next.lines.length) {
          return true;
        }
        if ((previous.endOffset ?? previous.text.length) !== (next.endOffset ?? next.text.length)) {
          return true;
        }
        return next.lines.some((line, index) => {
          const previousLine = previous.lines[index];
          if (!previousLine) {
            return true;
          }
          return (
            previousLine.startOffset !== line.startOffset ||
            previousLine.endOffset !== line.endOffset ||
            Math.abs(previousLine.top - line.top) > 0.5 ||
            Math.abs(previousLine.height - line.height) > 0.5 ||
            previousLine.slots.length !== line.slots.length
          );
        });
      });

    if (paragraphLayoutsChanged) {
      setMeasuredParagraphLayouts(nextParagraphLayouts);
    }

    return heightsChanged || paragraphLayoutsChanged;
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

  const getSelectedParagraphRange = () => {
    const normalized = normalizeSelection(state);
    return getParagraphs(state).slice(normalized.startIndex, normalized.endIndex + 1);
  };

  const selectionTouchesList = () => getSelectedParagraphRange().some((paragraph) => Boolean(paragraph.list));

  const focusedParagraph = () => {
    const focusParagraphId = state.selection.focus.paragraphId;
    return getParagraphs(state).find((paragraph) => paragraph.id === focusParagraphId) ?? null;
  };

  const handleListTab = (direction: "indent" | "outdent") => {
    if (findParagraphTableLocation(state.document, state.selection.focus.paragraphId)) {
      return false;
    }

    if (!selectionTouchesList()) {
      return false;
    }

    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareParagraphCommand((current) =>
      direction === "indent" ? indentParagraphList(current) : outdentParagraphList(current),
    );
    focusInput();
    return true;
  };

  const handleListEnter = () => {
    const paragraph = focusedParagraph();
    if (!paragraph?.list) {
      return false;
    }

    clearPreferredColumn();
    resetTransactionGrouping();
    if (selectionCollapsed() && getParagraphText(paragraph).length === 0) {
      applySelectionAwareParagraphCommand((current) => clearParagraphListAtSelection(current));
    } else {
      applyTransactionalState((current) =>
        applyTableAwareParagraphEdit(current, (temp) => splitListItemAtSelection(temp)),
      );
    }
    focusInput();
    return true;
  };

  const handleListBoundaryBackspace = (
    event: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
  ) => {
    const paragraph = focusedParagraph();
    if (!paragraph?.list || !selectionCollapsed()) {
      return false;
    }

    const paragraphOffset = positionToParagraphOffset(paragraph, state.selection.focus);
    if (paragraphOffset !== 0) {
      return false;
    }

    clearPreferredColumn();
    resetTransactionGrouping();
    applySelectionAwareParagraphCommand((current) => outdentParagraphList(current));
    event.currentTarget.value = "";
    focusInput();
    return true;
  };

  const applyLinkCommand = (href: string | null) => {
    const activeLink = getLinkAtSelection(state);
    if (selectionCollapsed() && !activeLink) {
      return;
    }

    clearPreferredColumn();
    resetTransactionGrouping();
    applyTransactionalState((current) => setLinkAtSelection(current, href), { mergeKey: "link" });
    focusInput();
  };

  const promptForLink = () => {
    const activeLink = getLinkAtSelection(state) ?? "";
    if (selectionCollapsed() && !activeLink) {
      return;
    }

    const nextHref = window.prompt("Enter link URL", activeLink);
    if (nextHref === null) {
      focusInput();
      return;
    }

    const normalizedHref = nextHref.trim();
    applyLinkCommand(normalizedHref.length > 0 ? normalizedHref : null);
  };

  const removeLinkCommand = () => {
    applyLinkCommand(null);
  };

  const applyImageAltCommand = (alt: string) => {
    const selectedImage = selectedImageRun();
    if (!selectedImage) {
      return;
    }

    clearPreferredColumn();
    resetTransactionGrouping();
    applyTransactionalState((current) => setSelectedImageAlt(current, alt), { mergeKey: "imageAlt" });
    focusInput();
  };

  const promptForImageAlt = () => {
    const selectedImage = selectedImageRun();
    if (!selectedImage) {
      return;
    }

    const nextAlt = window.prompt("Enter image alt text", selectedImageAlt() ?? "");
    if (nextAlt === null) {
      focusInput();
      return;
    }

    applyImageAltCommand(nextAlt.trim());
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
    const document = await importDocxToEditor2Document(arrayBuffer);
    resetEditorChromeState();
    applyState(createEditor2StateFromDocument(document));
    logger.info("import docx:done", { blocks: document.blocks.length });
    if (importInputRef) {
      importInputRef.value = "";
    }
    focusInput();
  };

  const insertImageFromFile = async (file: File, position?: Editor2Position | null) => {
    logger.info("image insert:start", { name: file.name, type: file.type, size: file.size });
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

    const naturalWidth = img.naturalWidth || 300;
    const naturalHeight = img.naturalHeight || 300;
    const maxWidth = getMaxInlineImageWidth(surfaceRef, state.document, state.selection.focus.paragraphId);
    const scale = naturalWidth > maxWidth ? maxWidth / naturalWidth : 1;
    const width = Math.max(24, Math.round(naturalWidth * scale));
    const height = Math.max(24, Math.round(naturalHeight * scale));
    logger.info("image insert:decoded", {
      width: naturalWidth,
      height: naturalHeight,
      fittedWidth: width,
      fittedHeight: height,
      maxWidth,
    });

    applyTransactionalState(
      (current) => {
        const targetState = position
          ? setSelection(current, { anchor: position, focus: position })
          : current;
        return insertImageAtSelection(targetState, { src, width, height });
      },
      { mergeKey: "insertImage" }
    );
    logger.debug("image insert:selection", state.selection);
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
      const tableBlock = state.document.blocks[anchorLocation.blockIndex];
      const tableId = tableBlock?.id;
      if (tableId) {
        const tableElement =
          surfaceRef.querySelector<HTMLElement>(`[data-source-block-id="${tableId}"]`) ??
          surfaceRef.querySelector<HTMLElement>(`[data-block-id="${tableId}"]`);
        if (tableElement && tableBlock?.type === "table") {
          const tableLayout = buildTableCellLayout(tableBlock);
          const anchorCell = tableLayout.find(
            (entry) =>
              entry.rowIndex === anchorLocation.rowIndex && entry.cellIndex === anchorLocation.cellIndex,
          );
          const focusCell = tableLayout.find(
            (entry) =>
              entry.rowIndex === focusLocation.rowIndex && entry.cellIndex === focusLocation.cellIndex,
          );

          if (anchorCell && focusCell) {
            const minRow = Math.min(
              anchorCell.visualRowIndex,
              focusCell.visualRowIndex,
            );
            const maxRow = Math.max(
              anchorCell.visualRowIndex + anchorCell.rowSpan - 1,
              focusCell.visualRowIndex + focusCell.rowSpan - 1,
            );
            const minCol = Math.min(
              anchorCell.visualColumnIndex,
              focusCell.visualColumnIndex,
            );
            const maxCol = Math.max(
              anchorCell.visualColumnIndex + anchorCell.colSpan - 1,
              focusCell.visualColumnIndex + focusCell.colSpan - 1,
            );

            for (const entry of tableLayout) {
              const cellRowStart = entry.visualRowIndex;
              const cellRowEnd = entry.visualRowIndex + entry.rowSpan - 1;
              const cellColStart = entry.visualColumnIndex;
              const cellColEnd = entry.visualColumnIndex + entry.colSpan - 1;
              const intersects =
                cellRowStart <= maxRow &&
                cellRowEnd >= minRow &&
                cellColStart <= maxCol &&
                cellColEnd >= minCol;
              if (!intersects) {
                continue;
              }

              const cellElement = tableElement.querySelector<HTMLElement>(
                `[data-row-index="${entry.rowIndex}"][data-cell-index="${entry.cellIndex}"]`,
              );
              if (!cellElement) {
                continue;
              }

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
    } else if (!normalized.isCollapsed) {
      for (let paragraphIndex = normalized.startIndex; paragraphIndex <= normalized.endIndex; paragraphIndex += 1) {
        const paragraph = paragraphs[paragraphIndex];
        if (!paragraph) {
          continue;
        }

        const paragraphElement = getParagraphBoundaryElement(surfaceRef, paragraph.id, "start");
        if (!paragraphElement) {
          continue;
        }

        const paragraphText = getParagraphText(paragraph);
        const charRects = collectParagraphCharRects(surfaceRef, paragraph.id);
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

    const selectedParagraph = getParagraphBoundaryElement(
      surfaceRef,
      state.selection.focus.paragraphId,
      "end",
    );
    if (!selectedParagraph) {
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    const charRects = collectParagraphCharRects(surfaceRef, state.selection.focus.paragraphId);
    const selectedParagraphNode =
      paragraphs.find((paragraph) => paragraph.id === state.selection.focus.paragraphId) ?? paragraphs[0];
    let left = 0;
    let top = 0;
    let height = 28;

    if (charRects.length === 0) {
      const fallbackRect =
        getEmptyBlockRect(selectedParagraph) ?? selectedParagraph.getBoundingClientRect();
      left = fallbackRect.left - surfaceRect.left;
      top = fallbackRect.top - surfaceRect.top;
      height = fallbackRect.height || 28;
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
      const metricsChanged = syncMeasuredLayoutMetrics();
      if (metricsChanged) {
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
    logger.debug("selection changed", {
      anchor: state.selection.anchor,
      focus: state.selection.focus,
      selectedImage: getSelectedImageInfo(state)
        ? {
            paragraphId: getSelectedImageInfo(state)?.paragraph.id,
            runId: getSelectedImageInfo(state)?.run.id,
            width: getSelectedImageInfo(state)?.width,
            height: getSelectedImageInfo(state)?.height,
          }
        : null,
    });
    requestInputBoxSync();
  });

  createEffect(() => {
    const viewport = viewportRef;
    if (!viewport) {
      return;
    }

    const handleViewportScroll = () => requestInputBoxSync();
    const handleWindowResize = () => requestInputBoxSync();
    viewport.addEventListener("scroll", handleViewportScroll, { passive: true });
    window.addEventListener("resize", handleWindowResize);

    onCleanup(() => {
      viewport.removeEventListener("scroll", handleViewportScroll);
      window.removeEventListener("resize", handleWindowResize);
    });
  });

  onCleanup(() => {
    syncRequestId += 1;
    stopDragging();
    stopImageResize();
  });

  const handleTextInput = (event: InputEvent & { currentTarget: HTMLTextAreaElement }) => {
    if (isReadOnly()) {
      event.currentTarget.value = "";
      return;
    }
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
    event.clipboardData?.setData("text/html", serializeEditor2SelectionToHtml(state));
  };

  const handleCut = (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    if (isReadOnly()) {
      event.preventDefault();
      return;
    }
    const text = getSelectedText(state);
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    event.clipboardData?.setData("text/plain", text);
    event.clipboardData?.setData("text/html", serializeEditor2SelectionToHtml(state));
    clearPreferredColumn();
    resetTransactionGrouping();
    applyTransactionalState((current) => applyTableAwareParagraphEdit(current, (temp) => deleteBackward(temp)));
    focusInput();
  };

  const handlePaste = (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    if (isReadOnly()) {
      event.preventDefault();
      return;
    }
    if (forcePlainTextPaste) {
      forcePlainTextPaste = false;
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (text.length === 0) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      clearPreferredColumn();
      resetTransactionGrouping();
      applyTransactionalState((current) =>
        applyTableAwareParagraphEdit(current, (temp) => insertPlainTextAtSelection(temp, text)),
      );
      event.currentTarget.value = "";
      focusInput();
      return;
    }

    const imageFile = findImageFileFromTransfer(event.clipboardData);
    if (imageFile) {
      event.preventDefault();
      clearPreferredColumn();
      resetTransactionGrouping();
      void insertImageFromFile(imageFile);
      event.currentTarget.value = "";
      focusInput();
      return;
    }

    const html = event.clipboardData?.getData("text/html") ?? "";
    if (html.trim().length > 0 && parseEditor2ClipboardHtml(html).length > 0) {
      event.preventDefault();
      clearPreferredColumn();
      resetTransactionGrouping();
      applyTransactionalState((current) =>
        applyTableAwareParagraphEdit(current, (temp) => insertClipboardHtmlAtSelection(temp, html)),
      );
      event.currentTarget.value = "";
      focusInput();
      return;
    }

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

  const handleDrop = (event: DragEvent) => {
    if (isReadOnly()) {
      event.preventDefault();
      return;
    }
    const imageFile = findImageFileFromTransfer(event.dataTransfer);
    if (!imageFile) {
      return;
    }

    event.preventDefault();
    clearPreferredColumn();
    resetTransactionGrouping();
    const position = resolvePositionAtSurfacePoint(event.clientX, event.clientY) ?? state.selection.focus;
    void insertImageFromFile(imageFile, position);
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
        const tableLayout = buildTableCellLayout(block);
        const currentCell = tableLayout.find(
          (entry) =>
            entry.rowIndex === tableLocation.rowIndex && entry.cellIndex === tableLocation.cellIndex,
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
              (element) => element.closest('[data-repeated-header="true"]') === null,
            ) ?? currentElementCandidates[0];
          const desiredX =
            preferredColumnX() ??
            (currentElement ? currentElement.getBoundingClientRect().left : caretBox().left);
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
              (entry) => entry.visualRowIndex === rowIndex && entry.cell.blocks.length > 0 && entry.cell.vMerge !== "continue",
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
                    (element) => element.closest('[data-repeated-header="true"]') === null,
                  ) ?? cellElementCandidates[0];
                const rect = cellElement?.getBoundingClientRect();
                const left = rect?.left ?? desiredX;
                const right = rect?.right ?? desiredX;
                const distance = desiredX < left ? left - desiredX : desiredX > right ? desiredX - right : 0;
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
    const targetElement = surfaceRef
      ? getParagraphBoundaryElement(surfaceRef, targetParagraph.id, direction < 0 ? "end" : "start")
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

  const resolvePositionAtSurfacePoint = (clientX: number, clientY: number): Editor2Position | null =>
    surfaceRef
      ? resolvePositionAtPoint({
          clientX,
          clientY,
          surface: surfaceRef,
          state,
          documentLike: document,
        })
      : null;

  const stopDragging = () => {
    dragAnchor = null;
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  };

  const stopImageDrag = () => {
    activeImageDrag = null;
    window.removeEventListener("mousemove", handleImageDragMouseMove);
    window.removeEventListener("mouseup", handleImageDragMouseUp);
  };

  const stopImageResize = () => {
    activeImageResize = null;
    window.removeEventListener("mousemove", handleImageResizeMouseMove);
    window.removeEventListener("mouseup", handleImageResizeMouseUp);
  };

  const handleImageDragMouseMove = (event: MouseEvent) => {
    const dragState = activeImageDrag;
    if (!dragState) {
      return;
    }

    const deltaX = Math.abs(event.clientX - dragState.startClientX);
    const deltaY = Math.abs(event.clientY - dragState.startClientY);
    if (!dragState.dragging && deltaX + deltaY >= 4) {
      dragState.dragging = true;
      logger.info("image drag:start", {
        paragraphId: dragState.paragraphId,
        paragraphOffset: dragState.paragraphOffset,
        clientX: dragState.startClientX,
        clientY: dragState.startClientY,
      });
    }
  };

  const handleImageDragMouseUp = (event: MouseEvent) => {
    const dragState = activeImageDrag;
    if (!dragState) {
      focusInput();
      return;
    }

    if (dragState.dragging) {
      const position = resolvePositionAtSurfacePoint(event.clientX, event.clientY);
      if (position) {
        logger.info("image drag:done", {
          paragraphId: dragState.paragraphId,
          paragraphOffset: dragState.paragraphOffset,
          target: position,
        });
        applyTransactionalState(
          (current) => moveSelectedImageToPosition(current, position),
          { mergeKey: "moveImage" },
        );
      } else {
        logger.warn("image drag:cancel", {
          paragraphId: dragState.paragraphId,
          paragraphOffset: dragState.paragraphOffset,
          clientX: event.clientX,
          clientY: event.clientY,
        });
      }
    }

    stopImageDrag();
    focusInput();
  };

  const handleWindowMouseMove = (event: MouseEvent) => {
    if (!dragAnchor) {
      return;
    }

    const position = resolvePositionAtSurfacePoint(event.clientX, event.clientY);
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

  const handleImageResizeMouseMove = (event: MouseEvent) => {
    const resizeState = activeImageResize;
    if (!resizeState) {
      return;
    }

    const deltaX = event.clientX - resizeState.startClientX;
    const maxWidth = getMaxInlineImageWidth(surfaceRef, state.document, resizeState.paragraphId);
    const nextWidth = Math.max(24, Math.min(maxWidth, resizeState.startWidth + deltaX));
    const nextHeight = Math.max(24, nextWidth / resizeState.aspectRatio);
    const paragraph = getParagraphs(state).find((candidate) => candidate.id === resizeState.paragraphId);
    if (!paragraph) {
      logger.warn("image resize:missing paragraph", resizeState);
      return;
    }
    logger.debug("image resize:move", {
      paragraphId: resizeState.paragraphId,
      paragraphOffset: resizeState.paragraphOffset,
      deltaX,
      nextWidth,
      nextHeight,
      maxWidth,
    });
    applyState(
      resizeSelectedImage(
        applySelectionToStatePreservingStructure(state, {
          anchor: paragraphOffsetToPosition(paragraph, resizeState.paragraphOffset),
          focus: paragraphOffsetToPosition(paragraph, resizeState.paragraphOffset + 1),
        }),
        nextWidth,
        nextHeight,
      ),
    );
  };

  const handleImageResizeMouseUp = () => {
    const resizeState = activeImageResize;
    if (resizeState) {
      logger.info("image resize:done", {
        paragraphId: resizeState.paragraphId,
        startWidth: resizeState.startWidth,
        startHeight: resizeState.startHeight,
        current: getSelectedImageInfo(state)
          ? {
              width: getSelectedImageInfo(state)?.width,
              height: getSelectedImageInfo(state)?.height,
            }
          : null,
      });
      historyState = {
        undoStack: [...historyState.undoStack, cloneState(resizeState.initialState)],
        redoStack: [],
        lastTransactionMeta: null,
      };
      setUndoStack(historyState.undoStack);
      setRedoStack(historyState.redoStack);
    }
    stopImageResize();
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

      const cells = block.rows.flatMap((row) =>
        row.cells.filter((cell) => cell.vMerge !== "continue" && cell.blocks.length > 0),
      );
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

    const targetCell = tableBlock.rows[location.rowIndex]?.cells[location.cellIndex];
    if (!targetCell) {
      return edit(current);
    }

    const tempState: Editor2State = {
      document: createEditor2Document(targetCell.blocks),
      selection: {
        anchor: { ...current.selection.anchor },
        focus: { ...current.selection.focus },
      },
    };
    const tempResult = edit(tempState);
    const replacementParagraphs = tempResult.document.blocks.filter(
      (block): block is Editor2ParagraphNode => block.type === "paragraph",
    );

    targetCell.blocks.splice(0, targetCell.blocks.length, ...replacementParagraphs);

    return {
      document: {
        ...current.document,
        blocks: nextBlocks,
      },
      selection: tempResult.selection,
    };
  };

  const moveSelectionToParagraphBoundary = (boundary: "start" | "end", extend: boolean) => {
    const targetParagraph = getParagraphs(state).find(
      (paragraph) => paragraph.id === state.selection.focus.paragraphId,
    );
    if (!targetParagraph) {
      return false;
    }

    const targetOffset = boundary === "start" ? 0 : getParagraphText(targetParagraph).length;
    const targetPosition = paragraphOffsetToPosition(targetParagraph, targetOffset);
    clearPreferredColumn();
    applyState(
      setSelection(state, {
        anchor: extend ? state.selection.anchor : targetPosition,
        focus: targetPosition,
      }),
    );
    return true;
  };

  const moveSelectionToDocumentBoundary = (boundary: "start" | "end", extend: boolean) => {
    const paragraphs = getParagraphs(state);
    if (paragraphs.length === 0) {
      return false;
    }

    const targetParagraph = boundary === "start" ? paragraphs[0] : paragraphs[paragraphs.length - 1];
    const targetOffset = boundary === "start" ? 0 : getParagraphText(targetParagraph).length;
    const targetPosition = paragraphOffsetToPosition(targetParagraph, targetOffset);
    clearPreferredColumn();
    applyState(
      setSelection(state, {
        anchor: extend ? state.selection.anchor : targetPosition,
        focus: targetPosition,
      }),
    );
    return true;
  };

  const moveSelectionByWord = (direction: "left" | "right", extend: boolean) => {
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
      applyState(direction === "left" ? moveSelectionLeft(state) : moveSelectionRight(state));
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
      if (focusOffset === paragraphLength && focusParagraphIndex < paragraphs.length - 1) {
        targetParagraph = paragraphs[focusParagraphIndex + 1]!;
        targetOffset = 0;
      } else {
        targetOffset = findNextWordBoundary(paragraphText, focusOffset);
      }
    }

    const targetPosition = paragraphOffsetToPosition(targetParagraph, targetOffset);
    clearPreferredColumn();
    applyState(
      setSelection(state, {
        anchor: extend ? state.selection.anchor : targetPosition,
        focus: targetPosition,
      }),
    );
    return true;
  };

  const handleKeyDown = (event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    if (isReadOnly()) {
      const key = event.key;
      const lowerKey = key.toLowerCase();
      const isNavigationKey =
        key === "ArrowLeft" ||
        key === "ArrowRight" ||
        key === "ArrowUp" ||
        key === "ArrowDown" ||
        key === "Home" ||
        key === "End" ||
        key === "PageUp" ||
        key === "PageDown";
      const isModifierOnly =
        key === "Shift" || key === "Control" || key === "Meta" || key === "Alt";
      const isCopyOrSelectAll =
        (event.ctrlKey || event.metaKey) && (lowerKey === "a" || lowerKey === "c");
      if (!isNavigationKey && !isModifierOnly && !isCopyOrSelectAll) {
        event.preventDefault();
      }
      return;
    }
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

    if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === "a") {
      const selectedImage = selectedImageRun();
      if (selectedImage) {
        event.preventDefault();
        promptForImageAlt();
        return;
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "v" && !event.altKey) {
      event.preventDefault();
      forcePlainTextPaste = true;
      focusInput();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        resetTransactionGrouping();
        if (moveSelectionByWord(event.key === "ArrowLeft" ? "left" : "right", event.shiftKey)) {
          focusInput();
          return;
        }
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        clearPreferredColumn();
        resetTransactionGrouping();

        if (!isSelectionCollapsed(state.selection)) {
          applyTransactionalState((current) =>
            applyTableAwareParagraphEdit(current, (temp) => deleteBackward(temp)),
          );
          event.currentTarget.value = "";
          focusInput();
          return;
        }

        const paragraphs = getParagraphs(state);
        const focusParagraphIndex = paragraphs.findIndex(
          (paragraph) => paragraph.id === state.selection.focus.paragraphId,
        );
        const focusParagraph = paragraphs[focusParagraphIndex];
        if (!focusParagraph) {
          event.currentTarget.value = "";
          focusInput();
          return;
        }

        if (event.key === "Backspace" && focusParagraph.list) {
          const focusParagraphOffset = positionToParagraphOffset(focusParagraph, state.selection.focus);
          if (focusParagraphOffset === 0) {
            applySelectionAwareParagraphCommand((current) => outdentParagraphList(current));
            event.currentTarget.value = "";
            focusInput();
            return;
          }
        }

        const focusOffset = state.selection.focus.offset;
        const paragraphText = getParagraphText(focusParagraph);
        const word = resolveWordSelection(paragraphText, focusOffset);

        if (event.key === "Backspace") {
          if (focusOffset === 0 || word.start === focusOffset) {
            applyTransactionalState((current) =>
              applyTableAwareParagraphEdit(current, (temp) => deleteBackward(temp)),
            );
          } else {
            applyTransactionalState((current) =>
              applyTableAwareParagraphEdit(
                setSelection(current, {
                  anchor: paragraphOffsetToPosition(focusParagraph, word.start),
                  focus: paragraphOffsetToPosition(focusParagraph, focusOffset),
                }),
                (temp) => deleteBackward(temp),
              ),
            );
          }
        } else if (focusOffset >= paragraphText.length) {
          applyTransactionalState((current) =>
            applyTableAwareParagraphEdit(current, (temp) => deleteForward(temp)),
          );
        } else if (word.end > focusOffset) {
          applyTransactionalState((current) =>
            applyTableAwareParagraphEdit(
              setSelection(current, {
                anchor: paragraphOffsetToPosition(focusParagraph, focusOffset),
                focus: paragraphOffsetToPosition(focusParagraph, word.end),
              }),
              (temp) => deleteBackward(temp),
            ),
          );
        } else {
          applyTransactionalState((current) =>
            applyTableAwareParagraphEdit(current, (temp) => deleteForward(temp)),
          );
        }

        event.currentTarget.value = "";
        focusInput();
        return;
      }
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      resetTransactionGrouping();
      const boundary = event.key === "Home" ? "start" : "end";
      if (event.ctrlKey || event.metaKey) {
        moveSelectionToDocumentBoundary(boundary, event.shiftKey);
      } else {
        moveSelectionToParagraphBoundary(boundary, event.shiftKey);
      }
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

      if (lowerKey === "k") {
        event.preventDefault();
        promptForLink();
        return;
      }

      if (event.shiftKey && (lowerKey === "7" || lowerKey === "8")) {
        event.preventDefault();
        clearPreferredColumn();
        resetTransactionGrouping();
        applySelectionAwareParagraphCommand((current) =>
          toggleParagraphList(current, lowerKey === "7" ? "ordered" : "bullet"),
        );
        focusInput();
        return;
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.altKey) {
      event.preventDefault();
      if (event.shiftKey) {
        performRedo();
        return;
      }

      performUndo();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y" && !event.altKey) {
      event.preventDefault();
      performRedo();
      return;
    }

    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        resetTransactionGrouping();
        clearPreferredColumn();
        if (moveSelectedImageByParagraph(event.key === "ArrowUp" ? -1 : 1)) {
          return;
        }
      }
    }

    switch (event.key) {
      case "Enter":
        if (event.shiftKey) {
          event.preventDefault();
          clearPreferredColumn();
          resetTransactionGrouping();
          applyTransactionalState((current) =>
            applyTableAwareParagraphEdit(current, (temp) => insertTextAtSelection(temp, "\n")),
          );
          focusInput();
          return;
        }
        if (handleListEnter()) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        clearPreferredColumn();
        resetTransactionGrouping();
        applyTransactionalState((current) => applyTableAwareParagraphEdit(current, (temp) => splitBlockAtSelection(temp)));
        focusInput();
        return;
      case "Backspace":
        if (handleListBoundaryBackspace(event)) {
          event.preventDefault();
          return;
        }
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
        if (handleListTab(event.shiftKey ? "outdent" : "indent")) {
          event.preventDefault();
          return;
        }
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

  if (!showChrome()) {
    return (
      <OasisEditor2Editor
        state={() => state}
        measuredBlockHeights={() => measuredBlockHeights()}
        measuredParagraphLayouts={() => measuredParagraphLayouts()}
        selectionBoxes={() => selectionBoxes()}
        caretBox={() => caretBox()}
        inputBox={() => inputBox()}
        focused={() => focused()}
        viewportHeight={props.viewportHeight}
        class={props.class}
        style={props.style}
        readOnly={isReadOnly()}
        showCaret={() => {
          if (!caretBox().visible || !isSelectionCollapsed(state.selection)) {
            return false;
          }
          const anchorLoc = findParagraphTableLocation(state.document, state.selection.anchor.paragraphId);
          const focusLoc = findParagraphTableLocation(state.document, state.selection.focus.paragraphId);
          const inTableSelection = anchorLoc && focusLoc &&
            anchorLoc.blockIndex === focusLoc.blockIndex &&
            (anchorLoc.rowIndex !== focusLoc.rowIndex || anchorLoc.cellIndex !== focusLoc.cellIndex);
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
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onEditorMouseDown={(event) => {
          event.preventDefault();
          focusInput();
        }}
        onSurfaceMouseDown={(event) => {
          event.preventDefault();

          stopImageDrag();
          stopImageResize();

          if (
            event.target instanceof Element &&
            event.target.closest("[data-paragraph-id]")
          ) {
            focusInput();
            return;
          }

          const paragraphElement = surfaceRef
            ? findNearestParagraphElement(surfaceRef, event.clientX, event.clientY)
            : null;
          if (!paragraphElement) {
            focusInput();
            return;
          }
          const paragraphId = paragraphElement.dataset.paragraphId;
          const paragraph = paragraphId
            ? getParagraphs(state).find((candidate) => candidate.id === paragraphId)
            : undefined;
          if (!paragraphId || !paragraph || !surfaceRef) {
            focusInput();
            return;
          }

          clearPreferredColumn();
          resetTransactionGrouping();
          const layout = measureParagraphLayoutFromRects(
            paragraph,
            collectParagraphCharRects(surfaceRef, paragraph.id),
          );
          const offset = layout.text.length === 0
            ? 0
            : Math.max(
                0,
                Math.min(
                  layout.text.length,
                  resolveClosestOffsetInMeasuredLayout(layout, event.clientX, event.clientY),
                ),
              );
          const position = paragraphOffsetToPosition(paragraph, offset);

          if (event.shiftKey) {
            dragAnchor = state.selection.anchor;
            applyState(
              setSelection(state, {
                anchor: state.selection.anchor,
                focus: position,
              }),
            );
          } else {
            dragAnchor = position;
            applyState(
              setSelection(state, {
                anchor: position,
                focus: position,
              }),
            );
          }
          window.addEventListener("mousemove", handleWindowMouseMove);
          window.addEventListener("mouseup", handleWindowMouseUp);
          focusInput();
        }}
        onParagraphMouseDown={(paragraphId, event) => {
          event.preventDefault();
          const paragraph = getParagraphs(state).find((candidate) => candidate.id === paragraphId);
          if (!paragraph || !surfaceRef) {
            return;
          }
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
        onImageMouseDown={(paragraphId, paragraphOffset, event) => {
          event.preventDefault();
          event.stopPropagation();
          const paragraph = getParagraphs(state).find((candidate) => candidate.id === paragraphId);
          if (!paragraph) {
            logger.warn("image select:missing paragraph", { paragraphId, paragraphOffset });
            return;
          }

          clearPreferredColumn();
          resetTransactionGrouping();
          dragAnchor = null;
          stopDragging();
          stopImageDrag();
          stopImageResize();

          const start = paragraphOffsetToPosition(paragraph, paragraphOffset);
          const end = paragraphOffsetToPosition(paragraph, paragraphOffset + 1);
          logger.info("image select", {
            paragraphId,
            paragraphOffset,
            start,
            end,
          });

          if (event.shiftKey) {
            applyState(
              setSelection(state, {
                anchor: state.selection.anchor,
                focus: end,
              }),
            );
            focusInput();
            return;
          }

          applyState(
            setSelection(state, {
              anchor: start,
              focus: end,
            }),
          );
          activeImageDrag = {
            paragraphId,
            paragraphOffset,
            startClientX: event.clientX,
            startClientY: event.clientY,
            dragging: false,
          };
          window.addEventListener("mousemove", handleImageDragMouseMove);
          window.addEventListener("mouseup", handleImageDragMouseUp);
          focusInput();
        }}
        onImageResizeHandleMouseDown={(paragraphId, paragraphOffset, event) => {
          event.preventDefault();
          event.stopPropagation();
          const paragraph = getParagraphs(state).find((candidate) => candidate.id === paragraphId);
          if (!paragraph) {
            logger.warn("image resize:start missing paragraph", { paragraphId, paragraphOffset });
            return;
          }

          stopImageDrag();
          const selectedImage = getSelectedImageInfo(
            applySelectionToStatePreservingStructure(state, {
              anchor: paragraphOffsetToPosition(paragraph, paragraphOffset),
              focus: paragraphOffsetToPosition(paragraph, paragraphOffset + 1),
            }),
          );
          if (!selectedImage) {
            logger.warn("image resize:start missing selection", {
              paragraphId,
              paragraphOffset,
              selection: state.selection,
            });
            return;
          }

          logger.info("image resize:start", {
            paragraphId,
            paragraphOffset,
            width: selectedImage.width,
            height: selectedImage.height,
            clientX: event.clientX,
            clientY: event.clientY,
          });
          activeImageResize = {
            paragraphId,
            paragraphOffset,
            startClientX: event.clientX,
            startWidth: selectedImage.width,
            startHeight: selectedImage.height,
            aspectRatio: selectedImage.width / selectedImage.height,
            initialState: cloneState(state),
          };
          window.addEventListener("mousemove", handleImageResizeMouseMove);
          window.addEventListener("mouseup", handleImageResizeMouseUp);
        }}
        onInputBlur={() => setFocused(false)}
        onInputFocus={() => setFocused(true)}
        onCompositionEnd={handleCompositionEnd}
        onCompositionStart={handleCompositionStart}
        onCopy={handleCopy}
        onCut={handleCut}
        onInput={handleTextInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onImportInputChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          void handleImportDocx(file);
        }}
        onImageInputChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          void handleInsertImage(file);
        }}
      />
    );
  }

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
            class="oasis-editor-2-tool-button"
            data-testid="editor-2-toolbar-undo"
            disabled={undoStack().length === 0}
            onClick={performUndo}
            title="Undo last change"
          >
            Undo
          </button>
          <button
            type="button"
            class="oasis-editor-2-tool-button"
            data-testid="editor-2-toolbar-redo"
            disabled={redoStack().length === 0}
            onClick={performRedo}
            title="Redo last undone change"
          >
            Redo
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
            classList={{
              "oasis-editor-2-tool-button-active": Boolean(selectedImageRun()),
            }}
            data-testid="editor-2-toolbar-image-alt"
            disabled={!selectedImageRun()}
            onClick={promptForImageAlt}
            title="Edit the selected image alt text"
          >
            Image Alt
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
          <button
            type="button"
            class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
            data-testid="editor-2-toolbar-merge-table"
            disabled={!canMergeSelectedTable(state)}
            onClick={() => {
              applyTransactionalState(
                (current) => mergeSelectedTable(current),
                { mergeKey: "mergeTable" },
              );
              focusInput();
            }}
            title="Merge selected cells horizontally or vertically"
          >
            Merge Selection
          </button>
          <button
            type="button"
            class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
            data-testid="editor-2-toolbar-merge-table-cells"
            disabled={!canMergeSelectedTableCells(state)}
            onClick={() => {
              applyTransactionalState(
                (current) => mergeSelectedTableCells(current),
                { mergeKey: "mergeTableCells" },
              );
              focusInput();
            }}
            title="Merge selected cells horizontally"
          >
            Merge Horizontally
          </button>
          <button
            type="button"
            class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
            data-testid="editor-2-toolbar-split-table"
            disabled={!canSplitSelectedTable(state)}
            onClick={() => {
              applyTransactionalState(
                (current) => splitSelectedTable(current),
                { mergeKey: "splitTable" },
              );
              focusInput();
            }}
            title="Split selected cells horizontally or vertically"
          >
            Split Selection
          </button>
          <details class="oasis-editor-2-table-actions-advanced">
            <summary class="oasis-editor-2-table-actions-summary">Advanced table actions</summary>
            <div class="oasis-editor-2-toolbar-group oasis-editor-2-table-actions-group">
              <button
                type="button"
                class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
                data-testid="editor-2-toolbar-insert-table-column-before"
                disabled={!canEditSelectedTableColumn(state)}
                onClick={() => {
                  applyTransactionalState(
                    (current) => insertSelectedTableColumn(current, -1),
                    { mergeKey: "insertTableColumn" },
                  );
                  focusInput();
                }}
                title="Insert a column to the left"
              >
                Insert Column Before
              </button>
              <button
                type="button"
                class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
                data-testid="editor-2-toolbar-insert-table-column-after"
                disabled={!canEditSelectedTableColumn(state)}
                onClick={() => {
                  applyTransactionalState(
                    (current) => insertSelectedTableColumn(current, 1),
                    { mergeKey: "insertTableColumn" },
                  );
                  focusInput();
                }}
                title="Insert a column to the right"
              >
                Insert Column After
              </button>
              <button
                type="button"
                class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
                data-testid="editor-2-toolbar-delete-table-column"
                disabled={!canEditSelectedTableColumn(state)}
                onClick={() => {
                  applyTransactionalState(
                    (current) => deleteSelectedTableColumn(current),
                    { mergeKey: "deleteTableColumn" },
                  );
                  focusInput();
                }}
                title="Delete the current column"
              >
                Delete Column
              </button>
              <button
                type="button"
                class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
                data-testid="editor-2-toolbar-insert-table-row-before"
                disabled={!canEditSelectedTableRow(state)}
                onClick={() => {
                  applyTransactionalState(
                    (current) => insertSelectedTableRow(current, -1),
                    { mergeKey: "insertTableRow" },
                  );
                  focusInput();
                }}
                title="Insert a row above the current one"
              >
                Insert Row Before
              </button>
              <button
                type="button"
                class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
                data-testid="editor-2-toolbar-insert-table-row-after"
                disabled={!canEditSelectedTableRow(state)}
                onClick={() => {
                  applyTransactionalState(
                    (current) => insertSelectedTableRow(current, 1),
                    { mergeKey: "insertTableRow" },
                  );
                  focusInput();
                }}
                title="Insert a row below the current one"
              >
                Insert Row After
              </button>
              <button
                type="button"
                class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
                data-testid="editor-2-toolbar-delete-table-row"
                disabled={!canEditSelectedTableRow(state)}
                onClick={() => {
                  applyTransactionalState(
                    (current) => deleteSelectedTableRow(current),
                    { mergeKey: "deleteTableRow" },
                  );
                  focusInput();
                }}
                title="Delete the current row"
              >
                Delete Row
              </button>
              <button
                type="button"
                class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
                data-testid="editor-2-toolbar-split-table-cell"
                disabled={!canSplitSelectedTableCell(state)}
                onClick={() => {
                  applyTransactionalState(
                    (current) => splitSelectedTableCell(current),
                    { mergeKey: "splitTableCell" },
                  );
                  focusInput();
                }}
                title="Split selected cell horizontally"
              >
                Split Horizontally
              </button>
              <button
                type="button"
                class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
                data-testid="editor-2-toolbar-merge-table-rows"
                disabled={!canMergeSelectedTableRows(state)}
                onClick={() => {
                  applyTransactionalState(
                    (current) => mergeSelectedTableRows(current),
                    { mergeKey: "mergeTableRows" },
                  );
                  focusInput();
                }}
                title="Merge selected cells vertically"
              >
                Merge Vertically
              </button>
              <button
                type="button"
                class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
                data-testid="editor-2-toolbar-split-table-row"
                disabled={!canSplitSelectedTableCellVertically(state)}
                onClick={() => {
                  applyTransactionalState(
                    (current) => splitSelectedTableCellVertically(current),
                    { mergeKey: "splitTableRow" },
                  );
                  focusInput();
                }}
                title="Split selected cell vertically"
              >
                Split Vertically
              </button>
            </div>
          </details>
          <Show when={tableSelectionLabel()}>
            {(label) => (
              <div class="oasis-editor-2-toolbar-badge" data-testid="editor-2-table-selection-label">
                {label()}
              </div>
            )}
          </Show>
          <Show when={tableActionRestrictionLabel()}>
            {(label) => (
              <div class="oasis-editor-2-toolbar-note" data-testid="editor-2-table-actions-note">
                {label()}
              </div>
            )}
          </Show>
          <button
            type="button"
            class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
            classList={{
              "oasis-editor-2-tool-button-active": Boolean(toolbarStyleState().link),
            }}
            data-testid="editor-2-toolbar-link"
            disabled={selectionCollapsed() && !toolbarStyleState().link}
            onClick={promptForLink}
          >
            Link
          </button>
          <button
            type="button"
            class="oasis-editor-2-tool-button oasis-editor-2-tool-button-wide"
            data-testid="editor-2-toolbar-unlink"
            disabled={!toolbarStyleState().link}
            onClick={removeLinkCommand}
          >
            Unlink
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
        <OasisEditor2Editor
          state={() => state}
          measuredBlockHeights={() => measuredBlockHeights()}
          measuredParagraphLayouts={() => measuredParagraphLayouts()}
          selectionBoxes={() => selectionBoxes()}
          caretBox={() => caretBox()}
          inputBox={() => inputBox()}
          focused={() => focused()}
          viewportHeight={props.viewportHeight}
          class={props.class}
          style={props.style}
          readOnly={isReadOnly()}
          showCaret={() => {
            if (!caretBox().visible || !isSelectionCollapsed(state.selection)) {
              return false;
            }
            const anchorLoc = findParagraphTableLocation(state.document, state.selection.anchor.paragraphId);
            const focusLoc = findParagraphTableLocation(state.document, state.selection.focus.paragraphId);
            const inTableSelection = anchorLoc && focusLoc &&
              anchorLoc.blockIndex === focusLoc.blockIndex &&
              (anchorLoc.rowIndex !== focusLoc.rowIndex || anchorLoc.cellIndex !== focusLoc.cellIndex);
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
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          onEditorMouseDown={(event) => {
            event.preventDefault();
            focusInput();
          }}
          onSurfaceMouseDown={(event) => {
            event.preventDefault();

            if (
              event.target instanceof Element &&
              event.target.closest("[data-paragraph-id]")
            ) {
              focusInput();
              return;
            }

            const paragraphElement = surfaceRef
              ? findNearestParagraphElement(surfaceRef, event.clientX, event.clientY)
              : null;
            if (!paragraphElement) {
              focusInput();
              return;
            }
            const paragraphId = paragraphElement.dataset.paragraphId;
            const paragraph = paragraphId
              ? getParagraphs(state).find((candidate) => candidate.id === paragraphId)
              : undefined;
            if (!paragraphId || !paragraph || !surfaceRef) {
              focusInput();
              return;
            }

            clearPreferredColumn();
            resetTransactionGrouping();
            const layout = measureParagraphLayoutFromRects(
              paragraph,
              collectParagraphCharRects(surfaceRef, paragraph.id),
            );
            const offset = layout.text.length === 0
              ? 0
              : Math.max(
                  0,
                  Math.min(
                    layout.text.length,
                    resolveClosestOffsetInMeasuredLayout(layout, event.clientX, event.clientY),
                  ),
                );
            const position = paragraphOffsetToPosition(paragraph, offset);

            if (event.shiftKey) {
              dragAnchor = state.selection.anchor;
              applyState(
                setSelection(state, {
                  anchor: state.selection.anchor,
                  focus: position,
                }),
              );
            } else {
              dragAnchor = position;
              applyState(
                setSelection(state, {
                  anchor: position,
                  focus: position,
                }),
              );
            }
            window.addEventListener("mousemove", handleWindowMouseMove);
            window.addEventListener("mouseup", handleWindowMouseUp);
            focusInput();
          }}
          onParagraphMouseDown={(paragraphId, event) => {
            event.preventDefault();
            const paragraph = getParagraphs(state).find((candidate) => candidate.id === paragraphId);
            if (!paragraph || !surfaceRef) {
              return;
            }
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
          onImageMouseDown={(paragraphId, paragraphOffset, event) => {
            event.preventDefault();
            event.stopPropagation();
            const paragraph = getParagraphs(state).find((candidate) => candidate.id === paragraphId);
            if (!paragraph) {
              logger.warn("image select:missing paragraph", { paragraphId, paragraphOffset });
              return;
            }

            clearPreferredColumn();
            resetTransactionGrouping();
            dragAnchor = null;
            stopDragging();
            stopImageDrag();
            stopImageResize();

            const start = paragraphOffsetToPosition(paragraph, paragraphOffset);
            const end = paragraphOffsetToPosition(paragraph, paragraphOffset + 1);
            logger.info("image select", {
              paragraphId,
              paragraphOffset,
              start,
              end,
            });

            if (event.shiftKey) {
              applyState(
                setSelection(state, {
                  anchor: state.selection.anchor,
                  focus: end,
                }),
              );
              focusInput();
              return;
            }

            applyState(
              setSelection(state, {
                anchor: start,
                focus: end,
              }),
            );
            activeImageDrag = {
              paragraphId,
              paragraphOffset,
              startClientX: event.clientX,
              startClientY: event.clientY,
              dragging: false,
            };
            window.addEventListener("mousemove", handleImageDragMouseMove);
            window.addEventListener("mouseup", handleImageDragMouseUp);
            focusInput();
          }}
          onImageResizeHandleMouseDown={(paragraphId, paragraphOffset, event) => {
            event.preventDefault();
            event.stopPropagation();
            const paragraph = getParagraphs(state).find((candidate) => candidate.id === paragraphId);
            if (!paragraph) {
              logger.warn("image resize:start missing paragraph", { paragraphId, paragraphOffset });
              return;
            }

            stopImageDrag();
            const selectedImage = getSelectedImageInfo(
              applySelectionToStatePreservingStructure(state, {
                anchor: paragraphOffsetToPosition(paragraph, paragraphOffset),
                focus: paragraphOffsetToPosition(paragraph, paragraphOffset + 1),
              }),
            );
            if (!selectedImage) {
              logger.warn("image resize:start missing selection", {
                paragraphId,
                paragraphOffset,
                selection: state.selection,
              });
              return;
            }

            logger.info("image resize:start", {
              paragraphId,
              paragraphOffset,
              width: selectedImage.width,
              height: selectedImage.height,
              clientX: event.clientX,
              clientY: event.clientY,
            });
            activeImageResize = {
              paragraphId,
              paragraphOffset,
              startClientX: event.clientX,
              startWidth: selectedImage.width,
              startHeight: selectedImage.height,
              aspectRatio: selectedImage.width / selectedImage.height,
              initialState: cloneState(state),
            };
            window.addEventListener("mousemove", handleImageResizeMouseMove);
            window.addEventListener("mouseup", handleImageResizeMouseUp);
          }}
          onInputBlur={() => setFocused(false)}
          onInputFocus={() => setFocused(true)}
          onCompositionEnd={handleCompositionEnd}
          onCompositionStart={handleCompositionStart}
          onCopy={handleCopy}
          onCut={handleCut}
          onInput={handleTextInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onImportInputChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            void handleImportDocx(file);
          }}
          onImageInputChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            void handleInsertImage(file);
          }}
        />
      </section>
    </div>
  );
}
