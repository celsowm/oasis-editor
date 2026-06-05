import type { EditorDocument } from "../../../core/model.js";
import {
  EFFECTIVE_TEXT_STYLE_DEFAULTS,
  getDocumentParagraphs,
  resolveEffectiveTextStyleForParagraph,
} from "../../../core/model.js";

export function collectPdfFontFamilies(
  document: EditorDocument,
): Set<string | null | undefined> {
  const families = new Set<string | null | undefined>([
    EFFECTIVE_TEXT_STYLE_DEFAULTS.fontFamily,
  ]);
  for (const paragraph of getDocumentParagraphs(document)) {
    families.add(
      resolveEffectiveTextStyleForParagraph(
        undefined,
        paragraph.style?.styleId,
        document.styles,
      ).fontFamily,
    );
    for (const run of paragraph.runs) {
      families.add(run.styles?.fontFamily);
    }
  }
  return families;
}
