import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type {
  EditorDocument,
  EditorDocxSourcePackage,
  EditorOpcRelationship,
} from "@/core/model.js";
import { patchRebuiltDocxPreservingSource } from "@/export/docx/opc/sourceBackedDocxPatcher.js";

const CONTENT_TYPES_NS =
  "http://schemas.openxmlformats.org/package/2006/content-types";
const RELS_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";
const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const OFFICE_REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const OFFICE_DOCUMENT_RELATIONSHIP = `${OFFICE_REL_NS}/officeDocument`;
const HEADER_RELATIONSHIP = `${OFFICE_REL_NS}/header`;

function relationship(
  id: string,
  type: string,
  target: string,
  resolvedTarget: string,
): EditorOpcRelationship {
  return {
    id,
    type,
    target,
    targetMode: "Internal",
    resolvedTarget,
  };
}

function relationshipsXml(
  relationships: Array<{ id: string; type: string; target: string }>,
): string {
  return `<Relationships xmlns="${RELS_NS}">${relationships
    .map(
      ({ id, type, target }): string =>
        `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`,
    )
    .join("")}</Relationships>`;
}

function sourcePackage(
  headerRelationshipId: string,
  sectionCount: 1 | 2,
): EditorDocxSourcePackage {
  const headerRelationship = relationship(
    headerRelationshipId,
    HEADER_RELATIONSHIP,
    "parts/source-header.xml",
    "custom/parts/source-header.xml",
  );
  const rootRelationship = relationship(
    "rIdOfficeSource",
    OFFICE_DOCUMENT_RELATIONSHIP,
    "custom/main.xml",
    "custom/main.xml",
  );
  const firstSection = `<w:p><w:pPr><w:sectPr><w:headerReference w:type="default" r:id="${headerRelationshipId}"/></w:sectPr></w:pPr></w:p>`;
  const finalSection =
    sectionCount === 1
      ? `<w:sectPr><w:headerReference w:type="default" r:id="${headerRelationshipId}"/></w:sectPr>`
      : "<w:sectPr/>";
  const mainXml = `<w:document xmlns:w="${WORD_NS}" xmlns:r="${OFFICE_REL_NS}"><w:body>${sectionCount === 2 ? firstSection : ""}${finalSection}</w:body></w:document>`;
  const contentTypesXml = `<Types xmlns="${CONTENT_TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/custom/main.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/custom/parts/source-header.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>`;
  const mainRelationshipsXml = relationshipsXml([
    {
      id: headerRelationship.id,
      type: headerRelationship.type,
      target: headerRelationship.target,
    },
  ]);
  const rootRelationshipsXml = relationshipsXml([
    {
      id: rootRelationship.id,
      type: rootRelationship.type,
      target: rootRelationship.target,
    },
  ]);

  return {
    format: "docx",
    mainDocumentPart: "custom/main.xml",
    contentTypes: {
      defaults: {
        rels: "application/vnd.openxmlformats-package.relationships+xml",
        xml: "application/xml",
      },
      overrides: {
        "custom/main.xml":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
        "custom/parts/source-header.xml":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml",
      },
    },
    rootRelationships: [rootRelationship],
    parts: {
      "[Content_Types].xml": {
        path: "[Content_Types].xml",
        kind: "xml",
        encoding: "utf8",
        originalHash: "content-types",
        data: contentTypesXml,
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
        data: mainXml,
        relationships: [headerRelationship],
      },
      "custom/_rels/main.xml.rels": {
        path: "custom/_rels/main.xml.rels",
        kind: "xml",
        encoding: "utf8",
        originalHash: "main-rels",
        data: mainRelationshipsXml,
      },
      "custom/parts/source-header.xml": {
        path: "custom/parts/source-header.xml",
        kind: "xml",
        encoding: "utf8",
        originalHash: "header",
        data: `<w:hdr xmlns:w="${WORD_NS}"><w:p><w:r><w:t>Source header</w:t></w:r></w:p></w:hdr>`,
      },
    },
  };
}

async function rebuiltPackage(sectionCount: 1 | 2): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<Types xmlns="${CONTENT_TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    relationshipsXml([
      {
        id: "rId1",
        type: OFFICE_DOCUMENT_RELATIONSHIP,
        target: "word/document.xml",
      },
    ]),
  );
  const firstSection = `<w:p><w:pPr><w:sectPr><w:headerReference w:type="default" r:id="rIdHeader1"/></w:sectPr></w:pPr></w:p>`;
  const finalSection = `<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader1"/></w:sectPr>`;
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}" xmlns:r="${OFFICE_REL_NS}"><w:body>${sectionCount === 2 ? firstSection : ""}${finalSection}</w:body></w:document>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    relationshipsXml([
      {
        id: "rIdHeader1",
        type: HEADER_RELATIONSHIP,
        target: "header1.xml",
      },
    ]),
  );
  zip.file(
    "word/header1.xml",
    `<w:hdr xmlns:w="${WORD_NS}"><w:p><w:r><w:t>Edited header</w:t></w:r></w:p></w:hdr>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("header/footer source mapping safety", () => {
  it("resolves a same-id source relationship before the generic OPC merge", async () => {
    const document: EditorDocument = {
      id: "document:same-header-id",
      sourcePackage: sourcePackage("rIdHeader1", 1),
    };
    const output = await JSZip.loadAsync(
      await patchRebuiltDocxPreservingSource(document, await rebuiltPackage(1)),
    );

    expect(output.file("word/header1.xml")).toBeNull();
    expect(
      await output.file("custom/parts/source-header.xml")?.async("string"),
    ).toContain("Edited header");
    const relationships = await output
      .file("custom/_rels/main.xml.rels")
      ?.async("string");
    expect(relationships).toContain('Id="rIdHeader1"');
    expect(relationships).toContain('Target="parts/source-header.xml"');
  });

  it("does not positionally remap headers when the section count changes", async () => {
    const document: EditorDocument = {
      id: "document:changed-section-topology",
      sourcePackage: sourcePackage("rIdSourceHeader", 2),
    };
    const output = await JSZip.loadAsync(
      await patchRebuiltDocxPreservingSource(document, await rebuiltPackage(1)),
    );

    expect(
      await output.file("custom/parts/source-header.xml")?.async("string"),
    ).toContain("Source header");
    expect(await output.file("word/header1.xml")?.async("string")).toContain(
      "Edited header",
    );
    const relationships = await output
      .file("custom/_rels/main.xml.rels")
      ?.async("string");
    expect(relationships).toContain('Id="rIdSourceHeader"');
    expect(relationships).toContain('Id="rIdHeader1"');
  });
});
