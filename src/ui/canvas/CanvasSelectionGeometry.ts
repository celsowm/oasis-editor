import { normalizeSelection } from "../../core/selection.js";
import { positionToParagraphOffset, type EditorState } from "../../core/model.js";
import type { CaretBox, InputBox, SelectionBox } from "../editorUiTypes.js";
import type { CanvasLayoutSnapshot, CanvasSnapshotParagraph } from "./CanvasLayoutSnapshot.js";

export interface CanvasSelectionGeometryResult {
  selectionBoxes: SelectionBox[];
  caretBox: CaretBox;
  inputBox: InputBox;
}

function getParagraphSelectionRange(
  paragraphId: string,
  paragraphIndex: number,
  normalized: ReturnType<typeof normalizeSelection>,
): { start: number; end: number } | null {
  if (normalized.isCollapsed) {
    return null;
  }
  if (paragraphIndex < normalized.startIndex || paragraphIndex > normalized.endIndex) {
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
      (paragraph) => focusOffset >= paragraph.startOffset && focusOffset <= paragraph.endOffset,
    ) ?? paragraphs[paragraphs.length - 1]!;
  const slots = containingSegment.lines.flatMap((line) => line.slots);
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

  if (!normalized.isCollapsed) {
    for (const paragraph of snapshot.paragraphs) {
      const selectedRange = getParagraphSelectionRange(
        paragraph.paragraphId,
        paragraph.paragraphIndex,
        normalized,
      );
      if (!selectedRange) continue;
      const paragraphSelectionStart = Math.max(selectedRange.start, paragraph.startOffset);
      const paragraphSelectionEnd = Math.min(selectedRange.end, paragraph.endOffset);
      if (paragraphSelectionStart >= paragraphSelectionEnd) continue;

      for (const line of paragraph.lines) {
        const lineStart = Math.max(paragraphSelectionStart, line.startOffset);
        const lineEnd = Math.min(paragraphSelectionEnd, line.endOffset);
        if (lineStart >= lineEnd) continue;

        const startSlot = line.slots.find((slot) => slot.offset === lineStart);
        const endSlot =
          line.slots.find((slot) => slot.offset === lineEnd) ??
          line.slots[line.slots.length - 1];
        if (!startSlot || !endSlot) continue;

        selectionBoxes.push({
          left: startSlot.left - surfaceRect.left,
          top: line.top - surfaceRect.top,
          width: Math.max(1, endSlot.left - startSlot.left),
          height: line.height,
        });
      }
    }
  }

  const focusParagraphId = state.selection.focus.paragraphId;
  const focusParagraphSegments = snapshot.paragraphsById.get(focusParagraphId) ?? [];
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
    visible: focusParagraphSegments.length > 0,
  };

  return {
    selectionBoxes,
    inputBox: { left: caretLeft, top: caretTop, height: caretHeight },
    caretBox,
  };
}

