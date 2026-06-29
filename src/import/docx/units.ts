import {
  TWIPS_PER_INCH,
  PX_PER_INCH,
  EMU_PER_PT,
  OOXML_PERCENT_DENOMINATOR,
  OOXML_ROTATION_UNITS,
} from "@/core/units.js";
import { roundTo } from "@/utils/round.js";
export {
  TWIPS_PER_INCH,
  PX_PER_INCH,
  EMU_PER_PT,
  OOXML_PERCENT_DENOMINATOR,
  OOXML_ROTATION_UNITS,
};
export const PAGE_BREAK_MARKER = "\f";
export const DOCX_IMPLICIT_SINGLE_LINE_HEIGHT = 1.1;

export function twipsToPx(
  value: string | null | undefined,
  fallback: number,
): number {
  const parsed = value ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.round((parsed / TWIPS_PER_INCH) * PX_PER_INCH);
}

export function twipsToPoints(
  value: string | null | undefined,
): number | undefined {
  const parsed = value ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return roundTo(parsed / 20, 4);
}

export function halfPointsToPx(
  value: string | null | undefined,
): number | null {
  const parsed = value ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return roundTo((parsed / 2 / 72) * PX_PER_INCH, 4);
}

export function normalizeImportedFontFamily(
  value: string | null | undefined,
): string | undefined {
  const family = value?.trim();
  if (!family) {
    return undefined;
  }
  const quoted = /[\s,]/.test(family)
    ? `"${family.replace(/"/g, '\\"')}"`
    : family;
  const fallback = /times/i.test(family) ? "serif" : "sans-serif";
  return `${quoted}, ${fallback}`;
}

export function normalizeImportedHexColor(
  value: string | null | undefined,
): string | undefined {
  const color = value?.trim();
  if (!color || color === "auto" || color === "none") {
    return undefined;
  }
  return color.startsWith("#") ? color : `#${color.toUpperCase()}`;
}
