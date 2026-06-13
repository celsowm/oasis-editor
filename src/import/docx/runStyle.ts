import { type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorTextStyle } from "../../core/model.js";
import { DEFAULT_EDITOR_STYLES } from "../../core/editorState.js";
import { resolveEffectiveTextStyleForParagraph } from "../../core/model.js";
import {
  WORD_NS,
  WORD14_NS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  parseOnOffProperty,
  parseStyleIdProperty,
  isWordTrue,
} from "./xmlHelpers.js";
import {
  twipsToPoints,
  halfPointsToPx,
  normalizeImportedFontFamily,
  normalizeImportedHexColor,
} from "./units.js";
import { resolveThemeFont } from "./themeFonts.js";
import { resolveThemeColor } from "./themeColors.js";
import { type DocxImportTheme } from "./theme.js";
import {
  stripUndefined,
  emptyOrUndefined,
  parseShdFill,
} from "./styleUtils.js";

export function normalizeImportedRunStyle(
  style: EditorTextStyle | undefined,
  paragraphStyleId: string | undefined,
): EditorTextStyle | undefined {
  if (!style) {
    return undefined;
  }

  const effective = resolveEffectiveTextStyleForParagraph(
    style,
    paragraphStyleId,
    DEFAULT_EDITOR_STYLES,
  );
  const defaultEffective = resolveEffectiveTextStyleForParagraph(
    undefined,
    paragraphStyleId,
    DEFAULT_EDITOR_STYLES,
  );

  // Pure dedup: keep when different from default-effective, drop when equal.
  const dd = <T>(e: T, d: T): T | undefined => (e !== d ? e : undefined);

  // Hybrid dedup: honor an explicit raw import (including explicit-off) first,
  // then fall back to pure dedup. Used for toggles where an inherited style
  // might set the flag but a direct `w:val="0"` must override it.
  const hd = <T>(raw: T | undefined, e: T, d: T): T | undefined =>
    raw !== undefined ? raw : dd(e, d);

  return stripUndefined({
    styleId: style.styleId,
    bold: hd(style.bold, effective.bold, defaultEffective.bold),
    italic: hd(style.italic, effective.italic, defaultEffective.italic),
    underline: dd(effective.underline, defaultEffective.underline),
    underlineStyle: dd(
      effective.underlineStyle,
      defaultEffective.underlineStyle,
    ),
    underlineColor: dd(
      effective.underlineColor,
      defaultEffective.underlineColor,
    ),
    strike: hd(style.strike, effective.strike, defaultEffective.strike),
    doubleStrike: hd(
      style.doubleStrike,
      effective.doubleStrike,
      defaultEffective.doubleStrike,
    ),
    superscript: dd(effective.superscript, defaultEffective.superscript),
    subscript: dd(effective.subscript, defaultEffective.subscript),
    smallCaps: hd(
      style.smallCaps,
      effective.smallCaps,
      defaultEffective.smallCaps,
    ),
    allCaps: hd(style.allCaps, effective.allCaps, defaultEffective.allCaps),
    hidden: hd(style.hidden, effective.hidden, defaultEffective.hidden),
    noProof: hd(style.noProof, effective.noProof, defaultEffective.noProof),
    webHidden: hd(
      style.webHidden,
      effective.webHidden,
      defaultEffective.webHidden,
    ),
    specVanish: hd(
      style.specVanish,
      effective.specVanish,
      defaultEffective.specVanish,
    ),
    textEffect: dd(effective.textEffect, defaultEffective.textEffect),
    characterScale: dd(
      effective.characterScale,
      defaultEffective.characterScale,
    ),
    characterSpacing: dd(
      effective.characterSpacing,
      defaultEffective.characterSpacing,
    ),
    baselineShift: dd(effective.baselineShift, defaultEffective.baselineShift),
    kerningThreshold: dd(
      effective.kerningThreshold,
      defaultEffective.kerningThreshold,
    ),
    ligatures: dd(effective.ligatures, defaultEffective.ligatures),
    numberSpacing: dd(effective.numberSpacing, defaultEffective.numberSpacing),
    numberForm: dd(effective.numberForm, defaultEffective.numberForm),
    stylisticSet: dd(effective.stylisticSet, defaultEffective.stylisticSet),
    contextualAlternates: dd(
      effective.contextualAlternates,
      defaultEffective.contextualAlternates,
    ),
    fontFamily: hd(
      style.fontFamily,
      effective.fontFamily,
      defaultEffective.fontFamily,
    ),
    fontSize: hd(style.fontSize, effective.fontSize, defaultEffective.fontSize),
    color: dd(effective.color, defaultEffective.color),
    highlight: dd(effective.highlight, defaultEffective.highlight),
    shading: dd(effective.shading, defaultEffective.shading),
    language: dd(effective.language, defaultEffective.language),
    link: dd(effective.link, defaultEffective.link),
  });
}

export function parseRunStyle(
  runProperties: XmlElement | null,
  theme: DocxImportTheme,
): EditorTextStyle | undefined {
  if (!runProperties) {
    return undefined;
  }

  const styles: EditorTextStyle = {};
  const styleId = parseStyleIdProperty(runProperties, "rStyle");
  if (styleId) {
    styles.styleId = styleId;
  }
  // OOXML toggles default to "on" when present but can be explicitly turned off
  // with `w:val="0"`. Honor that, because direct run formatting overrides an
  // inherited character/paragraph style (e.g. a run in a bold style with
  // `<w:b w:val="0"/>` must render not-bold).
  //
  // `w:b`/`w:i` apply to Latin text while `w:bCs`/`w:iCs` apply to complex
  // script (RTL, etc.). The editor model has a single bold/italic flag, so the
  // run is bold/italic if either variant is on, explicitly off when either is
  // off, and untouched when both are absent.
  const bold = parseOnOffProperty(runProperties, "b");
  const boldCs = parseOnOffProperty(runProperties, "bCs");
  if (bold !== undefined || boldCs !== undefined) {
    styles.bold = bold === true || boldCs === true;
  }
  const italic = parseOnOffProperty(runProperties, "i");
  const italicCs = parseOnOffProperty(runProperties, "iCs");
  if (italic !== undefined || italicCs !== undefined) {
    styles.italic = italic === true || italicCs === true;
  }
  const strike = parseOnOffProperty(runProperties, "strike");
  if (strike !== undefined) {
    styles.strike = strike;
  }
  const doubleStrike = parseOnOffProperty(runProperties, "dstrike");
  if (doubleStrike !== undefined) {
    styles.doubleStrike = doubleStrike;
  }
  const smallCaps = parseOnOffProperty(runProperties, "smallCaps");
  if (smallCaps !== undefined) {
    styles.smallCaps = smallCaps;
  }
  const allCaps = parseOnOffProperty(runProperties, "caps");
  if (allCaps !== undefined) {
    styles.allCaps = allCaps;
  }
  const hidden = parseOnOffProperty(runProperties, "vanish");
  if (hidden !== undefined) {
    styles.hidden = hidden;
  }
  const noProof = parseOnOffProperty(runProperties, "noProof");
  if (noProof !== undefined) {
    styles.noProof = noProof;
  }
  const webHidden = parseOnOffProperty(runProperties, "webHidden");
  if (webHidden !== undefined) {
    styles.webHidden = webHidden;
  }
  const specVanish = parseOnOffProperty(runProperties, "specVanish");
  if (specVanish !== undefined) {
    styles.specVanish = specVanish;
  }
  const textEffect = getAttributeValue(
    getFirstChildByTagNameNS(runProperties, WORD_NS, "effect"),
    "val",
  );
  if (textEffect) {
    styles.textEffect = textEffect;
  }
  const characterScale = getAttributeValue(
    getFirstChildByTagNameNS(runProperties, WORD_NS, "w"),
    "val",
  );
  if (characterScale) {
    const parsed = Number(characterScale);
    if (Number.isFinite(parsed) && parsed > 0) {
      styles.characterScale = parsed;
    }
  }
  const characterSpacing = getAttributeValue(
    getFirstChildByTagNameNS(runProperties, WORD_NS, "spacing"),
    "val",
  );
  if (characterSpacing) {
    const parsed = twipsToPoints(characterSpacing);
    if (parsed !== undefined) {
      styles.characterSpacing = parsed;
    }
  }
  const baselineShift = getAttributeValue(
    getFirstChildByTagNameNS(runProperties, WORD_NS, "position"),
    "val",
  );
  if (baselineShift) {
    const parsed = Number(baselineShift);
    if (Number.isFinite(parsed)) {
      styles.baselineShift = parsed / 2;
    }
  }
  const kerningThreshold = getAttributeValue(
    getFirstChildByTagNameNS(runProperties, WORD_NS, "kern"),
    "val",
  );
  if (kerningThreshold) {
    const parsed = Number(kerningThreshold);
    if (Number.isFinite(parsed) && parsed >= 0) {
      styles.kerningThreshold = parsed / 2;
    }
  }
  const ligatures = getAttributeValue(
    getFirstChildByTagNameNS(runProperties, WORD14_NS, "ligatures"),
    "val",
  );
  if (
    ligatures === "none" ||
    ligatures === "standard" ||
    ligatures === "contextual" ||
    ligatures === "historical" ||
    ligatures === "standardContextual"
  ) {
    styles.ligatures = ligatures;
  }
  const numberSpacing = getAttributeValue(
    getFirstChildByTagNameNS(runProperties, WORD14_NS, "numSpacing"),
    "val",
  );
  if (numberSpacing === "proportional" || numberSpacing === "tabular") {
    styles.numberSpacing = numberSpacing;
  }
  const numberForm = getAttributeValue(
    getFirstChildByTagNameNS(runProperties, WORD14_NS, "numForm"),
    "val",
  );
  if (numberForm === "lining" || numberForm === "oldStyle") {
    styles.numberForm = numberForm;
  }
  const stylisticSet = getAttributeValue(
    getFirstChildByTagNameNS(runProperties, WORD14_NS, "stylisticSets"),
    "val",
  );
  if (stylisticSet) {
    const parsed =
      /^[0-9a-fA-F]+$/.test(stylisticSet) && stylisticSet.length > 2
        ? Number.parseInt(stylisticSet, 16)
        : Number(stylisticSet);
    if (Number.isFinite(parsed) && parsed > 0) {
      for (let set = 1; set <= 20; set += 1) {
        if ((parsed & (1 << (set - 1))) !== 0) {
          styles.stylisticSet = set;
          break;
        }
      }
    }
  }
  const contextualAlternates = getAttributeValue(
    getFirstChildByTagNameNS(runProperties, WORD14_NS, "cntxtAlts"),
    "val",
  );
  if (contextualAlternates === null) {
    if (getFirstChildByTagNameNS(runProperties, WORD14_NS, "cntxtAlts")) {
      styles.contextualAlternates = true;
    }
  } else if (isWordTrue(contextualAlternates)) {
    styles.contextualAlternates = true;
  }

  const underline = getFirstChildByTagNameNS(runProperties, WORD_NS, "u");
  const underlineValue = getAttributeValue(underline, "val");
  if (underline && underlineValue !== "none") {
    styles.underline = true;
    if (underlineValue && underlineValue !== "single") {
      styles.underlineStyle =
        underlineValue as EditorTextStyle["underlineStyle"];
    }
    const underlineColor = getAttributeValue(underline, "color");
    if (underlineColor && underlineColor !== "auto") {
      styles.underlineColor = normalizeImportedHexColor(underlineColor);
    }
  }

  const vertAlign = getFirstChildByTagNameNS(
    runProperties,
    WORD_NS,
    "vertAlign",
  );
  const vertAlignValue = getAttributeValue(vertAlign, "val");
  if (vertAlignValue === "superscript") {
    styles.superscript = true;
  }
  if (vertAlignValue === "subscript") {
    styles.subscript = true;
  }

  const fonts = getFirstChildByTagNameNS(runProperties, WORD_NS, "rFonts");
  const fontFamily =
    getAttributeValue(fonts, "ascii") ??
    getAttributeValue(fonts, "hAnsi") ??
    getAttributeValue(fonts, "cs") ??
    getAttributeValue(fonts, "eastAsia") ??
    resolveThemeFont(fonts, theme.fonts);
  if (fontFamily) {
    styles.fontFamily = normalizeImportedFontFamily(fontFamily);
  }

  const size =
    getFirstChildByTagNameNS(runProperties, WORD_NS, "sz") ??
    getFirstChildByTagNameNS(runProperties, WORD_NS, "szCs");
  const sizeValue = getAttributeValue(size, "val");
  if (sizeValue) {
    const parsed = halfPointsToPx(sizeValue);
    if (parsed !== null) {
      styles.fontSize = parsed;
    }
  }

  const color = getFirstChildByTagNameNS(runProperties, WORD_NS, "color");
  const colorValue = getAttributeValue(color, "val");
  if (colorValue && colorValue !== "auto") {
    styles.color = normalizeImportedHexColor(colorValue);
  } else if (colorValue !== "auto") {
    // No literal `w:val` (or theme-only color): resolve `w:themeColor` against
    // the document theme, applying `w:themeTint`/`w:themeShade`.
    const themeColor = resolveThemeColor(color, theme.colors);
    if (themeColor) {
      styles.color = themeColor;
    }
  }

  const highlight = getFirstChildByTagNameNS(
    runProperties,
    WORD_NS,
    "highlight",
  );
  const highlightValue = getAttributeValue(highlight, "val");
  if (highlightValue && highlightValue !== "none") {
    styles.highlight = highlightValue;
  }

  // Run shading (w:shd): solid background fill behind the run's text. Only the
  // literal `w:fill` hex is resolved here; theme fills are a follow-up.
  const shd = getFirstChildByTagNameNS(runProperties, WORD_NS, "shd");
  const shdFill = parseShdFill(shd);
  if (shdFill) {
    styles.shading = shdFill;
  }

  const language = getFirstChildByTagNameNS(runProperties, WORD_NS, "lang");
  if (language) {
    const value = getAttributeValue(language, "val");
    const eastAsia = getAttributeValue(language, "eastAsia");
    const bidi = getAttributeValue(language, "bidi");
    const parsedLanguage: NonNullable<EditorTextStyle["language"]> = {};
    if (value) parsedLanguage.value = value;
    if (eastAsia) parsedLanguage.eastAsia = eastAsia;
    if (bidi) parsedLanguage.bidi = bidi;
    if (Object.keys(parsedLanguage).length > 0) {
      styles.language = parsedLanguage;
    }
  }

  return emptyOrUndefined(styles);
}
