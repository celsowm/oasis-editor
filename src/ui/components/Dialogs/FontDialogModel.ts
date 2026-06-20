import type {
  EditorLigatures,
  EditorNumberForm,
  EditorNumberSpacing,
  EditorUnderlineStyle,
} from "@/core/model.js";
import type {
  FontTabValues,
  AdvancedTabValues,
  FontDialogInitialValues,
  FontDialogApplyValues,
  FontDialogSpacingMode,
  FontDialogPositionMode,
} from "./font-dialog/FontDialogTypes.js";
import { DEFAULT_COLOR } from "./font-dialog/FontDialogTypes.js";

export type FontFaceStyle = "regular" | "italic" | "bold" | "boldItalic";

export function parsePositiveNumber(value: string): number | null {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseNonNegativeNumber(value: string): number | null {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function formatNullableNumber(
  value: string | number | null | undefined,
): string {
  return value === undefined || value === null || value === ""
    ? ""
    : String(value);
}

export function resolveSpacingMode(
  value: string | number | null | undefined,
): FontDialogSpacingMode {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed === 0) return "normal";
  return parsed > 0 ? "expanded" : "condensed";
}

export function resolvePositionMode(
  value: string | number | null | undefined,
): FontDialogPositionMode {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed === 0) return "normal";
  return parsed > 0 ? "raised" : "lowered";
}

export function parseStylisticSet(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 20
    ? parsed
    : null;
}

export function ligaturesToCss(
  value: EditorLigatures | "",
): string | undefined {
  switch (value) {
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
      return undefined;
  }
}

export function numericToCss(
  numberSpacing: EditorNumberSpacing | "",
  numberForm: EditorNumberForm | "",
): string | undefined {
  const parts: string[] = [];
  if (numberSpacing === "proportional") parts.push("proportional-nums");
  if (numberSpacing === "tabular") parts.push("tabular-nums");
  if (numberForm === "lining") parts.push("lining-nums");
  if (numberForm === "oldStyle") parts.push("oldstyle-nums");
  return parts.join(" ") || undefined;
}

export function featureSettingsToCss(
  stylisticSet: string,
  contextualAlternates: boolean,
): string | undefined {
  const parts: string[] = [];
  const set = parseStylisticSet(stylisticSet);
  if (set !== null) {
    parts.push(`"ss${String(set).padStart(2, "0")}" 1`);
  }
  if (contextualAlternates) {
    parts.push('"calt" 1');
  }
  return parts.join(", ") || undefined;
}

export function resolveFontFaceStyle(
  bold: boolean,
  italic: boolean,
): FontFaceStyle {
  if (bold && italic) return "boldItalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "regular";
}

export function createFontTabValuesFromInitial(
  initial: FontDialogInitialValues,
): FontTabValues {
  return {
    familyFilter: "",
    fontFamily: initial.fontFamily ?? "",
    fontSize: initial.fontSize ?? "",
    colorMode: initial.colorMode,
    color: initial.color || DEFAULT_COLOR,
    highlight: initial.highlight || "",
    shading: initial.shading || "",
    bold: Boolean(initial.bold),
    italic: Boolean(initial.italic),
    underline: Boolean(initial.underline),
    underlineStyle: initial.underline
      ? (initial.underlineStyle ?? "single")
      : "none",
    underlineColor: initial.underlineColor || DEFAULT_COLOR,
    strike: Boolean(initial.strike),
    doubleStrike: Boolean(initial.doubleStrike),
    superscript: Boolean(initial.superscript),
    subscript: Boolean(initial.subscript),
    smallCaps: Boolean(initial.smallCaps),
    allCaps: Boolean(initial.allCaps),
    hidden: Boolean(initial.hidden),
  };
}

export function createAdvancedTabValuesFromInitial(
  initial: FontDialogInitialValues,
): AdvancedTabValues {
  return {
    characterScale: formatNullableNumber(initial.characterScale),
    spacingMode: resolveSpacingMode(initial.characterSpacing),
    spacingAmount: initial.characterSpacing
      ? String(Math.abs(Number(initial.characterSpacing)))
      : "",
    positionMode: resolvePositionMode(initial.baselineShift),
    positionAmount: initial.baselineShift
      ? String(Math.abs(Number(initial.baselineShift)))
      : "",
    kerningEnabled: initial.kerningThreshold !== "",
    kerningThreshold: formatNullableNumber(initial.kerningThreshold),
    ligatures: initial.ligatures,
    numberSpacing: initial.numberSpacing,
    numberForm: initial.numberForm,
    stylisticSet: formatNullableNumber(initial.stylisticSet),
    contextualAlternates: Boolean(initial.contextualAlternates),
  };
}

export function buildFontDialogPreviewStyle(
  font: FontTabValues,
  advanced: AdvancedTabValues,
): Record<string, string | number | undefined> {
  const size = Number(font.fontSize);
  const scale = parsePositiveNumber(advanced.characterScale) ?? 100;
  const spacingAmount =
    advanced.spacingMode === "normal"
      ? null
      : parseNonNegativeNumber(advanced.spacingAmount);
  const positionAmount =
    advanced.positionMode === "normal"
      ? null
      : parseNonNegativeNumber(advanced.positionAmount);
  const spacing =
    spacingAmount === null
      ? undefined
      : advanced.spacingMode === "condensed"
        ? `-${spacingAmount}pt`
        : `${spacingAmount}pt`;
  const baselineShift =
    positionAmount === null
      ? undefined
      : advanced.positionMode === "lowered"
        ? `-${positionAmount}pt`
        : `${positionAmount}pt`;
  const textDecorations: string[] = [];
  if (font.underline && font.underlineStyle !== "none")
    textDecorations.push("underline");
  if (font.strike) textDecorations.push("line-through");
  if (font.doubleStrike) textDecorations.push("line-through");
  return {
    "font-family": font.fontFamily || "inherit",
    "font-size": Number.isFinite(size) && size > 0 ? `${size}pt` : undefined,
    "font-weight": font.bold ? 700 : 400,
    "font-style": font.italic ? "italic" : "normal",
    "text-decoration": textDecorations.join(" ") || "none",
    color: font.colorMode === "automatic" ? "inherit" : font.color,
    "background-color": font.highlight || font.shading || undefined,
    "vertical-align":
      baselineShift ??
      (font.superscript ? "super" : font.subscript ? "sub" : "baseline"),
    "font-stretch": `${scale}%`,
    "letter-spacing": spacing,
    "font-variant-ligatures": ligaturesToCss(advanced.ligatures),
    "font-variant-numeric": numericToCss(
      advanced.numberSpacing,
      advanced.numberForm,
    ),
    "font-feature-settings": featureSettingsToCss(
      advanced.stylisticSet,
      advanced.contextualAlternates,
    ),
  };
}

export function buildFontDialogApplyValues(
  font: FontTabValues,
  advanced: AdvancedTabValues,
): FontDialogApplyValues {
  const sizeNum = Number(font.fontSize);
  const isValidSize = Number.isFinite(sizeNum) && sizeNum > 0;
  const underlineStyle: EditorUnderlineStyle | null =
    font.underlineStyle === "none" ? null : font.underlineStyle;
  const underline = underlineStyle !== null;
  const scale = advanced.characterScale.trim()
    ? parsePositiveNumber(advanced.characterScale)
    : null;
  const spacingAmount =
    advanced.spacingMode === "normal"
      ? null
      : parseNonNegativeNumber(advanced.spacingAmount);
  const positionAmount =
    advanced.positionMode === "normal"
      ? null
      : parseNonNegativeNumber(advanced.positionAmount);
  const kerningThreshold =
    advanced.kerningEnabled && advanced.kerningThreshold.trim()
      ? parseNonNegativeNumber(advanced.kerningThreshold)
      : null;
  const stylisticSet = parseStylisticSet(advanced.stylisticSet);
  return {
    fontFamily: font.fontFamily.trim() ? font.fontFamily.trim() : null,
    fontSize: isValidSize ? sizeNum : null,
    colorMode: font.colorMode,
    color: font.colorMode === "automatic" ? null : font.color || null,
    highlight: font.highlight || null,
    shading: font.shading || null,
    bold: font.bold,
    italic: font.italic,
    underline,
    underlineStyle,
    underlineColor: underline ? font.underlineColor || null : null,
    strike: font.strike,
    doubleStrike: font.doubleStrike,
    superscript: font.superscript,
    subscript: font.subscript,
    smallCaps: font.smallCaps,
    allCaps: font.allCaps,
    hidden: font.hidden,
    characterScale: scale,
    characterSpacing:
      spacingAmount === null
        ? null
        : advanced.spacingMode === "condensed"
          ? -spacingAmount
          : spacingAmount,
    baselineShift:
      positionAmount === null
        ? null
        : advanced.positionMode === "lowered"
          ? -positionAmount
          : positionAmount,
    kerningThreshold,
    ligatures: advanced.ligatures || null,
    numberSpacing: advanced.numberSpacing || null,
    numberForm: advanced.numberForm || null,
    stylisticSet,
    contextualAlternates: advanced.contextualAlternates,
  };
}
