import { type Element as XmlElement } from "@xmldom/xmldom";
import {
  DRAWINGML_NS,
  getFirstChildByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";

export interface ThemeFontMap {
  majorHAnsi?: string;
  minorHAnsi?: string;
  majorEastAsia?: string;
  minorEastAsia?: string;
  majorBidi?: string;
  minorBidi?: string;
}

const latinTypeface = (fontElement: XmlElement | null): string | undefined => {
  const latin = getFirstChildByTagNameNS(fontElement, DRAWINGML_NS, "latin");
  const typeface = latin?.getAttribute("typeface")?.trim();
  return typeface || undefined;
};

const complexScriptTypeface = (
  fontElement: XmlElement | null,
): string | undefined => {
  const cs = getFirstChildByTagNameNS(fontElement, DRAWINGML_NS, "cs");
  const typeface = cs?.getAttribute("typeface")?.trim();
  return typeface || latinTypeface(fontElement);
};

const eastAsiaTypeface = (
  fontElement: XmlElement | null,
): string | undefined => {
  const eastAsia = getFirstChildByTagNameNS(fontElement, DRAWINGML_NS, "ea");
  const typeface = eastAsia?.getAttribute("typeface")?.trim();
  return typeface || latinTypeface(fontElement);
};

/**
 * Extracts font-scheme data from the `<a:themeElements>` DOM node already
 * parsed by {@link parseDocxTheme}. Does not re-parse XML.
 */
export function extractThemeFonts(
  themeElements: XmlElement | null | undefined,
): ThemeFontMap {
  const fontScheme = getFirstChildByTagNameNS(
    themeElements,
    DRAWINGML_NS,
    "fontScheme",
  );
  const majorFont = getFirstChildByTagNameNS(
    fontScheme,
    DRAWINGML_NS,
    "majorFont",
  );
  const minorFont = getFirstChildByTagNameNS(
    fontScheme,
    DRAWINGML_NS,
    "minorFont",
  );
  return {
    majorHAnsi: latinTypeface(majorFont),
    minorHAnsi: latinTypeface(minorFont),
    majorEastAsia: eastAsiaTypeface(majorFont),
    minorEastAsia: eastAsiaTypeface(minorFont),
    majorBidi: complexScriptTypeface(majorFont),
    minorBidi: complexScriptTypeface(minorFont),
  };
}

export function resolveThemeFont(
  fonts: XmlElement | null,
  themeFonts: ThemeFontMap,
): string | undefined {
  const themeKey =
    getAttributeValue(fonts, "asciiTheme") ??
    getAttributeValue(fonts, "hAnsiTheme") ??
    getAttributeValue(fonts, "eastAsiaTheme") ??
    getAttributeValue(fonts, "cstheme");
  if (!themeKey) {
    return undefined;
  }

  const normalizedThemeKey =
    themeKey === "majorAscii" || themeKey === "majorHAnsi"
      ? "majorHAnsi"
      : themeKey === "minorAscii" || themeKey === "minorHAnsi"
        ? "minorHAnsi"
        : themeKey === "majorEastAsia"
          ? "majorEastAsia"
          : themeKey === "minorEastAsia"
            ? "minorEastAsia"
            : themeKey === "majorBidi"
              ? "majorBidi"
              : themeKey === "minorBidi"
                ? "minorBidi"
                : undefined;

  return normalizedThemeKey ? themeFonts[normalizedThemeKey] : undefined;
}
