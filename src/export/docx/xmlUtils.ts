import {
  TWIPS_PER_INCH,
  PX_PER_INCH,
  TWIPS_PER_POINT,
} from "@/core/units.js";

export const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const PACKAGE_REL_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";
export const OFFICE_REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export const WORD14_NS = "http://schemas.microsoft.com/office/word/2010/wordml";

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function pxToTwips(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.round((value / PX_PER_INCH) * TWIPS_PER_INCH));
}

export function toTwips(value: number | null | undefined): number | null {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return null;
  }
  return Math.round((value / PX_PER_INCH) * TWIPS_PER_INCH);
}

export function toHalfPoints(value: number | null | undefined): number | null {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return null;
  }
  return Math.round((value / PX_PER_INCH) * 72 * 2);
}

export function pointsToTwips(value: number | null | undefined): number | null {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.round(value * TWIPS_PER_POINT));
}

export function normalizeDocxColor(
  color: string | undefined,
  fallback = "000000",
): string {
  const normalized = color?.trim().replace(/^#/, "");
  return normalized && /^[0-9a-fA-F]{6}$/.test(normalized)
    ? normalized.toUpperCase()
    : fallback;
}
