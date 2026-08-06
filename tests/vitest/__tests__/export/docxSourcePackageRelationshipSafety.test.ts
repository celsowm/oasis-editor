import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type {
  EditorDocument,
  EditorDocxSourcePackage,
} from "@/core/model.js";
import { patchRebuiltDocxWithSourcePackage } from "@/export/docx/opc/sourcePackagePatcher.js";

const RELS_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";

function sourcePackageWithDocumentRelationships(
  relationshipsXml: string,
): EditorDocxSourcePackage {
  return {
    format: "docx",
    mainDocumentPart: "word/document.xml",
    contentTypes: { defaults: {}, overrides: {} },
    rootRelationships: [],
    parts: {
      "word/_rels/document.xml.rels": {
        path: "word/_rels/document.xml.rels",
        kind: "xml",
        data: relationshipsXml,
        encoding: "utf8",
        originalHash: "source",
      },
    },
  };
}

async function rebuiltPackageWithDocumentRelationships(
  relationshipsXml: string,
): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/></Types>`,
  );
  zip.file("word/_rels/document.xml.rels", relationshipsXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("source relationship merge safety", () => {
  it("fails explicitly instead of silently dropping a conflicting source r:id", async () => {
    const sourceRelationships = `<Relationships xmlns="${RELS_NS}"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="../customXml/item1.xml"/></Relationships>`;
    const rebuiltRelationships = `<Relationships xmlns="${RELS_NS}"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const document: EditorDocument = {
      id: "document:collision",
      sourcePackage: sourcePackageWithDocumentRelationships(
        sourceRelationships,
      ),
    };

    await expect(
      patchRebuiltDocxWithSourcePackage(
        document,
        await rebuiltPackageWithDocumentRelationships(rebuiltRelationships),
      ),
    ).rejects.toThrow(/relationship id rIdStyles/);
  });

  it("preserves distinct source ids even when they point to the same target", async () => {
    const type =
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml";
    const sourceRelationships = `<Relationships xmlns="${RELS_NS}"><Relationship Id="rIdSource" Type="${type}" Target="../customXml/item1.xml"/></Relationships>`;
    const rebuiltRelationships = `<Relationships xmlns="${RELS_NS}"><Relationship Id="rIdRebuilt" Type="${type}" Target="../customXml/item1.xml"/></Relationships>`;
    const document: EditorDocument = {
      id: "document:duplicate-target",
      sourcePackage: sourcePackageWithDocumentRelationships(
        sourceRelationships,
      ),
    };

    const output = await JSZip.loadAsync(
      await patchRebuiltDocxWithSourcePackage(
        document,
        await rebuiltPackageWithDocumentRelationships(rebuiltRelationships),
      ),
    );
    const merged = await output
      .file("word/_rels/document.xml.rels")
      ?.async("string");

    expect(merged).toContain('Id="rIdSource"');
    expect(merged).toContain('Id="rIdRebuilt"');
  });
});
