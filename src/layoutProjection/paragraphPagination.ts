import type {
  EditorCaretSlot,
  EditorLayoutFragment,
  EditorLayoutFragmentChar,
  EditorLayoutLine,
  EditorLayoutParagraph,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
} from "../core/model.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../core/model.js";
import { measureLinesFromRects, type CharRect } from "../ui/caretGeometry.js";
import { getParagraphBorderInsets } from "./paragraphBorders.js";
import type { ITextMeasurer } from "../core/engine.js";
import {
  domTextMeasurer,
  resolveRenderedLineHeightPx,
} from "../ui/textMeasurement.js";
import { perfTimer } from "../utils/performanceMetrics.js";

const DEFAULT_FONT_SIZE = 14.6667; // 11pt
const DEFAULT_LINE_HEIGHT = 1.15;

function paragraphStyleComparableKey(
  style: Required<EditorParagraphStyle>,
): string {
  const {
    spacingBefore: _spacingBefore,
    spacingAfter: _spacingAfter,
    contextualSpacing: _contextualSpacing,
    ...comparable
  } = style;
  return JSON.stringify(comparable);
}

export function shouldCollapseContextualSpacing(
  previous: EditorParagraphNode | undefined,
  next: EditorParagraphNode | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): boolean {
  if (!previous || !next) {
    return false;
  }
  const previousStyle = resolveEffectiveParagraphStyle(previous.style, styles);
  const nextStyle = resolveEffectiveParagraphStyle(next.style, styles);
  if (!previousStyle.contextualSpacing && !nextStyle.contextualSpacing) {
    return false;
  }
  if (previousStyle.styleId || nextStyle.styleId) {
    return (
      previousStyle.styleId !== undefined &&
      previousStyle.styleId === nextStyle.styleId
    );
  }
  return (
    paragraphStyleComparableKey(previousStyle) ===
    paragraphStyleComparableKey(nextStyle)
  );
}

function sliceFragmentToRange(
  fragment: EditorLayoutFragment,
  startOffset: number,
  endOffset: number,
): EditorLayoutFragment | null {
  const start = Math.max(startOffset, fragment.startOffset);
  const end = Math.min(endOffset, fragment.endOffset);
  if (start >= end) {
    return null;
  }

  const chars = fragment.chars.filter(
    (char) => char.paragraphOffset >= start && char.paragraphOffset < end,
  );

  return {
    paragraphId: fragment.paragraphId,
    runId: fragment.runId,
    startOffset: start,
    endOffset: end,
    text: chars.map((char) => char.char).join(""),
    styles: fragment.styles ? { ...fragment.styles } : undefined,
    image: fragment.image ? { ...fragment.image } : undefined,
    revision: fragment.revision ? { ...fragment.revision } : undefined,
    chars,
  };
}

const paragraphLayoutCache = new WeakMap<
  EditorParagraphNode,
  Map<string, EditorLayoutParagraph>
>();
const paragraphFieldDependenceCache = new WeakMap<
  EditorParagraphNode,
  { dependsOnPageIndex: boolean; dependsOnTotalPages: boolean }
>();

function getParagraphFieldDependence(paragraph: EditorParagraphNode): {
  dependsOnPageIndex: boolean;
  dependsOnTotalPages: boolean;
} {
  const cached = paragraphFieldDependenceCache.get(paragraph);
  if (cached) return cached;
  let dependsOnPageIndex = false;
  let dependsOnTotalPages = false;
  for (const run of paragraph.runs) {
    if (run.field?.type === "PAGE") dependsOnPageIndex = true;
    else if (run.field?.type === "NUMPAGES") dependsOnTotalPages = true;
    if (dependsOnPageIndex && dependsOnTotalPages) break;
  }
  const result = { dependsOnPageIndex, dependsOnTotalPages };
  paragraphFieldDependenceCache.set(paragraph, result);
  return result;
}

export function projectParagraphLayout(
  paragraph: EditorParagraphNode,
  pageIndex?: number,
  totalPages?: number,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
  measurer: ITextMeasurer = domTextMeasurer,
  defaultTabStop?: number,
): EditorLayoutParagraph {
  const { dependsOnPageIndex, dependsOnTotalPages } =
    getParagraphFieldDependence(paragraph);
  const cacheKey = `${dependsOnPageIndex ? (pageIndex ?? "") : ""}:${
    dependsOnTotalPages ? (totalPages ?? "") : ""
  }:${contentWidth ?? ""}:${defaultTabStop ?? ""}`;
  let cacheForParagraph = paragraphLayoutCache.get(paragraph);
  if (cacheForParagraph) {
    const cached = cacheForParagraph.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const result = perfTimer(
    "layout:projectParagraphLayout",
    () => {
      let paragraphOffset = 0;
      const fragments: EditorLayoutFragment[] = paragraph.runs.map((run) => {
        let resolvedText = run.text;
        if (run.field) {
          if (run.field.type === "PAGE") {
            resolvedText =
              typeof pageIndex === "number" ? String(pageIndex + 1) : "1";
          } else if (run.field.type === "NUMPAGES") {
            resolvedText =
              typeof totalPages === "number" ? String(totalPages) : "1";
          }
        }

        const chars: EditorLayoutFragmentChar[] = Array.from(resolvedText).map(
          (char, index) => ({
            char,
            paragraphOffset: paragraphOffset + index,
            runOffset: index,
          }),
        );

        const fragment: EditorLayoutFragment = {
          paragraphId: paragraph.id,
          runId: run.id,
          startOffset: paragraphOffset,
          endOffset: paragraphOffset + resolvedText.length,
          text: resolvedText,
          styles: run.styles ? { ...run.styles } : undefined,
          image: run.image ? { ...run.image } : undefined,
          revision: run.revision ? { ...run.revision } : undefined,
          chars,
        };

        paragraphOffset += resolvedText.length;
        return fragment;
      });

      const fontSize = estimateParagraphFontSize(paragraph, styles);
      const lineHeight = estimateParagraphLineHeight(
        paragraph,
        fontSize,
        styles,
      );
      const lines = measurer
        .composeMeasuredParagraphLines({
          paragraph,
          fragments,
          styles,
          contentWidth,
          defaultTabStop,
        })
        .map((line) => ({
          ...line,
          height: line.height || lineHeight,
          fragments: fragments
            .map((fragment) =>
              sliceFragmentToRange(fragment, line.startOffset, line.endOffset),
            )
            .filter(
              (fragment): fragment is EditorLayoutFragment => fragment !== null,
            ),
        }));

      return {
        paragraphId: paragraph.id,
        text: fragments.map((fragment) => fragment.text).join(""),
        fragments,
        lines,
        startOffset: 0,
        endOffset: paragraphOffset,
        contentWidth,
      };
    },
    0,
  );

  if (!cacheForParagraph) {
    cacheForParagraph = new Map();
    paragraphLayoutCache.set(paragraph, cacheForParagraph);
  }
  cacheForParagraph.set(cacheKey, result);

  return result;
}

export function measureParagraphLayoutFromRects(
  paragraph: EditorParagraphNode,
  charRects: CharRect[],
  styles?: Record<string, EditorNamedStyle>,
): EditorLayoutParagraph {
  const projected = projectParagraphLayout(
    paragraph,
    undefined,
    undefined,
    styles,
    undefined,
  );
  const measuredLines = measureLinesFromRects(charRects);

  return {
    ...projected,
    lines: measuredLines.map((line) => {
      const slots: EditorCaretSlot[] = line.slots.map((slot) => ({
        paragraphId: paragraph.id,
        offset: slot.offset,
        left: slot.left,
        top: slot.top,
        height: slot.height,
      }));

      return {
        paragraphId: paragraph.id,
        index: line.index,
        startOffset: line.startOffset,
        endOffset: line.endOffset,
        top: line.top,
        height: line.height,
        slots,
        fragments: projected.fragments
          .map((fragment) =>
            sliceFragmentToRange(fragment, line.startOffset, line.endOffset),
          )
          .filter(
            (fragment): fragment is EditorLayoutFragment => fragment !== null,
          ),
      };
    }),
    contentWidth: projected.contentWidth,
  };
}

export function applyMeasuredLineGeometry(
  projected: EditorLayoutParagraph,
  measured: EditorLayoutParagraph,
): EditorLayoutParagraph {
  return {
    ...projected,
    startOffset: measured.startOffset ?? projected.startOffset,
    endOffset: measured.endOffset ?? projected.endOffset,
    lines: measured.lines.map((line) => ({
      paragraphId: projected.paragraphId,
      index: line.index,
      startOffset: line.startOffset,
      endOffset: line.endOffset,
      top: line.top,
      height: line.height,
      slots: line.slots.map((slot) => ({
        paragraphId: projected.paragraphId,
        offset: slot.offset,
        left: slot.left,
        top: slot.top,
        height: slot.height,
      })),
      fragments: projected.fragments
        .map((fragment) =>
          sliceFragmentToRange(fragment, line.startOffset, line.endOffset),
        )
        .filter(
          (fragment): fragment is EditorLayoutFragment => fragment !== null,
        ),
    })),
  };
}

export function isMeasuredLayoutCurrent(
  projected: EditorLayoutParagraph,
  measured: EditorLayoutParagraph,
): boolean {
  if (projected.paragraphId !== measured.paragraphId) {
    return false;
  }

  if (projected.text !== measured.text) {
    return false;
  }

  const projectedStart = projected.startOffset ?? 0;
  const measuredStart = measured.startOffset ?? 0;
  const projectedEnd = projected.endOffset ?? projected.text.length;
  const measuredEnd = measured.endOffset ?? measured.text.length;

  if (projectedStart !== measuredStart || projectedEnd !== measuredEnd) {
    return false;
  }

  if (projected.contentWidth !== measured.contentWidth) {
    return false;
  }

  return true;
}

export function resolveClosestOffsetInMeasuredLayout(
  layout: EditorLayoutParagraph,
  clientX: number,
  clientY: number,
): number {
  const slots = layout.lines.flatMap((line) => line.slots);
  if (slots.length === 0) {
    return 0;
  }

  let bestOffset = slots[0]!.offset;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const slot of slots) {
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

  return bestOffset;
}

export function getEffectiveParagraphStyle(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
) {
  return resolveEffectiveParagraphStyle(paragraph.style, styles);
}

function estimateParagraphFontSize(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
): number {
  const runFontSizes = paragraph.runs
    .map(
      (run) =>
        resolveEffectiveTextStyleForParagraph(
          run.styles,
          paragraph.style?.styleId,
          styles,
        ).fontSize,
    )
    .filter(
      (fontSize): fontSize is number =>
        typeof fontSize === "number" && Number.isFinite(fontSize),
    );

  return runFontSizes.length > 0
    ? Math.max(...runFontSizes)
    : DEFAULT_FONT_SIZE;
}

function estimateParagraphLineHeight(
  paragraph: EditorParagraphNode,
  fontSize: number,
  styles: Record<string, EditorNamedStyle> | undefined,
): number {
  const paragraphStyle = getEffectiveParagraphStyle(paragraph, styles);
  const lineHeight = paragraphStyle.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const lineGridPitch = paragraphStyle.lineGridPitch;
  const snapToGrid = paragraphStyle.snapToGrid !== false;

  const effectiveTextStyle = resolveEffectiveTextStyleForParagraph(
    undefined,
    paragraph.style?.styleId,
    styles,
  );
  const renderedLineHeight = resolveRenderedLineHeightPx(
    {
      ...effectiveTextStyle,
      fontSize: effectiveTextStyle.fontSize ?? fontSize,
    },
    lineHeight,
  );

  if (lineGridPitch && lineGridPitch > 0 && snapToGrid) {
    if (paragraphStyle.lineGridType === "implicit") {
      return Math.max(renderedLineHeight, lineGridPitch);
    }
    return Math.ceil(renderedLineHeight / lineGridPitch) * lineGridPitch;
  }
  return renderedLineHeight;
}

export function getParagraphSegmentHeight(
  paragraph: EditorParagraphNode,
  lines: EditorLayoutLine[],
  isFirstSegment: boolean,
  isLastSegment: boolean,
  styles: Record<string, EditorNamedStyle> | undefined,
  allowSpacingBefore = true,
  allowSpacingAfter = true,
): number {
  const lineHeights = lines.reduce((sum, line) => sum + line.height, 0);
  const paragraphStyle = getEffectiveParagraphStyle(paragraph, styles);
  const spacingBefore =
    isFirstSegment && allowSpacingBefore
      ? (paragraphStyle.spacingBefore ?? 0)
      : 0;
  const spacingAfter =
    isLastSegment && allowSpacingAfter ? (paragraphStyle.spacingAfter ?? 0) : 0;
  const insets = getParagraphBorderInsets(paragraphStyle);
  const borderTop = isFirstSegment ? insets.top : 0;
  const borderBottom = isLastSegment ? insets.bottom : 0;
  return spacingBefore + spacingAfter + lineHeights + borderTop + borderBottom;
}

export function getParagraphSegmentFitHeight(
  paragraph: EditorParagraphNode,
  segmentHeight: number,
  isLastSegment: boolean,
  styles: Record<string, EditorNamedStyle> | undefined,
  allowSpacingAfter = true,
): number {
  if (!isLastSegment || !allowSpacingAfter) {
    return segmentHeight;
  }
  const paragraphStyle = getEffectiveParagraphStyle(paragraph, styles);
  return Math.max(0, segmentHeight - (paragraphStyle.spacingAfter ?? 0));
}

export function getProjectedParagraphBlockHeight(
  paragraph: EditorParagraphNode,
  layout: EditorLayoutParagraph,
  styles: Record<string, EditorNamedStyle> | undefined,
  allowSpacingBefore = true,
  allowSpacingAfter = true,
): number {
  return getParagraphSegmentHeight(
    paragraph,
    layout.lines,
    true,
    true,
    styles,
    allowSpacingBefore,
    allowSpacingAfter,
  );
}

export function getParagraphMeasuredHeight(
  measuredHeights: Record<string, number> | undefined,
  paragraphId: string,
  segmentId: string,
  isWholeParagraphSegment: boolean,
  fallbackHeight: number,
): number {
  return (
    measuredHeights?.[segmentId] ??
    (isWholeParagraphSegment ? measuredHeights?.[paragraphId] : undefined) ??
    fallbackHeight
  );
}

export function createParagraphSegmentLayout(
  layout: EditorLayoutParagraph,
  startLineIndex: number,
  endLineIndexExclusive: number,
): EditorLayoutParagraph {
  const segmentLines = layout.lines.slice(
    startLineIndex,
    endLineIndexExclusive,
  );
  const startOffset = segmentLines[0]?.startOffset ?? 0;
  const endOffset =
    segmentLines[segmentLines.length - 1]?.endOffset ?? startOffset;
  const topOffset = segmentLines[0]?.top ?? 0;

  return {
    paragraphId: layout.paragraphId,
    text: layout.text.slice(startOffset, endOffset),
    fragments: layout.fragments
      .map((fragment) => sliceFragmentToRange(fragment, startOffset, endOffset))
      .filter(
        (fragment): fragment is EditorLayoutFragment => fragment !== null,
      ),
    lines: segmentLines.map((line, index) => ({
      ...line,
      index,
      top: line.top - topOffset,
      slots: line.slots.map((slot) => ({
        ...slot,
        top: slot.top - topOffset,
      })),
    })),
    startOffset,
    endOffset,
    contentWidth: layout.contentWidth,
  };
}

export function applyWidowOrphanControl(
  paragraph: EditorParagraphNode,
  lines: EditorLayoutLine[],
  startLineIndex: number,
  endLineIndexExclusive: number,
  styles: Record<string, EditorNamedStyle> | undefined,
  allowSpacingBefore = true,
  allowSpacingAfter = true,
  // When true, a lone first line of a multi-line paragraph at the bottom of a
  // page (an orphan) is pushed to the next page instead of being placed. Gated
  // so it never fires on a fresh page, which would loop forever.
  allowOrphanControl = false,
): { endLineIndexExclusive: number; height: number } {
  const heightFor = (end: number): number =>
    getParagraphSegmentHeight(
      paragraph,
      lines.slice(startLineIndex, end),
      startLineIndex === 0,
      end === lines.length,
      styles,
      allowSpacingBefore,
      allowSpacingAfter,
    );

  const paragraphStyle = getEffectiveParagraphStyle(paragraph, styles);
  if (paragraphStyle.widowControl === false) {
    return {
      endLineIndexExclusive,
      height: heightFor(endLineIndexExclusive),
    };
  }

  let adjustedEnd = endLineIndexExclusive;
  const remainingLineCount = lines.length - adjustedEnd;

  // Widow control: never carry a single trailing line to the next page.
  if (remainingLineCount === 1 && adjustedEnd - startLineIndex > 1) {
    adjustedEnd -= 1;
  }

  // Orphan control: never leave the lone first line of a multi-line paragraph
  // at the bottom of a page. Signal the caller (height 0, no lines) to move the
  // whole paragraph to the next page. Word keeps at least two lines together.
  if (
    allowOrphanControl &&
    startLineIndex === 0 &&
    adjustedEnd - startLineIndex === 1 &&
    lines.length > 1
  ) {
    return { endLineIndexExclusive: startLineIndex, height: 0 };
  }

  return {
    endLineIndexExclusive: adjustedEnd,
    height: heightFor(adjustedEnd),
  };
}

export interface EstimateParagraphBlockHeightOptions {
  allowSpacingBefore?: boolean;
  allowSpacingAfter?: boolean;
}

export function estimateParagraphBlockHeight(
  paragraph: EditorParagraphNode,
  styles?: Record<string, EditorNamedStyle>,
  contentWidth?: number,
  measurer: ITextMeasurer = domTextMeasurer,
  options: EstimateParagraphBlockHeightOptions = {},
  defaultTabStop?: number,
): number {
  const layout = projectParagraphLayout(
    paragraph,
    undefined,
    undefined,
    styles,
    contentWidth,
    measurer,
    defaultTabStop,
  );
  const lineHeightPx = layout.lines.reduce((sum, line) => sum + line.height, 0);
  const paragraphStyle = getEffectiveParagraphStyle(paragraph, styles);
  const spacingBefore =
    options.allowSpacingBefore === false
      ? 0
      : (paragraphStyle.spacingBefore ?? 0);
  const spacingAfter =
    options.allowSpacingAfter === false ? 0 : (paragraphStyle.spacingAfter ?? 0);
  const insets = getParagraphBorderInsets(paragraphStyle);

  return (
    spacingBefore + spacingAfter + lineHeightPx + insets.top + insets.bottom
  );
}
