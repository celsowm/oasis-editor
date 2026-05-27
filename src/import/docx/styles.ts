import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorNamedStyle,
  EditorParagraphStyle,
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
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  parseBooleanProperty,
  parseOnOffProperty,
  parseStyleIdProperty,
  isWordTrue,
} from "./xmlHelpers.js";
import {
  twipsToPx,
  twipsToPoints,
  halfPointsToPx,
  normalizeImportedFontFamily,
  DOCX_IMPLICIT_SINGLE_LINE_HEIGHT,
} from "./units.js";
import { type ThemeFontMap, resolveThemeFont } from "./themeFonts.js";

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> | undefined {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
  return entries.length > 0 ? (Object.fromEntries(entries) as Partial<T>) : undefined;
}

export function normalizeImportedParagraphStyle(
  style: EditorParagraphStyle | undefined,
): EditorParagraphStyle | undefined {
  if (!style) {
    return undefined;
  }

  const effective = resolveEffectiveParagraphStyle(style, DEFAULT_EDITOR_STYLES);
  const defaultEffective = resolveEffectiveParagraphStyle(undefined, DEFAULT_EDITOR_STYLES);

  const normalized = stripUndefined({
    styleId: style.styleId,
    align: effective.align !== defaultEffective.align ? effective.align : undefined,
    spacingBefore:
      effective.spacingBefore !== defaultEffective.spacingBefore ? effective.spacingBefore : undefined,
    spacingAfter:
      effective.spacingAfter !== defaultEffective.spacingAfter ? effective.spacingAfter : undefined,
    lineHeight: effective.lineHeight !== defaultEffective.lineHeight ? effective.lineHeight : undefined,
    lineGridPitch: style.lineGridPitch ?? undefined,
    snapToGrid: effective.snapToGrid !== defaultEffective.snapToGrid ? effective.snapToGrid : undefined,
    indentLeft:
      style.indentLeft !== undefined || effective.indentLeft !== defaultEffective.indentLeft
        ? effective.indentLeft
        : undefined,
    indentRight:
      style.indentRight !== undefined || effective.indentRight !== defaultEffective.indentRight
        ? effective.indentRight
        : undefined,
    indentFirstLine:
      style.indentFirstLine !== undefined || effective.indentFirstLine !== defaultEffective.indentFirstLine
        ? effective.indentFirstLine
        : undefined,
    indentHanging:
      style.indentHanging !== undefined || effective.indentHanging !== defaultEffective.indentHanging
        ? effective.indentHanging
        : undefined,
    pageBreakBefore:
      effective.pageBreakBefore !== defaultEffective.pageBreakBefore ? effective.pageBreakBefore : undefined,
    keepWithNext: effective.keepWithNext !== defaultEffective.keepWithNext ? effective.keepWithNext : undefined,
    keepLinesTogether:
      effective.keepLinesTogether !== defaultEffective.keepLinesTogether
        ? effective.keepLinesTogether
        : undefined,
    widowControl:
      effective.widowControl !== defaultEffective.widowControl ? effective.widowControl : undefined,
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

  const effective = resolveEffectiveTextStyleForParagraph(style, paragraphStyleId, DEFAULT_EDITOR_STYLES);
  const defaultEffective = resolveEffectiveTextStyleForParagraph(undefined, paragraphStyleId, DEFAULT_EDITOR_STYLES);

  return stripUndefined({
    styleId: style.styleId,
    bold: effective.bold !== defaultEffective.bold ? effective.bold : undefined,
    italic: effective.italic !== defaultEffective.italic ? effective.italic : undefined,
    underline: effective.underline !== defaultEffective.underline ? effective.underline : undefined,
    underlineStyle:
      effective.underlineStyle !== defaultEffective.underlineStyle ? effective.underlineStyle : undefined,
    strike: effective.strike !== defaultEffective.strike ? effective.strike : undefined,
    superscript: effective.superscript !== defaultEffective.superscript ? effective.superscript : undefined,
    subscript: effective.subscript !== defaultEffective.subscript ? effective.subscript : undefined,
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
    color: effective.color !== defaultEffective.color ? effective.color : undefined,
    highlight: effective.highlight !== defaultEffective.highlight ? effective.highlight : undefined,
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
  if (parseBooleanProperty(runProperties, "b")) {
    styles.bold = true;
  }
  if (parseBooleanProperty(runProperties, "i")) {
    styles.italic = true;
  }
  if (parseBooleanProperty(runProperties, "strike")) {
    styles.strike = true;
  }

  const underline = getFirstChildByTagNameNS(runProperties, WORD_NS, "u");
  const underlineValue = getAttributeValue(underline, "val");
  if (underline && underlineValue !== "none") {
    styles.underline = true;
    if (underlineValue && underlineValue !== "single") {
      styles.underlineStyle = underlineValue as EditorTextStyle["underlineStyle"];
    }
  }

  const vertAlign = getFirstChildByTagNameNS(runProperties, WORD_NS, "vertAlign");
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

  const size = getFirstChildByTagNameNS(runProperties, WORD_NS, "sz");
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

  const highlight = getFirstChildByTagNameNS(runProperties, WORD_NS, "highlight");
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
  const justification = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "jc");
  const justificationValue = getAttributeValue(justification, "val");
  if (
    justificationValue === "left" ||
    justificationValue === "start" ||
    justificationValue === "center" ||
    justificationValue === "right" ||
    justificationValue === "end" ||
    justificationValue === "justify"
  ) {
    style.align = justificationValue === "start" ? "left"
      : justificationValue === "end" ? "right"
      : justificationValue as "left" | "center" | "right" | "justify";
  } else if (justificationValue === "both" || justificationValue === "distribute") {
    // Word OOXML uses "both" for full justification (both edges aligned)
    // and "distribute" for distributed justification (a variant of justify).
    style.align = "justify";
  }

  const spacing = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "spacing");
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

  const snapToGrid = parseOnOffProperty(paragraphProperties, "snapToGrid");
  if (snapToGrid !== undefined) {
    style.snapToGrid = snapToGrid;
  }

  const indent = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "ind");
  // OOXML supports both physical (left/right) and logical (start/end) indents.
  // Prefer start/end when present to preserve modern bidi-aware documents.
  const left = getAttributeValue(indent, "start") ?? getAttributeValue(indent, "left");
  const right = getAttributeValue(indent, "end") ?? getAttributeValue(indent, "right");
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

  if (parseBooleanProperty(paragraphProperties, "pageBreakBefore")) {
    style.pageBreakBefore = true;
  }
  if (parseBooleanProperty(paragraphProperties, "keepNext")) {
    style.keepWithNext = true;
  }
  if (parseBooleanProperty(paragraphProperties, "keepLines")) {
    style.keepLinesTogether = true;
  }
  const widowControl = parseOnOffProperty(paragraphProperties, "widowControl");
  if (widowControl !== undefined) {
    style.widowControl = widowControl;
  }

  return Object.keys(style).length > 0 ? style : undefined;
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

  const document = new DOMParser().parseFromString(stylesXml, "application/xml");
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
  const defaultParagraphStyle = withDocxImplicitSingleLineHeight(parseParagraphStyle(pPrDefault));
  const defaultTextStyle = parseRunStyle(rPrDefault, themeFonts);
  const styles: Record<string, EditorNamedStyle> = {};
  let defaultParagraphStyleId: string | undefined;

  for (const styleElement of getChildrenByTagNameNS(root, WORD_NS, "style")) {
    const id = getAttributeValue(styleElement, "styleId");
    const type = getAttributeValue(styleElement, "type");
    if (!id || (type !== "paragraph" && type !== "character" && type !== "table")) {
      continue;
    }

    const name = getAttributeValue(getFirstChildByTagNameNS(styleElement, WORD_NS, "name"), "val") ?? id;
    const basedOn = getAttributeValue(getFirstChildByTagNameNS(styleElement, WORD_NS, "basedOn"), "val") ?? undefined;
    const nextStyle = getAttributeValue(getFirstChildByTagNameNS(styleElement, WORD_NS, "next"), "val") ?? undefined;
    const paragraphStyle = withDocxImplicitSingleLineHeight(
      parseParagraphStyle(getFirstChildByTagNameNS(styleElement, WORD_NS, "pPr")),
    );
    const textStyle = parseRunStyle(getFirstChildByTagNameNS(styleElement, WORD_NS, "rPr"), themeFonts);

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
      type === "paragraph" && isWordTrue(getAttributeValue(styleElement, "default"));

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
