import type { EditorDocument, EditorParagraphNode } from "./model.js";
import { getDocumentParagraphs, getParagraphText } from "./model.js";

export interface OutlineItem {
  id: string;
  level: number;
  text: string;
  anchor: string;
}

export function outlineFrom(doc: EditorDocument): OutlineItem[] {
  const paragraphs = getDocumentParagraphs(doc);
  const items: OutlineItem[] = [];

  for (const p of paragraphs) {
    const styleId = p.style?.styleId;
    if (styleId && styleId.startsWith("heading")) {
      const levelStr = styleId.replace("heading", "");
      const level = parseInt(levelStr, 10);
      if (!isNaN(level) && level >= 1 && level <= 6) {
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
  }

  return items;
}
