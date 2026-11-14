import type { EditorState } from "@/core/model.js";
import { collectChangeBarParagraphIds } from "@/core/commands/reviewMarkup.js";
import type { ChangeBarBox } from "@/ui/editorUiTypes.js";
import type { CanvasLayoutSnapshot } from "./CanvasLayoutSnapshot.js";

/** Horizontal offset of the change bar from the left text edge, in CSS px. */
const CHANGE_BAR_GAP = 8;

/**
 * Project Simple Markup change bars into the margin. The snapshot is built from
 * the *projected* (final) layout, whose paragraphs keep the raw document's ids,
 * so we can match the raw revision-bearing paragraph ids against the painted
 * line geometry. One bar per changed paragraph spans its first-to-last line;
 * Word marks by individual line, but paragraph granularity is the scoped
 * delivery here (structural/property revisions are not painted).
 *
 * Show Markup filters live in `collectChangeBarParagraphIds`, so hiding a
 * category or reviewer removes the corresponding bar without touching data.
 */
export function computeChangeBars(
  snapshot: CanvasLayoutSnapshot,
  state: EditorState,
): ChangeBarBox[] {
  const ids = collectChangeBarParagraphIds(state);
  if (ids.size === 0) return [];

  const surfaceRect = snapshot.surfaceRect;
  const boxes: ChangeBarBox[] = [];
  for (const segment of snapshot.paragraphs) {
    if (!ids.has(segment.paragraphId)) continue;
    const lines = segment.lines;
    const top = lines.length
      ? Math.min(...lines.map((line): number => line.top))
      : segment.top;
    const bottom = lines.length
      ? Math.max(...lines.map((line): number => line.top + line.height))
      : segment.top + segment.height;
    boxes.push({
      paragraphId: segment.paragraphId,
      left: segment.left - surfaceRect.left - CHANGE_BAR_GAP,
      top: top - surfaceRect.top,
      height: Math.max(1, bottom - top),
    });
  }
  return boxes;
}

export type { ChangeBarBox };
