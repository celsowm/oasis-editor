import type { ToolbarDocumentStyle } from "./schema/items.js";

/**
 * The compact style `<select>` only renders the quick-style options produced
 * by `getQuickStyles`. When the active paragraph/character style is not among
 * them (a semi-hidden style, a character style, or a style applied outside the
 * gallery), a native select has no matching option and renders blank ("just
 * white"). Supply one fallback option for the active style so the control
 * always shows the current selection.
 */
export function compactStyleFallback(
  activeId: string,
  quickStyles: readonly ToolbarDocumentStyle[],
  allStyles: readonly ToolbarDocumentStyle[],
): { id: string; name: string } | null {
  if (!activeId || quickStyles.some((style) => style.id === activeId)) {
    return null;
  }
  const found = allStyles.find((style) => style.id === activeId);
  return { id: activeId, name: found?.name ?? activeId };
}
