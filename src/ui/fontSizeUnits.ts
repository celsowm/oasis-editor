import { ptToPx, pxToPt } from "../export/pdf/units.js";

/**
 * Font sizes are stored in the model — and rendered on the canvas — in pixels,
 * but the toolbar and dialogs present them to the user in points (pt), matching
 * Word. These helpers convert at that UI boundary; the model/render stay in px.
 */

/** Standard point sizes offered in the toolbar and font dialog dropdowns. */
export const STANDARD_FONT_SIZES_PT = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72,
];

/** Convert a model pixel size to a point value, rounded to 2 decimals. */
export function fontSizePxToPt(px: number): number {
  return Math.round(pxToPt(px) * 100) / 100;
}

/** Convert a user-facing point size to a model pixel size, rounded to 4 decimals. */
export function fontSizePtToPx(pt: number): number {
  return Math.round(ptToPx(pt) * 10000) / 10000;
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
