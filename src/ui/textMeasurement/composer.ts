import type {
  EditorLayoutLine,
  EditorNamedStyle,
  EditorParagraphNode,
} from "@/core/model.js";
import type { FloatingExclusionRect } from "@/core/engine.js";
import { resolveEffectiveTextStyleForParagraph } from "@/core/model.js";
import { DEFAULT_FONT_SIZE } from "./constants.js";
import type {
  MeasuredChar,
  MeasuredToken,
  TextMeasureOptions,
} from "./types.js";
import {
  buildMeasuredChars,
  buildParagraphFragments,
  tokenizeMeasuredChars,
} from "./tokenizer.js";
import { getAvailableWidth, getLineStartInset } from "./indentation.js";
import { getParagraphLineHeight } from "./paragraphLineHeight.js";
import { resolveTabAdvancePx } from "./tabStops.js";
import { commitLine } from "./layoutLine.js";
import { applyParagraphAlignment } from "./alignment.js";

const DEFAULT_CONTENT_WIDTH = 624;
const MIN_CONTENT_WIDTH = 120;

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

  return result.filter((segment) => segment.right - segment.left > 1);
}

interface LineSegment {
  left: number;
  width: number;
}

interface LineFlowBox {
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
    .filter((interval) => interval.right > interval.left)
    .sort((a, b) => a.left - b.left);
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
  xs.sort((p, q) => p - q);
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

function resolveLineFlowBox(options: {
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
    .sort((a, b) => a.left - b.left)
    .map((segment) => ({
      left: segment.left,
      width: Math.max(1, segment.right - segment.left),
    }));

  const widest = ordered.reduce((best, current) =>
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

export function measureParagraphMinContentWidthPx(
  paragraph: EditorParagraphNode,
  styles?: Record<string, EditorNamedStyle>,
): number {
  const fragments = buildParagraphFragments(paragraph);
  const measuredChars = buildMeasuredChars(paragraph, fragments, styles);
  const tokens = tokenizeMeasuredChars(measuredChars);
  const firstLineInset = Math.max(
    0,
    getLineStartInset(paragraph, styles, true),
  );
  const otherLineInset = Math.max(
    0,
    getLineStartInset(paragraph, styles, false),
  );
  const inset = Math.max(firstLineInset, otherLineInset);
  const largestUnbreakableToken = tokens.reduce((largest, token) => {
    if (token.kind !== "text") return largest;
    return Math.max(largest, token.width);
  }, 0);
  const largestInlineObject = paragraph.runs.reduce((largest, run) => {
    const imageWidth = run.image && !run.image.floating ? run.image.width : 0;
    const textBoxWidth =
      run.textBox && !run.textBox.floating ? run.textBox.width : 0;

    return Math.max(largest, imageWidth, textBoxWidth);
  }, 0);

  return Math.max(1, inset + largestUnbreakableToken, largestInlineObject);
}

export function composeMeasuredParagraphLines(
  options: TextMeasureOptions,
): EditorLayoutLine[] {
  const { paragraph, fragments, styles, contentWidth, defaultTabStop } =
    options;
  const exclusions = options.exclusions ?? [];
  const measuredChars = buildMeasuredChars(paragraph, fragments, styles);
  const tokens = tokenizeMeasuredChars(measuredChars);
  const charByOffset = new Map<number, string>(
    measuredChars.map((char) => [char.offset, char.char] as const),
  );
  const fallbackFontSize = Math.max(
    DEFAULT_FONT_SIZE,
    ...paragraph.runs.map(
      (run) =>
        resolveEffectiveTextStyleForParagraph(
          run.styles,
          paragraph.style?.styleId,
          styles,
        ).fontSize ?? DEFAULT_FONT_SIZE,
    ),
  );
  const lineHeight = getParagraphLineHeight(
    paragraph,
    styles,
    fallbackFontSize,
  );
  const width =
    contentWidth === undefined
      ? Math.max(MIN_CONTENT_WIDTH, DEFAULT_CONTENT_WIDTH)
      : Math.max(1, contentWidth);

  if (tokens.length === 0) {
    const firstLineInset = getLineStartInset(paragraph, styles, true);
    const emptyLine: EditorLayoutLine = {
      paragraphId: paragraph.id,
      index: 0,
      startOffset: 0,
      endOffset: 0,
      top: 0,
      height: lineHeight,
      slots: [
        {
          paragraphId: paragraph.id,
          offset: 0,
          left: firstLineInset,
          top: 0,
          height: lineHeight,
        },
      ],
      fragments: [],
    };

    if (exclusions.length > 0) {
      const flow = resolveLineFlowBox({
        paragraph,
        styles,
        contentWidth: width,
        isFirstLine: true,
        lineTop: 0,
        lineHeight,
        exclusions,
      });
      if (flow.forcedTop !== undefined && flow.forcedTop > 0) {
        emptyLine.top = flow.forcedTop;
        emptyLine.slots[0]!.left = flow.left;
        emptyLine.slots[0]!.top = flow.forcedTop;
      } else {
        emptyLine.slots[0]!.left = flow.left;
      }
      emptyLine.availableWidth = flow.width;
    }

    return [emptyLine];
  }

  const lines: EditorLayoutLine[] = [];
  const lineHardBreaks: boolean[] = [];
  let lineStartOffset =
    tokens[0]!.kind === "newline"
      ? tokens[0]!.chars[0]!.offset + 1
      : tokens[0]!.chars[0]!.offset;
  let lineWidth = 0;
  let lineEndOffset = lineStartOffset;
  let lineMaxObjectHeight = 0;
  let top = 0;
  let isFirstLine = true;

  const computeFlow = (): LineFlowBox =>
    resolveLineFlowBox({
      paragraph,
      styles,
      contentWidth: width,
      isFirstLine,
      lineTop: top,
      lineHeight,
      exclusions,
    });

  // A visual "band" at vertical position `top` may expose several writable
  // segments (gaps) when wrapping is "through". We fill the leftmost gap first,
  // then jump to the next gap on the SAME band before advancing `top`.
  let currentFlow = computeFlow();
  let segmentIndex = 0;
  let bandHeight = 0;
  let lineStartInset = currentFlow.segments[0]!.left;
  let lineAvailableWidth = currentFlow.segments[0]!.width;
  let lineSlotLefts = [lineStartInset];

  const applySegment = (nextOffset: number) => {
    lineStartOffset = nextOffset;
    lineEndOffset = nextOffset;
    lineWidth = 0;
    lineMaxObjectHeight = 0;
    const segment =
      currentFlow.segments[segmentIndex] ?? currentFlow.segments[0]!;
    lineStartInset = segment.left;
    lineAvailableWidth = segment.width;
    lineSlotLefts = [lineStartInset];
  };

  // Commit the current segment as a layout line. Does not advance `top`; that
  // happens once per band in `advanceRegion`.
  const flushLine = (hardBreak = false) => {
    // An inline image/text box grows the line so it does not overlap adjacent
    // lines; normal text lines keep their font-derived height.
    const effectiveHeight = Math.max(lineHeight, lineMaxObjectHeight);
    commitLine(
      lines,
      paragraph.id,
      lineStartOffset,
      lineEndOffset,
      lineSlotLefts,
      top,
      effectiveHeight,
      lineAvailableWidth,
    );
    lineHardBreaks.push(hardBreak);
    bandHeight = Math.max(bandHeight, effectiveHeight);
  };

  // Move to the next writable region after a wrap. A soft wrap first tries the
  // next gap on the current band (same `top`); a hard break, or an exhausted
  // band, advances `top` to a fresh band and recomputes its segments.
  const resetLine = (nextOffset: number, softWrap = true) => {
    if (softWrap && segmentIndex + 1 < currentFlow.segments.length) {
      segmentIndex += 1;
      applySegment(nextOffset);
      return;
    }
    top += bandHeight > 0 ? bandHeight : lineHeight;
    bandHeight = 0;
    segmentIndex = 0;
    isFirstLine = false;
    currentFlow = computeFlow();
    applySegment(nextOffset);
  };

  const measureCharsAt = (
    chars: MeasuredChar[],
    startLineWidth: number,
  ): number => {
    let widthAt = startLineWidth;
    for (const char of chars) {
      widthAt +=
        char.char === "\t"
          ? resolveTabAdvancePx(
              paragraph,
              styles,
              defaultTabStop,
              lineStartInset,
              widthAt,
              char.offset,
              measuredChars,
            )
          : char.width;
    }
    return widthAt - startLineWidth;
  };

  const measureTokenAt = (token: MeasuredToken): number =>
    token.chars.some((char) => char.char === "\t")
      ? measureCharsAt(token.chars, lineWidth)
      : token.width;

  const appendChars = (chars: MeasuredChar[]) => {
    for (const char of chars) {
      lineWidth +=
        char.char === "\t"
          ? resolveTabAdvancePx(
              paragraph,
              styles,
              defaultTabStop,
              lineStartInset,
              lineWidth,
              char.offset,
              measuredChars,
            )
          : char.width;
      if (char.objectHeight !== undefined) {
        lineMaxObjectHeight = Math.max(lineMaxObjectHeight, char.objectHeight);
      }
      lineEndOffset = char.offset + 1;
      lineSlotLefts.push(lineStartInset + lineWidth);
    }
  };

  for (const token of tokens) {
    if (token.kind === "newline") {
      flushLine(true);
      resetLine(token.chars[0]!.offset + 1, false);
      continue;
    }

    const tokenWidth = measureTokenAt(token);
    const fitsCurrentLine = lineWidth + tokenWidth <= lineAvailableWidth;
    const isEmptyLine = lineStartOffset === lineEndOffset;

    if (token.kind === "whitespace") {
      if (fitsCurrentLine || isEmptyLine) {
        appendChars(token.chars);
      } else {
        flushLine();
        resetLine(token.chars[token.chars.length - 1]!.offset + 1);
      }
      continue;
    }

    if (fitsCurrentLine) {
      appendChars(token.chars);
      continue;
    }

    flushLine();
    resetLine(token.chars[0]!.offset);

    let currentChunk: MeasuredChar[] = [];
    let currentChunkWidth = 0;

    for (const char of token.chars) {
      const charWidth =
        char.char === "\t"
          ? resolveTabAdvancePx(
              paragraph,
              styles,
              defaultTabStop,
              lineStartInset,
              currentChunkWidth,
              char.offset,
              measuredChars,
            )
          : char.width;
      if (
        currentChunk.length > 0 &&
        currentChunkWidth + charWidth > lineAvailableWidth
      ) {
        appendChars(currentChunk);
        flushLine();
        resetLine(char.offset);
        currentChunk = [];
        currentChunkWidth = 0;
      }

      currentChunk.push(char);
      currentChunkWidth += charWidth;
    }

    if (currentChunk.length > 0) {
      appendChars(currentChunk);
    }
  }

  if (
    lines.length === 0 ||
    lineStartOffset !== lineEndOffset ||
    lineSlotLefts.length > 1
  ) {
    flushLine();
  }

  return applyParagraphAlignment(
    paragraph,
    styles,
    width,
    lines,
    lineHardBreaks,
    charByOffset,
  );
}
