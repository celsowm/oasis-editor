import type { EditorState, EditorTextBoxData, EditorParagraphNode } from "@/core/model.js";
import { wrapPresetToFloating } from "./floatingLayout.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import {
  createEditorParagraph,
  createEditorStyledRun,
} from "@/core/editorState.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import {
  getStyleAtOffset,
  insertRunsAtOffset,
} from "@/core/document/paragraphRuns.js";
import { cloneParagraph } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import {
  deleteSelectionRange,
  getFocusParagraph,
  withSelection,
} from "@/core/selection/rangeEditing.js";

const SHAPE_DEFAULT_WIDTH = 150;
const SHAPE_DEFAULT_HEIGHT = 100;
const SHAPE_DEFAULT_FILL = "#4472C4";
const SHAPE_DEFAULT_BORDER_COLOR = "#2F528F";
const SHAPE_DEFAULT_BORDER_WIDTH_PT = 1;

/**
 * Inserts a basic shape (`wps:wsp` with preset geometry) at the current
 * selection. Modeled as an inline run carrying an {@link EditorTextBoxData}
 * with an empty paragraph body, floating "in front of text" by default — the
 * same anchoring Word applies to a freshly inserted shape.
 */
export function insertShapeAtSelection(
  state: EditorState,
  preset: string,
): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);

  const textBox: EditorTextBoxData = {
    width: SHAPE_DEFAULT_WIDTH,
    height: SHAPE_DEFAULT_HEIGHT,
    blocks: [createEditorParagraph("")],
    shape: {
      preset,
      fill: SHAPE_DEFAULT_FILL,
      borderColor: SHAPE_DEFAULT_BORDER_COLOR,
      borderWidthPt: SHAPE_DEFAULT_BORDER_WIDTH_PT,
    },
    floating: wrapPresetToFloating(undefined, "front"),
  };

  const insertedRun = createEditorStyledRun(
    "￼",
    getStyleAtOffset(paragraph, offset),
    undefined,
    textBox,
  );
  const nextParagraph = insertRunsAtOffset(paragraph, offset, [insertedRun]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = paragraphs.map((candidate, candidateIndex): EditorParagraphNode =>
    candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
  );

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, offset + 1)),
  );
}
