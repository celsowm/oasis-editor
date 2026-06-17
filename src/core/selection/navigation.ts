import type { EditorSelection, EditorState } from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
} from "@/core/model.js";
import {
  clampPosition,
  findParagraphIndex,
  isSelectionCollapsed,
} from "@/core/selection.js";
import {
  collapseToBoundary,
  getFocusParagraph,
  withSelection,
} from "./rangeEditing.js";

function setStateSelection(
  state: EditorState,
  selection: EditorSelection,
): EditorState {
  return {
    document: state.document,
    selection,
  };
}

export function moveVertical(state: EditorState, delta: -1 | 1): EditorState {
  if (!isSelectionCollapsed(state.selection)) {
    return collapseToBoundary(state, delta < 0 ? "start" : "end");
  }

  const { index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);
  const nextIndex = index + delta;

  if (nextIndex < 0 || nextIndex >= paragraphs.length) {
    return state;
  }

  const nextParagraph = paragraphs[nextIndex];
  return setStateSelection(
    state,
    withSelection(
      paragraphOffsetToPosition(
        nextParagraph,
        Math.min(offset, getParagraphLength(nextParagraph)),
      ),
    ),
  );
}

export function moveFocusHorizontally(
  state: EditorState,
  delta: -1 | 1,
): EditorState {
  const focus = clampPosition(state, state.selection.focus);
  const paragraphs = getParagraphs(state);
  const index = findParagraphIndex(paragraphs, focus.paragraphId);
  const paragraph = paragraphs[index];
  const paragraphOffset = positionToParagraphOffset(paragraph, focus);
  const paragraphLength = getParagraphLength(paragraph);

  if (delta < 0 && paragraphOffset > 0) {
    return setStateSelection(state, {
      anchor: state.selection.anchor,
      focus: paragraphOffsetToPosition(paragraph, paragraphOffset - 1),
    });
  }

  if (delta > 0 && paragraphOffset < paragraphLength) {
    return setStateSelection(state, {
      anchor: state.selection.anchor,
      focus: paragraphOffsetToPosition(paragraph, paragraphOffset + 1),
    });
  }

  if (delta < 0 && index > 0) {
    const previousParagraph = paragraphs[index - 1];
    return setStateSelection(state, {
      anchor: state.selection.anchor,
      focus: paragraphOffsetToPosition(
        previousParagraph,
        getParagraphLength(previousParagraph),
      ),
    });
  }

  if (delta > 0 && index < paragraphs.length - 1) {
    const nextParagraph = paragraphs[index + 1];
    return setStateSelection(state, {
      anchor: state.selection.anchor,
      focus: paragraphOffsetToPosition(nextParagraph, 0),
    });
  }

  return state;
}

export function moveFocusVertical(
  state: EditorState,
  delta: -1 | 1,
): EditorState {
  const focus = clampPosition(state, state.selection.focus);
  const paragraphs = getParagraphs(state);
  const index = findParagraphIndex(paragraphs, focus.paragraphId);
  const paragraph = paragraphs[index];
  const paragraphOffset = positionToParagraphOffset(paragraph, focus);
  const nextIndex = index + delta;

  if (nextIndex < 0 || nextIndex >= paragraphs.length) {
    return state;
  }

  const nextParagraph = paragraphs[nextIndex];
  return setStateSelection(state, {
    anchor: state.selection.anchor,
    focus: paragraphOffsetToPosition(
      nextParagraph,
      Math.min(paragraphOffset, getParagraphLength(nextParagraph)),
    ),
  });
}
