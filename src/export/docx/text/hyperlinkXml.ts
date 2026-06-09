import type { DocContext } from "../docxTypes.js";
import { escapeXml } from "../xmlUtils.js";

export function wrapRunWithHyperlink(
  runXml: string,
  link: string,
  context: DocContext,
): string {
  if (link.startsWith("#")) {
    return `<w:hyperlink w:anchor="${escapeXml(link.slice(1))}">${runXml}</w:hyperlink>`;
  }

  const rId = context.hyperlinkMap.get(link);
  if (!rId) {
    return runXml;
  }

  return `<w:hyperlink r:id="${rId}">${runXml}</w:hyperlink>`;
}
