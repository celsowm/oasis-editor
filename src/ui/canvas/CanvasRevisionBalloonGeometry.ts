import type { EditorState } from "@/core/model.js";
import {
  collectRevisionDescriptors,
  type RevisionDescriptor,
} from "@/core/commands/revisionDescriptors.js";
import { isRevisionMarkupShown } from "@/core/commands/reviewMarkup.js";
import type { RevisionMarkupBox } from "@/ui/editorUiTypes.js";
import type { CanvasLayoutSnapshot } from "./CanvasLayoutSnapshot.js";

/** Card size and right-margin placement, in unscaled layer px. */
const BALLOON_WIDTH = 168;
const BALLOON_HEIGHT = 42;
const BALLOON_RIGHT_INSET = 12;
const BALLOON_GAP = 6;
const CONNECTOR_MIN_WIDTH = 4;

interface Candidate {
  descriptor: RevisionDescriptor;
  pageIndex: number;
  /** Layer-local top of the anchor line. */
  top: number;
  lineHeight: number;
  /** Layer-local right edge of the anchor paragraph's text. */
  connectorLeft: number;
  balloonLeft: number;
}

/**
 * Project Word-style reviewer balloons into the right page margin. One card is
 * emitted per visible revision id (Show Markup category/reviewer filters are
 * honoured through `isRevisionMarkupShown`), anchored to the first painted line
 * of that revision's first paragraph. Cards are stacked vertically per page so
 * they never overlap, and each carries a short connector back toward the text.
 *
 * The right-margin x is derived per page from `page.left + page.width`, the same
 * way `computeChangeBars` derives its per-page left-margin x — the snapshot
 * intentionally exposes no `margins` field. This is presentational only, gated
 * by the caller to All Markup (Simple Markup paints change bars instead).
 */
export function computeRevisionBalloons(
  snapshot: CanvasLayoutSnapshot,
  state: EditorState,
): RevisionMarkupBox[] {
  const { surfaceRect } = snapshot;
  const rightByPage = new Map<number, number>();
  for (const page of snapshot.pages ?? []) {
    const left = page.left + page.width - BALLOON_RIGHT_INSET - BALLOON_WIDTH;
    rightByPage.set(page.index, left - surfaceRect.left);
  }

  const segments = snapshot.paragraphs;
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
    if (!anchor) continue;
    const balloonLeft = rightByPage.get(anchor.pageIndex);
    if (balloonLeft === undefined) continue;
    const line = anchor.lines[0];
    candidates.push({
      descriptor,
      pageIndex: anchor.pageIndex,
      top: (line ? line.top : anchor.top) - surfaceRect.top,
      lineHeight: line ? line.height : anchor.height,
      connectorLeft: anchor.left + anchor.width - surfaceRect.left,
      balloonLeft,
    });
  }

  // Stack per page so cards never overlap; keep document order for equal tops.
  candidates.sort((a, b): number => a.pageIndex - b.pageIndex || a.top - b.top);
  const lastBottomByPage = new Map<number, number>();
  const boxes: RevisionMarkupBox[] = [];
  for (const candidate of candidates) {
    const lastBottom = lastBottomByPage.get(candidate.pageIndex) ?? -Infinity;
    const top = Math.max(candidate.top, lastBottom + BALLOON_GAP);
    lastBottomByPage.set(candidate.pageIndex, top + BALLOON_HEIGHT);
    const descriptor = candidate.descriptor;
    boxes.push({
      revisionId: descriptor.id,
      type: descriptor.type,
      variant: "balloon",
      left: candidate.balloonLeft,
      top,
      width: BALLOON_WIDTH,
      height: BALLOON_HEIGHT,
      author: descriptor.author,
      date: descriptor.date,
      snippet: descriptor.snippet,
      connectorLeft: candidate.connectorLeft,
      connectorTop: candidate.top + Math.max(1, candidate.lineHeight / 2),
      connectorWidth: Math.max(
        CONNECTOR_MIN_WIDTH,
        candidate.balloonLeft - candidate.connectorLeft,
      ),
    });
  }
  return boxes;
}
