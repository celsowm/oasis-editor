import type { EditorState, EditorTextRun } from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import {
  sliceRuns,
  getStyleAtOffset,
  buildParagraphFromRuns,
} from "@/core/document/paragraphRuns.js";
import { cloneParagraphs } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import {
  deleteSelectionRange,
  getFocusParagraph,
  withSelection,
} from "@/core/selection/rangeEditing.js";

export function insertFieldAtSelection(
  state: EditorState,
  fieldType: "PAGE" | "NUMPAGES",
): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);

  const beforeRuns = sliceRuns(paragraph, 0, offset);
  const afterRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));

  const fieldRun: EditorTextRun = {
    id: `run:field:${Math.random().toString(36).slice(2, 9)}`,
    text: fieldType === "PAGE" ? "1" : "1", // Placeholder, resolved during projection
    kind: "field",
    field: { type: fieldType },
    styles: getStyleAtOffset(paragraph, offset),
  };

  const nextParagraph = buildParagraphFromRuns(paragraph, [
    ...beforeRuns,
    fieldRun,
    ...afterRuns,
  ]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    nextParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(
      paragraphOffsetToPosition(nextParagraph, offset + fieldRun.text.length),
    ),
  );
}
