import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type {
  EditorDocument,
  EditorDocxSourcePackage,
} from "@/core/model.js";
import { patchRebuiltDocxWithSourcePackage } from "@/export/docx/opc/sourcePackagePatcher.js";

const CONTENT_TYPES_NS =
  "http://schemas.openxmlformats.org/package/2006/content-types";
const RELS_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";
const TRANSITIONAL_OFFICE_DOCUMENT =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
const TRANSITIONAL_STYLES =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";
const STRICT_OFFICE_DOCUMENT =
  "http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument";
const STRICT_STYLES =
  "http://purl.oclc.org/ooxml/officeDocument/relationships/styles";

function sourcePackage(): EditorDocxSourcePackage {
  const rootRelationshipsXml = `<Relationships xmlns="${RELS_NS}"><Relationship Id="rIdOffice" Type="${STRICT_OFFICE_DOCUMENT}" Target="word/document.xml"/></Relationships>`;
  const documentRelationshipsXml = `<Relationships xmlns="${RELS_NS}"><Relationship Id="rIdStyles" Type="${STRICT_STYLES}" Target="styles.xml"/></Relationships>`;
  return {
    format: "docx",
    mainDocumentPart: "word/document.xml",
    contentTypes: {
      defaults: {
        rels: "application/vnd.openxmlformats-package.relationships+xml",
        xml: "application/xml",
      },
      overrides: {
        "word/document.xml":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
        "word/styles.xml":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml",
      },
    },
    rootRelationships: [
      {
        id: "rIdOffice",
        type: STRICT_OFFICE_DOCUMENT,
        target: "word/document.xml",
        targetMode: "Internal",
        resolvedTarget: "word/document.xml",
      },
    ],
    parts: {
      "[Content_Types].xml": {
        path: "[Content_Types].xml",
        kind: "xml",
        encoding: "utf8",
        originalHash: "content-types",
        data: `<Types xmlns="${CONTENT_TYPES_NS}"/>`,
      },
      "_rels/.rels": {
        path: "_rels/.rels",
        kind: "xml",
        encoding: "utf8",
        originalHash: "root-rels",
        data: rootRelationshipsXml,
      },
      "word/document.xml": {
        path: "word/document.xml",
        kind: "xml",
        encoding: "utf8",
        originalHash: "document",
        data: "<source-document/>",
        relationships: [
          {
            id: "rIdStyles",
            type: STRICT_STYLES,
            target: "styles.xml",
            targetMode: "Internal",
            resolvedTarget: "word/styles.xml",
          },
        ],
      },
      "word/_rels/document.xml.rels": {
        path: "word/_rels/document.xml.rels",
        kind: "xml",
        encoding: "utf8",
        originalHash: "document-rels",
        data: documentRelationshipsXml,
      },
      "word/styles.xml": {
        path: "word/styles.xml",
        kind: "xml",
        encoding: "utf8",
        originalHash: "styles",
        data: "<source-styles/>",
      },
    },
  };
}

async function rebuiltPackage(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<Types xmlns="${CONTENT_TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${TRANSITIONAL_OFFICE_DOCUMENT}" Target="word/document.xml"/></Relationships>`,
  );
  zip.file("word/document.xml", "<rebuilt-document/>");
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="${RELS_NS}"><Relationship Id="rIdStylesGenerated" Type="${TRANSITIONAL_STYLES}" Target="styles.xml"/></Relationships>`,
  );
  zip.file("word/styles.xml", "<rebuilt-styles/>");
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("ISO/IEC 29500 Strict relationships", () => {
  it("retains the source relationship type URIs while overlaying rebuilt parts", async () => {
    const document: EditorDocument = {
      id: "document:strict-relationships",
      sourcePackage: sourcePackage(),
    };
    const output = await JSZip.loadAsync(
      await patchRebuiltDocxWithSourcePackage(
        document,
        await rebuiltPackage(),
      ),
    );

    const rootRelationships = await output
      .file("_rels/.rels")
      ?.async("string");
    expect(rootRelationships).toContain(STRICT_OFFICE_DOCUMENT);
    expect(rootRelationships).not.toContain(TRANSITIONAL_OFFICE_DOCUMENT);

    const documentRelationships = await output
      .file("word/_rels/document.xml.rels")
      ?.async("string");
    expect(documentRelationships).toContain(STRICT_STYLES);
    expect(documentRelationships).not.toContain(TRANSITIONAL_STYLES);
    expect(documentRelationships).toContain('Id="rIdStyles"');
  });
});
