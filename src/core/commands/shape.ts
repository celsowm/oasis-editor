import type {
  EditorState,
  EditorTextBoxData,
  EditorParagraphNode,
} from "@/core/model.js";
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

function shapeColorsForDesign(state: EditorState): {
  fill: string;
  border: string;
} {
  switch (state.document.design?.effectsId) {
    case "flat":
      return { fill: "#e2e8f0", border: "#64748b" };
    case "intense":
      return { fill: "#0f766e", border: "#115e59" };
    case "moderate":
      return { fill: "#5b9bd5", border: "#2f75b5" };
    default:
      return { fill: SHAPE_DEFAULT_FILL, border: SHAPE_DEFAULT_BORDER_COLOR };
  }
}

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
  const shapeColors = shapeColorsForDesign(collapsedState);

  const textBox: EditorTextBoxData = {
    width: SHAPE_DEFAULT_WIDTH,
    height: SHAPE_DEFAULT_HEIGHT,
    blocks: [createEditorParagraph("")],
    shape: {
      preset,
      fill: shapeColors.fill,
      borderColor: shapeColors.border,
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
  const nextParagraphs = paragraphs.map(
    (candidate, candidateIndex): EditorParagraphNode =>
      candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
  );

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, offset + 1)),
  );
}
