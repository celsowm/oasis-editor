import type { EditorTextStyle } from "../model.js";

export function parseInlineStyles(
  element: Element,
): EditorTextStyle | undefined {
  const result: EditorTextStyle = {};
  const style = (element as HTMLElement).style;

  parseFontAndColor(style, result);
  parseLanguage(element, result);
  parseTextDecoration(style, result);
  parseTextShape(style, result);
  parseOpenTypeVariants(style, result);
  parseBaseline(element, style, result);
  parseLink(element, result);

  return Object.keys(result).length > 0 ? result : undefined;
}

function parseFontAndColor(
  style: CSSStyleDeclaration,
  result: EditorTextStyle,
): void {
  const fontFamily = style.fontFamily.trim();
  if (fontFamily) {
    result.fontFamily = fontFamily;
  }

  const fontSize = style.fontSize.trim();
  if (fontSize.endsWith("px")) {
    const parsed = Number.parseFloat(fontSize);
    if (Number.isFinite(parsed)) {
      result.fontSize = parsed;
    }
  }

  const color = style.color.trim();
  if (color) {
    result.color = color;
  }

  const backgroundColor = style.backgroundColor.trim();
  if (backgroundColor) {
    result.highlight = backgroundColor;
  }
}

function parseLanguage(element: Element, result: EditorTextStyle): void {
  const langValue =
    element.getAttribute("data-oasis-lang-value") ??
    element.getAttribute("lang");
  const langEastAsia = element.getAttribute("data-oasis-lang-east-asia");
  const langBidi = element.getAttribute("data-oasis-lang-bidi");
  if (langValue || langEastAsia || langBidi) {
    result.language = {};
    if (langValue) result.language.value = langValue;
    if (langEastAsia) result.language.eastAsia = langEastAsia;
    if (langBidi) result.language.bidi = langBidi;
  }
}

function parseTextDecoration(
  style: CSSStyleDeclaration,
  result: EditorTextStyle,
): void {
  const textDecoration = style.textDecoration.toLowerCase();
  if (textDecoration.includes("underline")) {
    result.underline = true;
    const decorationStyle = style.textDecorationStyle?.toLowerCase();
    switch (decorationStyle) {
      case "double":
        result.underlineStyle = "double";
        break;
      case "dotted":
        result.underlineStyle = "dotted";
        break;
      case "dashed":
        result.underlineStyle = "dash";
        break;
      case "wavy":
        result.underlineStyle = "wave";
        break;
    }
  }
  if (textDecoration.includes("line-through")) {
    result.strike = true;
  }

  const decorationColor = style.textDecorationColor?.trim();
  if (decorationColor) {
    result.underlineColor = decorationColor;
  }
}

function parseTextShape(
  style: CSSStyleDeclaration,
  result: EditorTextStyle,
): void {
  const fontWeight = style.fontWeight.trim();
  if (fontWeight === "bold" || Number.parseInt(fontWeight, 10) >= 600) {
    result.bold = true;
  }

  const fontStyle = style.fontStyle.trim();
  if (fontStyle === "italic") {
    result.italic = true;
  }
  if (style.display.trim().toLowerCase() === "none") {
    result.hidden = true;
  }
  if (style.textTransform.trim().toLowerCase() === "uppercase") {
    result.allCaps = true;
  }
  if (style.fontVariant.trim().toLowerCase().includes("small-caps")) {
    result.smallCaps = true;
  }

  const letterSpacing = style.letterSpacing.trim();
  if (letterSpacing.endsWith("pt")) {
    const parsed = Number.parseFloat(letterSpacing);
    if (Number.isFinite(parsed)) {
      result.characterSpacing = parsed;
    }
  }

  const fontStretch = style.fontStretch.trim();
  if (fontStretch.endsWith("%")) {
    const parsed = Number.parseFloat(fontStretch);
    if (Number.isFinite(parsed) && parsed > 0) {
      result.characterScale = parsed;
    }
  }
}

function parseOpenTypeVariants(
  style: CSSStyleDeclaration,
  result: EditorTextStyle,
): void {
  const ligatures = style.fontVariantLigatures.trim().toLowerCase();
  if (ligatures === "none") {
    result.ligatures = "none";
  } else if (ligatures.includes("historical")) {
    result.ligatures = "historical";
  } else if (
    ligatures.includes("common-ligatures") &&
    ligatures.includes("contextual")
  ) {
    result.ligatures = "standardContextual";
  } else if (ligatures.includes("common-ligatures")) {
    result.ligatures = "standard";
  } else if (ligatures.includes("contextual")) {
    result.ligatures = "contextual";
  }

  const numeric = style.fontVariantNumeric.trim().toLowerCase();
  if (numeric.includes("proportional-nums")) {
    result.numberSpacing = "proportional";
  } else if (numeric.includes("tabular-nums")) {
    result.numberSpacing = "tabular";
  }
  if (numeric.includes("lining-nums")) {
    result.numberForm = "lining";
  } else if (numeric.includes("oldstyle-nums")) {
    result.numberForm = "oldStyle";
  }

  const featureSettings = style.fontFeatureSettings.trim().toLowerCase();
  const stylisticSet = featureSettings.match(
    /["']ss(0[1-9]|1[0-9]|20)["']\s+1/,
  );
  if (stylisticSet?.[1]) {
    result.stylisticSet = Number(stylisticSet[1]);
  }
  if (/["']calt["']\s+1/.test(featureSettings)) {
    result.contextualAlternates = true;
  }
}

function parseBaseline(
  element: Element,
  style: CSSStyleDeclaration,
  result: EditorTextStyle,
): void {
  if (element.tagName === "SUP") {
    result.superscript = true;
  }
  if (element.tagName === "SUB") {
    result.subscript = true;
  }

  const verticalAlign = style.verticalAlign.trim();
  if (verticalAlign.endsWith("pt")) {
    const parsed = Number.parseFloat(verticalAlign);
    if (Number.isFinite(parsed)) {
      result.baselineShift = parsed;
    }
  }
}

function parseLink(element: Element, result: EditorTextStyle): void {
  const link =
    element.tagName === "A"
      ? ((element as HTMLAnchorElement).getAttribute("href")?.trim() ?? "")
      : "";
  if (link) {
    result.link = link;
    result.underline = true;
  }
}
