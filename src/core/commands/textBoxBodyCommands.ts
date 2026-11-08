import type {
  EditorParagraphNode,
  EditorState,
  EditorTextBoxBody,
  EditorTextRun,
} from "@/core/model.js";
import { getParagraphs, getRunTextBox } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { cloneParagraph, cloneRun } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { getSelectedTextBoxRun } from "./textBox.js";

/** The text-direction (flow) values WordCraft's `shape.textDirection` accepts. */
export type TextBoxTextDirection = "horz" | "vert" | "vert270" | "wordArtVert";

/** The vertical-alignment values WordCraft's `shape.alignText` accepts. */
export type TextBoxVerticalAlign = "t" | "ctr" | "b";

/** True when a text box is selected and its body can be styled. */
export function canStyleSelectedTextBox(state: EditorState): boolean {
  return getSelectedTextBoxRun(state) !== null;
}

/**
 * Word's "Text Direction" (WordCraft `shape.textDirection`): sets the flow of
 * the selected text box's text (horizontal, 90° up, 270°, or stacked
 * word-art). A no-op when no text box is selected.
 */
export function setSelectedTextBoxTextDirection(
  state: EditorState,
  dir: TextBoxTextDirection,
): EditorState {
  const mapped: EditorTextBoxBody["vert"] =
    dir === "horz"
      ? "horz"
      : dir === "vert"
        ? "vert"
        : dir === "vert270"
          ? "vert270"
          : "wordArtVert";
  return patchSelectedTextBoxBody(state, (body) => ({
    ...body,
    vert: mapped,
  }));
}

/**
 * Word's "Align Text" (WordCraft `shape.alignText`): sets the vertical anchor
 * of the selected text box's text (top, middle, or bottom). A no-op when no
 * text box is selected.
 */
export function setSelectedTextBoxVerticalAlign(
  state: EditorState,
  anchor: TextBoxVerticalAlign,
): EditorState {
  const mapped = anchor === "b" ? "b" : anchor === "ctr" ? "ctr" : "t";
  return patchSelectedTextBoxBody(state, (body) => ({
    ...body,
    anchor: mapped,
  }));
}

/** Applies `updater` to the text box body of the selected shape run. */
function patchSelectedTextBoxBody(
  state: EditorState,
  updater: (body: EditorTextBoxBody) => EditorTextBoxBody,
): EditorState {
  const selected = getSelectedTextBoxRun(state);
  const textBox = selected && getRunTextBox(selected.run);
  if (!selected || !textBox) return state;

  const { paragraphIndex, run: targetRun } = selected;
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map(
    (candidate, candidateIndex): EditorParagraphNode => {
      if (candidateIndex !== paragraphIndex) return cloneParagraph(candidate);
      return {
        ...cloneParagraph(candidate),
        runs: candidate.runs.map((run): EditorTextRun =>
          run.id === targetRun.id && run.kind === "textBox"
            ? {
                ...run,
                textBox: {
                  ...run.textBox,
                  body: updater(run.textBox.body ?? {}),
                },
              }
            : cloneRun(run),
        ),
      };
    },
  );

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(
      nextParagraphs,
      normalizeSelection(state),
    ),
  );
}
