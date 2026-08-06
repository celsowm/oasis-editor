import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type {
  EditorDocument,
  EditorDocxSourcePackage,
} from "@/core/model.js";
import { hashRebuiltDocxParts } from "@/export/docx/opc/rebuiltPartHashes.js";
import { patchRebuiltDocxWithSourcePackage } from "@/export/docx/opc/sourcePackagePatcher.js";

const CONTENT_TYPES_NS =
  "http://schemas.openxmlformats.org/package/2006/content-types";
const RELS_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";
const OFFICE_DOCUMENT_RELATIONSHIP =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
const STYLES_RELATIONSHIP =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";

async function rebuiltPackage(hasStyles: boolean): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<Types xmlns="${CONTENT_TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${
      hasStyles
        ? '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
        : ""
    }</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${OFFICE_DOCUMENT_RELATIONSHIP}" Target="word/document.xml"/></Relationships>`,
  );
  zip.file("word/document.xml", "<document/>");
  if (hasStyles) {
    zip.file(
      "word/_rels/document.xml.rels",
      `<Relationships xmlns="${RELS_NS}"><Relationship Id="rIdStyles" Type="${STYLES_RELATIONSHIP}" Target="styles.xml"/></Relationships>`,
    );
    zip.file("word/styles.xml", "<styles/>");
  }
  return zip.generateAsync({ type: "arraybuffer" });
}

function sourcePackage(): EditorDocxSourcePackage {
  const rootRelationshipsXml = `<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${OFFICE_DOCUMENT_RELATIONSHIP}" Target="word/document.xml"/></Relationships>`;
  const documentRelationshipsXml = `<Relationships xmlns="${RELS_NS}"><Relationship Id="rIdStyles" Type="${STYLES_RELATIONSHIP}" Target="styles.xml"/></Relationships>`;
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
        id: "rId1",
        type: OFFICE_DOCUMENT_RELATIONSHIP,
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
            type: STYLES_RELATIONSHIP,
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
        data: "<source-styles><unknown/></source-styles>",
      },
    },
  };
}

describe("explicit modeled-part deletion", () => {
  it("removes the part, relationship part, and content-type override", async () => {
    const baseline = await rebuiltPackage(true);
    const source = sourcePackage();
    source.rebuiltPartHashes = await hashRebuiltDocxParts(baseline);
    const document: EditorDocument = {
      id: "document:delete-styles",
      sourcePackage: source,
    };

    const output = await JSZip.loadAsync(
      await patchRebuiltDocxWithSourcePackage(
        document,
        await rebuiltPackage(false),
      ),
    );

    expect(output.file("word/styles.xml")).toBeNull();
    expect(output.file("word/_rels/document.xml.rels")).toBeNull();
    const contentTypes = await output
      .file("[Content_Types].xml")
      ?.async("string");
    expect(contentTypes).not.toContain("/word/styles.xml");
  });
});
