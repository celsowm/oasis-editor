import { describe, it, expect } from "vitest";
import { NamespaceRegistry } from "../../ooxml/namespaceRegistry.js";
import { PreservationBag } from "../../ooxml/preservationBag.js";
import { sortXmlNodesBySchemaOrder, P_PR_CHILD_ORDER, R_PR_CHILD_ORDER, SECT_PR_CHILD_ORDER } from "../../ooxml/schemaOrder.js";
import { extractMarkupCompatibilityMetadata, serializeMcAttributes } from "../../ooxml/markupCompatibilityEngine.js";
import { preserveNamespacesAndMc } from "../../export/docx/opc/universalContainerPatcher.js";
import { DOMParser } from "@xmldom/xmldom";

describe("Milestone 2 Integration Suite: Universal Rewritten-Part Source & Extension Preservation", () => {
  it("maintains strict OOXML schema child element ordering across properties", () => {
    const rawPPrChildren = ["w:sectPr", "w:jc", "w:pStyle", "w:ind", "w:keepNext", "w:rPr"];
    const sortedPPr = sortXmlNodesBySchemaOrder(rawPPrChildren, (name) => name, P_PR_CHILD_ORDER);
    expect(sortedPPr).toEqual(["w:pStyle", "w:keepNext", "w:rPr", "w:sectPr", "w:ind", "w:jc"]);

    const rawSectPrChildren = ["w:cols", "w:pgSz", "w:headerReference", "w:pgMar", "w:vAlign"];
    const sortedSectPr = sortXmlNodesBySchemaOrder(rawSectPrChildren, (name) => name, SECT_PR_CHILD_ORDER);
    expect(sortedSectPr).toEqual(["w:headerReference", "w:pgSz", "w:pgMar", "w:cols", "w:vAlign"]);
  });

  it("captures and preserves unknown Microsoft extension elements (w14, w15, w16cid)", () => {
    const xml = `<w:pPr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">
      <w:pStyle w:val="Heading1"/>
      <w14:paraId w14:val="1A2B3C4D"/>
      <w15:collapsed w15:val="1"/>
      <w:jc w:val="center"/>
    </w:pPr>`;

    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const element = doc.documentElement!;

    const bag = new PreservationBag();
    bag.captureUnmappedChildren(element, new Set(["pStyle", "jc"]), P_PR_CHILD_ORDER);

    expect(bag.children.length).toBe(2);
    expect(bag.children[0]!.localName).toBe("paraId");
    expect(bag.children[1]!.localName).toBe("collapsed");
  });

  it("round-trips mc:AlternateContent, mc:Ignorable, and mc:PreserveElements across rewritten containers", () => {
    const sourceXml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" mc:Ignorable="w14" mc:PreserveElements="w14:paraId">
      <w:body>
        <w:p>
          <mc:AlternateContent>
            <mc:Choice Requires="w14"><w:r><w:t>Enhanced</w:t></w:r></mc:Choice>
            <mc:Fallback><w:r><w:t>Standard</w:t></w:r></mc:Fallback>
          </mc:AlternateContent>
        </w:p>
      </w:body>
    </w:document>`;

    const rebuiltXml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Edited</w:t></w:r></w:p></w:body></w:document>`;

    const patched = preserveNamespacesAndMc(sourceXml, rebuiltXml);
    expect(patched).toContain('mc:Ignorable="w14"');
    expect(patched).toContain('mc:PreserveElements="w14:paraId"');
  });
});
