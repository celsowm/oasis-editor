import type { EditorSelection, EditorState } from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphs,
  getParagraphText,
  paragraphOffsetToFieldPosition,
  hasFieldBoundaryAtOffset,
} from "@/core/model.js";
import {
  clampPosition,
  isSelectionCollapsed,
  normalizeSelection,
} from "@/core/selection.js";
import {
  collapseToBoundary,
  getFocusParagraph,
  withSelection,
} from "@/core/selection/rangeEditing.js";
import {
  moveVertical,
  moveFocusHorizontally,
  moveFocusVertical,
} from "@/core/selection/navigation.js";

export function getSelectedText(state: EditorState): string {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return "";
  }

  const paragraphs = getParagraphs(state);
  if (normalized.startIndex === normalized.endIndex) {
    const paragraph = paragraphs[normalized.startIndex];
    const text = getParagraphText(paragraph);
    return text.slice(
      normalized.startParagraphOffset,
      normalized.endParagraphOffset,
    );
  }

  const parts: string[] = [];
  const startParagraph = paragraphs[normalized.startIndex];
  const endParagraph = paragraphs[normalized.endIndex];

  parts.push(
    getParagraphText(startParagraph).slice(normalized.startParagraphOffset),
  );
  for (
    let index = normalized.startIndex + 1;
    index < normalized.endIndex;
    index += 1
  ) {
    parts.push(getParagraphText(paragraphs[index]));
  }
  parts.push(
    getParagraphText(endParagraph).slice(0, normalized.endParagraphOffset),
  );

  return parts.join("\n");
}

export function setSelection(
  state: EditorState,
  selection: EditorSelection,
): EditorState {
  return {
    ...state,
    selection: {
      anchor: clampPosition(state, selection.anchor),
      focus: clampPosition(state, selection.focus),
    },
  };
}

export function moveSelectionLeft(state: EditorState): EditorState {
  if (!isSelectionCollapsed(state.selection)) {
    return collapseToBoundary(state, "start");
  }

  const { paragraph, index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);
  if (hasFieldBoundaryAtOffset(paragraph, offset) &&
      state.selection.focus.fieldBoundaryAffinity !== "before-markers") {
    return { ...state, selection: withSelection(paragraphOffsetToFieldPosition(paragraph, offset, "before-markers")) };
  }
  if (offset > 0) {
    return {
      ...state,
      selection: withSelection(
        paragraphOffsetToFieldPosition(paragraph, offset - 1, "after-markers"),
      ),
    };
  }

  if (index === 0) {
    return state;
  }

  const previousParagraph = paragraphs[index - 1];
  return {
    ...state,
    selection: withSelection(
      paragraphOffsetToFieldPosition(
        previousParagraph,
        getParagraphLength(previousParagraph),
        "after-markers",
      ),
    ),
  };
}

export function moveSelectionRight(state: EditorState): EditorState {
  if (!isSelectionCollapsed(state.selection)) {
    return collapseToBoundary(state, "end");
  }

  const { paragraph, index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);
  const paragraphLength = getParagraphLength(paragraph);
  if (hasFieldBoundaryAtOffset(paragraph, offset) &&
      state.selection.focus.fieldBoundaryAffinity !== "after-markers") {
    return { ...state, selection: withSelection(paragraphOffsetToFieldPosition(paragraph, offset, "after-markers")) };
  }
  if (offset < paragraphLength) {
    return {
      ...state,
      selection: withSelection(
        paragraphOffsetToFieldPosition(paragraph, offset + 1, "before-markers"),
      ),
    };
  }

  if (index >= paragraphs.length - 1) {
    return state;
  }

  const nextParagraph = paragraphs[index + 1];
  return {
    ...state,
    selection: withSelection(paragraphOffsetToFieldPosition(nextParagraph, 0, "before-markers")),
  };
}

export function moveSelectionUp(state: EditorState): EditorState {
  return moveVertical(state, -1);
}

export function moveSelectionDown(state: EditorState): EditorState {
  return moveVertical(state, 1);
}

export function extendSelectionLeft(state: EditorState): EditorState {
  return moveFocusHorizontally(state, -1);
}

export function extendSelectionRight(state: EditorState): EditorState {
  return moveFocusHorizontally(state, 1);
}

export function extendSelectionUp(state: EditorState): EditorState {
  return moveFocusVertical(state, -1);
}

export function extendSelectionDown(state: EditorState): EditorState {
  return moveFocusVertical(state, 1);
}
