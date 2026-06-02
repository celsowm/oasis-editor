import type {
  EditorLigatures,
  EditorNumberForm,
  EditorNumberSpacing,
} from "../../../core/model.js";

export type FontDialogSpacingMode = "normal" | "expanded" | "condensed";
export type FontDialogPositionMode = "normal" | "raised" | "lowered";
export type FontFaceStyle = "regular" | "italic" | "bold" | "boldItalic";

export function parsePositiveNumber(value: string): number | null {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseNonNegativeNumber(value: string): number | null {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function formatNullableNumber(value: string | number | null | undefined): string {
  return value === undefined || value === null || value === "" ? "" : String(value);
}

export function resolveSpacingMode(value: string | number | null | undefined): FontDialogSpacingMode {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed === 0) return "normal";
  return parsed > 0 ? "expanded" : "condensed";
}

export function resolvePositionMode(value: string | number | null | undefined): FontDialogPositionMode {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed === 0) return "normal";
  return parsed > 0 ? "raised" : "lowered";
}

export function parseStylisticSet(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 20 ? parsed : null;
}

export function ligaturesToCss(value: EditorLigatures | ""): string | undefined {
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

export function resolveFontFaceStyle(bold: boolean, italic: boolean): FontFaceStyle {
  if (bold && italic) return "boldItalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "regular";
}
