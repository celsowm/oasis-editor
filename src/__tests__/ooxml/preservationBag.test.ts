import { describe, it, expect } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { PreservationBag } from "../../ooxml/preservationBag.js";
import { P_PR_CHILD_ORDER } from "../../ooxml/schemaOrder.js";

describe("PreservationBag", () => {
  it("captures unknown attributes correctly", () => {
    const xml = `<w:pPr w14:paraId="12345678" w15:collapsed="1" w:jc="center" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"/>`;
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const element = doc.documentElement!;

    const bag = new PreservationBag();
    bag.captureAttributes(element, new Set(["jc"]));

    expect(bag.attributes).toEqual([
      { name: "w14:paraId", value: "12345678" },
      { name: "w15:collapsed", value: "1" },
    ]);
    expect(bag.serializeAttributes()).toBe('w14:paraId="12345678" w15:collapsed="1"');
  });

  it("captures unknown child elements with schema ordering indexes", () => {
    const xml = `<w:pPr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
      <w:pStyle w:val="Normal"/>
      <w14:textId w14:val="11223344"/>
      <w:jc w:val="left"/>
    </w:pPr>`;
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const element = doc.documentElement!;

    const bag = new PreservationBag();
    bag.captureUnmappedChildren(element, new Set(["pStyle", "jc"]), P_PR_CHILD_ORDER);

    expect(bag.children.length).toBe(1);
    expect(bag.children[0]!.localName).toBe("textId");
    expect(bag.children[0]!.prefix).toBe("w14");
    expect(bag.children[0]!.xml).toContain('w14:textId');
    expect(bag.children[0]!.xml).toContain('w14:val="11223344"');
  });
});
