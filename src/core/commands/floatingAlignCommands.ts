import type {
  EditorImageFloatingLayout,
  EditorParagraphNode,
  EditorState,
  EditorTextRun,
} from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { cloneParagraph, cloneRun } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { preserveSelectionByParagraphOffsets } from "@/core/selection/rangeEditing.js";
import { getSelectedObjectRun } from "./selectedObjectRun.js";

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
