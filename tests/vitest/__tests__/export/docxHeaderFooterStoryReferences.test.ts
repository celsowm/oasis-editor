import { describe, expect, it } from "vitest";
import { collectHeaderFooterStoryReferences } from "@/export/docx/opc/headerFooterStoryReferences.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

describe("header/footer story reference parsing", () => {
  it("uses namespace identity instead of canonical w/r prefix spellings", () => {
    const xml = `<?xml version="1.0"?>
<wx:document xmlns:wx="${WORD_NS}" xmlns:rel="${OFFICE_REL_NS}">
  <wx:body>
    <wx:p><wx:pPr><wx:sectPr>
      <wx:headerReference wx:type="first" rel:id="rIdFirst"/>
      <wx:footerReference wx:type="even" rel:id="rIdEvenFooter"/>
    </wx:sectPr></wx:pPr></wx:p>
    <wx:sectPr>
      <wx:headerReference wx:type="default" rel:id="rIdDefault"/>
      <wx:headerReference wx:type="default" rel:id="rIdDefaultDuplicate"/>
      <wx:sectPrChange><wx:sectPr><wx:headerReference wx:type="default" rel:id="rIdHistorical"/></wx:sectPr></wx:sectPrChange>
    </wx:sectPr>
  </wx:body>
</wx:document>`;

    expect(collectHeaderFooterStoryReferences(xml)).toEqual([
      {
        kind: "header",
        type: "first",
        occurrence: 0,
        relationshipId: "rIdFirst",
      },
      {
        kind: "footer",
        type: "even",
        occurrence: 0,
        relationshipId: "rIdEvenFooter",
      },
      {
        kind: "header",
        type: "default",
        occurrence: 0,
        relationshipId: "rIdDefault",
      },
      {
        kind: "header",
        type: "default",
        occurrence: 1,
        relationshipId: "rIdDefaultDuplicate",
      },
    ]);
  });
});
