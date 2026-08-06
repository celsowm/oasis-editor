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
const OFFICE_DOCUMENT_RELATIONSHIP =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
const STYLES_RELATIONSHIP =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";
const IMAGE_RELATIONSHIP =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

function sourcePackage(): EditorDocxSourcePackage {
  const rootRelationshipsXml = `<Relationships xmlns="${RELS_NS}"><Relationship Id="rIdOfficeOriginal" Type="${OFFICE_DOCUMENT_RELATIONSHIP}" Target="custom/main.xml"/></Relationships>`;
  const documentRelationshipsXml = `<Relationships xmlns="${RELS_NS}"><Relationship Id="rIdStylesOriginal" Type="${STYLES_RELATIONSHIP}" Target="styles/customStyles.xml"/></Relationships>`;

  return {
    format: "docx",
    mainDocumentPart: "custom/main.xml",
    contentTypes: {
      defaults: {
        rels: "application/vnd.openxmlformats-package.relationships+xml",
        xml: "application/xml",
        png: "image/png",
      },
      overrides: {
        "custom/main.xml":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
        "custom/styles/customStyles.xml":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml",
      },
    },
    rootRelationships: [
      {
        id: "rIdOfficeOriginal",
        type: OFFICE_DOCUMENT_RELATIONSHIP,
        target: "custom/main.xml",
        targetMode: "Internal",
        resolvedTarget: "custom/main.xml",
      },
    ],
    parts: {
      "[Content_Types].xml": {
        path: "[Content_Types].xml",
        kind: "xml",
        encoding: "utf8",
        originalHash: "content-types",
        data: `<Types xmlns="${CONTENT_TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/custom/main.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/custom/styles/customStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
      },
      "_rels/.rels": {
        path: "_rels/.rels",
        kind: "xml",
        encoding: "utf8",
        originalHash: "root-rels",
        data: rootRelationshipsXml,
      },
      "custom/main.xml": {
        path: "custom/main.xml",
        kind: "xml",
        encoding: "utf8",
        originalHash: "main",
        data: "<source-main/>",
        relationships: [
          {
            id: "rIdStylesOriginal",
            type: STYLES_RELATIONSHIP,
            target: "styles/customStyles.xml",
            targetMode: "Internal",
            resolvedTarget: "custom/styles/customStyles.xml",
          },
        ],
      },
      "custom/_rels/main.xml.rels": {
        path: "custom/_rels/main.xml.rels",
        kind: "xml",
        encoding: "utf8",
        originalHash: "main-rels",
        data: documentRelationshipsXml,
      },
      "custom/styles/customStyles.xml": {
        path: "custom/styles/customStyles.xml",
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
    `<Types xmlns="${CONTENT_TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${OFFICE_DOCUMENT_RELATIONSHIP}" Target="word/document.xml"/></Relationships>`,
  );
  zip.file("word/document.xml", "<rebuilt-main/>");
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="${RELS_NS}"><Relationship Id="rIdStyles" Type="${STYLES_RELATIONSHIP}" Target="styles.xml"/><Relationship Id="rIdImg1" Type="${IMAGE_RELATIONSHIP}" Target="media/image1.png"/></Relationships>`,
  );
  zip.file("word/styles.xml", "<rebuilt-styles/>");
  zip.file("word/media/image1.png", new Uint8Array([1, 2, 3]));
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("relationship-discovered source paths", () => {
  it("relocates rebuilt parts to their original paths and rebases relationships", async () => {
    const document: EditorDocument = {
      id: "document:discovered-paths",
      sourcePackage: sourcePackage(),
    };
    const output = await JSZip.loadAsync(
      await patchRebuiltDocxWithSourcePackage(
        document,
        await rebuiltPackage(),
      ),
    );

    expect(await output.file("custom/main.xml")?.async("string")).toBe(
      "<rebuilt-main/>",
    );
    expect(output.file("word/document.xml")).toBeNull();
    expect(
      await output.file("custom/styles/customStyles.xml")?.async("string"),
    ).toBe("<rebuilt-styles/>");
    expect(output.file("word/styles.xml")).toBeNull();
    expect(await output.file("word/media/image1.png")?.async("base64")).toBe(
      "AQID",
    );

    const rootRelationships = await output
      .file("_rels/.rels")
      ?.async("string");
    expect(rootRelationships).toContain('Id="rIdOfficeOriginal"');
    expect(rootRelationships).toContain('Target="custom/main.xml"');
    expect(rootRelationships).not.toContain("word/document.xml");

    const documentRelationships = await output
      .file("custom/_rels/main.xml.rels")
      ?.async("string");
    expect(documentRelationships).toContain('Id="rIdStylesOriginal"');
    expect(documentRelationships).toContain(
      'Target="styles/customStyles.xml"',
    );
    expect(documentRelationships).toContain('Id="rIdImg1"');
    expect(documentRelationships).toContain(
      'Target="../word/media/image1.png"',
    );

    const contentTypes = await output
      .file("[Content_Types].xml")
      ?.async("string");
    expect(contentTypes).toContain('PartName="/custom/main.xml"');
    expect(contentTypes).toContain(
      'PartName="/custom/styles/customStyles.xml"',
    );
    expect(contentTypes).not.toContain('PartName="/word/document.xml"');
    expect(contentTypes).not.toContain('PartName="/word/styles.xml"');
  });
});
