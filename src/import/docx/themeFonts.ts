import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import {
  DRAWINGML_NS,
  getChildrenByTagNameNS,
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

export function parseThemeFonts(themeXml: string | null): ThemeFontMap {
  if (!themeXml) {
    return {};
  }

  const document = new DOMParser().parseFromString(themeXml, "application/xml");
  const root = document.documentElement;
  const themeElements = root
    ? getChildrenByTagNameNS(root, DRAWINGML_NS, "themeElements")[0]
    : null;
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

  const latinTypeface = (
    fontElement: XmlElement | null,
  ): string | undefined => {
    const latin = getFirstChildByTagNameNS(fontElement, DRAWINGML_NS, "latin");
    const typeface = latin?.getAttribute("typeface")?.trim();
    return typeface || undefined;
  };
  const complexScriptTypeface = (
    fontElement: XmlElement | null,
  ): string | undefined => {
    const complexScript = getFirstChildByTagNameNS(
      fontElement,
      DRAWINGML_NS,
      "cs",
    );
    const typeface = complexScript?.getAttribute("typeface")?.trim();
    return typeface || latinTypeface(fontElement);
  };
  const eastAsiaTypeface = (
    fontElement: XmlElement | null,
  ): string | undefined => {
    const eastAsia = getFirstChildByTagNameNS(fontElement, DRAWINGML_NS, "ea");
    const typeface = eastAsia?.getAttribute("typeface")?.trim();
    return typeface || latinTypeface(fontElement);
  };

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
