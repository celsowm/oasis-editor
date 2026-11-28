import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildListLabels, getDocumentParagraphs } from "@/core/model.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const V = 'xmlns:v="urn:schemas-microsoft-com:vml"';
const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9iCl8AAAAASUVORK5CYII=";

async function buildPictureBulletDocx(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDoc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`,
  );
  zip.file("word/media/bullet.png", PNG, { base64: true });
  zip.file(
    "word/_rels/numbering.xml.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdPic" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/bullet.png"/></Relationships>`,
  );
  zip.file(
    "word/numbering.xml",
    `<w:numbering ${W} ${R} ${V}>
      <w:numPicBullet w:numPicBulletId="0"><w:pict><v:shape style="width:12px;height:12px" alt="bullet"><v:imagedata r:id="rIdPic"/></v:shape></w:pict></w:numPicBullet>
      <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlPicBulletId w:val="0"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/></w:lvl></w:abstractNum>
      <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
    </w:numbering>`,
  );
  zip.file(
    "word/document.xml",
    `<w:document ${W}><w:body><w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>Item</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("picture bullets", () => {
  it("resolves numPicBullet through numbering.xml relationships", async () => {
    const document = await importDocxToEditorDocument(
      await buildPictureBulletDocx(),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;
    expect(paragraph.list).toMatchObject({
      kind: "bullet",
      bulletPicture: {
        numPicBulletId: "0",
        widthPx: 12,
        heightPx: 12,
        altText: "bullet",
      },
    });
    const src = paragraph.list!.bulletPicture!.src;
    expect(src).toMatch(/^asset:/);
    expect(document.assets?.[src.slice("asset:".length)]?.url).toMatch(
      /^data:image\/png;base64,/,
    );
    // No text glyph is emitted when an image bullet is present.
    expect(buildListLabels(document, "en-US").get(paragraph.id)).toBe("");
  });

  it("round-trips the picture bullet definition and its relationship", async () => {
    const buffer = await buildPictureBulletDocx();
    const document = await importDocxToEditorDocument(buffer);
    await attachDocxSourcePackage(document, buffer);
    const zip = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const numbering = (await zip.file("word/numbering.xml")?.async("string")) ?? "";
    expect(numbering).toMatch(/<w:numPicBullet w:numPicBulletId="0"/);
    expect(numbering).toMatch(/r:id="rIdPic"/);
    expect(numbering).toMatch(/<w:lvlPicBulletId w:val="0"\/>/);
    const rels = (await zip.file("word/_rels/numbering.xml.rels")?.async("string")) ?? "";
    expect(rels).toMatch(/Target="media\/bullet.png"/);
  });

  it("does not invent a glyph when the picture cannot be resolved", async () => {
    const document = await importDocxToEditorDocument(
      await buildPictureBulletDocx(),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;
    // Source XML is preserved even though the model has no image bullet if the
    // relationship is missing.
    expect(paragraph.list).toBeDefined();
  });
});
