import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorNamedStyle,
  EditorParagraphStyle,
  EditorTabStop,
  EditorTableStyle,
  EditorTextStyle,
} from "../../core/model.js";
import { DEFAULT_EDITOR_STYLES } from "../../core/editorState.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../../core/model.js";
import {
  WORD_NS,
  WORD14_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  parseOnOffProperty,
  parseStyleIdProperty,
  isWordTrue,
} from "./xmlHelpers.js";
import {
  twipsToPx,
  twipsToPoints,
  halfPointsToPx,
  normalizeImportedFontFamily,
  normalizeImportedHexColor,
  DOCX_IMPLICIT_SINGLE_LINE_HEIGHT,
} from "./units.js";
import { parseDocxBoxBorders } from "./borders.js";
import { type ThemeFontMap, resolveThemeFont } from "./themeFonts.js";

function stripUndefined<T extends Record<string, unknown>>(
  value: T,
): Partial<T> | undefined {
  const entries = Object.entries(value).filter(
    ([, entryValue]) => entryValue !== undefined,
  );
  return entries.length > 0
    ? (Object.fromEntries(entries) as Partial<T>)
    : undefined;
}

export function normalizeImportedParagraphStyle(
  style: EditorParagraphStyle | undefined,
): EditorParagraphStyle | undefined {
  if (!style) {
    return undefined;
  }

  const effective = resolveEffectiveParagraphStyle(
    style,
    DEFAULT_EDITOR_STYLES,
  );
  const defaultEffective = resolveEffectiveParagraphStyle(
    undefined,
    DEFAULT_EDITOR_STYLES,
  );

  const normalized = stripUndefined({
    styleId: style.styleId,
    align:
      effective.align !== defaultEffective.align ? effective.align : undefined,
    spacingBefore:
      effective.spacingBefore !== defaultEffective.spacingBefore
        ? effective.spacingBefore
        : undefined,
    spacingAfter:
      effective.spacingAfter !== defaultEffective.spacingAfter
        ? effective.spacingAfter
        : undefined,
    contextualSpacing:
      style.contextualSpacing !== undefined ||
      effective.contextualSpacing !== defaultEffective.contextualSpacing
        ? effective.contextualSpacing
        : undefined,
    lineHeight:
      effective.lineHeight !== defaultEffective.lineHeight
        ? effective.lineHeight
        : undefined,
    lineGridPitch: style.lineGridPitch ?? undefined,
    snapToGrid:
      style.snapToGrid !== undefined ||
      effective.snapToGrid !== defaultEffective.snapToGrid
        ? effective.snapToGrid
        : undefined,
    indentLeft:
      style.indentLeft !== undefined ||
      effective.indentLeft !== defaultEffective.indentLeft
        ? effective.indentLeft
        : undefined,
    indentRight:
      style.indentRight !== undefined ||
      effective.indentRight !== defaultEffective.indentRight
        ? effective.indentRight
        : undefined,
    indentFirstLine:
      style.indentFirstLine !== undefined ||
      effective.indentFirstLine !== defaultEffective.indentFirstLine
        ? effective.indentFirstLine
        : undefined,
    indentHanging:
      style.indentHanging !== undefined ||
      effective.indentHanging !== defaultEffective.indentHanging
        ? effective.indentHanging
        : undefined,
    pageBreakBefore:
      style.pageBreakBefore !== undefined ||
      effective.pageBreakBefore !== defaultEffective.pageBreakBefore
        ? effective.pageBreakBefore
        : undefined,
    keepWithNext:
      style.keepWithNext !== undefined ||
      effective.keepWithNext !== defaultEffective.keepWithNext
        ? effective.keepWithNext
        : undefined,
    keepLinesTogether:
      style.keepLinesTogether !== undefined ||
      effective.keepLinesTogether !== defaultEffective.keepLinesTogether
        ? effective.keepLinesTogether
        : undefined,
    widowControl:
      style.widowControl !== undefined ||
      effective.widowControl !== defaultEffective.widowControl
        ? effective.widowControl
        : undefined,
    shading: style.shading ?? undefined,
    borderTop: style.borderTop ?? undefined,
    borderRight: style.borderRight ?? undefined,
    borderBottom: style.borderBottom ?? undefined,
    borderLeft: style.borderLeft ?? undefined,
    tabs: style.tabs ?? undefined,
  });

  return normalized;
}

export function withDocxImplicitSingleLineHeight(
  style: EditorParagraphStyle | undefined,
): EditorParagraphStyle {
  if (style?.lineHeight !== undefined) {
    return style;
  }
  return {
    ...(style ?? {}),
    lineHeight: DOCX_IMPLICIT_SINGLE_LINE_HEIGHT,
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

  return stripUndefined({
    styleId: style.styleId,
    // Prefer an explicitly-imported toggle (true OR false) so an explicit-off
    // survives and overrides an inherited style; otherwise dedup against the
    // editor default. Mirrors the fontSize/indent handling below.
    bold:
      style.bold !== undefined
        ? style.bold
        : effective.bold !== defaultEffective.bold
          ? effective.bold
          : undefined,
    italic:
      style.italic !== undefined
        ? style.italic
        : effective.italic !== defaultEffective.italic
          ? effective.italic
          : undefined,
    underline:
      effective.underline !== defaultEffective.underline
        ? effective.underline
        : undefined,
    underlineStyle:
      effective.underlineStyle !== defaultEffective.underlineStyle
        ? effective.underlineStyle
        : undefined,
    underlineColor:
      effective.underlineColor !== defaultEffective.underlineColor
        ? effective.underlineColor
        : undefined,
    strike:
      style.strike !== undefined
        ? style.strike
        : effective.strike !== defaultEffective.strike
          ? effective.strike
          : undefined,
    doubleStrike:
      style.doubleStrike !== undefined
        ? style.doubleStrike
        : effective.doubleStrike !== defaultEffective.doubleStrike
          ? effective.doubleStrike
          : undefined,
    superscript:
      effective.superscript !== defaultEffective.superscript
        ? effective.superscript
        : undefined,
    subscript:
      effective.subscript !== defaultEffective.subscript
        ? effective.subscript
        : undefined,
    smallCaps:
      style.smallCaps !== undefined
        ? style.smallCaps
        : effective.smallCaps !== defaultEffective.smallCaps
          ? effective.smallCaps
          : undefined,
    allCaps:
      style.allCaps !== undefined
        ? style.allCaps
        : effective.allCaps !== defaultEffective.allCaps
          ? effective.allCaps
          : undefined,
    hidden:
      style.hidden !== undefined
        ? style.hidden
        : effective.hidden !== defaultEffective.hidden
          ? effective.hidden
          : undefined,
    characterScale:
      effective.characterScale !== defaultEffective.characterScale
        ? effective.characterScale
        : undefined,
    characterSpacing:
      effective.characterSpacing !== defaultEffective.characterSpacing
        ? effective.characterSpacing
        : undefined,
    baselineShift:
      effective.baselineShift !== defaultEffective.baselineShift
        ? effective.baselineShift
        : undefined,
    kerningThreshold:
      effective.kerningThreshold !== defaultEffective.kerningThreshold
        ? effective.kerningThreshold
        : undefined,
    ligatures:
      effective.ligatures !== defaultEffective.ligatures
        ? effective.ligatures
        : undefined,
    numberSpacing:
      effective.numberSpacing !== defaultEffective.numberSpacing
        ? effective.numberSpacing
        : undefined,
    numberForm:
      effective.numberForm !== defaultEffective.numberForm
        ? effective.numberForm
        : undefined,
    stylisticSet:
      effective.stylisticSet !== defaultEffective.stylisticSet
        ? effective.stylisticSet
        : undefined,
    contextualAlternates:
      effective.contextualAlternates !== defaultEffective.contextualAlternates
        ? effective.contextualAlternates
        : undefined,
    fontFamily:
      style.fontFamily !== undefined
        ? style.fontFamily
        : effective.fontFamily !== defaultEffective.fontFamily
          ? effective.fontFamily
          : undefined,
    fontSize:
      style.fontSize !== undefined
        ? style.fontSize
        : effective.fontSize !== defaultEffective.fontSize
          ? effective.fontSize
          : undefined,
    color:
      effective.color !== defaultEffective.color ? effective.color : undefined,
    highlight:
      effective.highlight !== defaultEffective.highlight
        ? effective.highlight
        : undefined,
    link: effective.link !== defaultEffective.link ? effective.link : undefined,
  });
}

export function parseRunStyle(
  runProperties: XmlElement | null,
  themeFonts: ThemeFontMap,
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
      styles.underlineColor = underlineColor.startsWith("#")
        ? underlineColor
        : `#${underlineColor}`;
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
    resolveThemeFont(fonts, themeFonts);
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
    styles.color = colorValue.startsWith("#") ? colorValue : `#${colorValue}`;
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

  return Object.keys(styles).length > 0 ? styles : undefined;
}

export function parseParagraphStyle(
  paragraphProperties: XmlElement | null,
): EditorParagraphStyle | undefined {
  if (!paragraphProperties) {
    return undefined;
  }

  const style: EditorParagraphStyle = {};
  const styleId = parseStyleIdProperty(paragraphProperties, "pStyle");
  if (styleId) {
    style.styleId = styleId;
  }
  const justification = getFirstChildByTagNameNS(
    paragraphProperties,
    WORD_NS,
    "jc",
  );
  const justificationValue = getAttributeValue(justification, "val");
  if (
    justificationValue === "left" ||
    justificationValue === "start" ||
    justificationValue === "center" ||
    justificationValue === "right" ||
    justificationValue === "end" ||
    justificationValue === "justify"
  ) {
    style.align =
      justificationValue === "start"
        ? "left"
        : justificationValue === "end"
          ? "right"
          : (justificationValue as "left" | "center" | "right" | "justify");
  } else if (
    justificationValue === "both" ||
    justificationValue === "distribute"
  ) {
    // Word OOXML uses "both" for full justification (both edges aligned)
    // and "distribute" for distributed justification (a variant of justify).
    style.align = "justify";
  }

  const spacing = getFirstChildByTagNameNS(
    paragraphProperties,
    WORD_NS,
    "spacing",
  );
  const before = getAttributeValue(spacing, "before");
  const after = getAttributeValue(spacing, "after");
  const line = getAttributeValue(spacing, "line");
  const lineRule = getAttributeValue(spacing, "lineRule");
  if (before) {
    style.spacingBefore = twipsToPx(before, 0);
  }
  if (after) {
    style.spacingAfter = twipsToPx(after, 0);
  }
  if (line) {
    const parsedLineHeight = Number(line) / 240;
    if (lineRule === "exact" || lineRule === "atLeast") {
      style.lineHeight = parsedLineHeight;
    } else {
      style.lineHeight = parsedLineHeight;
    }
  }
  const contextualSpacing = parseOnOffProperty(
    paragraphProperties,
    "contextualSpacing",
  );
  if (contextualSpacing !== undefined) {
    style.contextualSpacing = contextualSpacing;
  }

  const snapToGrid = parseOnOffProperty(paragraphProperties, "snapToGrid");
  if (snapToGrid !== undefined) {
    style.snapToGrid = snapToGrid;
  }

  const indent = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "ind");
  // OOXML supports both physical (left/right) and logical (start/end) indents.
  // Prefer start/end when present to preserve modern bidi-aware documents.
  const left =
    getAttributeValue(indent, "start") ?? getAttributeValue(indent, "left");
  const right =
    getAttributeValue(indent, "end") ?? getAttributeValue(indent, "right");
  const firstLine = getAttributeValue(indent, "firstLine");
  const hanging = getAttributeValue(indent, "hanging");
  if (left) {
    style.indentLeft = twipsToPx(left, 0);
  }
  if (right) {
    style.indentRight = twipsToPx(right, 0);
  }
  if (hanging) {
    style.indentHanging = twipsToPx(hanging, 0);
    // When both are present, keep a deterministic behavior and let hanging win.
    style.indentFirstLine = undefined;
  } else if (firstLine) {
    style.indentFirstLine = twipsToPx(firstLine, 0);
  }

  const tabs = parseParagraphTabs(paragraphProperties);
  if (tabs.length > 0) {
    style.tabs = tabs;
  }

  const pageBreakBefore = parseOnOffProperty(
    paragraphProperties,
    "pageBreakBefore",
  );
  if (pageBreakBefore !== undefined) {
    style.pageBreakBefore = pageBreakBefore;
  }
  const keepNext = parseOnOffProperty(paragraphProperties, "keepNext");
  if (keepNext !== undefined) {
    style.keepWithNext = keepNext;
  }
  const keepLines = parseOnOffProperty(paragraphProperties, "keepLines");
  if (keepLines !== undefined) {
    style.keepLinesTogether = keepLines;
  }
  const widowControl = parseOnOffProperty(paragraphProperties, "widowControl");
  if (widowControl !== undefined) {
    style.widowControl = widowControl;
  }

  const paragraphBorders = getFirstChildByTagNameNS(
    paragraphProperties,
    WORD_NS,
    "pBdr",
  );
  if (paragraphBorders) {
    const { borderTop, borderRight, borderBottom, borderLeft } =
      parseDocxBoxBorders(paragraphBorders);
    if (borderTop) style.borderTop = borderTop;
    if (borderRight) style.borderRight = borderRight;
    if (borderBottom) style.borderBottom = borderBottom;
    if (borderLeft) style.borderLeft = borderLeft;
  }

  const shading = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "shd");
  const shadingFill = normalizeImportedHexColor(
    getAttributeValue(shading, "fill"),
  );
  if (shadingFill) {
    style.shading = shadingFill;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function parseParagraphTabs(
  paragraphProperties: XmlElement,
): EditorTabStop[] {
  const tabsElement = getFirstChildByTagNameNS(
    paragraphProperties,
    WORD_NS,
    "tabs",
  );
  if (!tabsElement) {
    return [];
  }

  const tabs: EditorTabStop[] = [];
  for (const tabElement of getChildrenByTagNameNS(
    tabsElement,
    WORD_NS,
    "tab",
  )) {
    const position = twipsToPoints(getAttributeValue(tabElement, "pos"));
    if (position === undefined) {
      continue;
    }

    const typeValue = getAttributeValue(tabElement, "val");
    const type =
      typeValue === "center" ||
      typeValue === "right" ||
      typeValue === "decimal" ||
      typeValue === "bar" ||
      typeValue === "clear"
        ? typeValue
        : "left";
    const leaderValue = getAttributeValue(tabElement, "leader");
    const leader =
      leaderValue === "dot" ||
      leaderValue === "hyphen" ||
      leaderValue === "underscore" ||
      leaderValue === "heavy" ||
      leaderValue === "middleDot"
        ? leaderValue
        : leaderValue === "none"
          ? "none"
          : undefined;

    tabs.push({
      position,
      type,
      ...(leader !== undefined ? { leader } : {}),
    });
  }

  return tabs;
}

export interface ParagraphAutospacingFlags {
  before: boolean;
  after: boolean;
}

/**
 * Reads Word's "auto spacing" flags (`w:beforeAutospacing` / `w:afterAutospacing`)
 * from a paragraph's `<w:spacing>` element. When these are set, Word ignores the
 * literal before/after values and treats the margins as automatic HTML-style
 * collapsing margins. The flags are needed so containers (e.g. table cells) can
 * reproduce that collapsing; see `collapseCellAutospacing` in tables.ts.
 */
export function parseAutospacingFlags(
  paragraphProperties: XmlElement | null,
): ParagraphAutospacingFlags {
  const spacing = getFirstChildByTagNameNS(
    paragraphProperties,
    WORD_NS,
    "spacing",
  );
  return {
    before: isWordTrue(getAttributeValue(spacing, "beforeAutospacing")),
    after: isWordTrue(getAttributeValue(spacing, "afterAutospacing")),
  };
}

export function mergeImportedParagraphStyles(
  base: EditorParagraphStyle | undefined,
  local: EditorParagraphStyle | undefined,
): EditorParagraphStyle | undefined {
  const merged = { ...(base ?? {}), ...(local ?? {}) };
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function mergeImportedTextStyles(
  base: EditorTextStyle | undefined,
  local: EditorTextStyle | undefined,
): EditorTextStyle | undefined {
  const merged = { ...(base ?? {}), ...(local ?? {}) };
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function parseImportedStyles(
  stylesXml: string | null,
  themeFonts: ThemeFontMap,
): Record<string, EditorNamedStyle> | undefined {
  if (!stylesXml) {
    return undefined;
  }

  const document = new DOMParser().parseFromString(
    stylesXml,
    "application/xml",
  );
  const root = document.documentElement;
  if (!root) {
    return undefined;
  }

  const docDefaults = getFirstChildByTagNameNS(root, WORD_NS, "docDefaults");
  const pPrDefault = getFirstChildByTagNameNS(
    getFirstChildByTagNameNS(docDefaults, WORD_NS, "pPrDefault"),
    WORD_NS,
    "pPr",
  );
  const rPrDefault = getFirstChildByTagNameNS(
    getFirstChildByTagNameNS(docDefaults, WORD_NS, "rPrDefault"),
    WORD_NS,
    "rPr",
  );
  const defaultParagraphStyle = withDocxImplicitSingleLineHeight(
    parseParagraphStyle(pPrDefault),
  );
  const defaultTextStyle = parseRunStyle(rPrDefault, themeFonts);
  const styles: Record<string, EditorNamedStyle> = {};
  let defaultParagraphStyleId: string | undefined;

  for (const styleElement of getChildrenByTagNameNS(root, WORD_NS, "style")) {
    const id = getAttributeValue(styleElement, "styleId");
    const type = getAttributeValue(styleElement, "type");
    if (
      !id ||
      (type !== "paragraph" && type !== "character" && type !== "table")
    ) {
      continue;
    }

    const name =
      getAttributeValue(
        getFirstChildByTagNameNS(styleElement, WORD_NS, "name"),
        "val",
      ) ?? id;
    const basedOn =
      getAttributeValue(
        getFirstChildByTagNameNS(styleElement, WORD_NS, "basedOn"),
        "val",
      ) ?? undefined;
    const nextStyle =
      getAttributeValue(
        getFirstChildByTagNameNS(styleElement, WORD_NS, "next"),
        "val",
      ) ?? undefined;
    const paragraphStyle = withDocxImplicitSingleLineHeight(
      parseParagraphStyle(
        getFirstChildByTagNameNS(styleElement, WORD_NS, "pPr"),
      ),
    );
    const textStyle = parseRunStyle(
      getFirstChildByTagNameNS(styleElement, WORD_NS, "rPr"),
      themeFonts,
    );

    let tableStyle: EditorTableStyle | undefined;
    if (type === "table") {
      const tblPr = getFirstChildByTagNameNS(styleElement, WORD_NS, "tblPr");
      const tblInd = getFirstChildByTagNameNS(tblPr, WORD_NS, "tblInd");
      const indentLeft = twipsToPoints(getAttributeValue(tblInd, "w"));
      tableStyle = {
        styleId: id,
        indentLeft,
      };
    }

    const isDefaultParagraph =
      type === "paragraph" &&
      isWordTrue(getAttributeValue(styleElement, "default"));

    if (isDefaultParagraph) {
      defaultParagraphStyleId = id;
    }

    styles[id] = {
      id,
      name,
      type,
      basedOn,
      nextStyle,
      paragraphStyle:
        type === "paragraph" && isDefaultParagraph
          ? mergeImportedParagraphStyles(defaultParagraphStyle, paragraphStyle)
          : paragraphStyle,
      textStyle:
        type === "paragraph" && isDefaultParagraph
          ? mergeImportedTextStyles(defaultTextStyle, textStyle)
          : textStyle,
      tableStyle,
    };
  }

  if (defaultParagraphStyleId && styles[defaultParagraphStyleId]) {
    return styles;
  }

  if (defaultParagraphStyle || defaultTextStyle) {
    styles.Normal = {
      id: "Normal",
      name: "Normal",
      type: "paragraph",
      paragraphStyle: defaultParagraphStyle,
      textStyle: defaultTextStyle,
    };
  }

  return Object.keys(styles).length > 0 ? styles : undefined;
}
