import type { EditorTextStyle } from "../../../core/model.js";
import { escapeXml, normalizeDocxColor, toHalfPoints } from "../xmlUtils.js";
import {
  DOCX_HIGHLIGHT_COLORS,
  DOCX_HIGHLIGHT_HEX_ALIASES,
} from "./constants.js";

function pointsToSignedTwips(value: number | null | undefined): number | null {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 20);
}

function ligaturesToDocx(value: EditorTextStyle["ligatures"]): string | null {
  switch (value) {
    case "none":
      return "none";
    case "standard":
      return "standard";
    case "contextual":
      return "contextual";
    case "historical":
      return "historical";
    case "standardContextual":
      return "standardContextual";
    default:
      return null;
  }
}

function numberSpacingToDocx(
  value: EditorTextStyle["numberSpacing"],
): string | null {
  switch (value) {
    case "proportional":
      return "proportional";
    case "tabular":
      return "tabular";
    default:
      return null;
  }
}

function numberFormToDocx(value: EditorTextStyle["numberForm"]): string | null {
  switch (value) {
    case "lining":
      return "lining";
    case "oldStyle":
      return "oldStyle";
    default:
      return null;
  }
}

function stylisticSetToDocx(
  value: EditorTextStyle["stylisticSet"],
): string | null {
  if (typeof value !== "number" || value < 1 || value > 20) {
    return null;
  }
  return (1 << (value - 1)).toString(16).toUpperCase().padStart(8, "0");
}

function parseHexColor(color: string): [number, number, number] | null {
  const normalized = color.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function normalizeHighlightForDocx(highlight: string): string {
  if (highlight in DOCX_HIGHLIGHT_COLORS) {
    return highlight;
  }

  const normalizedHex = highlight.trim().replace(/^#/, "").toLowerCase();
  const directAlias = DOCX_HIGHLIGHT_HEX_ALIASES[normalizedHex];
  if (directAlias) {
    return directAlias;
  }

  const rgb = parseHexColor(highlight);
  if (!rgb) {
    return "yellow";
  }

  let bestName = "yellow";
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [name, candidate] of Object.entries(DOCX_HIGHLIGHT_COLORS)) {
    const distance =
      (candidate[0] - rgb[0]) ** 2 +
      (candidate[1] - rgb[1]) ** 2 +
      (candidate[2] - rgb[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestName = name;
    }
  }
  return bestName;
}

export function serializeRunProperties(styles?: EditorTextStyle): string {
  if (!styles) {
    return "";
  }

  const parts: string[] = [];
  if (styles.bold) parts.push("<w:b/>", "<w:bCs/>");
  if (styles.italic) parts.push("<w:i/>", "<w:iCs/>");
  if (styles.underline) {
    const underlineVal = styles.underlineStyle ?? "single";
    const underlineColor = styles.underlineColor
      ? ` w:color="${escapeXml(styles.underlineColor.replace(/^#/, ""))}"`
      : "";
    parts.push(`<w:u w:val="${escapeXml(underlineVal)}"${underlineColor}/>`);
  }
  if (styles.strike) parts.push("<w:strike/>");
  if (styles.doubleStrike) parts.push("<w:dstrike/>");
  if (styles.smallCaps) parts.push("<w:smallCaps/>");
  if (styles.allCaps) parts.push("<w:caps/>");
  if (styles.hidden) parts.push("<w:vanish/>");
  if (styles.noProof) parts.push("<w:noProof/>");
  if (styles.webHidden) parts.push("<w:webHidden/>");
  if (styles.specVanish) parts.push("<w:specVanish/>");
  if (styles.textEffect) {
    parts.push(`<w:effect w:val="${escapeXml(styles.textEffect)}"/>`);
  }
  if (
    styles.characterScale !== undefined &&
    styles.characterScale !== null &&
    Number.isFinite(styles.characterScale)
  ) {
    parts.push(
      `<w:w w:val="${Math.max(1, Math.round(styles.characterScale))}"/>`,
    );
  }
  if (
    styles.characterSpacing !== undefined &&
    styles.characterSpacing !== null
  ) {
    const spacing = pointsToSignedTwips(styles.characterSpacing);
    if (spacing !== null) parts.push(`<w:spacing w:val="${spacing}"/>`);
  }
  if (
    styles.baselineShift !== undefined &&
    styles.baselineShift !== null &&
    Number.isFinite(styles.baselineShift)
  ) {
    parts.push(`<w:position w:val="${Math.round(styles.baselineShift * 2)}"/>`);
  }
  if (
    styles.kerningThreshold !== undefined &&
    styles.kerningThreshold !== null &&
    Number.isFinite(styles.kerningThreshold)
  ) {
    parts.push(
      `<w:kern w:val="${Math.max(0, Math.round(styles.kerningThreshold * 2))}"/>`,
    );
  }
  const ligatures = ligaturesToDocx(styles.ligatures);
  if (ligatures) {
    parts.push(`<w14:ligatures w14:val="${ligatures}"/>`);
  }
  const numberSpacing = numberSpacingToDocx(styles.numberSpacing);
  if (numberSpacing) {
    parts.push(`<w14:numSpacing w14:val="${numberSpacing}"/>`);
  }
  const numberForm = numberFormToDocx(styles.numberForm);
  if (numberForm) {
    parts.push(`<w14:numForm w14:val="${numberForm}"/>`);
  }
  const stylisticSet = stylisticSetToDocx(styles.stylisticSet);
  if (stylisticSet) {
    parts.push(`<w14:stylisticSets w14:val="${stylisticSet}"/>`);
  }
  if (styles.contextualAlternates) {
    parts.push('<w14:cntxtAlts w14:val="1"/>');
  }
  if (styles.superscript) {
    parts.push('<w:vertAlign w:val="superscript"/>');
  } else if (styles.subscript) {
    parts.push('<w:vertAlign w:val="subscript"/>');
  }
  if (styles.fontFamily) {
    parts.push(
      `<w:rFonts w:ascii="${escapeXml(styles.fontFamily)}" w:hAnsi="${escapeXml(styles.fontFamily)}" w:cs="${escapeXml(styles.fontFamily)}"/>`,
    );
  }
  if (styles.fontSize !== undefined && styles.fontSize !== null) {
    const size = toHalfPoints(styles.fontSize);
    if (size !== null) {
      parts.push(`<w:sz w:val="${size}"/>`, `<w:szCs w:val="${size}"/>`);
    }
  }
  if (styles.color) {
    parts.push(
      `<w:color w:val="${escapeXml(styles.color.replace(/^#/, ""))}"/>`,
    );
  }
  if (styles.highlight) {
    parts.push(
      `<w:highlight w:val="${escapeXml(normalizeHighlightForDocx(styles.highlight))}"/>`,
    );
  }
  if (styles.shading) {
    parts.push(
      `<w:shd w:val="clear" w:color="auto" w:fill="${normalizeDocxColor(styles.shading, "FFFFFF")}"/>`,
    );
  }
  if (styles.language) {
    const attrs: string[] = [];
    if (styles.language.value) {
      attrs.push(`w:val="${escapeXml(styles.language.value)}"`);
    }
    if (styles.language.eastAsia) {
      attrs.push(`w:eastAsia="${escapeXml(styles.language.eastAsia)}"`);
    }
    if (styles.language.bidi) {
      attrs.push(`w:bidi="${escapeXml(styles.language.bidi)}"`);
    }
    if (attrs.length > 0) {
      parts.push(`<w:lang ${attrs.join(" ")}/>`);
    }
  }

  return parts.length > 0 ? `<w:rPr>${parts.join("")}</w:rPr>` : "";
}
