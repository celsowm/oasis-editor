import { ptToPx, pxToPt } from "@/export/pdf/units.js";
import { roundTo } from "@/utils/round.js";

/**
 * Font sizes are stored in the model — and rendered on the canvas — in pixels,
 * but the toolbar and dialogs present them to the user in points (pt), matching
 * Word. These helpers convert at that UI boundary; the model/render stay in px.
 */

/** Standard point sizes offered in the toolbar and font dialog dropdowns. */
export const STANDARD_FONT_SIZES_PT = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72,
];

/** Next larger standard point size (Word's "Grow Font"). */
export function nextFontSizePt(currentPt: number): number {
  for (const size of STANDARD_FONT_SIZES_PT) {
    if (size > currentPt + 1e-6) {
      return size;
    }
  }
  return Math.round(currentPt) + 10;
}

/** Next smaller standard point size (Word's "Shrink Font"). */
export function previousFontSizePt(currentPt: number): number {
  for (let index = STANDARD_FONT_SIZES_PT.length - 1; index >= 0; index -= 1) {
    const size = STANDARD_FONT_SIZES_PT[index]!;
    if (size < currentPt - 1e-6) {
      return size;
    }
  }
  return Math.max(1, Math.round(currentPt) - 1);
}

/** Convert a model pixel size to a point value, rounded to 2 decimals. */
export function fontSizePxToPt(px: number): number {
  return roundTo(pxToPt(px), 2);
}

/** Convert a user-facing point size to a model pixel size, rounded to 4 decimals. */
export function fontSizePtToPx(pt: number): number {
  return roundTo(ptToPx(pt), 4);
}

/** Format a model pixel size as a point display string ("" when invalid/≤0). */
export function formatFontSizePt(
  px: string | number | null | undefined,
): string {
  const value = Number(px);
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }
  return String(fontSizePxToPt(value));
}

/** Parse a user-facing point string into a model pixel size (null when invalid/≤0). */
export function parseFontSizePtToPx(
  pt: string | number | null | undefined,
): number | null {
  const value = Number(pt);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return fontSizePtToPx(value);
}
