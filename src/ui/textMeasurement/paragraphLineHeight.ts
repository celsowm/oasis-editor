import type {
  EditorNamedStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
} from "@/core/model.js";
import {
  getRunImage,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "@/core/model.js";
import { PX_PER_POINT } from "./constants.js";
import { resolveRenderedLineHeightPx } from "./fontMetrics.js";

const DEFAULT_LINE_HEIGHT = 1.15;

interface ResolvedLineSpacing {
  rule: "auto" | "exact" | "atLeast";
  /** Multiplier to use for the natural (single-line) height computation. */
  multiplier: number;
  /** Absolute height in px for exact/atLeast rules (0 for auto). */
  absolutePx: number;
}

/**
 * Interprets `lineHeight`/`lineRule`. For `exact`/`atLeast`, `lineHeight` is an
 * absolute px height; otherwise it is a multiplier of single line spacing.
 */
export function resolveLineSpacing(
  paragraphStyle: EditorParagraphStyle,
): ResolvedLineSpacing {
  const rule = paragraphStyle.lineRule ?? "auto";
  if (rule === "exact" || rule === "atLeast") {
    return {
      rule,
      multiplier: DEFAULT_LINE_HEIGHT,
      absolutePx: paragraphStyle.lineHeight ?? 0,
    };
  }
  return {
    rule: "auto",
    multiplier: paragraphStyle.lineHeight ?? DEFAULT_LINE_HEIGHT,
    absolutePx: 0,
  };
}

/**
 * Applies the line rule to a naturally-computed line height: `exact` forces the
 * absolute value, `atLeast` grows the natural height to the minimum, `auto`
 * leaves it unchanged.
 */
export function applyLineRule(
  naturalHeight: number,
  spacing: ResolvedLineSpacing,
): number {
  if (spacing.rule === "exact") {
    return spacing.absolutePx;
  }
  if (spacing.rule === "atLeast") {
    return Math.max(naturalHeight, spacing.absolutePx);
  }
  return naturalHeight;
}

export function getParagraphLineHeight(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
  fallbackFontSize: number,
): number {
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    styles,
  );
  const spacing = resolveLineSpacing(paragraphStyle);
  const lineHeight = spacing.multiplier;
  const lineGridPitch = paragraphStyle.lineGridPitch;
  const snapToGrid = paragraphStyle.snapToGrid !== false;

  const paragraphTextStyle = resolveEffectiveTextStyleForParagraph(
    undefined,
    paragraph.style?.styleId,
    styles,
  );
  const maxRunHeight = paragraph.runs.reduce((largest, run) => {
    const runTextStyle = resolveEffectiveTextStyleForParagraph(
      run.styles,
      paragraph.style?.styleId,
      styles,
    );
    const fontSize =
      runTextStyle.fontSize ?? paragraphTextStyle.fontSize ?? fallbackFontSize;
    const baselineShiftPx =
      Math.abs(runTextStyle.baselineShift ?? 0) * PX_PER_POINT;
    const runLineHeight = resolveRenderedLineHeightPx(
      { ...runTextStyle, fontSize },
      lineHeight,
    );
    // Floating images are painted outside the text flow, so they must not grow
    // the line height (matches the tokenizer and min-content-width measurement).
    const image = getRunImage(run);
    const imageHeight = image && !image.floating ? image.height : 0;
    return Math.max(largest, runLineHeight + baselineShiftPx, imageHeight);
  }, 0);

  const renderedLineHeight = Math.max(
    resolveRenderedLineHeightPx(
      {
        ...paragraphTextStyle,
        fontSize: paragraphTextStyle.fontSize ?? fallbackFontSize,
      },
      lineHeight,
    ),
    maxRunHeight,
  );

  const ruledLineHeight = applyLineRule(renderedLineHeight, spacing);

  if (lineGridPitch && lineGridPitch > 0 && snapToGrid) {
    return Math.ceil(ruledLineHeight / lineGridPitch) * lineGridPitch;
  }
  return ruledLineHeight;
}
