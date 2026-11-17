import type { Element as XmlElement } from "@xmldom/xmldom";
import { WORD_NS, OFFICE_REL_NS } from "@/export/docx/xmlUtils.js";

/** Attribute identity is the expanded name, not a producer-selected prefix.
 * Do not interpret an ignored extension's id/type as a Word relationship.
 * The current semantic import and preservation paths target Transitional WML.
 */
export function readHeaderFooterRelationshipId(element: XmlElement): string | undefined {
  return element.getAttributeNS(OFFICE_REL_NS, "id") || undefined;
}

export function readHeaderFooterReferenceType(element: XmlElement): string {
  return element.getAttributeNS(WORD_NS, "type") || "default";
}

export function replaceHeaderFooterRelationshipId(
  element: XmlElement,
  value: string,
): boolean {
  const attribute = element.getAttributeNodeNS(OFFICE_REL_NS, "id");
  if (!attribute || attribute.value === value) return false;
  element.setAttributeNS(OFFICE_REL_NS, attribute.name, value);
  return true;
}
