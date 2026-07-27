import type {
  EditorAsset,
  EditorBlockNode,
  EditorDocument,
  EditorNamedStyle,
  EditorPageSettings,
  EditorSection,
} from "../model.js";
import {
  DEFAULT_EDITOR_PAGE_SETTINGS,
  getDocumentParagraphsCanonical,
  getParagraphLength,
  normalizePageSettings,
} from "../model.js";
import { createEditorNodeId } from "./nodeFactories.js";
import {
  DEFAULT_EDITOR_STYLES,
  DEFAULT_TABLE_STYLES,
} from "./defaultStyles.js";

function withDefaultTableStyles(
  styles: Record<string, EditorNamedStyle>,
): Record<string, EditorNamedStyle> {
  const defaults = Object.fromEntries(
    Object.entries(DEFAULT_TABLE_STYLES).filter(([id]) => !(id in styles)),
  );
  return { ...styles, ...defaults };
}

export function createEditorDocument(
  blocks: EditorBlockNode[],
  pageSettings?: EditorPageSettings,
  sections?: EditorSection[],
  styles?: Record<string, EditorNamedStyle>,
  metadata?: { title?: string; [key: string]: unknown },
  assets?: Record<string, EditorAsset>,
): EditorDocument {
  const normalizedPageSettings = normalizePageSettings(
    pageSettings
      ? {
          width: pageSettings.width,
          height: pageSettings.height,
          orientation: pageSettings.orientation,
          margins: { ...pageSettings.margins },
          ...(pageSettings.columns ? { columns: pageSettings.columns } : {}),
        }
      : {
          width: DEFAULT_EDITOR_PAGE_SETTINGS.width,
          height: DEFAULT_EDITOR_PAGE_SETTINGS.height,
          orientation: DEFAULT_EDITOR_PAGE_SETTINGS.orientation,
          margins: { ...DEFAULT_EDITOR_PAGE_SETTINGS.margins },
        },
  );
  const document: EditorDocument = {
    schemaVersion: 1,
    id: createEditorNodeId("document"),
    pageSettings: normalizedPageSettings,
    sections: sections ?? [
      {
        id: "section:default",
        blocks,
        pageSettings: normalizedPageSettings,
      },
    ],
    styles: styles
      ? withDefaultTableStyles(styles)
      : { ...DEFAULT_EDITOR_STYLES },
    metadata: metadata ?? { title: "Untitled document" },
    // The asset registry holds out-of-band image payloads (data URLs).
    // It must be carried through any document-rebuild path or `asset:<id>`
    // refs in image runs will dangle and the renderer will try to GET
    // "asset:img-1" as a URL.
    assets: assets ?? undefined,
  };
  return document;
}

export function getDocumentCharacterCount(document: EditorDocument): number {
  return getDocumentParagraphsCanonical(document).reduce(
    (sum, p): number => sum + getParagraphLength(p),
    0,
  );
}

export function getDocumentWordCount(document: EditorDocument): number {
  const paragraphs = getDocumentParagraphsCanonical(document);
  let totalWords = 0;

  for (const paragraph of paragraphs) {
    const text = paragraph.runs.reduce(
      (sum, run): string => sum + run.text,
      "",
    );
    if (!text.trim()) continue;

    // Split by whitespace and punctuation that typically separates words
    // This is a naive implementation but covers basic English/Portuguese needs
    const words = text
      .split(/[\s\p{P}]+/u)
      .filter((word): boolean => word.length > 0);
    totalWords += words.length;
  }

  return totalWords;
}
