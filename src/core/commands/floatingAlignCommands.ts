import type {
  EditorImageFloatingLayout,
  EditorParagraphNode,
  EditorState,
  EditorTextRun,
} from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { EMU_PER_PX } from "@/core/units.js";
import { normalizeSelection } from "@/core/selection.js";
import { cloneParagraph, cloneRun } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { getSelectedObjectRun } from "./selectedObjectRun.js";
import {
  applyMoveWithText,
  isFloatingFixedPosition,
} from "./floatingLayout.js";

/** The horizontal alignment presets WordCraft's `arrange.align` accepts. */
export type FloatingObjectAlign = "left" | "center" | "right";

/**
 * True when a floating object (image or text box) is selected. Inline objects
 * become floatable on align (Word pulls them square-wrapped), so simply having
 * an image/text box selected is enough.
 */
export function canAlignSelectedFloatingObject(state: EditorState): boolean {
  const selected = getSelectedObjectRun(
    state,
    (run): boolean => run.kind === "image" || run.kind === "textBox",
  );
  return selected !== null;
}

/**
 * True when a floating object (image or text box) is selected and can be
 * nudged. Inline objects are implicitly floated on nudge (Word turns them
 * square-wrapped and moves them relative to the paragraph).
 */
export function canNudgeSelectedFloatingObject(state: EditorState): boolean {
  const selected = getSelectedObjectRun(
    state,
    (run): boolean => run.kind === "image" || run.kind === "textBox",
  );
  return selected !== null;
}

/**
 * Word's "Nudge" (WordCraft `arrange.nudge`): moves the selected image/text box
 * by a pixel delta, shifting the floating horizontal/vertical anchor offsets.
 * Any horizontal alignment is cleared so the offset is honoured (matching
 * WordCraft's unalign). An inline object is floated (square wrap) as part of
 * the move. A no-op when no image/text box is selected.
 */
export function nudgeSelectedFloatingObject(
  state: EditorState,
  dxPx: number,
  dyPx: number,
): EditorState {
  const selected = getSelectedObjectRun(
    state,
    (run): boolean => run.kind === "image" || run.kind === "textBox",
  );
  if (!selected) return state;

  const { paragraphIndex, run: targetRun } = selected;
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map(
    (candidate, candidateIndex): EditorParagraphNode => {
      if (candidateIndex !== paragraphIndex) return cloneParagraph(candidate);
      return {
        ...cloneParagraph(candidate),
        runs: candidate.runs.map((run): EditorTextRun => {
          if (run.id !== targetRun.id) return cloneRun(run);
          if (run.kind === "image") {
            return {
              ...run,
              image: {
                ...run.image,
                floating: patchNudge(run.image.floating, dxPx, dyPx),
              },
            };
          }
          if (run.kind === "textBox") {
            return {
              ...run,
              textBox: {
                ...run.textBox,
                floating: patchNudge(run.textBox.floating, dxPx, dyPx),
              },
            };
          }
          return cloneRun(run);
        }),
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

/**
 * Word's "Position"/"Align" for a floating object: pins the selected image or
 * text box horizontally to the left/center/right of the margin by setting the
 * horizontal anchor's alignment. An inline object is floated ("square" wrap)
 * as part of the alignment. A no-op when no image/text box is selected.
 */
export function alignSelectedFloatingObject(
  state: EditorState,
  align: FloatingObjectAlign,
): EditorState {
  const selected = getSelectedObjectRun(
    state,
    (run): boolean => run.kind === "image" || run.kind === "textBox",
  );
  if (!selected) return state;

  const { paragraphIndex, run: targetRun } = selected;
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map(
    (candidate, candidateIndex): EditorParagraphNode => {
      if (candidateIndex !== paragraphIndex) return cloneParagraph(candidate);
      return {
        ...cloneParagraph(candidate),
        runs: candidate.runs.map((run): EditorTextRun => {
          if (run.id !== targetRun.id) return cloneRun(run);
          if (run.kind === "image") {
            return {
              ...run,
              image: {
                ...run.image,
                floating: patchFloating(run.image.floating, align),
              },
            };
          }
          if (run.kind === "textBox") {
            return {
              ...run,
              textBox: {
                ...run.textBox,
                floating: patchFloating(run.textBox.floating, align),
              },
            };
          }
          return cloneRun(run);
        }),
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

/**
 * Builds the next floating layout: promotes an inline object to a square-wrapped
 * floating object, anchors the horizontal position to the margin and sets the
 * requested alignment at a zero offset.
 */
function patchFloating(
  floating: EditorImageFloatingLayout | undefined,
  align: FloatingObjectAlign,
): EditorImageFloatingLayout {
  return {
    ...(floating ?? {
      type: "floating",
      allowOverlap: true,
      positionV: { relativeFrom: "paragraph", offset: 0 },
    }),
    type: "floating",
    wrap:
      floating?.wrap === "none" ? floating.wrap : (floating?.wrap ?? "square"),
    behindDoc: floating?.behindDoc,
    positionH: {
      relativeFrom: "margin",
      align,
      offset: 0,
    },
  };
}

/**
 * Builds the next floating layout for a nudge: floats an inline object
 * (square wrap), clears any horizontal alignment so the offset applies, and
 * shifts the horizontal/vertical offsets by the pixel delta (converted to
 * EMU). Missing position anchors default to column/paragraph.
 */
function patchNudge(
  floating: EditorImageFloatingLayout | undefined,
  dxPx: number,
  dyPx: number,
): EditorImageFloatingLayout {
  const base: EditorImageFloatingLayout = {
    ...(floating ?? {
      type: "floating",
      allowOverlap: true,
      positionH: { relativeFrom: "column", offset: 0 },
      positionV: { relativeFrom: "paragraph", offset: 0 },
    }),
    type: "floating",
  };

  const h = base.positionH ?? {};
  const v = base.positionV ?? {};
  return {
    ...base,
    wrap: base.wrap === "none" ? base.wrap : (base.wrap ?? "square"),
    positionH: {
      ...h,
      offset: (h.offset ?? 0) + Math.round(dxPx * EMU_PER_PX),
      align: undefined,
    },
    positionV: {
      ...v,
      offset: (v.offset ?? 0) + Math.round(dyPx * EMU_PER_PX),
    },
  };
}

/**
 * True when a floating object (image or text box) is selected and can be
 * pinned to the page / moved with text.
 */
export function canSetSelectedFloatingFixedPosition(
  state: EditorState,
): boolean {
  const selected = getSelectedObjectRun(
    state,
    (run): boolean => run.kind === "image" || run.kind === "textBox",
  );
  return selected !== null;
}

/** True when the selected floating object is pinned to the page. */
export function isSelectedFloatingFixedPosition(state: EditorState): boolean {
  const selected = getSelectedObjectRun(
    state,
    (run): boolean => run.kind === "image" || run.kind === "textBox",
  );
  if (!selected) return false;
  if (selected.run.kind === "image") {
    return isFloatingFixedPosition(selected.run.image.floating);
  }
  if (selected.run.kind === "textBox") {
    return isFloatingFixedPosition(selected.run.textBox.floating);
  }
  return false;
}

/**
 * Word's "Move with text" / "Fix position on page" (WordCraft
 * `arrange.moveWithText`): sets whether the selected image/text box moves with
 * the text (anchored to the paragraph) or is pinned to the page. Only applies
 * to floating objects; a no-op when none is selected.
 */
export function setSelectedFloatingFixedPosition(
  state: EditorState,
  fixed: boolean,
): EditorState {
  const selected = getSelectedObjectRun(
    state,
    (run): boolean => run.kind === "image" || run.kind === "textBox",
  );
  if (!selected) return state;

  const { paragraphIndex, run: targetRun } = selected;
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map(
    (candidate, candidateIndex): EditorParagraphNode => {
      if (candidateIndex !== paragraphIndex) return cloneParagraph(candidate);
      return {
        ...cloneParagraph(candidate),
        runs: candidate.runs.map((run): EditorTextRun => {
          if (run.id !== targetRun.id) return cloneRun(run);
          if (run.kind === "image") {
            const floating = run.image.floating;
            return {
              ...run,
              image: {
                ...run.image,
                floating: floating
                  ? applyMoveWithText(floating, fixed)
                  : floating,
              },
            };
          }
          if (run.kind === "textBox") {
            const floating = run.textBox.floating;
            return {
              ...run,
              textBox: {
                ...run.textBox,
                floating: floating
                  ? applyMoveWithText(floating, fixed)
                  : floating,
              },
            };
          }
          return cloneRun(run);
        }),
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

/**
 * True when a floating object (image or text box) is selected and can be given
 * an exact rotation.
 */
export function canSetSelectedFloatingRotation(state: EditorState): boolean {
  const selected = getSelectedObjectRun(
    state,
    (run): boolean => run.kind === "image" || run.kind === "textBox",
  );
  return selected !== null;
}

/** Normalize an angle to the [0, 360) range; `0` collapses to `undefined`. */
function normalizeRotationDegrees(rotation: number): number | undefined {
  if (!Number.isFinite(rotation)) return undefined;
  const normalized = ((Math.round(rotation) % 360) + 360) % 360;
  return normalized === 0 ? undefined : normalized;
}

/**
 * WordCraft's `arrange.rotation`: sets the exact angle (degrees, clockwise) of
 * the selected image or text box, normalised to 0–360. A no-op when no
 * floating object is selected.
 */
export function setSelectedFloatingRotation(
  state: EditorState,
  degrees: number,
): EditorState {
  const selected = getSelectedObjectRun(
    state,
    (run): boolean => run.kind === "image" || run.kind === "textBox",
  );
  if (!selected) return state;

  const nextRotation = normalizeRotationDegrees(degrees);
  const { paragraphIndex, run: targetRun } = selected;
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map(
    (candidate, candidateIndex): EditorParagraphNode => {
      if (candidateIndex !== paragraphIndex) return cloneParagraph(candidate);
      return {
        ...cloneParagraph(candidate),
        runs: candidate.runs.map((run): EditorTextRun => {
          if (run.id !== targetRun.id) return cloneRun(run);
          if (run.kind === "image") {
            return { ...run, image: { ...run.image, rotation: nextRotation } };
          }
          if (run.kind === "textBox") {
            return {
              ...run,
              textBox: { ...run.textBox, rotation: nextRotation },
            };
          }
          return cloneRun(run);
        }),
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
