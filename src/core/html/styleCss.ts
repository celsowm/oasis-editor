import type { EditorParagraphStyle, EditorTextStyle } from "../model.js";
import { underlineStyleToCssDecorationStyle } from "../textStyleMappings.js";

export function textRunStylesToCss(style?: EditorTextStyle): string {
  if (!style) {
    return "";
  }

  const parts: string[] = [];
  if (style.fontFamily) {
    parts.push(`font-family:${style.fontFamily}`);
  }
  if (style.fontSize !== undefined && style.fontSize !== null) {
    parts.push(`font-size:${style.fontSize}px`);
  }
  if (style.color) {
    parts.push(`color:${style.color}`);
  }
  if (style.highlight) {
    parts.push(`background-color:${style.highlight}`);
  } else if (style.shading) {
    parts.push(`background-color:${style.shading}`);
  }
  if (style.superscript) {
    parts.push("vertical-align:super");
    parts.push("font-size:0.75em");
  } else if (style.subscript) {
    parts.push("vertical-align:sub");
    parts.push("font-size:0.75em");
  }
  if (style.bold) {
    parts.push("font-weight:700");
  }
  if (style.italic) {
    parts.push("font-style:italic");
  }
  if (style.hidden) {
    parts.push("display:none");
  }
  if (style.allCaps) {
    parts.push("text-transform:uppercase");
  }
  if (style.smallCaps) {
    parts.push("font-variant:small-caps");
  }
  if (style.characterScale !== undefined && style.characterScale !== null) {
    parts.push(`font-stretch:${style.characterScale}%`);
  }
  if (style.characterSpacing !== undefined && style.characterSpacing !== null) {
    parts.push(`letter-spacing:${style.characterSpacing}pt`);
  }
  if (getPrimaryTextLanguage(style.language)) {
    parts.push("hyphens:auto");
  }
  if (style.baselineShift !== undefined && style.baselineShift !== null) {
    parts.push(`vertical-align:${style.baselineShift}pt`);
  }
  const ligatures = ligaturesToCss(style.ligatures);
  if (ligatures) {
    parts.push(`font-variant-ligatures:${ligatures}`);
  }
  const numeric = numericToCss(style.numberSpacing, style.numberForm);
  if (numeric) {
    parts.push(`font-variant-numeric:${numeric}`);
  }
  const featureSettings = fontFeatureSettingsToCss(
    style.stylisticSet,
    style.contextualAlternates,
  );
  if (featureSettings) {
    parts.push(`font-feature-settings:${featureSettings}`);
  }
  const decorations: string[] = [];
  if (style.underline || style.link) {
    decorations.push("underline");
  }
  if (style.strike) {
    decorations.push("line-through");
  }
  if (style.doubleStrike) {
    decorations.push("line-through");
  }
  if (decorations.length > 0) {
    parts.push(`text-decoration:${decorations.join(" ")}`);
    if (style.underline || style.link) {
      const cssDecorationStyle = underlineStyleToCssDecorationStyle(
        style.underlineStyle,
      );
      if (cssDecorationStyle) {
        parts.push(`text-decoration-style:${cssDecorationStyle}`);
      }
      if (style.underlineColor) {
        parts.push(`text-decoration-color:${style.underlineColor}`);
      }
    }
  }

  return parts.join(";");
}

export function getPrimaryTextLanguage(
  language: EditorTextStyle["language"],
): string | null {
  return language?.value ?? language?.bidi ?? language?.eastAsia ?? null;
}

function ligaturesToCss(
  ligatures: EditorTextStyle["ligatures"],
): string | null {
  switch (ligatures) {
    case "none":
      return "none";
    case "standard":
      return "common-ligatures";
    case "contextual":
      return "contextual";
    case "historical":
      return "historical-ligatures";
    case "standardContextual":
      return "common-ligatures contextual";
    default:
      return null;
  }
}

function numericToCss(
  numberSpacing: EditorTextStyle["numberSpacing"],
  numberForm: EditorTextStyle["numberForm"],
): string | null {
  const parts: string[] = [];
  if (numberSpacing === "proportional") parts.push("proportional-nums");
  if (numberSpacing === "tabular") parts.push("tabular-nums");
  if (numberForm === "lining") parts.push("lining-nums");
  if (numberForm === "oldStyle") parts.push("oldstyle-nums");
  return parts.join(" ") || null;
}

function fontFeatureSettingsToCss(
  stylisticSet: EditorTextStyle["stylisticSet"],
  contextualAlternates: EditorTextStyle["contextualAlternates"],
): string | null {
  const parts: string[] = [];
  if (
    typeof stylisticSet === "number" &&
    stylisticSet >= 1 &&
    stylisticSet <= 20
  ) {
    parts.push(`"ss${String(stylisticSet).padStart(2, "0")}" 1`);
  }
  if (contextualAlternates) {
    parts.push('"calt" 1');
  }
  return parts.join(", ") || null;
}

export function paragraphStyleToCssText(style?: EditorParagraphStyle): string {
  if (!style) {
    return "";
  }

  const parts: string[] = [];
  if (style.align) {
    parts.push(`text-align:${style.align}`);
  }
  if (style.lineHeight !== undefined && style.lineHeight !== null) {
    // exact/atLeast store an absolute px height; auto stores a unitless multiplier.
    const isAbsoluteRule =
      style.lineRule === "exact" || style.lineRule === "atLeast";
    parts.push(`line-height:${style.lineHeight}${isAbsoluteRule ? "px" : ""}`);
  }
  if (style.spacingBefore !== undefined && style.spacingBefore !== null) {
    parts.push(`padding-top:${style.spacingBefore}px`);
  }
  if (style.spacingAfter !== undefined && style.spacingAfter !== null) {
    parts.push(`padding-bottom:${style.spacingAfter}px`);
  }
  if (style.indentLeft !== undefined && style.indentLeft !== null) {
    parts.push(`padding-left:${style.indentLeft}px`);
  }
  if (style.indentRight !== undefined && style.indentRight !== null) {
    parts.push(`padding-right:${style.indentRight}px`);
  }
  if (style.indentFirstLine !== undefined && style.indentFirstLine !== null) {
    parts.push(`text-indent:${style.indentFirstLine}px`);
  }
  return parts.join(";");
}
