import type { EditorDocument } from "./model.js";
import { getDocumentParagraphs, getParagraphText } from "./model.js";

export interface OutlineItem {
  id: string;
  level: number;
  text: string;
  anchor: string;
}

/**
 * Resolve the heading level (1-9) of a paragraph style id, or null if the style
 * is not a heading. Case-insensitive and tolerant of an optional space, so it
 * matches both the editor's own convention (`heading1`) and Word's imported
 * style ids (`Heading1`, `Heading 1`). Keeping detection here means imported
 * `styleId`s round-trip unchanged on export.
 */
export function getHeadingLevel(styleId: string | undefined): number | null {
  if (!styleId) return null;
  const match = /^heading\s*([1-9])$/i.exec(styleId.trim());
  return match ? parseInt(match[1]!, 10) : null;
}

export function outlineFrom(doc: EditorDocument): OutlineItem[] {
  const paragraphs = getDocumentParagraphs(doc);
  const items: OutlineItem[] = [];

  for (const p of paragraphs) {
    const level = getHeadingLevel(p.style?.styleId);
    if (level !== null && level <= 6) {
      const text = getParagraphText(p).trim();
      if (text) {
        items.push({
          id: p.id,
          level,
          text,
          anchor: p.id, // Using paragraph ID as the anchor
        });
      }
    }
  }

  return items;
}
