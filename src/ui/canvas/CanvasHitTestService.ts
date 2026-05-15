import {
  paragraphOffsetToPosition,
  type EditorEditingZone,
  type EditorPosition,
  type EditorState,
} from "../../core/model.js";
import { recordDuration } from "../../utils/performanceMetrics.js";
import type {
  CanvasLayoutSnapshot,
  CanvasSnapshotLine,
  CanvasSnapshotPage,
  CanvasSnapshotParagraph,
} from "./CanvasLayoutSnapshot.js";

export interface SurfaceHit {
  zone: EditorEditingZone;
  paragraphId: string;
  paragraphOffset: number;
  position: EditorPosition;
  source: "canvas-layout" | "dom-fallback";
  fallbackReason?: string;
  resolvedFromParagraph: boolean;
  tableCellAnchorPosition?: EditorPosition;
}

export interface ResolveCanvasHitOptions {
  snapshot: CanvasLayoutSnapshot;
  state: EditorState;
  clientX: number;
  clientY: number;
}

function scoreRectDistance(
  left: number,
  top: number,
  width: number,
  height: number,
  clientX: number,
  clientY: number,
): number {
  const right = left + width;
  const bottom = top + height;
  const verticalDelta =
    clientY < top ? top - clientY : clientY > bottom ? clientY - bottom : 0;
  const horizontalDelta =
    clientX < left ? left - clientX : clientX > right ? clientX - right : 0;
  return verticalDelta * 1000 + horizontalDelta;
}

function resolveZoneFromPage(page: CanvasSnapshotPage, clientY: number): EditorEditingZone {
  const localY = clientY - page.top;
  if (localY < page.bodyTop) return "header";
  if (localY >= page.bodyBottom) return "footer";
  return "main";
}

function resolveNearestPage(
  pages: CanvasSnapshotPage[],
  clientX: number,
  clientY: number,
): CanvasSnapshotPage | null {
  if (pages.length === 0) return null;
  let bestPage = pages[0]!;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const page of pages) {
    const score = scoreRectDistance(
      page.left,
      page.top,
      page.width,
      page.height,
      clientX,
      clientY,
    );
    if (score < bestScore) {
      bestScore = score;
      bestPage = page;
    }
  }
  return bestPage;
}

function resolveClosestOffsetInLine(
  line: CanvasSnapshotLine,
  clientX: number,
  clientY: number,
): { offset: number; score: number } {
  if (line.slots.length === 0) {
    return { offset: line.startOffset, score: Number.POSITIVE_INFINITY };
  }
  let bestOffset = line.slots[0]!.offset;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const slot of line.slots) {
    const verticalDelta =
      clientY < slot.top
        ? slot.top - clientY
        : clientY > slot.top + slot.height
          ? clientY - (slot.top + slot.height)
          : 0;
    const horizontalDelta = Math.abs(clientX - slot.left);
    const score = verticalDelta * 1000 + horizontalDelta;
    if (score < bestScore) {
      bestScore = score;
      bestOffset = slot.offset;
    }
  }
  return { offset: bestOffset, score: bestScore };
}

function resolveClosestOffsetInParagraph(
  paragraph: CanvasSnapshotParagraph,
  clientX: number,
  clientY: number,
): number {
  let bestOffset = paragraph.startOffset;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const line of paragraph.lines) {
    const { offset, score } = resolveClosestOffsetInLine(line, clientX, clientY);
    if (score < bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }
  return Math.max(paragraph.startOffset, Math.min(bestOffset, paragraph.endOffset));
}

function resolveParagraphHit(
  paragraphs: CanvasSnapshotParagraph[],
  clientX: number,
  clientY: number,
): { paragraph: CanvasSnapshotParagraph; offset: number } | null {
  if (paragraphs.length === 0) return null;

  let bestLineHit: {
    paragraph: CanvasSnapshotParagraph;
    offset: number;
    score: number;
  } | null = null;

  for (const paragraph of paragraphs) {
    for (const line of paragraph.lines) {
      const lineTop = line.top - 2;
      const lineBottom = line.top + line.height + 2;
      if (clientY < lineTop || clientY > lineBottom) continue;
      const { offset, score } = resolveClosestOffsetInLine(line, clientX, clientY);
      if (!bestLineHit || score < bestLineHit.score) {
        bestLineHit = { paragraph, offset, score };
      }
    }
  }

  if (bestLineHit) {
    return { paragraph: bestLineHit.paragraph, offset: bestLineHit.offset };
  }

  let nearestParagraph: CanvasSnapshotParagraph | null = null;
  let nearestScore = Number.POSITIVE_INFINITY;
  for (const paragraph of paragraphs) {
    const score = scoreRectDistance(
      paragraph.left,
      paragraph.top,
      Math.max(1, paragraph.width),
      Math.max(1, paragraph.height),
      clientX,
      clientY,
    );
    if (score < nearestScore) {
      nearestScore = score;
      nearestParagraph = paragraph;
    }
  }
  if (!nearestParagraph) {
    return null;
  }
  return {
    paragraph: nearestParagraph,
    offset: resolveClosestOffsetInParagraph(nearestParagraph, clientX, clientY),
  };
}

export function resolveCanvasSurfaceHitAtPoint(
  options: ResolveCanvasHitOptions,
): SurfaceHit | null {
  const { snapshot, state, clientX, clientY } = options;
  const page = resolveNearestPage(snapshot.pages, clientX, clientY);
  if (!page) {
    return null;
  }

  const zone = resolveZoneFromPage(page, clientY);
  const zoneParagraphs = snapshot.paragraphs.filter(
    (paragraph) => paragraph.pageIndex === page.index && paragraph.zone === zone,
  );
  const paragraphHit = resolveParagraphHit(zoneParagraphs, clientX, clientY);
  if (!paragraphHit) {
    const focusParagraph = state.selection.focus.paragraphId;
    const focusOffset = state.selection.focus.offset;
    return {
      zone,
      paragraphId: focusParagraph,
      paragraphOffset: focusOffset,
      position: { ...state.selection.focus },
      source: "canvas-layout",
      resolvedFromParagraph: false,
      fallbackReason: "zone-without-paragraph",
    };
  }

  const paragraph = paragraphHit.paragraph;
  const offset = Math.max(0, Math.min(paragraphHit.offset, paragraph.textLength));
  const position = paragraphOffsetToPosition(paragraph.paragraph, offset);
  return {
    zone,
    paragraphId: paragraph.paragraphId,
    paragraphOffset: offset,
    position,
    source: "canvas-layout",
    resolvedFromParagraph: true,
    tableCellAnchorPosition: paragraph.tableCell?.anchorPosition,
  };
}

export interface ResolveHitWithFallbackOptions extends ResolveCanvasHitOptions {
  allowDomFallback: boolean;
  resolveDomFallbackPosition: (clientX: number, clientY: number) => EditorPosition | null;
  onFallbackUsed?: (reason: string, details: { clientX: number; clientY: number }) => void;
}

function isUnsupportedFallbackReason(reason: string): boolean {
  return reason.startsWith("unsupported:");
}

export function resolveCanvasSurfaceHitAtPointWithFallback(
  options: ResolveHitWithFallbackOptions,
): SurfaceHit | null {
  const primary = resolveCanvasSurfaceHitAtPoint(options);
  if (primary?.resolvedFromParagraph) {
    return primary;
  }
  if (!options.allowDomFallback) {
    return primary;
  }

  const fallbackPosition = options.resolveDomFallbackPosition(
    options.clientX,
    options.clientY,
  );
  if (!fallbackPosition) {
    return primary;
  }

  const reason = primary?.fallbackReason ?? "unresolved-hit";
  if (!isUnsupportedFallbackReason(reason)) {
    return primary;
  }
  options.onFallbackUsed?.(reason, {
    clientX: options.clientX,
    clientY: options.clientY,
  });
  recordDuration("canvas:fallback:hit-test", 0);

  return {
    zone: primary?.zone ?? (options.state.activeZone ?? "main"),
    paragraphId: fallbackPosition.paragraphId,
    paragraphOffset: fallbackPosition.offset,
    position: fallbackPosition,
    source: "dom-fallback",
    fallbackReason: reason,
    resolvedFromParagraph: true,
  };
}
