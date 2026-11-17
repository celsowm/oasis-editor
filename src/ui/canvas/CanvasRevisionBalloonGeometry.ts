import type { EditorState } from "@/core/model.js";
import {
  collectRevisionDescriptors,
  type RevisionDescriptor,
} from "@/core/commands/revisionDescriptors.js";
import { isRevisionMarkupShown } from "@/core/commands/reviewMarkup.js";
import type { RevisionMarkupBox } from "@/ui/editorUiTypes.js";
import type { CanvasLayoutSnapshot } from "./CanvasLayoutSnapshot.js";

/**
 * Balloon sizing, in unscaled layer px. The card never leaves the page's right
 * margin: it shrinks to the margin's width (derived per page from the rightmost
 * painted text segment) so it cannot cover body text, and grows up to
 * `BALLOON_MAX_WIDTH` when the margin is wide.
 */
const BALLOON_MAX_WIDTH = 168;
const BALLOON_MIN_WIDTH = 84;
const BALLOON_HEIGHT = 58;
const BALLOON_INSET = 8;
const BALLOON_GAP = 6;
const FALLBACK_MARGIN = 96;

interface Candidate {
  descriptor: RevisionDescriptor;
  pageIndex: number;
  /** Layer-local top of the anchor line. */
  top: number;
}

interface PageMetrics {
  /** Layer-local left of the card. */
  left: number;
  width: number;
}

/**
 * Project Word-style reviewer balloons into each page's right margin. One card
 * is emitted per visible revision id (Show Markup category/reviewer filters are
 * honoured through `isRevisionMarkupShown`), anchored to the first painted line
 * of that revision's first paragraph. Cards stack vertically per page so they
 * never overlap.
 *
 * The snapshot intentionally exposes no `margins` field, so the right margin is
 * derived per page from the rightmost painted segment — the same "derive the
 * margin from painted geometry" approach `computeChangeBars` uses on the left.
 * Presentational only, and gated by the caller to All Markup (Simple Markup
 * paints change bars instead).
 */
export function computeRevisionBalloons(
  snapshot: CanvasLayoutSnapshot,
  state: EditorState,
): RevisionMarkupBox[] {
  const { surfaceRect } = snapshot;
  const segments = snapshot.paragraphs;

  const contentRightByPage = new Map<number, number>();
  for (const segment of segments) {
    const right = segment.left + segment.width;
    const current = contentRightByPage.get(segment.pageIndex);
    if (current === undefined || right > current) {
      contentRightByPage.set(segment.pageIndex, right);
    }
  }

  const metricsByPage = new Map<number, PageMetrics>();
  for (const page of snapshot.pages ?? []) {
    const pageRight = page.left + page.width;
    const contentRight =
      contentRightByPage.get(page.index) ??
      pageRight - Math.min(FALLBACK_MARGIN, page.width);
    const margin = Math.max(0, pageRight - contentRight);
    const width = Math.min(
      BALLOON_MAX_WIDTH,
      Math.max(BALLOON_MIN_WIDTH, margin - BALLOON_INSET * 2),
    );
    metricsByPage.set(page.index, {
      left: pageRight - BALLOON_INSET - width - surfaceRect.left,
      width,
    });
  }

  const candidates: Candidate[] = [];
  for (const descriptor of collectRevisionDescriptors(state)) {
    if (!isRevisionMarkupShown(state, descriptor.type, descriptor.author)) {
      continue;
    }
    const ids = new Set(descriptor.paragraphIds);
    let anchor: (typeof segments)[number] | undefined;
    for (const segment of segments) {
      if (!ids.has(segment.paragraphId)) continue;
      if (!anchor || segment.top < anchor.top) anchor = segment;
    }
    if (!anchor || !metricsByPage.has(anchor.pageIndex)) continue;
    const line = anchor.lines[0];
    candidates.push({
      descriptor,
      pageIndex: anchor.pageIndex,
      top: (line ? line.top : anchor.top) - surfaceRect.top,
    });
  }

  // Stack per page so cards never overlap; document order for equal tops.
  candidates.sort((a, b): number => a.pageIndex - b.pageIndex || a.top - b.top);
  const lastBottomByPage = new Map<number, number>();
  const boxes: RevisionMarkupBox[] = [];
  for (const candidate of candidates) {
    const lastBottom = lastBottomByPage.get(candidate.pageIndex) ?? -Infinity;
    const top = Math.max(candidate.top, lastBottom + BALLOON_GAP);
    lastBottomByPage.set(candidate.pageIndex, top + BALLOON_HEIGHT);
    const metrics = metricsByPage.get(candidate.pageIndex)!;
    const descriptor = candidate.descriptor;
    boxes.push({
      revisionId: descriptor.id,
      type: descriptor.type,
      variant: "balloon",
      left: metrics.left,
      top,
      width: metrics.width,
      height: BALLOON_HEIGHT,
      author: descriptor.author,
      date: descriptor.date,
      snippet: descriptor.snippet,
    });
  }
  return boxes;
}
