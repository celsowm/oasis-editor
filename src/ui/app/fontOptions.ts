import type { EditorDocument } from "../../core/model.js";
import type { ToolbarStyleState } from "../toolbarStyleState.js";
import { STANDARD_FONT_SIZES_PT, fontSizePxToPt } from "../fontSizeUnits.js";

const COMMON_FONT_FAMILIES = [
  "Aptos, sans-serif",
  "Aptos Display, sans-serif",
  "Arial",
  "Arial Black",
  "Bahnschrift, sans-serif",
  "Book Antiqua, serif",
  "Calibri, sans-serif",
  "Calibri Light, sans-serif",
  "Cambria, serif",
  "Candara, sans-serif",
  "Century Gothic, sans-serif",
  "Comic Sans MS",
  "Consolas, monospace",
  "Constantia, serif",
  "Corbel, sans-serif",
  "Courier New",
  "Franklin Gothic Medium, sans-serif",
  "Garamond, serif",
  "Georgia",
  "Gill Sans, sans-serif",
  "Helvetica, sans-serif",
  "Impact",
  "Inter",
  "Lucida Console, monospace",
  "Lucida Sans Unicode, sans-serif",
  "Open Sans, sans-serif",
  "Palatino Linotype, serif",
  "Segoe UI, sans-serif",
  "Tahoma, sans-serif",
  "Times New Roman",
  "Trebuchet MS, sans-serif",
  "Verdana, sans-serif",
  "Wingdings",
] as const;

function addFontFamily(
  target: string[],
  seen: Set<string>,
  value: string | null | undefined,
): void {
  const family = value?.trim();
  if (!family) return;
  const key = family.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  target.push(family);
}

export function computeFontFamilyOptions(
  document: EditorDocument | undefined,
  toolbarStyleState: Pick<ToolbarStyleState, "fontFamily">,
  localFontFamilies: string[] = [],
): string[] {
  const seen = new Set<string>();
  const documentFonts: string[] = [];
  const fallbackFonts: string[] = [];

  for (const style of Object.values(document?.styles ?? {})) {
    addFontFamily(documentFonts, seen, style.textStyle?.fontFamily);
  }
  addFontFamily(documentFonts, seen, toolbarStyleState.fontFamily);

  for (const family of localFontFamilies) {
    addFontFamily(fallbackFonts, seen, family);
  }
  for (const family of COMMON_FONT_FAMILIES) {
    addFontFamily(fallbackFonts, seen, family);
  }

  return [
    ...documentFonts.sort((a, b) => a.localeCompare(b)),
    ...fallbackFonts.sort((a, b) => a.localeCompare(b)),
  ];
}

export function computeFontSizeOptions(
  document: EditorDocument | undefined,
  toolbarStyleState: Pick<ToolbarStyleState, "fontSize">,
): number[] {
  // Sizes are presented in points; the model stores pixels.
  const values = new Set<number>(STANDARD_FONT_SIZES_PT);
  for (const style of Object.values(document?.styles ?? {})) {
    const fontSize = style.textStyle?.fontSize;
    if (typeof fontSize === "number" && Number.isFinite(fontSize)) {
      values.add(fontSizePxToPt(fontSize));
    }
  }
  const current = fontSizePxToPt(Number(toolbarStyleState.fontSize));
  if (Number.isFinite(current) && current > 0) values.add(current);
  return Array.from(values).sort((a, b) => a - b);
}
