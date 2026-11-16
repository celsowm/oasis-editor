import type { ToolbarDocumentStyle } from "./schema/items.js";

/** Shared geometry for the ribbon allocator and the rendered gallery. */
export const STYLE_GALLERY_CARD_WIDTH = 106;
export const TABLE_STYLE_GALLERY_CARD_WIDTH = 72;
export const STYLE_GALLERY_EXPAND_WIDTH = 24;
export const STYLE_GALLERY_BORDER_WIDTH = 2;
/** A mounted strip always keeps a real preview, even while temporarily hidden.
 * The ribbon owns collapse; a narrow strip must not degrade into a name-only
 * placeholder when the document has available styles.
 */
export function styleGallerySlots(width: number): number {
  return gallerySlots(width, STYLE_GALLERY_CARD_WIDTH);
}

/** Whole-card capacity shared by paragraph and table preview strips. */
export function gallerySlots(width: number, cardWidth: number): number {
  return Math.max(1, Math.floor((Number.isFinite(width) ? width : 0) / cardWidth));
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
