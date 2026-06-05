import { type Element as XmlElement } from "@xmldom/xmldom";
import {
  DRAWINGML_NS,
  getFirstChildByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";
import { normalizeImportedHexColor } from "./units.js";

/**
 * Resolved theme color scheme (`<a:clrScheme>` from `word/theme/theme1.xml`).
 * Each slot holds a concrete `#RRGGBB` value. Slots use DrawingML names
 * (`dk1`, `lt1`, `accent1`, `hlink`, …); WordprocessingML `w:themeColor`
 * tokens are mapped onto these slots in {@link resolveThemeColor}.
 */
export interface ThemeColorMap {
  dk1?: string;
  lt1?: string;
  dk2?: string;
  lt2?: string;
  accent1?: string;
  accent2?: string;
  accent3?: string;
  accent4?: string;
  accent5?: string;
  accent6?: string;
  hlink?: string;
  folHlink?: string;
}

const SCHEME_SLOTS: (keyof ThemeColorMap)[] = [
  "dk1",
  "lt1",
  "dk2",
  "lt2",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "hlink",
  "folHlink",
];

/**
 * Reads a single scheme slot's color, accepting both `<a:srgbClr val="…"/>`
 * and `<a:sysClr lastClr="…"/>` (dk1/lt1 are usually system colors that carry
 * the resolved value in `lastClr`).
 */
function readSchemeColor(slot: XmlElement | null): string | undefined {
  const srgb = getFirstChildByTagNameNS(slot, DRAWINGML_NS, "srgbClr");
  if (srgb) {
    return normalizeImportedHexColor(getAttributeValue(srgb, "val"));
  }
  const sys = getFirstChildByTagNameNS(slot, DRAWINGML_NS, "sysClr");
  if (sys) {
    return normalizeImportedHexColor(getAttributeValue(sys, "lastClr"));
  }
  return undefined;
}

/**
 * Extracts color-scheme data from the `<a:themeElements>` DOM node already
 * parsed by {@link parseDocxTheme}. Does not re-parse XML.
 */
export function extractThemeColors(
  themeElements: XmlElement | null | undefined,
): ThemeColorMap {
  const colorScheme = getFirstChildByTagNameNS(
    themeElements,
    DRAWINGML_NS,
    "clrScheme",
  );
  if (!colorScheme) {
    return {};
  }

  const colors: ThemeColorMap = {};
  for (const slot of SCHEME_SLOTS) {
    const color = readSchemeColor(
      getFirstChildByTagNameNS(colorScheme, DRAWINGML_NS, slot),
    );
    if (color) {
      colors[slot] = color;
    }
  }
  return colors;
}

/**
 * Maps a WordprocessingML `w:themeColor` token onto a scheme slot using the
 * default DOCX color map. The optional `w:clrSchemeMapping` override in
 * `settings.xml` (which can remap text1/background1) is not honored.
 */
function themeTokenToSlot(token: string): keyof ThemeColorMap | undefined {
  switch (token) {
    case "dark1":
    case "text1":
      return "dk1";
    case "light1":
    case "background1":
      return "lt1";
    case "dark2":
    case "text2":
      return "dk2";
    case "light2":
    case "background2":
      return "lt2";
    case "accent1":
    case "accent2":
    case "accent3":
    case "accent4":
    case "accent5":
    case "accent6":
      return token;
    case "hyperlink":
      return "hlink";
    case "followedHyperlink":
      return "folHlink";
    default:
      return undefined;
  }
}

/**
 * Parses a `w:themeTint`/`w:themeShade` byte (hex `00`–`FF`) into a 0–1 factor.
 */
function parseThemeFactor(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const byte = Number.parseInt(value, 16);
  return Number.isFinite(byte) ? byte / 255 : undefined;
}

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function toHex(r: number, g: number, b: number): string {
  const part = (channel: number): string =>
    clampChannel(channel).toString(16).padStart(2, "0").toUpperCase();
  return `#${part(r)}${part(g)}${part(b)}`;
}

/**
 * Resolves a `w:color`/`w:shd` element that references the theme
 * (`w:themeColor` with optional `w:themeTint`/`w:themeShade`) into a concrete
 * `#RRGGBB` value. Returns `undefined` when the element has no theme reference
 * or the scheme slot is unknown.
 *
 * `themeShade` darkens toward black; `themeTint` lightens toward white. Both use
 * the standard per-channel approximation of Word's luminance modulation.
 */
export function resolveThemeColor(
  colorElement: XmlElement | null,
  colors: ThemeColorMap,
): string | undefined {
  const token = getAttributeValue(colorElement, "themeColor");
  if (!token) {
    return undefined;
  }

  const slot = themeTokenToSlot(token);
  const base = slot ? colors[slot] : undefined;
  if (!base) {
    return undefined;
  }

  let r = Number.parseInt(base.slice(1, 3), 16);
  let g = Number.parseInt(base.slice(3, 5), 16);
  let b = Number.parseInt(base.slice(5, 7), 16);

  const shade = parseThemeFactor(getAttributeValue(colorElement, "themeShade"));
  if (shade !== undefined) {
    r *= shade;
    g *= shade;
    b *= shade;
  }

  const tint = parseThemeFactor(getAttributeValue(colorElement, "themeTint"));
  if (tint !== undefined) {
    const lift = 255 * (1 - tint);
    r = r * tint + lift;
    g = g * tint + lift;
    b = b * tint + lift;
  }

  return toHex(r, g, b);
}
