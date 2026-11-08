import type {
  EditorParagraphNode,
  EditorState,
  EditorTextRun,
  EditorTextBoxShape,
} from "@/core/model.js";
import { getParagraphs, getRunTextBox } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { cloneParagraph, cloneRun } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { getSelectedTextBoxRun } from "./textBox.js";

/**
 * True when a shape (text box) is selected and can be re-filled / re-outlined.
 */
export function canStyleSelectedShape(state: EditorState): boolean {
  return getSelectedTextBoxRun(state) !== null;
}

/** The current appearance of the selected shape, or `null` when none. */
export function getSelectedShapeAppearance(
  state: EditorState,
): EditorTextBoxShape | null {
  const selected = getSelectedTextBoxRun(state);
  const textBox = selected && getRunTextBox(selected.run);
  return textBox?.shape ?? null;
}

/**
 * Word's "Shape Fill" / "Shape Outline": patches the selected shape's solid
 * fill or outline. `{ fill: null }` clears the fill (transparent); `{ fill:
 * "#RRGGBB" }` applies a solid color. A no-op when no shape is selected.
 */
export function setSelectedShapeFill(
  state: EditorState,
  fill: string | null,
): EditorState {
  return patchSelectedShape(state, (shape) => ({
    ...shape,
    fill: fill ?? undefined,
  }));
}

/**
 * Word's "Shape Outline": patches the selected shape's outline color.
 * `{ borderColor: null }` removes the outline. A no-op when no shape is
 * selected.
 */
export function setSelectedShapeOutline(
  state: EditorState,
  borderColor: string | null,
): EditorState {
  return patchSelectedShape(state, (shape) => ({
    ...shape,
    borderColor: borderColor ?? undefined,
  }));
}

/** Applies `updater` to the shape appearance of the selected shape run. */
function patchSelectedShape(
  state: EditorState,
  updater: (shape: EditorTextBoxShape) => EditorTextBoxShape,
): EditorState {
  const selected = getSelectedTextBoxRun(state);
  const textBox = selected && getRunTextBox(selected.run);
  if (!selected || !textBox) {
    return state;
  }

  const { paragraphIndex, run: targetRun } = selected;
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map(
    (candidate, candidateIndex): EditorParagraphNode => {
      if (candidateIndex !== paragraphIndex) {
        return cloneParagraph(candidate);
      }
      return {
        ...cloneParagraph(candidate),
        runs: candidate.runs.map((run): EditorTextRun =>
          run.id === targetRun.id && run.kind === "textBox"
            ? {
                ...run,
                textBox: {
                  ...run.textBox,
                  shape: updater(run.textBox.shape ?? {}),
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
