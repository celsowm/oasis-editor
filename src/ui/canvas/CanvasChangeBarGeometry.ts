import type { EditorState } from "@/core/model.js";
import { collectChangeBarRanges } from "@/core/commands/reviewMarkup.js";
import type { ChangeBarBox } from "@/ui/editorUiTypes.js";
import type { CanvasLayoutSnapshot } from "./CanvasLayoutSnapshot.js";

/** Fraction of the page's left margin where the change bar sits. */
const CHANGE_BAR_MARGIN_RATIO = 0.5;
/** Fallback inset (CSS px) when a page exposes no measurable left margin. */
const CHANGE_BAR_FALLBACK_INSET = 12;

/**
 * Project Simple Markup change bars into the page margin. The snapshot is built
 * from the *projected* (final) layout, whose paragraphs keep the raw document's
 * ids, so we can match the raw revision-bearing paragraph ids against the
 * painted line geometry. Unlike the earlier paragraph-level bar, one thin bar
 * is emitted per *changed line*: `collectChangeBarRanges` supplies the visible
 * revision extents in final-text offsets, and only lines overlapping them are
 * marked (table/row/cell/grid revisions cover every line of their paragraphs).
 *
 * The horizontal position is a per-page constant derived from the page's left
 * edge and its rendered content boundary, so bars align in the page margin
 * instead of following each paragraph's (or table cell's) own text edge. Show
 * Markup filters live in `collectChangeBarRanges`, so hiding a category or
 * reviewer removes the matching bars without touching data.
 */
export function computeChangeBars(
  snapshot: CanvasLayoutSnapshot,
  state: EditorState,
): ChangeBarBox[] {
  const ranges = collectChangeBarRanges(state);
  if (ranges.size === 0) return [];

  const surfaceRect = snapshot.surfaceRect;
  // One bar x per page: the least-indented body text on that page marks the
  // content boundary; the bar sits partway into the margin before it.
  const contentLeftByPage = new Map<number, number>();
  for (const segment of snapshot.paragraphs) {
    const current = contentLeftByPage.get(segment.pageIndex);
    if (current === undefined || segment.left < current) {
      contentLeftByPage.set(segment.pageIndex, segment.left);
    }
  }
  const barLeftByPage = new Map<number, number>();
  for (const page of snapshot.pages ?? []) {
    const contentLeft = contentLeftByPage.get(page.index);
    const margin = contentLeft === undefined ? 0 : contentLeft - page.left;
    barLeftByPage.set(
      page.index,
      page.left +
        (margin > 0
          ? margin * CHANGE_BAR_MARGIN_RATIO
          : CHANGE_BAR_FALLBACK_INSET) -
        surfaceRect.left,
    );
  }

  const boxes: ChangeBarBox[] = [];
  for (const segment of snapshot.paragraphs) {
    const paragraphRanges = ranges.get(segment.paragraphId);
    if (paragraphRanges === undefined) continue;
    const left =
      barLeftByPage.get(segment.pageIndex) ??
      segment.left - surfaceRect.left - CHANGE_BAR_FALLBACK_INSET;
    const lines = segment.lines;
    // A segment without line geometry (unmeasured paragraph) cannot be split,
    // so paint a single paragraph-level bar; range filtering needs line offsets.
    if (lines.length === 0) {
      boxes.push({
        paragraphId: segment.paragraphId,
        left,
        top: segment.top - surfaceRect.top,
        height: Math.max(1, segment.height),
      });
      continue;
    }
    const marked =
      paragraphRanges === null
        ? lines
        : lines.filter((line): boolean =>
            paragraphRanges.some(
              (range): boolean =>
                range.start < line.endOffset && range.end > line.startOffset,
            ),
          );
    // A paragraph with visible revisions must always show at least one bar.
    // Fully deleted text can leave a zero-length projected line whose offsets
    // match no range; fall back to its first line in that case.
    const targets = marked.length > 0 ? marked : [lines[0]!];
    for (const line of targets) {
      boxes.push({
        paragraphId: segment.paragraphId,
        left,
        top: line.top - surfaceRect.top,
        height: Math.max(1, line.height),
      });
    }
  }
  return boxes;
}

export type { ChangeBarBox };
