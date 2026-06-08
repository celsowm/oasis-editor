/**
 * Document sections: canonicalize (always return a non-empty section list,
 * synthesizing a default section when `document.sections` is missing) and
 * apply page-settings normalization to every section.
 */
import type { EditorDocument, EditorSection } from "./types/document.js";
import {
  getDocumentPageSettings,
  normalizePageSettings,
} from "./pageGeometry.js";

export function getDocumentSectionsCanonical(
  document: EditorDocument,
): EditorSection[] {
  if (document.sections && document.sections.length > 0) {
    return document.sections.map((section) => ({
      ...section,
      pageSettings: normalizePageSettings(section.pageSettings),
    }));
  }

  return [
    {
      id: "section:default",
      blocks: [],
      pageSettings: getDocumentPageSettings(document),
    },
  ];
}

export function getDocumentSections(document: EditorDocument): EditorSection[] {
  return getDocumentSectionsCanonical(document);
}
