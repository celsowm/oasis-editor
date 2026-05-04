import { describe, it, expect } from "vitest";
import { DocumentModel } from "../../core/document/DocumentTypes.js";
import { NativeDocxImporter } from "../../engine/import/NativeDocxImporter.js";
import { NativeDocxExporter } from "../../engine/export/NativeDocxExporter.js";
import { DefaultFontManager } from "../../core/typography/FontManager.js";
import {
  createParagraph,
  createHeading,
  createTextRun,
  createTable,
  createTableRow,
  createTableCell,
  createPageBreak,
} from "../../core/document/DocumentFactory.js";
import { createSection } from "../../core/document/DocumentFactory.js";

describe("NativeDocxImporter", () => {
  const fontManager = new DefaultFontManager();
  const roundTrip = async (doc: DocumentModel): Promise<DocumentModel> => {
    const exporter = new NativeDocxExporter(fontManager);
    const buffer = await exporter.exportToBuffer(doc);
    const importer = new NativeDocxImporter();
    return importer.importFromBuffer(buffer);
  };

  it("should round-trip a simple paragraph", async () => {
    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [
        createSection([createParagraph("Hello world")]),
      ],
    };

    const imported = await roundTrip(doc);
    expect(imported.sections.length).toBe(1);
    const blocks = imported.sections[0].children;
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(blocks[0].kind).toBe("paragraph");
    expect((blocks[0] as any).children[0].text).toBe("Hello world");
  });

  it("should round-trip formatted text", async () => {
    const p = createParagraph("");
    p.children = [
      createTextRun("Bold ", { bold: true }),
      createTextRun("italic", { italic: true }),
    ];

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([p])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks[0].kind).toBe("paragraph");
    const children = (blocks[0] as any).children;
    expect(children.length).toBe(2);
    expect(children[0].marks.bold).toBe(true);
    expect(children[1].marks.italic).toBe(true);
  });

  it("should round-trip a heading", async () => {
    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([createHeading("Title", 1)])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    expect(blocks[0].kind).toBe("heading");
    expect((blocks[0] as any).level).toBe(1);
  });

  it("should round-trip a table", async () => {
    const table = createTable(1, 2);
    const row = createTableRow(2);
    row.cells = [
      createTableCell([createParagraph("A")]),
      createTableCell([createParagraph("B")]),
    ];
    table.rows = [row];

    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([table])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    const tbl = blocks.find((b) => b.kind === "table") as any;
    expect(tbl).toBeDefined();
    expect(tbl.rows.length).toBe(1);
    expect(tbl.rows[0].cells.length).toBe(2);
  });

  it("should round-trip a page break", async () => {
    const doc: DocumentModel = {
      id: "doc:1",
      revision: 0,
      metadata: { title: "Test", createdAt: Date.now(), updatedAt: Date.now() },
      sections: [createSection([createParagraph("Before"), createPageBreak(), createParagraph("After")])],
    };

    const imported = await roundTrip(doc);
    const blocks = imported.sections[0].children;
    const hasPageBreak = blocks.some((b) => b.kind === "page-break");
    expect(hasPageBreak).toBe(true);
  });

  it("should parse mc:AlternateContent fallback", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Before</w:t>
      </w:r>
      <mc:AlternateContent>
        <mc:Choice Requires="w14">
          <w:r><w:t>Modern</w:t></w:r>
        </mc:Choice>
        <mc:Fallback>
          <w:r><w:t>Fallback</w:t></w:r>
        </mc:Fallback>
      </mc:AlternateContent>
      <w:r>
        <w:t>After</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    zip.file("word/document.xml", documentXml);
    zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

    zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>`);

    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const importer = new NativeDocxImporter();
    const imported = await importer.importFromBuffer(buffer);

    const blocks = imported.sections[0].children;
    expect(blocks[0].kind).toBe("paragraph");
    const runs = (blocks[0] as any).children;
    const texts = runs.map((r: any) => r.text);
    expect(texts).toContain("Before");
    expect(texts).toContain("Fallback");
    expect(texts).toContain("After");
    expect(texts).not.toContain("Modern");
  });
});
