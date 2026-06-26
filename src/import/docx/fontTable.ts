import { DOMParser } from "@xmldom/xmldom";
import type { EditorFontInfo } from "@/core/model.js";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";

/**
 * Parse `word/fontTable.xml` into the document's font declarations. Each
 * `<w:font w:name="…">` carries substitution metadata (alternative name, family,
 * pitch, charset, PANOSE, and the Unicode/codepage signature). Embedded font
 * references (`w:embedRegular`/etc., which point at obfuscated `.odttf` parts)
 * are intentionally not read.
 *
 * Returns `undefined` when there is no usable font table so the document field
 * stays absent (and export skips the part).
 */
export function parseFontTable(
  xml: string | null,
): EditorFontInfo[] | undefined {
  if (!xml) {
    return undefined;
  }
  const root = new DOMParser().parseFromString(xml, "application/xml");
  const fontsEl = root.getElementsByTagNameNS(WORD_NS, "fonts")[0];
  if (!fontsEl) {
    return undefined;
  }

  const fonts: EditorFontInfo[] = [];
  for (const fontEl of getChildrenByTagNameNS(fontsEl, WORD_NS, "font")) {
    const name = getAttributeValue(fontEl, "name");
    if (!name) {
      continue;
    }
    const info: EditorFontInfo = { name };

    const altName = getAttributeValue(
      getFirstChildByTagNameNS(fontEl, WORD_NS, "altName"),
      "val",
    );
    if (altName) info.altName = altName;

    const family = getAttributeValue(
      getFirstChildByTagNameNS(fontEl, WORD_NS, "family"),
      "val",
    );
    if (family) info.family = family;

    const pitch = getAttributeValue(
      getFirstChildByTagNameNS(fontEl, WORD_NS, "pitch"),
      "val",
    );
    if (pitch) info.pitch = pitch;

    const charset = getAttributeValue(
      getFirstChildByTagNameNS(fontEl, WORD_NS, "charset"),
      "val",
    );
    if (charset) info.charset = charset;

    const panose1 = getAttributeValue(
      getFirstChildByTagNameNS(fontEl, WORD_NS, "panose1"),
      "val",
    );
    if (panose1) info.panose1 = panose1;

    const sigEl = getFirstChildByTagNameNS(fontEl, WORD_NS, "sig");
    if (sigEl) {
      const sig: Record<string, string> = {};
      for (let i = 0; i < sigEl.attributes.length; i += 1) {
        const attr = sigEl.attributes[i]!;
        // Strip the `w:` prefix; export re-adds it.
        sig[attr.localName ?? attr.name] = attr.value;
      }
      if (Object.keys(sig).length > 0) info.sig = sig;
    }

    fonts.push(info);
  }

  return fonts.length > 0 ? fonts : undefined;
}
