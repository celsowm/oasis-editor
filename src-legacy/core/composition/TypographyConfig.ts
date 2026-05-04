export interface TypographyDefaults {
  paragraph: { fontSize: number; fontWeight: number; lineHeight: number };
  heading1: { fontSize: number; fontWeight: number; lineHeight: number };
  heading2: { fontSize: number; fontWeight: number; lineHeight: number };
  heading3: { fontSize: number; fontWeight: number; lineHeight: number };
  listItem: { fontSize: number; fontWeight: number; lineHeight: number };
  orderedListItem: { fontSize: number; fontWeight: number; lineHeight: number };
}

export const DEFAULT_TYPOGRAPHY: TypographyDefaults = {
  paragraph: { fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
  heading1: { fontSize: 24, fontWeight: 700, lineHeight: 1.2 },
  heading2: { fontSize: 18, fontWeight: 700, lineHeight: 1.3 },
  heading3: { fontSize: 16, fontWeight: 700, lineHeight: 1.4 },
  listItem: { fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
  orderedListItem: { fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
};

/**
 * Canonical heading font sizes in **CSS pixels** (96 DPI), indexed by level (1..6).
 * Used by both the on-screen renderer and exporters (which convert to pt as needed).
 */
export const HEADING_SIZES_PX: Record<number, number> = {
  1: 24,
  2: 20,
  3: 18,
  4: 16,
  5: 14,
  6: 12,
};

export function getTypographyForBlockKind(kind: string): { fontSize: number; fontWeight: number; lineHeight: number } {
  const d = DEFAULT_TYPOGRAPHY;
  switch (kind) {
    case "heading": return { fontSize: d.heading1.fontSize, fontWeight: d.heading1.fontWeight, lineHeight: d.heading1.lineHeight };
    case "list-item": return { fontSize: d.listItem.fontSize, fontWeight: d.listItem.fontWeight, lineHeight: d.listItem.lineHeight };
    case "ordered-list-item": return { fontSize: d.orderedListItem.fontSize, fontWeight: d.orderedListItem.fontWeight, lineHeight: d.orderedListItem.lineHeight };
    default: return { fontSize: d.paragraph.fontSize, fontWeight: d.paragraph.fontWeight, lineHeight: d.paragraph.lineHeight };
  }
}
