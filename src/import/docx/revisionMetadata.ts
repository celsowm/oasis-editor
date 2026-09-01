import type { Element as XmlElement } from "@xmldom/xmldom";
import type { EditorRevisionMetadata } from "@/core/model.js";
import { getAttributeValue } from "./xmlHelpers.js";

/** Parses the shared w:id/w:author/w:date payload used by OOXML property changes. */
export function parseRevisionMetadata(
  element: XmlElement | null | undefined,
): EditorRevisionMetadata | undefined {
  if (!element) return undefined;
  const id = getAttributeValue(element, "id");
  const author = getAttributeValue(element, "author");
  const rawDate = getAttributeValue(element, "date");
  if (!id || !author || !rawDate) return undefined;
  const date = Date.parse(rawDate);
  if (!Number.isFinite(date)) return undefined;
  return { id, author, date };
}
