import type { EditorNamedStyle, EditorParagraphNode } from "@/core/model.js";
import type { FloatingExclusionRect } from "@/core/engine.js";
import { getAvailableWidth, getLineStartInset } from "./indentation.js";

function intersectsVertically(
  aTop: number,
  aBottom: number,
  bTop: number,
  bBottom: number,
): boolean {
  return aTop < bBottom && aBottom > bTop;
}

function subtractInterval(
  segments: Array<{ left: number; right: number }>,
  cutLeft: number,
  cutRight: number,
): Array<{ left: number; right: number }> {
  const result: Array<{ left: number; right: number }> = [];

  for (const segment of segments) {
    if (cutRight <= segment.left || cutLeft >= segment.right) {
      result.push(segment);
      continue;
    }

    if (cutLeft > segment.left) {
      result.push({
        left: segment.left,
        right: Math.max(segment.left, cutLeft),
      });
    }

    if (cutRight < segment.right) {
      result.push({
        left: Math.min(segment.right, cutRight),
        right: segment.right,
      });
    }
  }

  return result.filter((segment): boolean => segment.right - segment.left > 1);
}

export interface LineSegment {
  left: number;
  width: number;
}

export interface LineFlowBox {
  /** Widest writable segment (kept for callers that ignore multi-interval). */
  left: number;
  width: number;
  forcedTop?: number;
  /** All writable segments on this line, ordered left→right. For non-through
   * wrapping this collapses to the single widest segment. */
  segments: LineSegment[];
}

function mergeIntervals(
  intervals: Array<{ left: number; right: number }>,
): Array<{ left: number; right: number }> {
  if (intervals.length <= 1) return intervals.slice();
  const sorted = intervals
    .filter((interval): boolean => interval.right > interval.left)
    .sort((a, b): number => a.left - b.left);
  const merged: Array<{ left: number; right: number }> = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.left <= last.right) {
      last.right = Math.max(last.right, interval.right);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

/** x-intervals covered by the polygon at a single horizontal scanline. */
function coveredIntervalsAtScanline(
  polygon: ReadonlyArray<{ x: number; y: number }>,
  y: number,
): Array<{ left: number; right: number }> {
  const xs: number[] = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const crosses = (a.y <= y && b.y > y) || (b.y <= y && a.y > y);
    if (!crosses) continue;
    const t = (y - a.y) / (b.y - a.y);
    xs.push(a.x + t * (b.x - a.x));
  }
  xs.sort((p, q): number => p - q);
  const intervals: Array<{ left: number; right: number }> = [];
  for (let k = 0; k + 1 < xs.length; k += 2) {
    intervals.push({ left: xs[k]!, right: xs[k + 1]! });
  }
  return intervals;
}

/**
 * Conservative union of x-intervals the polygon covers across the band
 * [top, bottom]. Sampling several scanlines and unioning ensures text never
 * overlaps the shape anywhere inside the line's vertical extent.
 */
function polygonCoveredIntervals(
  polygon: ReadonlyArray<{ x: number; y: number }>,
  top: number,
  bottom: number,
): Array<{ left: number; right: number }> {
  const samples = 5;
  const collected: Array<{ left: number; right: number }> = [];
  for (let s = 0; s < samples; s += 1) {
    const y = bottom === top ? top : top + ((bottom - top) * s) / (samples - 1);
    collected.push(...coveredIntervalsAtScanline(polygon, y));
  }
  return mergeIntervals(collected);
}

export function resolveLineFlowBox(options: {
  paragraph: EditorParagraphNode;
  styles?: Record<string, EditorNamedStyle>;
  contentWidth: number;
  isFirstLine: boolean;
  lineTop: number;
  lineHeight: number;
  exclusions?: FloatingExclusionRect[];
}): LineFlowBox {
  const {
    paragraph,
    styles,
    contentWidth,
    isFirstLine,
    lineTop,
    lineHeight,
    exclusions = [],
  } = options;

  const baseLeft = getLineStartInset(paragraph, styles, isFirstLine);
  const baseWidth = getAvailableWidth(
    paragraph,
    styles,
    contentWidth,
    isFirstLine,
  );

  const lineBottom = lineTop + lineHeight;

  let segments = [
    {
      left: baseLeft,
      right: baseLeft + baseWidth,
    },
  ];

  let hasThrough = false;

  for (const exclusion of exclusions) {
    const exclusionBottom = exclusion.y + exclusion.height;

    if (
      !intersectsVertically(lineTop, lineBottom, exclusion.y, exclusionBottom)
    ) {
      continue;
    }

    if (exclusion.wrap === "topAndBottom") {
      return {
        left: baseLeft,
        width: baseWidth,
        forcedTop: exclusionBottom,
        segments: [{ left: baseLeft, width: baseWidth }],
      };
    }

    if (exclusion.polygon) {
      if (exclusion.wrap === "through") {
        hasThrough = true;
      }
      for (const interval of polygonCoveredIntervals(
        exclusion.polygon,
        lineTop,
        lineBottom,
      )) {
        segments = subtractInterval(segments, interval.left, interval.right);
      }
    } else {
      segments = subtractInterval(
        segments,
        exclusion.x,
        exclusion.x + exclusion.width,
      );
    }
  }

  if (segments.length === 0) {
    const fallbackWidth = Math.max(1, baseWidth);
    return {
      left: baseLeft,
      width: fallbackWidth,
      segments: [{ left: baseLeft, width: fallbackWidth }],
    };
  }

  const ordered = segments
    .slice()
    .sort((a, b): number => a.left - b.left)
    .map((segment): { left: number; width: number } => ({
      left: segment.left,
      width: Math.max(1, segment.right - segment.left),
    }));

  const widest = ordered.reduce(
    (best, current): { left: number; width: number } =>
      current.width > best.width ? current : best,
  );

  return {
    left: widest.left,
    width: widest.width,
    // Only "through" wrapping flows text across multiple gaps; every other mode
    // keeps text on the single widest side.
    segments: hasThrough ? ordered : [widest],
  };
}
