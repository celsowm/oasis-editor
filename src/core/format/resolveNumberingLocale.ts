/**
 * Resolves the language that controls textual number formats (`ordinal`,
 * `cardinalText`, `ordinalText`, `chicago`).
 *
 * The document's language is deliberately independent from the language used
 * by the Ribbon: this service never reads `src/i18n/`. Callers pass the
 * editor-level override explicitly when one exists.
 */
import type { EditorDocument } from "@/core/model/types/document.js";
import type { EditorParagraphNode } from "@/core/model/types/nodes.js";
import {
  resolveDefaultParagraphStyleId,
  resolveEffectiveTextStyleForParagraph,
} from "@/core/model/styleResolution.js";

export const FALLBACK_NUMBERING_LOCALE = "pt-BR";

function languageValue(
  language: { value?: string | null } | null | undefined,
): string | undefined {
  const value = language?.value;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * `w:lang` of the content → document default language → explicit editor
 * setting → `pt-BR`.
 */
export function resolveNumberingLocale(
  document: EditorDocument,
  paragraph?: EditorParagraphNode,
  editorLocale?: string,
): string {
  if (paragraph) {
    const effective = resolveEffectiveTextStyleForParagraph(
      paragraph.runs[0]?.styles,
      paragraph.style?.styleId,
      document.styles,
    );
    const fromContent = languageValue(effective.language);
    if (fromContent) return fromContent;
  }
  const defaultStyleId = resolveDefaultParagraphStyleId(document.styles);
  const fromDocument = languageValue(
    document.styles?.[defaultStyleId ?? ""]?.textStyle?.language,
  );
  if (fromDocument) return fromDocument;
  if (typeof editorLocale === "string" && editorLocale.trim()) {
    return editorLocale.trim();
  }
  return FALLBACK_NUMBERING_LOCALE;
}
