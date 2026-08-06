import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { EditorDocument } from "@/core/model.js";
import {
  attachDocxSourcePackage,
  captureDocxSourcePackage,
} from "@/import/docx/opc/sourcePackage.js";

const OFFICE_DOCUMENT_RELATIONSHIP =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";

async function buildRelationshipDiscoveredPackage(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="bin" ContentType="application/octet-stream"/>
  <Override PartName="/custom/main.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/customXml/item1.xml" ContentType="application/xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdOffice" Type="${OFFICE_DOCUMENT_RELATIONSHIP}" Target="custom/main.xml"/>
  <Relationship Id="rIdExternal" Type="https://example.test/external" Target="https://example.test/resource" TargetMode="External"/>
</Relationships>`,
  );
  zip.file(
    "custom/main.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>`,
  );
  zip.file(
    "custom/_rels/main.xml.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdCustomXml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="../customXml/item1.xml"/>
</Relationships>`,
  );
  zip.file("customXml/item1.xml", "<root><value>preserve me</value></root>");
  zip.file("word/embeddings/payload.bin", new Uint8Array([0, 1, 2, 255]));
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("DOCX OPC source-package capture", () => {
  it("discovers the main part through root relationships and captures every part", async () => {
    const source = await captureDocxSourcePackage(
      await buildRelationshipDiscoveredPackage(),
    );

    expect(source.mainDocumentPart).toBe("custom/main.xml");
    expect(source.contentTypes.overrides["custom/main.xml"]).toContain(
      "document.main+xml",
    );
    expect(source.rootRelationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "rIdOffice",
          targetMode: "Internal",
          resolvedTarget: "custom/main.xml",
        }),
        expect.objectContaining({
          id: "rIdExternal",
          targetMode: "External",
          resolvedTarget: undefined,
        }),
      ]),
    );

    expect(source.parts["customXml/item1.xml"]).toEqual(
      expect.objectContaining({
        kind: "xml",
        encoding: "utf8",
        data: "<root><value>preserve me</value></root>",
      }),
    );
    expect(source.parts["word/embeddings/payload.bin"]).toEqual(
      expect.objectContaining({
        kind: "binary",
        encoding: "base64",
        data: "AAEC/w==",
      }),
    );
    expect(source.parts["custom/main.xml"]?.relationships).toEqual([
      expect.objectContaining({
        id: "rIdCustomXml",
        resolvedTarget: "customXml/item1.xml",
      }),
    ]);
    expect(source.parts["custom/main.xml"]?.originalHash).toMatch(
      /^[0-9a-f]{8}$/,
    );
  });

  it("uses word/document.xml only as an explicit compatibility fallback", async () => {
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>`,
    );

    const source = await captureDocxSourcePackage(
      await zip.generateAsync({ type: "arraybuffer" }),
    );

    expect(source.mainDocumentPart).toBe("word/document.xml");
    expect(source.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missing-content-types" }),
        expect.objectContaining({ code: "main-document-fallback" }),
      ]),
    );
  });

  it("attaches the structured-clone-safe package snapshot to the editor document", async () => {
    const document: EditorDocument = { id: "document:test" };
    const result = await attachDocxSourcePackage(
      document,
      await buildRelationshipDiscoveredPackage(),
    );

    expect(result).toBe(document);
    expect(result.sourcePackage?.format).toBe("docx");
    expect(result.sourcePackage?.mainDocumentPart).toBe("custom/main.xml");
    expect(JSON.parse(JSON.stringify(result.sourcePackage))).toEqual(
      result.sourcePackage,
    );
  });
});
