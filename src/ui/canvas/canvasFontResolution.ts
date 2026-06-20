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
) {
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
