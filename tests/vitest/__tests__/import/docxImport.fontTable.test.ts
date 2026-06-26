import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { parseFontTable } from "@/import/docx/fontTable.js";

const FONT_TABLE_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Calibri">
    <w:altName w:val="Carlito"/>
    <w:panose1 w:val="020F0502020204030204"/>
    <w:charset w:val="00"/>
    <w:family w:val="swiss"/>
    <w:pitch w:val="variable"/>
    <w:sig w:usb0="E4002EFF" w:usb1="C000247B" w:usb2="00000009" w:usb3="00000000" w:csb0="000001FF" w:csb1="00000000"/>
  </w:font>
  <w:font w:name="Custom Display">
    <w:altName w:val="Arial"/>
    <w:family w:val="decorative"/>
  </w:font>
</w:fonts>`;

async function importWithFontTable(fontTableXml: string | null) {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Body</w:t></w:r></w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
  );
  if (fontTableXml !== null) {
    zip.file("word/fontTable.xml", fontTableXml);
  }
  return importDocxToEditorDocument(
    await zip.generateAsync({ type: "arraybuffer" }),
  );
}

describe("parseFontTable", () => {
  it("returns undefined for an absent or empty table", () => {
    expect(parseFontTable(null)).toBeUndefined();
    expect(
      parseFontTable(
        `<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:fonts>`,
      ),
    ).toBeUndefined();
  });

  it("parses each font's substitution metadata", () => {
    const fonts = parseFontTable(FONT_TABLE_XML)!;
    expect(fonts).toHaveLength(2);
    expect(fonts[0]).toEqual({
      name: "Calibri",
      altName: "Carlito",
      family: "swiss",
      pitch: "variable",
      charset: "00",
      panose1: "020F0502020204030204",
      sig: {
        usb0: "E4002EFF",
        usb1: "C000247B",
        usb2: "00000009",
        usb3: "00000000",
        csb0: "000001FF",
        csb1: "00000000",
      },
    });
    expect(fonts[1]).toEqual({
      name: "Custom Display",
      altName: "Arial",
      family: "decorative",
    });
  });

  it("skips font entries with no name", () => {
    const fonts = parseFontTable(
      `<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:font><w:altName w:val="X"/></w:font>
        <w:font w:name="Keep"/>
      </w:fonts>`,
    );
    expect(fonts).toEqual([{ name: "Keep" }]);
  });
});

describe("DOCX font table round-trip", () => {
  it("imports word/fontTable.xml onto the document", async () => {
    const document = await importWithFontTable(FONT_TABLE_XML);
    expect(document.fontTable).toHaveLength(2);
    expect(document.fontTable![0]!.name).toBe("Calibri");
    expect(document.fontTable![0]!.altName).toBe("Carlito");
  });

  it("leaves fontTable absent when the part is missing", async () => {
    const document = await importWithFontTable(null);
    expect(document.fontTable).toBeUndefined();
  });

  it("re-emits the font table, content type, and relationship on export", async () => {
    const document = await importWithFontTable(FONT_TABLE_XML);
    const zip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );

    const fontTableXml = await zip.file("word/fontTable.xml")?.async("string");
    expect(fontTableXml).toBeTruthy();
    expect(fontTableXml).toContain('<w:font w:name="Calibri">');
    expect(fontTableXml).toContain('<w:altName w:val="Carlito"/>');
    expect(fontTableXml).toContain('<w:family w:val="swiss"/>');
    expect(fontTableXml).toContain('w:usb0="E4002EFF"');
    expect(fontTableXml).toContain('<w:font w:name="Custom Display">');

    const contentTypes = await zip.file("[Content_Types].xml")?.async("string");
    expect(contentTypes).toContain("/word/fontTable.xml");
    expect(contentTypes).toContain("wordprocessingml.fontTable+xml");

    const rels = await zip
      .file("word/_rels/document.xml.rels")
      ?.async("string");
    expect(rels).toContain('Target="fontTable.xml"');
    expect(rels).toContain("/fontTable");
  });

  it("writes no font table part when the document has none", async () => {
    const document = await importWithFontTable(null);
    const zip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    expect(zip.file("word/fontTable.xml")).toBeNull();
    const contentTypes = await zip.file("[Content_Types].xml")?.async("string");
    expect(contentTypes ?? "").not.toContain("fontTable");
  });
});
