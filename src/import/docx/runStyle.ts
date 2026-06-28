import { type Element as XmlElement, XMLSerializer } from "@xmldom/xmldom";
import type {
  EditorGlow,
  EditorGradientStop,
  EditorReflection,
  EditorTextFill,
  EditorTextOutline,
  EditorTextShadow,
  EditorTextStyle,
} from "@/core/model.js";
import { DEFAULT_EDITOR_STYLES } from "@/core/editorState.js";
import { resolveEffectiveTextStyleForParagraph } from "@/core/model.js";
import {
  WORD_NS,
  WORD14_NS,
  getFirstChildByTagNameNS,
  getFirstW14Child,
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
  EMU_PER_PT,
  OOXML_PERCENT_DENOMINATOR,
  OOXML_ROTATION_UNITS,
} from "./units.js";
import { parseDocxBorder } from "./borders.js";
import { resolveThemeFont } from "./themeFonts.js";
import { resolveThemeColor } from "./themeColors.js";
import { type DocxImportTheme } from "./theme.js";
import {
  stripUndefined,
  emptyOrUndefined,
  parseShdFill,
} from "./styleUtils.js";

function parseW14SolidFillColor(solidFillEl: XmlElement): string | null {
  const srgbClr = getFirstChildByTagNameNS(solidFillEl, WORD14_NS, "srgbClr");
  if (!srgbClr) return null;
  const val = getAttributeValue(srgbClr, "val");
  return val ? (normalizeImportedHexColor(val) ?? null) : null;
}

function parseW14TextFill(fillEl: XmlElement): EditorTextFill | null {
  const solidFill = getFirstChildByTagNameNS(fillEl, WORD14_NS, "solidFill");
  if (solidFill) {
    const color = parseW14SolidFillColor(solidFill);
    if (color) return { type: "solid", color };
  }
  const gradFill = getFirstChildByTagNameNS(fillEl, WORD14_NS, "gradFill");
  if (gradFill) {
    const gsLst = getFirstChildByTagNameNS(gradFill, WORD14_NS, "gsLst");
    if (gsLst) {
      const stops: EditorGradientStop[] = [];
      for (let i = 0; i < gsLst.childNodes.length; i++) {
        const node = gsLst.childNodes[i];
        if (node?.nodeType !== node.ELEMENT_NODE) continue;
        const gs = node as XmlElement;
        if (gs.namespaceURI !== WORD14_NS || gs.localName !== "gs") continue;
        const posVal = getAttributeValue(gs, "pos");
        const pos =
          posVal !== null ? Number(posVal) / OOXML_PERCENT_DENOMINATOR : NaN;
        if (!Number.isFinite(pos)) continue;
        const srgbClr = getFirstChildByTagNameNS(gs, WORD14_NS, "srgbClr");
        if (!srgbClr) continue;
        const colorVal = getAttributeValue(srgbClr, "val");
        if (!colorVal) continue;
        const color = normalizeImportedHexColor(colorVal);
        if (!color) continue;
        const alphaEl = getFirstChildByTagNameNS(srgbClr, WORD14_NS, "alpha");
        const alphaRaw = alphaEl ? getAttributeValue(alphaEl, "val") : null;
        const alpha =
          alphaRaw !== null
            ? Number(alphaRaw) / OOXML_PERCENT_DENOMINATOR
            : undefined;
        const stop: EditorGradientStop = { position: pos, color };
        if (alpha !== undefined && Number.isFinite(alpha)) stop.alpha = alpha;
        stops.push(stop);
      }
      if (stops.length > 0) {
        const linEl = getFirstChildByTagNameNS(gradFill, WORD14_NS, "lin");
        const angRaw = linEl ? getAttributeValue(linEl, "ang") : null;
        const angle =
          angRaw !== null ? Number(angRaw) / OOXML_ROTATION_UNITS : undefined;
        const result: EditorTextFill = { type: "gradient", stops };
        if (angle !== undefined && Number.isFinite(angle)) result.angle = angle;
        return result;
      }
    }
  }
  return null;
}

function parseW14ColorEl(
  el: XmlElement,
): { color: string; alpha?: number } | null {
  const srgbClr = getFirstChildByTagNameNS(el, WORD14_NS, "srgbClr");
  if (!srgbClr) return null;
  const val = getAttributeValue(srgbClr, "val");
  const color = val ? (normalizeImportedHexColor(val) ?? null) : null;
  if (!color) return null;
  const alphaEl = getFirstChildByTagNameNS(srgbClr, WORD14_NS, "alpha");
  const alphaRaw = alphaEl ? getAttributeValue(alphaEl, "val") : null;
  const alpha =
    alphaRaw !== null && Number.isFinite(Number(alphaRaw))
      ? Number(alphaRaw) / OOXML_PERCENT_DENOMINATOR
      : undefined;
  return { color, ...(alpha !== undefined ? { alpha } : {}) };
}

function parseW14Shadow(el: XmlElement): EditorTextShadow | null {
  const colorData = parseW14ColorEl(el);
  if (!colorData) return null;
  const blurRaw = el.getAttributeNS(WORD14_NS, "blurRad");
  const distRaw = el.getAttributeNS(WORD14_NS, "dist");
  const dirRaw = el.getAttributeNS(WORD14_NS, "dir");
  const blurPt = blurRaw ? Number(blurRaw) / EMU_PER_PT : 0;
  const distPt = distRaw ? Number(distRaw) / EMU_PER_PT : 0;
  const dirDeg = dirRaw ? Number(dirRaw) / OOXML_ROTATION_UNITS : 0;
  return {
    color: colorData.color,
    ...(colorData.alpha !== undefined ? { alpha: colorData.alpha } : {}),
    blurPt,
    distPt,
    dirDeg,
  };
}

function parseW14Glow(el: XmlElement): EditorGlow | null {
  const colorData = parseW14ColorEl(el);
  if (!colorData) return null;
  const radRaw = el.getAttributeNS(WORD14_NS, "rad");
  const radiusPt = radRaw ? Number(radRaw) / EMU_PER_PT : 0;
  return {
    color: colorData.color,
    ...(colorData.alpha !== undefined ? { alpha: colorData.alpha } : {}),
    radiusPt,
  };
}

function parseW14Reflection(el: XmlElement): EditorReflection {
  const blurRaw = el.getAttributeNS(WORD14_NS, "blurRad");
  const stARaw = el.getAttributeNS(WORD14_NS, "stA");
  const stPosRaw = el.getAttributeNS(WORD14_NS, "stPos");
  const endARaw = el.getAttributeNS(WORD14_NS, "endA");
  const endPosRaw = el.getAttributeNS(WORD14_NS, "endPos");
  const distRaw = el.getAttributeNS(WORD14_NS, "dist");
  return {
    blurPt: blurRaw ? Number(blurRaw) / EMU_PER_PT : 0,
    startAlpha:
      stARaw !== null ? Number(stARaw) / OOXML_PERCENT_DENOMINATOR : 0.55,
    startPos:
      stPosRaw !== null ? Number(stPosRaw) / OOXML_PERCENT_DENOMINATOR : 0,
    endAlpha:
      endARaw !== null ? Number(endARaw) / OOXML_PERCENT_DENOMINATOR : 0,
    endPos:
      endPosRaw !== null ? Number(endPosRaw) / OOXML_PERCENT_DENOMINATOR : 1,
    distPt: distRaw ? Number(distRaw) / EMU_PER_PT : 0,
  };
}

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
    rtl: hd(style.rtl, effective.rtl, defaultEffective.rtl),
    complexScript: hd(
      style.complexScript,
      effective.complexScript,
      defaultEffective.complexScript,
    ),
    snapToGrid: hd(
      style.snapToGrid,
      effective.snapToGrid,
      defaultEffective.snapToGrid,
    ),
    outline: hd(style.outline, effective.outline, defaultEffective.outline),
    shadow: hd(style.shadow, effective.shadow, defaultEffective.shadow),
    emboss: hd(style.emboss, effective.emboss, defaultEffective.emboss),
    imprint: hd(style.imprint, effective.imprint, defaultEffective.imprint),
    fitText: dd(effective.fitText, defaultEffective.fitText),
    emphasisMark: dd(effective.emphasisMark, defaultEffective.emphasisMark),
    textBorder: dd(effective.textBorder, defaultEffective.textBorder),
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
    textFill: dd(effective.textFill, defaultEffective.textFill),
    textOutline: dd(effective.textOutline, defaultEffective.textOutline),
    textShadow: dd(effective.textShadow, defaultEffective.textShadow),
    glow: dd(effective.glow, defaultEffective.glow),
    reflection: dd(effective.reflection, defaultEffective.reflection),
    scene3dXml: dd(effective.scene3dXml, defaultEffective.scene3dXml),
    props3dXml: dd(effective.props3dXml, defaultEffective.props3dXml),
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
  const rtl = parseOnOffProperty(runProperties, "rtl");
  if (rtl !== undefined) {
    styles.rtl = rtl;
  }
  const complexScript = parseOnOffProperty(runProperties, "cs");
  if (complexScript !== undefined) {
    styles.complexScript = complexScript;
  }
  const snapToGrid = parseOnOffProperty(runProperties, "snapToGrid");
  if (snapToGrid !== undefined) {
    styles.snapToGrid = snapToGrid;
  }
  const outline = parseOnOffProperty(runProperties, "outline");
  if (outline !== undefined) {
    styles.outline = outline;
  }
  const shadow = parseOnOffProperty(runProperties, "shadow");
  if (shadow !== undefined) {
    styles.shadow = shadow;
  }
  const emboss = parseOnOffProperty(runProperties, "emboss");
  if (emboss !== undefined) {
    styles.emboss = emboss;
  }
  const imprint = parseOnOffProperty(runProperties, "imprint");
  if (imprint !== undefined) {
    styles.imprint = imprint;
  }
  // `w:em`: emphasis mark drawn over each glyph.
  const emphasisMark = getAttributeValue(
    getFirstChildByTagNameNS(runProperties, WORD_NS, "em"),
    "val",
  );
  if (
    emphasisMark === "dot" ||
    emphasisMark === "comma" ||
    emphasisMark === "circle" ||
    emphasisMark === "underDot" ||
    emphasisMark === "none"
  ) {
    styles.emphasisMark = emphasisMark;
  }
  // `w:fitText/@w:val`: target width in twips the run is fitted to.
  const fitText = getAttributeValue(
    getFirstChildByTagNameNS(runProperties, WORD_NS, "fitText"),
    "val",
  );
  if (fitText) {
    const parsed = twipsToPoints(fitText);
    if (parsed !== undefined && parsed > 0) {
      styles.fitText = parsed;
    }
  }
  // `w:bdr`: a single CT_Border identical to a paragraph/cell border edge.
  const textBorder = parseDocxBorder(
    getFirstChildByTagNameNS(runProperties, WORD_NS, "bdr"),
  );
  if (textBorder) {
    styles.textBorder = textBorder;
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

  const textFillEl = getFirstW14Child(runProperties, "textFill");
  if (textFillEl) {
    const textFill = parseW14TextFill(textFillEl);
    if (textFill) styles.textFill = textFill;
  }

  const textOutlineEl = getFirstW14Child(runProperties, "textOutline");
  if (textOutlineEl) {
    const wAttr = textOutlineEl.getAttributeNS(WORD14_NS, "w");
    const widthEmu = wAttr !== null ? Number(wAttr) : NaN;
    const widthPt =
      Number.isFinite(widthEmu) && widthEmu > 0 ? widthEmu / EMU_PER_PT : 0.5;
    const textOutline: EditorTextOutline = { widthPt };
    const outlineFill = parseW14TextFill(textOutlineEl);
    if (outlineFill) {
      textOutline.fill = outlineFill;
      if (outlineFill.type === "solid") {
        textOutline.color = outlineFill.color;
      } else if (outlineFill.type === "gradient" && outlineFill.stops[0]) {
        textOutline.color = outlineFill.stops[0].color;
      }
    }
    styles.textOutline = textOutline;
  }

  const shadowEl = getFirstW14Child(runProperties, "shadow");
  if (shadowEl) {
    const textShadow = parseW14Shadow(shadowEl);
    if (textShadow) styles.textShadow = textShadow;
  }

  const glowEl = getFirstW14Child(runProperties, "glow");
  if (glowEl) {
    const glow = parseW14Glow(glowEl);
    if (glow) styles.glow = glow;
  }

  const reflectionEl = getFirstW14Child(runProperties, "reflection");
  if (reflectionEl) {
    styles.reflection = parseW14Reflection(reflectionEl);
  }

  // 3D scene/material is not rendered; preserve the verbatim XML so it
  // round-trips losslessly instead of being silently dropped.
  const scene3dEl = getFirstW14Child(runProperties, "scene3d");
  if (scene3dEl) {
    styles.scene3dXml = new XMLSerializer().serializeToString(scene3dEl);
  }

  const props3dEl = getFirstW14Child(runProperties, "props3d");
  if (props3dEl) {
    styles.props3dXml = new XMLSerializer().serializeToString(props3dEl);
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

  const shd = getFirstChildByTagNameNS(runProperties, WORD_NS, "shd");
  const shdFill = parseShdFill(shd, theme.colors);
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
