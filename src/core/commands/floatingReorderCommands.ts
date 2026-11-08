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

/** Word's Layering moves, matching WordCraft's `arrange.bringForward`. */
export type ZOrderMove = "front" | "back";

/**
 * True when a floating object (image or text box) is selected. Layering only
 * applies to floating objects (an inline object already sits in the text
 * layer), but Word activates the controls for any selected picture/text box.
 */
export function canReorderSelectedFloatingObject(state: EditorState): boolean {
  const selected = getSelectedObjectRun(
    state,
    (run): boolean => run.kind === "image" || run.kind === "textBox",
  );
  return selected !== null;
}

/**
 * Word's "Bring Forward"/"Send Backward" (WordCraft `arrange.bringForward` /
 * `arrange.sendBackward`): moves the selected image or text box to the front
 * of, or behind, the text layer by toggling the floating `behindDoc` flag. An
 * inline object is floated ("front") as part of the move. A no-op when no
 * image/text box is selected.
 */
export function reorderSelectedFloatingObject(
  state: EditorState,
  move: ZOrderMove,
): EditorState {
  const selected = getSelectedObjectRun(
    state,
    (run): boolean => run.kind === "image" || run.kind === "textBox",
  );
  if (!selected) return state;

  const { paragraphIndex, run: targetRun } = selected;
  const next = (
    floating: EditorImageFloatingLayout | undefined,
  ): EditorImageFloatingLayout => {
    const base: EditorImageFloatingLayout = {
      ...(floating ?? {
        type: "floating",
        allowOverlap: true,
        positionH: { relativeFrom: "column", offset: 0 },
        positionV: { relativeFrom: "paragraph", offset: 0 },
      }),
      type: "floating",
      wrap: "none",
      behindDoc: move === "back",
    };
    return base;
  };

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
              image: { ...run.image, floating: next(run.image.floating) },
            };
          }
          if (run.kind === "textBox") {
            return {
              ...run,
              textBox: { ...run.textBox, floating: next(run.textBox.floating) },
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
