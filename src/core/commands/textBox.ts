import type {
  EditorImageFloatingLayout,
  EditorState,
  EditorTextBoxData,
} from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { EMU_PER_PX } from "@/core/units.js";
import { normalizeSelection } from "@/core/selection.js";
import { cloneParagraph, cloneRun } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import {
  getSelectedObjectRun,
  type SelectedObjectRun,
} from "./selectedObjectRun.js";
import {
  applyMoveWithText,
  floatingToWrapPreset,
  isFloatingFixedPosition,
  wrapPresetToFloating,
  type WrapPreset,
} from "./floatingLayout.js";

/** Minimum size (px) a text box may shrink to — matches image resize. */
const MIN_TEXT_BOX_SIZE_PX = 24;

export type SelectedTextBoxRun = SelectedObjectRun;

export function getSelectedTextBoxRun(
  state: EditorState,
): SelectedTextBoxRun | null {
  return getSelectedObjectRun(state, (run) => Boolean(run.textBox));
}

export interface ResizeTextBoxOptions {
  /**
   * The handle that was dragged (one of the 8 compass directions). Determines
   * which edges move: a west/north drag must shift the floating anchor offset so
   * the opposite (east/south) edge stays fixed, and a height-changing drag
   * disables auto-fit so the manual height sticks.
   */
  handleDirection?: string;
}

/**
 * For a floating text box, keep the edge opposite the dragged handle fixed by
 * shifting the anchor offset. The rendered top-left is `base + emuToPx(offset)`,
 * so growing the box from the west/north means decreasing the offset by the
 * size delta (in EMU). Only applies to offset-based positions: when an axis is
 * `align`-anchored, the alignment already fixes an edge, so the offset is left
 * untouched.
 */
function shiftFloatingForResize(
  floating: EditorImageFloatingLayout,
  widthDelta: number,
  heightDelta: number,
  growsFromWest: boolean,
  growsFromNorth: boolean,
): EditorImageFloatingLayout {
  let next = floating;

  if (growsFromWest && widthDelta !== 0) {
    const h = floating.positionH;
    if (!h?.align) {
      next = {
        ...next,
        positionH: {
          ...(h ?? {}),
          offset: (h?.offset ?? 0) - widthDelta * EMU_PER_PX,
        },
      };
    }
  }

  if (growsFromNorth && heightDelta !== 0) {
    const v = next.positionV;
    if (!v?.align) {
      next = {
        ...next,
        positionV: {
          ...(v ?? {}),
          offset: (v?.offset ?? 0) - heightDelta * EMU_PER_PX,
        },
      };
    }
  }

  return next;
}

/** Normalize an angle to the [0, 360) range; `0` collapses to `undefined`. */
function normalizeRotation(rotation: number): number | undefined {
  if (!Number.isFinite(rotation)) {
    return undefined;
  }
  const normalized = ((Math.round(rotation) % 360) + 360) % 360;
  return normalized === 0 ? undefined : normalized;
}

export function rotateSelectedTextBox(
  state: EditorState,
  rotation: number,
): EditorState {
  const selected = getSelectedTextBoxRun(state);
  if (!selected || !selected.run.textBox) {
    return state;
  }

  const nextRotation = normalizeRotation(rotation);
  const { paragraphIndex, run: targetRun } = selected;

  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((candidate, candidateIndex) => {
    if (candidateIndex !== paragraphIndex) {
      return cloneParagraph(candidate);
    }

    return {
      ...cloneParagraph(candidate),
      runs: candidate.runs.map((run) =>
        run.id === targetRun.id && run.textBox
          ? {
              ...run,
              textBox: { ...run.textBox, rotation: nextRotation },
            }
          : cloneRun(run),
      ),
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(
      nextParagraphs,
      normalizeSelection(state),
    ),
  );
}

export function getSelectedTextBoxWrapPreset(
  state: EditorState,
): WrapPreset | null {
  const selected = getSelectedTextBoxRun(state);
  if (!selected?.run.textBox) {
    return null;
  }
  return floatingToWrapPreset(selected.run.textBox.floating);
}

export function isSelectedTextBoxFixedPosition(state: EditorState): boolean {
  const selected = getSelectedTextBoxRun(state);
  return isFloatingFixedPosition(selected?.run.textBox?.floating);
}

/** Patches the selected text box's `floating` field (or removes it for inline). */
function patchSelectedTextBoxFloating(
  state: EditorState,
  next: (
    floating: EditorTextBoxData["floating"],
  ) => EditorTextBoxData["floating"],
): EditorState {
  const selected = getSelectedTextBoxRun(state);
  if (!selected?.run.textBox) {
    return state;
  }

  const { paragraphIndex, run: targetRun } = selected;
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((candidate, candidateIndex) => {
    if (candidateIndex !== paragraphIndex) {
      return cloneParagraph(candidate);
    }

    return {
      ...cloneParagraph(candidate),
      runs: candidate.runs.map((run) => {
        if (run.id !== targetRun.id || !run.textBox) {
          return cloneRun(run);
        }
        const floating = next(run.textBox.floating);
        const textBox: EditorTextBoxData = { ...run.textBox };
        if (floating) {
          textBox.floating = floating;
        } else {
          delete textBox.floating;
        }
        return { ...run, textBox };
      }),
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(
      nextParagraphs,
      normalizeSelection(state),
    ),
  );
}

export function setSelectedTextBoxWrapPreset(
  state: EditorState,
  preset: WrapPreset,
): EditorState {
  return patchSelectedTextBoxFloating(state, (floating) =>
    wrapPresetToFloating(floating, preset),
  );
}

export function setSelectedTextBoxFixedPosition(
  state: EditorState,
  fixed: boolean,
): EditorState {
  return patchSelectedTextBoxFloating(state, (floating) =>
    floating ? applyMoveWithText(floating, fixed) : floating,
  );
}

export function resizeSelectedTextBox(
  state: EditorState,
  width: number,
  height: number,
  options: ResizeTextBoxOptions = {},
): EditorState {
  const selected = getSelectedTextBoxRun(state);
  if (!selected || !selected.run.textBox) {
    return state;
  }

  const direction = options.handleDirection ?? "se";
  const changesHeight = direction.includes("n") || direction.includes("s");
  const growsFromWest = direction.includes("w");
  const growsFromNorth = direction.includes("n");

  const nextWidth = Math.max(MIN_TEXT_BOX_SIZE_PX, Math.round(width));
  const nextHeight = Math.max(MIN_TEXT_BOX_SIZE_PX, Math.round(height));

  const { paragraphIndex, run: targetRun } = selected;
  const widthDelta = nextWidth - selected.run.textBox.width;
  const heightDelta = nextHeight - selected.run.textBox.height;

  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((candidate, candidateIndex) => {
    if (candidateIndex !== paragraphIndex) {
      return cloneParagraph(candidate);
    }

    return {
      ...cloneParagraph(candidate),
      runs: candidate.runs.map((run) => {
        if (run.id !== targetRun.id || !run.textBox) {
          return cloneRun(run);
        }

        const textBox = run.textBox;
        const nextTextBox: EditorTextBoxData = {
          ...textBox,
          width: nextWidth,
          height: nextHeight,
        };

        if (changesHeight && textBox.body?.autoFit) {
          nextTextBox.body = { ...textBox.body, autoFit: false };
        }

        if (textBox.floating) {
          nextTextBox.floating = shiftFloatingForResize(
            textBox.floating,
            widthDelta,
            heightDelta,
            growsFromWest,
            growsFromNorth,
          );
        }

        return { ...run, textBox: nextTextBox };
      }),
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(
      nextParagraphs,
      normalizeSelection(state),
    ),
  );
}
