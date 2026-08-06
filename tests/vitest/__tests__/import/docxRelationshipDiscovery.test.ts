import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxInWorker } from "@/import/docx/importDocxInWorker.js";
import {
  prepareDocxForCurrentImporter,
  requiresDocxImporterCompatibilityPackage,
} from "@/import/docx/opc/legacyCompatibilityPackage.js";
import { captureDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";

const OFFICE_DOCUMENT_RELATIONSHIP =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
const STYLES_RELATIONSHIP =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";
const HEADER_RELATIONSHIP =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header";
const IMAGE_RELATIONSHIP =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

async function buildNonConventionalDocx(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/custom/main.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/custom/styles/source-styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/custom/headers/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdOffice" Type="${OFFICE_DOCUMENT_RELATIONSHIP}" Target="custom/main.xml"/>
</Relationships>`,
  );
  zip.file(
    "custom/main.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="CustomBody"/></w:pPr>
      <w:r><w:t>Relationship-discovered body</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rIdHeader"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
  );
  zip.file(
    "custom/_rels/main.xml.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="${STYLES_RELATIONSHIP}" Target="styles/source-styles.xml"/>
  <Relationship Id="rIdHeader" Type="${HEADER_RELATIONSHIP}" Target="headers/header1.xml"/>
</Relationships>`,
  );
  zip.file(
    "custom/styles/source-styles.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="CustomBody">
    <w:name w:val="Custom Body"/>
    <w:rPr><w:b/></w:rPr>
  </w:style>
</w:styles>`,
  );
  zip.file(
    "custom/headers/header1.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:r><w:t>Relationship-discovered header</w:t></w:r></w:p>
</w:hdr>`,
  );
  zip.file(
    "custom/headers/_rels/header1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImage" Type="${IMAGE_RELATIONSHIP}" Target="../media/logo.png"/>
</Relationships>`,
  );
  zip.file("custom/media/logo.png", new Uint8Array([137, 80, 78, 71]));
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("relationship-discovered DOCX import", () => {
  it("prepares conventional aliases without changing the authoritative source snapshot", async () => {
    const buffer = await buildNonConventionalDocx();
    const sourcePackage = await captureDocxSourcePackage(buffer);

    expect(sourcePackage.mainDocumentPart).toBe("custom/main.xml");
    expect(requiresDocxImporterCompatibilityPackage(sourcePackage)).toBe(true);

    const compatibilityBuffer = await prepareDocxForCurrentImporter(
      buffer,
      sourcePackage,
    );
    const compatibilityZip = await JSZip.loadAsync(compatibilityBuffer);

    expect(compatibilityZip.file("word/document.xml")).not.toBeNull();
    expect(compatibilityZip.file("word/styles.xml")).not.toBeNull();
    expect(
      await compatibilityZip.file("word/document.xml")?.async("string"),
    ).toContain("Relationship-discovered body");

    const aliasedHeaderRelationships = await compatibilityZip
      .file(
        "word/__oasis_source__/custom/headers/_rels/header1.xml.rels",
      )
      ?.async("string");
    expect(aliasedHeaderRelationships).toContain(
      'Target="/word/__oasis_source__/custom/media/logo.png"',
    );

    expect(sourcePackage.parts["custom/main.xml"]).toBeDefined();
    expect(sourcePackage.parts["word/document.xml"]).toBeUndefined();
  });

  it("imports main, style, and header parts stored outside conventional Word paths", async () => {
    const document = await importDocxInWorker(await buildNonConventionalDocx());
    const firstBlock = document.sections?.[0]?.blocks[0];
    const firstHeaderBlock = document.sections?.[0]?.header?.[0];

    expect(firstBlock?.type).toBe("paragraph");
    if (!firstBlock || firstBlock.type !== "paragraph") {
      throw new Error("Expected the first imported block to be a paragraph.");
    }
    expect(firstBlock.runs.map((run): string => run.text).join("")).toBe(
      "Relationship-discovered body",
    );
    expect(firstBlock.style?.styleId).toBe("CustomBody");
    expect(document.styles?.CustomBody).toBeDefined();

    expect(firstHeaderBlock?.type).toBe("paragraph");
    if (!firstHeaderBlock || firstHeaderBlock.type !== "paragraph") {
      throw new Error("Expected the imported header block to be a paragraph.");
    }
    expect(
      firstHeaderBlock.runs.map((run): string => run.text).join(""),
    ).toBe("Relationship-discovered header");
    expect(document.sourcePackage?.mainDocumentPart).toBe("custom/main.xml");
  });
});
