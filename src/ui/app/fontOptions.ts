import type { EditorDocument } from "../../core/model.js";
import type { ToolbarStyleState } from "../toolbarStyleState.js";

export function computeFontFamilyOptions(
  document: EditorDocument | undefined,
  toolbarStyleState: Pick<ToolbarStyleState, "fontFamily">,
): string[] {
  const values = new Set<string>([
    "Arial",
    "Calibri, sans-serif",
    "Calibri Light, sans-serif",
    "Georgia",
    "Inter",
    "Times New Roman",
    "Courier New",
  ]);
  for (const style of Object.values(document?.styles ?? {})) {
    const fontFamily = style.textStyle?.fontFamily?.trim?.();
    if (fontFamily) values.add(fontFamily);
  }
  const current = toolbarStyleState.fontFamily.trim();
  if (current) values.add(current);
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

export function computeFontSizeOptions(
  document: EditorDocument | undefined,
  toolbarStyleState: Pick<ToolbarStyleState, "fontSize">,
): number[] {
  const values = new Set<number>([8, 9, 10, 11, 12, 14, 15, 16, 18, 20, 24, 28, 32, 36, 48, 72]);
  for (const style of Object.values(document?.styles ?? {})) {
    const fontSize = style.textStyle?.fontSize;
    if (typeof fontSize === "number" && Number.isFinite(fontSize)) values.add(fontSize);
  }
  const current = Number(toolbarStyleState.fontSize);
  if (Number.isFinite(current) && current > 0) values.add(current);
  return Array.from(values).sort((a, b) => a - b);
}
