import type { EditorSelection, EditorState } from "../model.js";
import {
  getParagraphLength,
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
} from "../model.js";
import {
  clampPosition,
  isSelectionCollapsed,
  normalizeSelection,
} from "../selection.js";
import {
  collapseToBoundary,
  getFocusParagraph,
  withSelection,
  moveVertical,
  moveFocusHorizontally,
  moveFocusVertical,
} from "./utils.js";

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
  if (offset > 0) {
    return {
      document: state.document,
      selection: withSelection(
        paragraphOffsetToPosition(paragraph, offset - 1),
      ),
    };
  }

  if (index === 0) {
    return state;
  }

  const previousParagraph = paragraphs[index - 1];
  return {
    document: state.document,
    selection: withSelection(
      paragraphOffsetToPosition(
        previousParagraph,
        getParagraphLength(previousParagraph),
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
  if (offset < paragraphLength) {
    return {
      document: state.document,
      selection: withSelection(
        paragraphOffsetToPosition(paragraph, offset + 1),
      ),
    };
  }

  if (index >= paragraphs.length - 1) {
    return state;
  }

  const nextParagraph = paragraphs[index + 1];
  return {
    document: state.document,
    selection: withSelection(paragraphOffsetToPosition(nextParagraph, 0)),
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
