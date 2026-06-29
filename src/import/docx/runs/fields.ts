import { type Element as XmlElement } from "@xmldom/xmldom";
import { WORD_NS, getChildrenByTagNameNS } from "@/import/docx/xmlHelpers.js";

export function getRunInstructionText(runElement: XmlElement): string {
  return getChildrenByTagNameNS(runElement, WORD_NS, "instrText")
    .map((element): string => element.textContent ?? "")
    .join("");
}
