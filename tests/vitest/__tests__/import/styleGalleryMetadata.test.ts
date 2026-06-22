import { describe, expect, it } from "vitest";
import { parseImportedStyles } from "@/import/docx/stylesXml.js";
import { buildStylesXml } from "@/export/docx/stylesXml.js";

describe("DOCX quick-style metadata", () => {
  it("imports and exports quick-style gallery metadata", () => {
    const xml = `<?xml version="1.0"?>
      <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:style w:type="character" w:styleId="Emphasis">
          <w:name w:val="Emphasis"/>
          <w:uiPriority w:val="20"/>
          <w:qFormat/>
          <w:semiHidden w:val="0"/>
          <w:unhideWhenUsed/>
          <w:rPr><w:i/></w:rPr>
        </w:style>
      </w:styles>`;

    const styles = parseImportedStyles(xml, { fonts: {}, colors: {} });
    expect(styles?.Emphasis).toMatchObject({
      type: "character",
      qFormat: true,
      uiPriority: 20,
      semiHidden: false,
      unhideWhenUsed: true,
    });

    const exported = buildStylesXml(styles ?? {});
    expect(exported).toContain('<w:uiPriority w:val="20"/>');
    expect(exported).toContain('<w:qFormat w:val="1"/>');
    expect(exported).toContain('<w:semiHidden w:val="0"/>');
    expect(exported).toContain('<w:unhideWhenUsed w:val="1"/>');
  });
});
