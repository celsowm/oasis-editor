import {
  EMU_PER_PX,
  EMU_PER_PT,
  PX_PER_INCH,
  PX_PER_POINT,
} from "@/core/units.js";
export { EMU_PER_PX, EMU_PER_PT, PX_PER_INCH, PX_PER_POINT };
export const OOXML_PERCENT_DENOMINATOR = 100000;
export const OOXML_ROTATION_UNITS = 60000;
export const VML_FRACTION_DENOMINATOR = 65536;

export function emuToPx(value: string | null | undefined): number | undefined {
  const emu = parseOptionalInt(value);
  return emu === undefined ? undefined : Math.round(emu / EMU_PER_PX);
}

export function parseOptionalInt(
  value: string | null | undefined,
): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseCssLengthToPx(
  value: string | null | undefined,
): number | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)(pt|px|in|cm|mm|pc)?$/i);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  const unit = (match[2] ?? "px").toLowerCase();
  switch (unit) {
    case "pt":
      return Math.round(amount * PX_PER_POINT);
    case "in":
      return Math.round(amount * PX_PER_INCH);
    case "cm":
      return Math.round((amount / 2.54) * PX_PER_INCH);
    case "mm":
      return Math.round((amount / 25.4) * PX_PER_INCH);
    case "pc":
      return Math.round(amount * 12 * PX_PER_POINT);
    case "px":
    default:
      return Math.round(amount);
  }
}

export function normalizeHexColor(
  value: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return undefined;
  }
  return `#${trimmed.toUpperCase()}`;
}
