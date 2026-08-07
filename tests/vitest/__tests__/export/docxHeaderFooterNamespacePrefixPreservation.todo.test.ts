import { describe, expect, it } from "vitest";
import { DOMParser } from "@xmldom/xmldom";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

/**
 * Namespace-prefix regression sentinel. OOXML identity is namespace URI + local
 * name; producer-selected prefixes such as `wx`/`rel` must never be treated as
 * semantic identifiers by source-preservation code.
 */
describe("DOCX namespace-prefix independence", () => {
  it("resolves header/footer reference semantics without canonical w/r prefixes", () => {
    const xml = `<wx:document xmlns:wx="${WORD_NS}" xmlns:rel="${OFFICE_REL_NS}"><wx:body><wx:sectPr><wx:headerReference wx:type="default" rel:id="rIdHeaderCustom"/><wx:footerReference wx:type="even" rel:id="rIdFooterCustom"/></wx:sectPr></wx:body></wx:document>`;
    const document = new DOMParser().parseFromString(xml, "application/xml");
    const references = Array.from(
      document.getElementsByTagNameNS(WORD_NS, "headerReference"),
    ).concat(Array.from(document.getElementsByTagNameNS(WORD_NS, "footerReference")));

    expect(references).toHaveLength(2);
    expect(references[0]!.localName).toBe("headerReference");
    expect(references[0]!.getAttributeNS(OFFICE_REL_NS, "id")).toBe(
      "rIdHeaderCustom",
    );
    expect(references[1]!.localName).toBe("footerReference");
    expect(references[1]!.getAttributeNS(OFFICE_REL_NS, "id")).toBe(
      "rIdFooterCustom",
    );
  });
});
