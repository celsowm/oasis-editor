import type { ToolbarDocumentStyle } from "./schema/items.js";

/** Shared geometry for the ribbon allocator and the rendered gallery. */
export const STYLE_GALLERY_CARD_WIDTH = 106;
export const STYLE_GALLERY_EXPAND_WIDTH = 24;
export const STYLE_GALLERY_BORDER_WIDTH = 2;
// Provisional minimum for a flexible preview; verify in real browsers.
export const STYLE_GALLERY_MIN_CARD_WIDTH = 80;

export function styleGallerySlots(width: number): number {
  if (!Number.isFinite(width) || width < STYLE_GALLERY_MIN_CARD_WIDTH) return 0;
  return Math.max(1, Math.floor(width / STYLE_GALLERY_CARD_WIDTH));
}

/** Follow the active style without changing the canonical quick-style order. */
export function visibleGalleryStyles(
  quick: readonly ToolbarDocumentStyle[],
  all: readonly ToolbarDocumentStyle[],
  activeId: string,
  slots: number,
): ToolbarDocumentStyle[] {
  if (slots <= 0) return [];
  const index = quick.findIndex((style) => style.id === activeId);
  if (index >= 0) {
    const start = Math.max(0, index - slots + 1);
    return quick.slice(start, start + slots);
  }
  const active = all.find((style) => style.id === activeId && style.type !== "table");
  return active ? [active, ...quick.slice(0, slots - 1)] : quick.slice(0, slots);
}
