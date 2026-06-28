import type { EditorTextStyle } from "./model.js";

export type UnderlineStyle = EditorTextStyle["underlineStyle"];

export function underlineStyleToCssDecorationStyle(
  underlineStyle: UnderlineStyle,
): string | null {
  switch (underlineStyle) {
    case "double":
    case "wavyDouble":
      return "double";
    case "dotted":
    case "dottedHeavy":
      return "dotted";
    case "dash":
    case "dashedHeavy":
    case "dashLong":
    case "dashLongHeavy":
    case "dotDash":
    case "dashDotHeavy":
    case "dotDotDash":
    case "dashDotDotHeavy":
      return "dashed";
    case "wave":
    case "wavyHeavy":
      return "wavy";
    default:
      return null;
  }
}

export function isDoubleUnderlineStyle(
  underlineStyle: UnderlineStyle,
): boolean {
  return underlineStyle === "double" || underlineStyle === "wavyDouble";
}

export function isWavyUnderlineStyle(underlineStyle: UnderlineStyle): boolean {
  return underlineStyle === "wave" || underlineStyle === "wavyHeavy";
}

export const WAVY_UNDERLINE_AMPLITUDE_PX = 1.5;
export const WAVY_UNDERLINE_WAVELENGTH_PX = 4;

export function underlineStyleLineWidthPx(
  underlineStyle: UnderlineStyle,
): number {
  switch (underlineStyle) {
    case "thick":
    case "dashedHeavy":
    case "dashLongHeavy":
    case "dashDotHeavy":
    case "dashDotDotHeavy":
    case "dottedHeavy":
    case "wavyHeavy":
      return 2;
    default:
      return 1;
  }
}

/**
 * Resolves the OpenType feature tags a run explicitly enables, mirroring the CSS
 * semantics in `styleCss.ts` (only enabled features, no implicit defaults). Used
 * by the PDF shaper to drive GSUB substitution and GPOS kerning. Returns a sorted,
 * de-duped array so it doubles as a stable cache key.
 *
 * `fontSizePt` (the run's resolved point size) gates the GPOS `kern` tag the same
 * way Word's `w:kern` threshold and the canvas painter do: kerning applies only
 * when the run's size meets `kerningThreshold`. Omit it to resolve substitution
 * tags alone.
 */
export function resolveOpenTypeFeatureTags(
  style: EditorTextStyle,
  fontSizePt?: number,
): string[] {
  const tags = new Set<string>();

  switch (style.ligatures) {
    case "standard":
      tags.add("liga");
      break;
    case "contextual":
      tags.add("calt");
      break;
    case "historical":
      tags.add("hlig");
      break;
    case "standardContextual":
      tags.add("liga");
      tags.add("calt");
      break;
    default:
      break;
  }

  if (style.numberForm === "lining") tags.add("lnum");
  if (style.numberForm === "oldStyle") tags.add("onum");
  if (style.numberSpacing === "proportional") tags.add("pnum");
  if (style.numberSpacing === "tabular") tags.add("tnum");

  if (
    typeof style.stylisticSet === "number" &&
    style.stylisticSet >= 1 &&
    style.stylisticSet <= 20
  ) {
    tags.add(`ss${String(style.stylisticSet).padStart(2, "0")}`);
  }

  if (style.contextualAlternates) tags.add("calt");

  // GPOS pair kerning. `kerningThreshold` (pt) is Word's `w:kern` minimum font
  // size; kerning is active only when the run's size meets it.
  if (
    typeof fontSizePt === "number" &&
    typeof style.kerningThreshold === "number" &&
    Number.isFinite(style.kerningThreshold) &&
    fontSizePt >= style.kerningThreshold
  ) {
    tags.add("kern");
  }

  return Array.from(tags).sort();
}

export function underlineStyleDashArray(
  underlineStyle: UnderlineStyle,
): number[] | undefined {
  switch (underlineStyle) {
    case "dotted":
    case "dottedHeavy":
      return [1.5, 2.5];
    case "dash":
    case "dashedHeavy":
      return [4, 3];
    case "dashLong":
    case "dashLongHeavy":
      return [8, 3];
    case "dotDash":
    case "dashDotHeavy":
      return [4, 2, 1, 2];
    case "dotDotDash":
    case "dashDotDotHeavy":
      return [4, 2, 1, 2, 1, 2];
    default:
      return undefined;
  }
}
