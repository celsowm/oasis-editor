import { normalizeSelection } from "@/core/selection.js";
import {
  getParagraphs,
  positionToParagraphOffset,
  type EditorState,
  findParagraphTableLocation,
  getActiveSectionIndex,
  getDocumentSections,
} from "@/core/model.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import type { CaretBox, InputBox, SelectionBox } from "@/ui/editorUiTypes.js";
import type {
  CanvasLayoutSnapshot,
  CanvasSnapshotParagraph,
} from "./CanvasLayoutSnapshot.js";
import type { CanvasSnapshotSlot } from "@/ui/canvas/canvasSnapshotTypes.js";

export interface SelectedImageSelectionBox {
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Shape rotation in degrees (0 when not rotated). */
  rotation: number;
}

export interface SelectedTextBoxSelectionBox {
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Shape rotation in degrees (0 when not rotated). */
  rotation: number;
  /** True when the selected text box is a floating (anchored) drawing. */
  floating: boolean;
}

export interface CanvasSelectionGeometryResult {
  selectionBoxes: SelectionBox[];
  caretBox: CaretBox;
  inputBox: InputBox;
  selectedImageBox: SelectedImageSelectionBox | null;
  selectedTextBoxBox: SelectedTextBoxSelectionBox | null;
}

const TEXT_SELECTION_ANTIALIAS_OVERSCAN_PX = 1;
const TEXT_SELECTION_LEADING_BEARING_INSET_PX = 1;

function getParagraphTextAtOffset(
  paragraph: CanvasSnapshotParagraph,
  offset: number,
): string {
  return paragraph.paragraph.runs.map((run): string => run.text).join("")[offset] ?? "";
}

function isSelectionEdgeWhitespace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n";
}

function getParagraphSelectionRange(
  paragraphId: string,
  paragraphIndexById: Map<string, number>,
  normalized: ReturnType<typeof normalizeSelection>,
): { start: number; end: number } | null {
  if (normalized.isCollapsed) {
    return null;
  }
  const paragraphIndex = paragraphIndexById.get(paragraphId);
  if (paragraphIndex === undefined) {
    return null;
  }
  if (
    paragraphIndex < normalized.startIndex ||
    paragraphIndex > normalized.endIndex
  ) {
    return null;
  }

  if (normalized.startIndex === normalized.endIndex) {
    return {
      start: normalized.startParagraphOffset,
      end: normalized.endParagraphOffset,
    };
  }

  if (paragraphId === normalized.start.paragraphId) {
    return {
      start: normalized.startParagraphOffset,
      end: Number.POSITIVE_INFINITY,
    };
  }

  if (paragraphId === normalized.end.paragraphId) {
    return {
      start: 0,
      end: normalized.endParagraphOffset,
    };
  }

  return {
    start: 0,
    end: Number.POSITIVE_INFINITY,
  };
}

function resolveCaretSlot(
  paragraphs: CanvasSnapshotParagraph[],
  focusOffset: number,
): { left: number; top: number; height: number } | null {
  if (paragraphs.length === 0) return null;
  const containingSegment =
    paragraphs.find(
      (paragraph): boolean =>
        focusOffset >= paragraph.startOffset &&
        focusOffset <= paragraph.endOffset,
    ) ?? paragraphs[paragraphs.length - 1]!;
  const slots = containingSegment.lines.flatMap((line): CanvasSnapshotSlot[] => line.slots);
  if (slots.length === 0) {
    return {
      left: containingSegment.left,
      top: containingSegment.top,
      height: Math.max(18, containingSegment.height),
    };
  }

  let best = slots[0]!;
  let bestDistance = Math.abs(focusOffset - best.offset);
  for (const slot of slots) {
    const distance = Math.abs(focusOffset - slot.offset);
    if (distance < bestDistance) {
      best = slot;
      bestDistance = distance;
    }
  }
  const firstLine = containingSegment.lines[0];
  const shouldIncludeSpacingBefore =
    containingSegment.startOffset === 0 &&
    firstLine !== undefined &&
    focusOffset >= firstLine.startOffset &&
    focusOffset <= firstLine.endOffset &&
    best.top > containingSegment.top;
  if (shouldIncludeSpacingBefore) {
    return {
      left: best.left,
      top: containingSegment.top,
      height: best.top + best.height - containingSegment.top,
    };
  }
  return {
    left: best.left,
    top: best.top,
    height: best.height,
  };
}

export function computeCanvasSelectionGeometry(
  snapshot: CanvasLayoutSnapshot,
  state: EditorState,
): CanvasSelectionGeometryResult {
  const normalized = normalizeSelection(state);
  const selectionBoxes: SelectionBox[] = [];
  const surfaceRect = snapshot.surfaceRect;
  const paragraphIndexById = new Map(
    getParagraphs(state).map(
      (paragraph, index): readonly [string, number] => [paragraph.id, index] as const,
    ),
  );
  let selectedImageBox: SelectedImageSelectionBox | null = null;
  let selectedTextBoxBox: SelectedTextBoxSelectionBox | null = null;

  if (
    !normalized.isCollapsed &&
    normalized.startIndex === normalized.endIndex &&
    normalized.endParagraphOffset - normalized.startParagraphOffset === 1
  ) {
    const matchesImage = (image: {
      paragraphId: string;
      startOffset: number;
      endOffset: number;
    }): boolean =>
      image.paragraphId === normalized.start.paragraphId &&
      image.startOffset === normalized.startParagraphOffset &&
      image.endOffset === normalized.endParagraphOffset;
    const selectedImage =
      snapshot.inlineImages.find(matchesImage) ??
      snapshot.floatingImages.find(matchesImage);
    if (selectedImage) {
      selectedImageBox = {
        paragraphId: selectedImage.paragraphId,
        startOffset: selectedImage.startOffset,
        endOffset: selectedImage.endOffset,
        left: selectedImage.left - surfaceRect.left,
        top: selectedImage.top - surfaceRect.top,
        width: selectedImage.width,
        height: selectedImage.height,
        rotation: selectedImage.rotation ?? 0,
      };
    }

    if (!selectedImageBox) {
      const matchesSelection = (box: {
        paragraphId: string;
        startOffset: number;
        endOffset: number;
      }): boolean =>
        box.paragraphId === normalized.start.paragraphId &&
        box.startOffset === normalized.startParagraphOffset &&
        box.endOffset === normalized.endParagraphOffset;

      const selectedFloating =
        snapshot.floatingTextBoxes.find(matchesSelection);
      const selectedInline = selectedFloating
        ? undefined
        : snapshot.inlineTextBoxes.find(matchesSelection);
      const selectedTextBox = selectedFloating ?? selectedInline;

      if (selectedTextBox) {
        selectedTextBoxBox = {
          paragraphId: selectedTextBox.paragraphId,
          startOffset: selectedTextBox.startOffset,
          endOffset: selectedTextBox.endOffset,
          left: selectedTextBox.left - surfaceRect.left,
          top: selectedTextBox.top - surfaceRect.top,
          width: selectedTextBox.width,
          height: selectedTextBox.height,
          rotation: selectedTextBox.rotation ?? 0,
          floating: Boolean(selectedFloating),
        };
      }
    }
  }

  // Check if we have a table-cell selection across multiple cells
  const activeSectionIndex = getActiveSectionIndex(state);
  const anchorLoc = findParagraphTableLocation(
    state.document,
    state.selection.anchor.paragraphId,
    activeSectionIndex,
  );
  const focusLoc = findParagraphTableLocation(
    state.document,
    state.selection.focus.paragraphId,
    activeSectionIndex,
  );

  let isMultiCellSelection = false;

  if (
    anchorLoc &&
    focusLoc &&
    anchorLoc.blockIndex === focusLoc.blockIndex &&
    anchorLoc.zone === focusLoc.zone &&
    (anchorLoc.rowIndex !== focusLoc.rowIndex ||
      anchorLoc.cellIndex !== focusLoc.cellIndex)
  ) {
    const sections = getDocumentSections(state.document);
    const section = sections[activeSectionIndex];
    let tableBlock;
    if (anchorLoc.zone === "header") {
      tableBlock = section?.header?.[anchorLoc.blockIndex];
    } else if (anchorLoc.zone === "footer") {
      tableBlock = section?.footer?.[anchorLoc.blockIndex];
    } else {
      tableBlock = section?.blocks?.[anchorLoc.blockIndex];
    }

    if (tableBlock && tableBlock.type === "table") {
      isMultiCellSelection = true;
      const tableLayout = buildTableCellLayout(tableBlock);
      const anchorCell = tableLayout.find(
        (entry): boolean =>
          entry.rowIndex === anchorLoc.rowIndex &&
          entry.cellIndex === anchorLoc.cellIndex,
      );
      const focusCell = tableLayout.find(
        (entry): boolean =>
          entry.rowIndex === focusLoc.rowIndex &&
          entry.cellIndex === focusLoc.cellIndex,
      );

      if (anchorCell && focusCell) {
        const startRow = Math.min(
          anchorCell.visualRowIndex,
          focusCell.visualRowIndex,
        );
        const endRow = Math.max(
          anchorCell.visualRowIndex + anchorCell.rowSpan - 1,
          focusCell.visualRowIndex + focusCell.rowSpan - 1,
        );
        const startCol = Math.min(
          anchorCell.visualColumnIndex,
          focusCell.visualColumnIndex,
        );
        const endCol = Math.max(
          anchorCell.visualColumnIndex + anchorCell.colSpan - 1,
          focusCell.visualColumnIndex + focusCell.colSpan - 1,
        );

        const uniqueCells = new Set<string>();

        for (const paragraph of snapshot.paragraphs) {
          if (
            paragraph.tableCell &&
            paragraph.tableCell.tableId === tableBlock.id
          ) {
            const cell = tableLayout.find(
              (c): boolean =>
                c.rowIndex === paragraph.tableCell!.rowIndex &&
                c.cellIndex === paragraph.tableCell!.cellIndex,
            );
            if (cell) {
              const inRow =
                cell.visualRowIndex <= endRow &&
                cell.visualRowIndex + cell.rowSpan - 1 >= startRow;
              const inCol =
                cell.visualColumnIndex <= endCol &&
                cell.visualColumnIndex + cell.colSpan - 1 >= startCol;
              if (inRow && inCol) {
                const cellKey = `${cell.rowIndex}:${cell.cellIndex}`;
                if (!uniqueCells.has(cellKey)) {
                  uniqueCells.add(cellKey);
                  selectionBoxes.push({
                    left: paragraph.tableCell.left - surfaceRect.left,
                    top: paragraph.tableCell.top - surfaceRect.top,
                    width: paragraph.tableCell.width,
                    height: paragraph.tableCell.height,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  if (
    !isMultiCellSelection &&
    !normalized.isCollapsed &&
    !selectedImageBox &&
    !selectedTextBoxBox
  ) {
    for (const paragraph of snapshot.paragraphs) {
      const selectedRange = getParagraphSelectionRange(
        paragraph.paragraphId,
        paragraphIndexById,
        normalized,
      );
      if (!selectedRange) continue;
      const paragraphSelectionStart = Math.max(
        selectedRange.start,
        paragraph.startOffset,
      );
      const paragraphSelectionEnd = Math.min(
        selectedRange.end,
        paragraph.endOffset,
      );
      if (paragraphSelectionStart >= paragraphSelectionEnd) continue;

      for (const line of paragraph.lines) {
        let lineStart = Math.max(paragraphSelectionStart, line.startOffset);
        let lineEnd = Math.min(paragraphSelectionEnd, line.endOffset);
        while (
          lineStart < lineEnd &&
          isSelectionEdgeWhitespace(
            getParagraphTextAtOffset(paragraph, lineStart),
          )
        ) {
          lineStart += 1;
        }
        while (
          lineEnd > lineStart &&
          isSelectionEdgeWhitespace(
            getParagraphTextAtOffset(paragraph, lineEnd - 1),
          )
        ) {
          lineEnd -= 1;
        }
        if (lineStart >= lineEnd) continue;

        const startSlot = line.slots.find((slot): boolean => slot.offset === lineStart);
        const endSlot =
          line.slots.find((slot): boolean => slot.offset === lineEnd) ??
          line.slots[line.slots.length - 1];
        if (!startSlot || !endSlot) continue;
        const shouldIncludeSpacingBefore =
          paragraph.startOffset === 0 &&
          line.startOffset === paragraph.startOffset &&
          line.top > paragraph.top;
        const boxTop = shouldIncludeSpacingBefore ? paragraph.top : line.top;
        const boxHeight = shouldIncludeSpacingBefore
          ? line.top + line.height - paragraph.top
          : line.height;

        selectionBoxes.push({
          left:
            startSlot.left -
            surfaceRect.left +
            TEXT_SELECTION_LEADING_BEARING_INSET_PX,
          top: boxTop - surfaceRect.top,
          width: Math.max(
            1,
            endSlot.left -
              startSlot.left +
              TEXT_SELECTION_ANTIALIAS_OVERSCAN_PX -
              TEXT_SELECTION_LEADING_BEARING_INSET_PX,
          ),
          height: boxHeight,
        });
      }
    }
  }

  const focusParagraphId = state.selection.focus.paragraphId;
  const focusParagraphSegments =
    snapshot.paragraphsById.get(focusParagraphId) ?? [];
  const focusParagraphNode = focusParagraphSegments[0]?.paragraph;
  const focusOffset = focusParagraphNode
    ? positionToParagraphOffset(focusParagraphNode, state.selection.focus)
    : state.selection.focus.offset;
  const caret = resolveCaretSlot(focusParagraphSegments, focusOffset);
  const caretLeft = (caret?.left ?? surfaceRect.left) - surfaceRect.left;
  const caretTop = (caret?.top ?? surfaceRect.top) - surfaceRect.top;
  const caretHeight = Math.max(18, caret?.height ?? 28);

  const caretBox: CaretBox = {
    left: caretLeft,
    top: caretTop,
    height: caretHeight,
    visible:
      focusParagraphSegments.length > 0 &&
      !isMultiCellSelection &&
      !selectedImageBox &&
      !selectedTextBoxBox,
  };

  return {
    selectionBoxes,
    inputBox: { left: caretLeft, top: caretTop, height: caretHeight },
    caretBox,
    selectedImageBox,
    selectedTextBoxBox,
  };
}
