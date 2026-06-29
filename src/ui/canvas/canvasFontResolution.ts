import {
  normalizeFamily,
  resolveMetricCompatibleFamily,
} from "@/export/pdf/fonts/officeFontAssets.js";
import {
  isLocalFontFamilyAvailable,
  isPreciseFontModeEnabled,
} from "@/text/fonts/preciseFontMode.js";
import { hasPreciseFont } from "@/text/fonts/preciseFontMetrics.js";
import { PX_PER_POINT } from "@/layoutProjection/constants.js";
import { DEFAULT_FONT_SIZE_PX } from "@/core/units.js";

// Pure canvas font/metric resolution helpers. Extracted from
// `canvasParagraphPainter` into this leaf so `verticalText` can use them without
// importing the paragraph painter (which imports the text-box painter, etc.) —
// keeping the canvas painter graph acyclic. `canvasParagraphPainter` re-exports
// these for its other consumers.

function quoteFontFamily(family: string): string {
  return /[\s,]/.test(family) ? `"${family.replace(/"/g, '\\"')}"` : family;
}

export function resolveCanvasFontFamily(
  fontFamily: string | null | undefined,
): string {
  const requested = normalizeFamily(fontFamily ?? "Calibri");
  const metric = resolveMetricCompatibleFamily(fontFamily ?? "Calibri");
  // The metric-compatible face (Tinos/Carlito/Arimo/Roboto) is bundled and
  // registered as a FontFace, and it is what the layout engine measures with.
  // Render it FIRST so glyph advances on screen match the measured slot
  // positions exactly; the requested system family is only a fallback for when
  // the bundled face has not registered yet.
  //
  // Precise font mode flips that order when the requested family is actually
  // installed locally AND its real face has been loaded for measurement
  // ({@link hasPreciseFont}). Gating on the loaded face keeps paint and
  // measurement in lockstep: the layout engine measures advances/line heights
  // from the very same real font, so on-screen glyph advances still match the
  // measured slots even when the substitute was not metric-compatible (Aptos).
  const preciseFirst =
    isPreciseFontModeEnabled() &&
    isLocalFontFamilyAvailable(requested) &&
    hasPreciseFont(requested);
  const families =
    requested.toLowerCase() === metric.toLowerCase()
      ? [metric]
      : preciseFirst
        ? [requested, metric]
        : [metric, requested];
  const generic = /serif/i.test(fontFamily ?? "") ? "serif" : "sans-serif";
  return [...families.map(quoteFontFamily), generic].join(", ");
}

export function resolveCanvasTextRenderMetrics(
  styles:
    | {
        superscript?: boolean;
        subscript?: boolean;
        smallCaps?: boolean;
        baselineShift?: number | null;
      }
    | undefined,
  fontSize: number,
): { fontSize: number; baselineOffset: number; } {
  const explicitBaselineShift = (styles?.baselineShift ?? 0) * PX_PER_POINT;
  if (styles?.smallCaps) {
    return {
      fontSize: fontSize * 0.8,
      baselineOffset: -explicitBaselineShift,
    };
  }
  if (styles?.superscript) {
    return {
      fontSize: fontSize * 0.75,
      baselineOffset: -fontSize * 0.35 - explicitBaselineShift,
    };
  }
  if (styles?.subscript) {
    return {
      fontSize: fontSize * 0.75,
      baselineOffset: fontSize * 0.2 - explicitBaselineShift,
    };
  }
  return {
    fontSize,
    baselineOffset: -explicitBaselineShift,
  };
}

/**
 * Canvas 2D text properties that newer browsers expose but the DOM lib types
 * (and some test environments) may not. Treated as optional + feature-detected.
 */
type CanvasTextFeatureContext = CanvasRenderingContext2D & {
  fontKerning?: "auto" | "normal" | "none";
  textRendering?:
    | "auto"
    | "optimizeSpeed"
    | "optimizeLegibility"
    | "geometricPrecision";
};

/**
 * Applies the subset of OpenType-feature/typography intent that Canvas 2D can
 * actually express, keeping painting consistent with the metric-only slot
 * measurement (see `measureCharacterWidth`).
 *
 * - **Kerning (`w:kern`)** → `ctx.fontKerning`. `w:kern/@w:val` is a *minimum
 *   font size threshold* (stored in pt as `kerningThreshold`); kerning is active
 *   only when the run's size meets it. Defaulting to `"none"` keeps the painter
 *   aligned with the no-kerning measurement, avoiding caret/slot drift.
 * - **Ligatures (`w14:ligatures`)** → `ctx.textRendering` as a *coarse, lossy
 *   hint* (`optimizeSpeed` suppresses, `optimizeLegibility` enables). It cannot
 *   distinguish standard/contextual/historical and is engine-dependent.
 *
 * Canvas 2D has **no** API for `w14:numForm`, `w14:numSpacing`,
 * `w14:stylisticSets`, or `w14:cntxtAlts` (no `fontVariantNumeric` /
 * `fontVariantLigatures` / `fontFeatureSettings`), so those remain a documented
 * canvas limitation — HTML/CSS honors them via `styleCss.ts`; PDF is separate.
 *
 * `fontVariantCaps`, `letterSpacing`, and `fontStretch` are intentionally left
 * untouched: small caps, character spacing, and character scale are already
 * realized by the render-metric/slot/scale path and would double-apply here.
 *
 * @param fontSizePx the run's effective (unscaled) font size in px.
 */
export function applyCanvasTextFeatureHints(
  ctx: CanvasRenderingContext2D,
  styles:
    | {
        kerningThreshold?: number | null;
        ligatures?:
          | "none"
          | "standard"
          | "contextual"
          | "historical"
          | "standardContextual"
          | null;
      }
    | undefined,
  fontSizePx: number,
): void {
  const featureCtx = ctx as CanvasTextFeatureContext;

  const threshold = styles?.kerningThreshold;
  const kerningActive =
    threshold !== undefined &&
    threshold !== null &&
    Number.isFinite(threshold) &&
    fontSizePx / PX_PER_POINT >= threshold;

  if ("fontKerning" in featureCtx) {
    featureCtx.fontKerning = kerningActive ? "normal" : "none";
  }

  if ("textRendering" in featureCtx) {
    featureCtx.textRendering =
      styles?.ligatures && styles.ligatures !== "none"
        ? "optimizeLegibility"
        : "optimizeSpeed";
  }
}

type RunStyleInput =
  | {
      bold?: boolean;
      italic?: boolean;
      fontFamily?: string | null;
      fontSize?: number | null;
      color?: string | null;
      characterScale?: number | null;
      superscript?: boolean;
      subscript?: boolean;
      smallCaps?: boolean;
      baselineShift?: number | null;
    }
  | undefined;

export function resolveCanvasRunPaintStyle(styles: RunStyleInput): {
  font: string;
  fillStyle: string;
  renderMetrics: ReturnType<typeof resolveCanvasTextRenderMetrics>;
  scale: number;
} {
  const fontSize = styles?.fontSize ?? DEFAULT_FONT_SIZE_PX;
  const fontFamily = resolveCanvasFontFamily(styles?.fontFamily);
  const fontWeight = styles?.bold ? "700" : "400";
  const fontStyle = styles?.italic ? "italic" : "normal";
  const renderMetrics = resolveCanvasTextRenderMetrics(styles, fontSize);
  return {
    font: `${fontStyle} ${fontWeight} ${renderMetrics.fontSize}px ${fontFamily}`,
    fillStyle: styles?.color ?? "#000000",
    renderMetrics,
    scale:
      styles?.characterScale && styles.characterScale > 0
        ? styles.characterScale / 100
        : 1,
  };
}
