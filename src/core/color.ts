// Shared color primitives. Single source of truth for hex (#RRGGBB) parsing
// and validation that was previously duplicated across the PDF and DOCX export
// backends (audit #3).

/** Matches a 6-digit hex color body (no leading `#`). */
const HEX6_PATTERN = /^[0-9a-fA-F]{6}$/;

/** Strips an optional leading `#` and surrounding whitespace. */
export function stripHashPrefix(color: string): string {
  return color.trim().replace(/^#/, "");
}

/**
 * Validates a `#RRGGBB` (or `RRGGBB`) hex color and returns its uppercase
 * 6-digit body without the leading `#`. Returns `null` when the input is not a
 * valid 6-digit hex color.
 */
export function normalizeHex6(color: string | null | undefined): string | null {
  if (!color) {
    return null;
  }
  const body = stripHashPrefix(color);
  return HEX6_PATTERN.test(body) ? body.toUpperCase() : null;
}

/**
 * Parses a `#RRGGBB` (or `RRGGBB`) hex color into 0–255 integer RGB channels.
 * Returns `null` when the input is not a valid 6-digit hex color.
 */
export function parseHexColorToRgb255(
  color: string | null | undefined,
): [number, number, number] | null {
  if (!color) {
    return null;
  }
  const normalized = stripHashPrefix(color);
  if (!HEX6_PATTERN.test(normalized)) {
    return null;
  }
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

/** Formats 0–255 integer RGB channels as a lowercase `#rrggbb` string. */
export function rgb255ToHex(r: number, g: number, b: number): string {
  const toHex = (value: number): string =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
