import { DOMParser } from "@xmldom/xmldom";
import { DRAWINGML_NS, getChildrenByTagNameNS } from "./xmlHelpers.js";
import { extractThemeFonts, type ThemeFontMap } from "./themeFonts.js";
import { extractThemeColors, type ThemeColorMap } from "./themeColors.js";

/**
 * Resolved `word/theme/theme1.xml` data threaded through the importer: the font
 * scheme (for `*Theme` run fonts) and the color scheme (for `w:themeColor`).
 */
export interface DocxImportTheme {
  fonts: ThemeFontMap;
  colors: ThemeColorMap;
}

/**
 * Parses `word/theme/theme1.xml` once and extracts both font and color scheme
 * data. This is the only place the XML is parsed; the individual extractors
 * ({@link extractThemeFonts}, {@link extractThemeColors}) work on the DOM node.
 */
export function parseDocxTheme(themeXml: string | null): DocxImportTheme {
  if (!themeXml) {
    return { fonts: {}, colors: {} };
  }

  const document = new DOMParser().parseFromString(themeXml, "application/xml");
  const root = document.documentElement;
  const themeElements = root
    ? (getChildrenByTagNameNS(root, DRAWINGML_NS, "themeElements")[0] ?? null)
    : null;

  return {
    fonts: extractThemeFonts(themeElements),
    colors: extractThemeColors(themeElements),
  };
}
