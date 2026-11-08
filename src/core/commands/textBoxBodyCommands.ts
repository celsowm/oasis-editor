import type {
  EditorParagraphNode,
  EditorState,
  EditorTextBoxBody,
  EditorTextBoxData,
  EditorTextRun,
} from "@/core/model.js";
import { getParagraphs, getRunTextBox } from "@/core/model.js";
import { PX_PER_CM } from "@/core/units.js";
import { normalizeSelection } from "@/core/selection.js";
import { cloneParagraph, cloneRun } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { getSelectedTextBoxRun } from "./textBox.js";

/** TextBox sizes never collapse below this many px (mirrors textBox.ts). */
const MIN_TEXT_BOX_SIZE_PX = 24;

/** The text-direction (flow) values WordCraft's `shape.textDirection` accepts. */
export type TextBoxTextDirection = "horz" | "vert" | "vert270" | "wordArtVert";

/** The vertical-alignment values WordCraft's `shape.alignText` accepts. */
export type TextBoxVerticalAlign = "t" | "ctr" | "b";

/** True when a text box is selected and its body can be styled. */
export function canStyleSelectedTextBox(state: EditorState): boolean {
  return getSelectedTextBoxRun(state) !== null;
}

/** The displayed size of the selected text box in centimetres, or `null`. */
export function getSelectedTextBoxSizeCm(
  state: EditorState,
): { width: number; height: number } | null {
  const selected = getSelectedTextBoxRun(state);
  const textBox = selected && getRunTextBox(selected.run);
  if (!textBox) return null;
  return {
    width: textBox.width / PX_PER_CM,
    height: textBox.height / PX_PER_CM,
  };
}

/** Set the selected text box width (cm), keeping its height. */
export function setSelectedTextBoxWidthCm(
  state: EditorState,
  cm: number,
): EditorState {
  return patchSelectedTextBoxData(state, (textBox) => ({
    ...textBox,
    width: Math.max(MIN_TEXT_BOX_SIZE_PX, Math.round(cm * PX_PER_CM)),
  }));
}

/** Set the selected text box height (cm), keeping its width. */
export function setSelectedTextBoxHeightCm(
  state: EditorState,
  cm: number,
): EditorState {
  return patchSelectedTextBoxData(state, (textBox) => ({
    ...textBox,
    height: Math.max(MIN_TEXT_BOX_SIZE_PX, Math.round(cm * PX_PER_CM)),
  }));
}

/** Normalize an angle to the [0, 360) range; `0` collapses to `undefined`. */
function normalizeRotation(rotation: number): number | undefined {
  if (!Number.isFinite(rotation)) return undefined;
  const normalized = ((Math.round(rotation) % 360) + 360) % 360;
  return normalized === 0 ? undefined : normalized;
}

/** The current alt text of the selected text box, or `null` when none. */
export function getSelectedTextBoxAlt(state: EditorState): string | null {
  const selected = getSelectedTextBoxRun(state);
  const textBox = selected && getRunTextBox(selected.run);
  return textBox?.alt ?? null;
}

/**
 * Word's "Alt Text" (WordCraft `object.altText`): sets the accessibility
 * description of the selected text box. `null` clears it. A no-op when no text
 * box is selected.
 */
export function setSelectedTextBoxAlt(
  state: EditorState,
  alt: string | null,
): EditorState {
  return patchSelectedTextBoxData(state, (textBox) => ({
    ...textBox,
    alt: alt ?? undefined,
  }));
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

/**
 * Word's "Rotate Left/Right" (WordCraft `arrange.rotate`): rotates the selected
 * text box by a fixed clockwise/counter-clockwise step, using the same
 * counter-clockwise-positive rotation convention as the shape model. A no-op
 * when no text box is selected.
 */
export function rotateSelectedTextBoxByStep(
  state: EditorState,
  direction: "left" | "right",
  stepDegrees = 90,
): EditorState {
  return patchSelectedTextBoxData(state, (textBox) => {
    const delta = direction === "right" ? -stepDegrees : stepDegrees;
    const nextRotation = normalizeRotation((textBox.rotation ?? 0) + delta);
    return { ...textBox, rotation: nextRotation };
  });
}

/** Applies `updater` to the selected text box run's data. */
function patchSelectedTextBoxData(
  state: EditorState,
  updater: (textBox: EditorTextBoxData) => EditorTextBoxData,
): EditorState {
  const selected = getSelectedTextBoxRun(state);
  if (!selected || !getRunTextBox(selected.run)) return state;

  const { paragraphIndex, run: targetRun } = selected;
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map(
    (candidate, candidateIndex): EditorParagraphNode => {
      if (candidateIndex !== paragraphIndex) return cloneParagraph(candidate);
      return {
        ...cloneParagraph(candidate),
        runs: candidate.runs.map((run): EditorTextRun =>
          run.id === targetRun.id && run.kind === "textBox"
            ? { ...run, textBox: updater(run.textBox) }
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

/** Applies `updater` to the text box body of the selected shape run. */
function patchSelectedTextBoxBody(
  state: EditorState,
  updater: (body: EditorTextBoxBody) => EditorTextBoxBody,
): EditorState {
  return patchSelectedTextBoxData(state, (textBox) => ({
    ...textBox,
    body: updater(textBox.body ?? {}),
  }));
}
