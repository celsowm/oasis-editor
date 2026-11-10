// Shared color primitives. Single source of truth for hex (#RRGGBB) parsing
// and validation that was previously duplicated across the PDF and DOCX export
// backends (audit #3).
import { CSS_NAMED_COLORS } from "./cssNamedColors.js";

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

/**
 * Named, hex and RGB opaque sRGB colors as a six-digit body, without a browser.
 * Translucent colors and other CSS color spaces require a separate policy.
 */
export function normalizeOpaqueRgbColor(
  color: string | null | undefined,
): string | null {
  const hex6 = normalizeHex6(color);
  if (hex6) return hex6;
  const value = color?.trim();
  if (!value) return null;
  const keyword = value.toLowerCase();
  if (Object.hasOwn(CSS_NAMED_COLORS, keyword))
    return CSS_NAMED_COLORS[keyword]!;
  const hex = value.match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
  if (hex) {
    const expanded =
      hex.length <= 4 ? [...hex].map((digit) => digit + digit).join("") : hex;
    return expanded.length === 8 && expanded.slice(6).toLowerCase() !== "ff"
      ? null
      : expanded.slice(0, 6).toUpperCase();
  }
  const body = value.match(/^rgba?\((.*)\)$/i)?.[1];
  if (!body) return null;
  let channels: string[], alpha: string | undefined;
  if (body.includes(",")) {
    const parts = body.split(",").map((part) => part.trim());
    if (parts.length !== 3 && parts.length !== 4) return null;
    channels = parts.slice(0, 3);
    if (
      !channels.every(
        (part) => part.endsWith("%") === channels[0]!.endsWith("%"),
      )
    )
      return null;
    alpha = parts[3];
  } else {
    const parts = body.split("/");
    if (parts.length > 2) return null;
    channels = parts[0]!.trim().split(/\s+/);
    alpha = parts[1]?.trim();
  }
  const number = (part: string): number | null => {
    const raw = part.endsWith("%") ? part.slice(0, -1) : part;
    if (!/^[+-]?(?:\d*\.\d+|\d+)(?:e[+-]?\d+)?$/i.test(raw)) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };
  if (alpha !== undefined) {
    const parsed = number(alpha);
    if (parsed === null || parsed / (alpha.endsWith("%") ? 100 : 1) < 1)
      return null;
  }
  if (channels.length !== 3) return null;
  const rgb = channels.map((part) => {
    const parsed = number(part);
    return parsed === null
      ? null
      : parsed * (part.endsWith("%") ? 255 / 100 : 1);
  });
  if (rgb.some((channel) => channel === null)) return null;
  return rgb255ToHex(rgb[0]!, rgb[1]!, rgb[2]!).slice(1).toUpperCase();
}
