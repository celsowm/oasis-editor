import { PT_PER_PX } from "@/core/units.js";

/**
 * Parses a table-size value (a raw number in pt, or a string with an
 * explicit `pt`/`px` suffix, or a bare number string) into points.
 * Percentage values are not a fixed unit and return `null`.
 */
export function parseUnitToPt(
  value: number | string | undefined,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.includes("%")) {
    return null;
  }
  if (trimmed.endsWith("pt")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (trimmed.endsWith("px")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? parsed * PT_PER_PX : null;
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
