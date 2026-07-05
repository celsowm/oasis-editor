import { STANDARD_FONT_SIZES_PT, fontSizePxToPt } from "@/ui/fontSizeUnits.js";
import type {
  SelectOption,
  ToolbarActionApi,
  ToolbarDocumentStyle,
} from "@/ui/components/Toolbar/schema/items.js";

/** Platform modifier symbol used in keyboard-shortcut tooltips. */
export const mod = /Mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl";

/** Document's named styles, read through the uniform command-state channel. */
export const documentStyles = (api: ToolbarActionApi): ToolbarDocumentStyle[] =>
  (api.commands.state("documentStyles").value as
    | ToolbarDocumentStyle[]
    | undefined) ?? [];

/** Named table styles for the Table Design gallery select. */
export const tableStyleOptions = (api: ToolbarActionApi): SelectOption[] =>
  documentStyles(api)
    .filter((s) => s.type === "table")
    .map((s) => ({ value: s.id, label: s.name }));

export const fontFamilyOptions = (api: ToolbarActionApi): SelectOption[] => {
  const values = new Set<string>([
    "Arial",
    "Calibri, sans-serif",
    "Calibri Light, sans-serif",
    "Georgia",
    "Inter",
    "Open Sans, sans-serif",
    "Times New Roman",
    "Courier New",
  ]);
  for (const s of documentStyles(api)) {
    if (s.fontFamily) values.add(s.fontFamily);
  }
  const current = String(
    api.commands.state("setFontFamily").value ?? "",
  ).trim();
  if (current) values.add(current);
  return Array.from(values)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
};

export const fontSizeOptions = (api: ToolbarActionApi): SelectOption[] => {
  // Sizes are presented in points; document styles store pixels.
  const values = new Set<number>(STANDARD_FONT_SIZES_PT);
  for (const s of documentStyles(api)) {
    if (typeof s.fontSize === "number" && Number.isFinite(s.fontSize)) {
      values.add(fontSizePxToPt(s.fontSize));
    }
  }
  // The command state already reports the current size in points.
  const current = Number(api.commands.state("setFontSize").value);
  if (Number.isFinite(current) && current > 0) values.add(current);
  return Array.from(values)
    .sort((a, b) => a - b)
    .map((n) => ({ value: String(n), label: String(n) }));
};
