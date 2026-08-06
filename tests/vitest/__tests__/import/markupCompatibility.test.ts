import { describe, expect, it } from "vitest";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import {
  WORD14_NS,
  WORD_NS,
  getChildrenByTagNameNS,
  getFirstW14Child,
} from "@/import/docx/xmlHelpers.js";
import {
  DEFAULT_MARKUP_COMPATIBILITY_CAPABILITIES,
  extendMarkupCompatibilityCapabilities,
  getMarkupCompatibleChildren,
} from "@/import/docx/markupCompatibility.js";

const MC_NS =
  "http://schemas.openxmlformats.org/markup-compatibility/2006";

function parseRoot(xml: string): XmlElement {
  return new DOMParser().parseFromString(xml, "application/xml")
    .documentElement as XmlElement;
}

describe("DOCX Markup Compatibility", () => {
  it("keeps generic parsing conservative while specialized w14 parsing selects Choice", () => {
    const root = parseRoot(`
      <w:root xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}" xmlns:mc="${MC_NS}">
        <mc:AlternateContent>
          <mc:Choice Requires="w14"><w14:feature w14:val="choice"/></mc:Choice>
          <mc:Fallback><w:feature w:val="fallback"/></mc:Fallback>
        </mc:AlternateContent>
      </w:root>
    `);

    expect(
      getChildrenByTagNameNS(root, WORD_NS, "feature")[0]?.getAttributeNS(
        WORD_NS,
        "val",
      ),
    ).toBe("fallback");
    expect(getFirstW14Child(root, "feature")?.getAttributeNS(WORD14_NS, "val"))
      .toBe("choice");
  });

  it("selects the first Choice whose complete Requires list is supported", () => {
    const root = parseRoot(`
      <w:root xmlns:w="${WORD_NS}" xmlns:mc="${MC_NS}" xmlns:x="urn:test:x" xmlns:y="urn:test:y">
        <mc:AlternateContent>
          <mc:Choice Requires="x y"><x:result value="both"/></mc:Choice>
          <mc:Choice Requires="y"><y:result value="y"/></mc:Choice>
          <mc:Fallback><w:result value="fallback"/></mc:Fallback>
        </mc:AlternateContent>
      </w:root>
    `);
    const capabilities = extendMarkupCompatibilityCapabilities(
      DEFAULT_MARKUP_COMPATIBILITY_CAPABILITIES,
      "urn:test:y",
    );

    const children = getMarkupCompatibleChildren(root, capabilities);
    expect(children).toHaveLength(1);
    expect(children[0]?.namespaceURI).toBe("urn:test:y");
    expect(children[0]?.getAttribute("value")).toBe("y");
  });

  it("filters unsupported Ignorable elements and unwraps ProcessContent wrappers", () => {
    const root = parseRoot(`
      <w:root xmlns:w="${WORD_NS}" xmlns:mc="${MC_NS}" xmlns:x="urn:test:future"
        mc:Ignorable="x" mc:ProcessContent="x:wrapper">
        <x:discard><w:dropped/></x:discard>
        <x:wrapper><w:kept/></x:wrapper>
        <w:ordinary/>
      </w:root>
    `);

    const children = getMarkupCompatibleChildren(root);
    expect(
      children.map((child): string => child.localName ?? child.tagName),
    ).toEqual(["kept", "ordinary"]);
    expect(getChildrenByTagNameNS(root, WORD_NS, "kept")).toHaveLength(1);
    expect(getChildrenByTagNameNS(root, WORD_NS, "dropped")).toHaveLength(0);
  });

  it("returns no effective child when no Choice is supported and Fallback is absent", () => {
    const root = parseRoot(`
      <w:root xmlns:w="${WORD_NS}" xmlns:mc="${MC_NS}" xmlns:x="urn:test:x">
        <mc:AlternateContent>
          <mc:Choice Requires="x"><x:future/></mc:Choice>
        </mc:AlternateContent>
      </w:root>
    `);

    expect(getMarkupCompatibleChildren(root)).toEqual([]);
  });
});
