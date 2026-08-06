import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type {
  EditorDocument,
  EditorDocxSourcePackage,
  EditorOpcRelationship,
} from "@/core/model.js";
import { patchRebuiltDocxWithHeaderFooterSourcePaths } from "@/export/docx/opc/headerFooterSourcePatcher.js";
import { hashDocxPartBytes } from "@/export/docx/opc/rebuiltPartHashes.js";

const CONTENT_TYPES_NS =
  "http://schemas.openxmlformats.org/package/2006/content-types";
const RELS_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";
const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const RELATIONSHIP_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const OFFICE_DOCUMENT_RELATIONSHIP = `${RELATIONSHIP_NS}/officeDocument`;
const HEADER_RELATIONSHIP = `${RELATIONSHIP_NS}/header`;
const FOOTER_RELATIONSHIP = `${RELATIONSHIP_NS}/footer`;
const IMAGE_RELATIONSHIP = `${RELATIONSHIP_NS}/image`;
const CUSTOM_RELATIONSHIP = "https://example.test/relationships/custom";

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
  relationships: Array<{
    id: string;
    type: string;
    target: string;
    external?: boolean;
  }>,
): string {
  return `<Relationships xmlns="${RELS_NS}">${relationships
    .map(
      ({ id, type, target, external }): string =>
        `<Relationship Id="${id}" Type="${type}" Target="${target}"${external ? ' TargetMode="External"' : ""}/>` ,
    )
    .join("")}</Relationships>`;
}

function sourcePackageWithMultipleStories(): EditorDocxSourcePackage {
  const mainRelationships = [
    relationship(
      "rIdFirstHeaderSource",
      HEADER_RELATIONSHIP,
      "parts/first-header.xml",
      "custom/parts/first-header.xml",
    ),
    relationship(
      "rIdFirstFooterSource",
      FOOTER_RELATIONSHIP,
      "parts/first-footer.xml",
      "custom/parts/first-footer.xml",
    ),
    relationship(
      "rIdDefaultHeaderSource",
      HEADER_RELATIONSHIP,
      "parts/default-header.xml",
      "custom/parts/default-header.xml",
    ),
  ];
  const rootRelationships = [
    relationship(
      "rIdOfficeSource",
      OFFICE_DOCUMENT_RELATIONSHIP,
      "custom/main.xml",
      "custom/main.xml",
    ),
  ];
  const mainXml = `<w:document xmlns:w="${WORD_NS}" xmlns:r="${RELATIONSHIP_NS}"><w:body><w:p><w:pPr><w:sectPr><w:headerReference w:type="first" r:id="rIdFirstHeaderSource"/><w:footerReference w:type="first" r:id="rIdFirstFooterSource"/></w:sectPr></w:pPr></w:p><w:sectPr><w:headerReference w:type="default" r:id="rIdDefaultHeaderSource"/></w:sectPr></w:body></w:document>`;
  const mainRelationshipsXml = relationshipsXml(
    mainRelationships.map(({ id, type, target }) => ({ id, type, target })),
  );
  const rootRelationshipsXml = relationshipsXml([
    {
      id: "rIdOfficeSource",
      type: OFFICE_DOCUMENT_RELATIONSHIP,
      target: "custom/main.xml",
    },
  ]);
  const firstHeaderRelationshipsXml = relationshipsXml([
    {
      id: "rIdOpaqueSource",
      type: CUSTOM_RELATIONSHIP,
      target: "../../customXml/header-metadata.xml",
    },
  ]);

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
        "custom/parts/first-header.xml":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml",
        "custom/parts/first-footer.xml":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml",
        "custom/parts/default-header.xml":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml",
      },
    },
    rootRelationships,
    parts: {
      "[Content_Types].xml": {
        path: "[Content_Types].xml",
        kind: "xml",
        encoding: "utf8",
        originalHash: "content-types",
        data: `<Types xmlns="${CONTENT_TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/custom/main.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/custom/parts/first-header.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/custom/parts/first-footer.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/custom/parts/default-header.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>`,
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
        relationships: mainRelationships,
      },
      "custom/_rels/main.xml.rels": {
        path: "custom/_rels/main.xml.rels",
        kind: "xml",
        encoding: "utf8",
        originalHash: "main-rels",
        data: mainRelationshipsXml,
      },
      "custom/parts/first-header.xml": {
        path: "custom/parts/first-header.xml",
        kind: "xml",
        encoding: "utf8",
        originalHash: "first-header",
        data: `<w:hdr xmlns:w="${WORD_NS}"><w:p><w:r><w:t>Source first header</w:t></w:r></w:p></w:hdr>`,
      },
      "custom/parts/_rels/first-header.xml.rels": {
        path: "custom/parts/_rels/first-header.xml.rels",
        kind: "xml",
        encoding: "utf8",
        originalHash: "first-header-rels",
        data: firstHeaderRelationshipsXml,
      },
      "custom/parts/first-footer.xml": {
        path: "custom/parts/first-footer.xml",
        kind: "xml",
        encoding: "utf8",
        originalHash: "first-footer",
        data: `<w:ftr xmlns:w="${WORD_NS}"><w:p><w:r><w:t>Source first footer</w:t></w:r></w:p></w:ftr>`,
      },
      "custom/parts/default-header.xml": {
        path: "custom/parts/default-header.xml",
        kind: "xml",
        encoding: "utf8",
        originalHash: "default-header",
        data: `<w:hdr xmlns:w="${WORD_NS}"><w:p><w:r><w:t>Source default header</w:t></w:r></w:p></w:hdr>`,
      },
      "customXml/header-metadata.xml": {
        path: "customXml/header-metadata.xml",
        kind: "xml",
        encoding: "utf8",
        originalHash: "metadata",
        data: "<metadata preserve=\"true\"/>",
      },
    },
  };
}

async function rebuiltPackageWithMultipleStories(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<Types xmlns="${CONTENT_TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/word/header2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>`,
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
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}" xmlns:r="${RELATIONSHIP_NS}"><w:body><w:p><w:pPr><w:sectPr><w:headerReference w:type="first" r:id="rIdHeader1"/><w:footerReference w:type="first" r:id="rIdFooter1"/></w:sectPr></w:pPr></w:p><w:sectPr><w:headerReference w:type="default" r:id="rIdHeader2"/></w:sectPr></w:body></w:document>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    relationshipsXml([
      {
        id: "rIdHeader1",
        type: HEADER_RELATIONSHIP,
        target: "header1.xml",
      },
      {
        id: "rIdFooter1",
        type: FOOTER_RELATIONSHIP,
        target: "footer1.xml",
      },
      {
        id: "rIdHeader2",
        type: HEADER_RELATIONSHIP,
        target: "header2.xml",
      },
    ]),
  );
  zip.file(
    "word/header1.xml",
    `<w:hdr xmlns:w="${WORD_NS}" xmlns:r="${RELATIONSHIP_NS}"><w:p><w:r><w:t>Edited first header</w:t></w:r><w:r><w:drawing r:id="rIdImg1"/></w:r></w:p></w:hdr>`,
  );
  zip.file(
    "word/_rels/header1.xml.rels",
    relationshipsXml([
      {
        id: "rIdImg1",
        type: IMAGE_RELATIONSHIP,
        target: "media/image1.png",
      },
    ]),
  );
  zip.file(
    "word/footer1.xml",
    `<w:ftr xmlns:w="${WORD_NS}"><w:p><w:r><w:t>Edited first footer</w:t></w:r></w:p></w:ftr>`,
  );
  zip.file(
    "word/header2.xml",
    `<w:hdr xmlns:w="${WORD_NS}"><w:p><w:r><w:t>Edited default header</w:t></w:r></w:p></w:hdr>`,
  );
  zip.file("word/media/image1.png", new Uint8Array([1, 2, 3, 4]));
  return zip.generateAsync({ type: "arraybuffer" });
}

async function patchWithHeaderFooterPaths(
  document: EditorDocument,
  rebuilt: ArrayBuffer,
): Promise<JSZip> {
  return JSZip.loadAsync(
    await patchRebuiltDocxWithHeaderFooterSourcePaths(document, rebuilt),
  );
}

describe("header/footer source path preservation", () => {
  it("restores source paths, source relationship ids, and rebased nested relationships", async () => {
    const document: EditorDocument = {
      id: "document:header-footer-paths",
      sourcePackage: sourcePackageWithMultipleStories(),
    };
    const output = await patchWithHeaderFooterPaths(
      document,
      await rebuiltPackageWithMultipleStories(),
    );

    expect(output.file("word/header1.xml")).toBeNull();
    expect(output.file("word/header2.xml")).toBeNull();
    expect(output.file("word/footer1.xml")).toBeNull();
    expect(
      await output.file("custom/parts/first-header.xml")?.async("string"),
    ).toContain("Edited first header");
    expect(
      await output.file("custom/parts/first-footer.xml")?.async("string"),
    ).toContain("Edited first footer");
    expect(
      await output.file("custom/parts/default-header.xml")?.async("string"),
    ).toContain("Edited default header");

    const mainXml = await output.file("custom/main.xml")?.async("string");
    expect(mainXml).toContain('r:id="rIdFirstHeaderSource"');
    expect(mainXml).toContain('r:id="rIdFirstFooterSource"');
    expect(mainXml).toContain('r:id="rIdDefaultHeaderSource"');
    expect(mainXml).not.toContain('r:id="rIdHeader1"');

    const mainRelationshipsXml = await output
      .file("custom/_rels/main.xml.rels")
      ?.async("string");
    expect(mainRelationshipsXml).toContain('Id="rIdFirstHeaderSource"');
    expect(mainRelationshipsXml).toContain('Target="parts/first-header.xml"');
    expect(mainRelationshipsXml).toContain('Id="rIdFirstFooterSource"');
    expect(mainRelationshipsXml).toContain('Target="parts/first-footer.xml"');
    expect(mainRelationshipsXml).toContain('Id="rIdDefaultHeaderSource"');
    expect(mainRelationshipsXml).toContain('Target="parts/default-header.xml"');
    expect(mainRelationshipsXml).not.toContain('Id="rIdHeader1"');

    const headerRelationshipsXml = await output
      .file("custom/parts/_rels/first-header.xml.rels")
      ?.async("string");
    expect(headerRelationshipsXml).toContain('Id="rIdImg1"');
    expect(headerRelationshipsXml).toContain(
      'Target="../../word/media/image1.png"',
    );
    expect(headerRelationshipsXml).toContain('Id="rIdOpaqueSource"');
    expect(
      await output.file("customXml/header-metadata.xml")?.async("string"),
    ).toContain('preserve="true"');

    const contentTypes = await output
      .file("[Content_Types].xml")
      ?.async("string");
    expect(contentTypes).toContain(
      'PartName="/custom/parts/first-header.xml"',
    );
    expect(contentTypes).toContain(
      'PartName="/custom/parts/first-footer.xml"',
    );
    expect(contentTypes).toContain(
      'PartName="/custom/parts/default-header.xml"',
    );
    expect(contentTypes).not.toContain('PartName="/word/header1.xml"');
  });

  it("maps a renumbered surviving header to its original part and deletes the removed one", async () => {
    const sourcePackage = sourcePackageWithMultipleStories();
    const sourceMain = sourcePackage.parts["custom/main.xml"]!;
    sourceMain.data = `<w:document xmlns:w="${WORD_NS}" xmlns:r="${RELATIONSHIP_NS}"><w:body><w:sectPr><w:headerReference w:type="first" r:id="rIdFirstHeaderSource"/><w:headerReference w:type="default" r:id="rIdDefaultHeaderSource"/></w:sectPr></w:body></w:document>`;
    sourceMain.relationships = sourceMain.relationships?.filter(
      ({ id }): boolean => id !== "rIdFirstFooterSource",
    );
    sourcePackage.parts["custom/_rels/main.xml.rels"]!.data = relationshipsXml([
      {
        id: "rIdFirstHeaderSource",
        type: HEADER_RELATIONSHIP,
        target: "parts/first-header.xml",
      },
      {
        id: "rIdDefaultHeaderSource",
        type: HEADER_RELATIONSHIP,
        target: "parts/default-header.xml",
      },
    ]);
    delete sourcePackage.parts["custom/parts/first-footer.xml"];
    delete sourcePackage.contentTypes.overrides[
      "custom/parts/first-footer.xml"
    ];

    const unchangedDefaultHeader = `<w:hdr xmlns:w="${WORD_NS}"><w:p><w:r><w:t>Canonical default header</w:t></w:r></w:p></w:hdr>`;
    sourcePackage.rebuiltPartHashes = {
      "word/header1.xml": "removed-first-header",
      "word/header2.xml": hashDocxPartBytes(
        new TextEncoder().encode(unchangedDefaultHeader),
      ),
    };

    const rebuilt = new JSZip();
    rebuilt.file(
      "[Content_Types].xml",
      `<Types xmlns="${CONTENT_TYPES_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>`,
    );
    rebuilt.file(
      "_rels/.rels",
      relationshipsXml([
        {
          id: "rId1",
          type: OFFICE_DOCUMENT_RELATIONSHIP,
          target: "word/document.xml",
        },
      ]),
    );
    rebuilt.file(
      "word/document.xml",
      `<w:document xmlns:w="${WORD_NS}" xmlns:r="${RELATIONSHIP_NS}"><w:body><w:sectPr><w:headerReference w:type="default" r:id="rIdHeader1"/></w:sectPr></w:body></w:document>`,
    );
    rebuilt.file(
      "word/_rels/document.xml.rels",
      relationshipsXml([
        {
          id: "rIdHeader1",
          type: HEADER_RELATIONSHIP,
          target: "header1.xml",
        },
      ]),
    );
    rebuilt.file("word/header1.xml", unchangedDefaultHeader);
    const rebuiltBuffer = await rebuilt.generateAsync({ type: "arraybuffer" });
    const document: EditorDocument = {
      id: "document:renumbered-header",
      sourcePackage,
    };
    const output = await patchWithHeaderFooterPaths(document, rebuiltBuffer);

    expect(output.file("custom/parts/first-header.xml")).toBeNull();
    expect(output.file("word/header1.xml")).toBeNull();
    expect(
      await output.file("custom/parts/default-header.xml")?.async("string"),
    ).toContain("Source default header");

    const mainXml = await output.file("custom/main.xml")?.async("string");
    expect(mainXml).toContain('r:id="rIdDefaultHeaderSource"');
    expect(mainXml).not.toContain("rIdFirstHeaderSource");
    const mainRelationshipsXml = await output
      .file("custom/_rels/main.xml.rels")
      ?.async("string");
    expect(mainRelationshipsXml).toContain('Id="rIdDefaultHeaderSource"');
    expect(mainRelationshipsXml).not.toContain("rIdFirstHeaderSource");

    const contentTypes = await output
      .file("[Content_Types].xml")
      ?.async("string");
    expect(contentTypes).not.toContain("/custom/parts/first-header.xml");
    expect(contentTypes).toContain("/custom/parts/default-header.xml");
  });
});
