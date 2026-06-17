import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { projectDocumentLayout } from "@/layoutProjection/index.js";

async function buildDocxWithHeaderImage(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Body</w:t></w:r></w:p>
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rIdHeader"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>`;
  const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:p>
    <w:r>
      <w:drawing>
        <wp:inline>
          <wp:extent cx="19050" cy="28575"/>
          <wp:docPr id="1" name="Header Logo" descr="Logo"/>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:blipFill><a:blip r:embed="rIdImage"/></pic:blipFill>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>
</w:hdr>`;
  const headerRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;

  zip.file("word/document.xml", documentXml);
  zip.file("word/_rels/document.xml.rels", documentRelsXml);
  zip.file("word/header1.xml", headerXml);
  zip.file("word/_rels/header1.xml.rels", headerRelsXml);
  zip.file(
    "word/media/image1.png",
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+Xh6qAAAAAElFTkSuQmCC",
    { base64: true },
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

async function buildDocxWithTypedHeaders(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Page one</w:t></w:r></w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    <w:p><w:r><w:t>Page two</w:t></w:r></w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    <w:p><w:r><w:t>Page three</w:t></w:r></w:p>
    <w:sectPr>
      <w:headerReference w:type="first" r:id="rIdFirstHeader"/>
      <w:headerReference w:type="even" r:id="rIdEvenHeader"/>
      <w:headerReference w:type="default" r:id="rIdDefaultHeader"/>
      <w:footerReference w:type="first" r:id="rIdFirstFooter"/>
      <w:footerReference w:type="even" r:id="rIdEvenFooter"/>
      <w:footerReference w:type="default" r:id="rIdDefaultFooter"/>
      <w:titlePg/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdFirstHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rIdEvenHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header2.xml"/>
  <Relationship Id="rIdDefaultHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header3.xml"/>
  <Relationship Id="rIdFirstFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
  <Relationship Id="rIdEvenFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer2.xml"/>
  <Relationship Id="rIdDefaultFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer3.xml"/>
</Relationships>`;
  const partXml = (tag: "hdr" | "ftr", text: string): string =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:${tag} xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:${tag}>`;

  zip.file("word/document.xml", documentXml);
  zip.file("word/_rels/document.xml.rels", documentRelsXml);
  zip.file("word/header1.xml", partXml("hdr", "FIRST HEADER"));
  zip.file("word/header2.xml", partXml("hdr", "EVEN HEADER"));
  zip.file("word/header3.xml", partXml("hdr", "DEFAULT HEADER"));
  zip.file("word/footer1.xml", partXml("ftr", "FIRST FOOTER"));
  zip.file("word/footer2.xml", partXml("ftr", "EVEN FOOTER"));
  zip.file("word/footer3.xml", partXml("ftr", "DEFAULT FOOTER"));
  return zip.generateAsync({ type: "arraybuffer" });
}

async function buildDocxWithCompactFooterPageField(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Page one</w:t></w:r></w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    <w:p><w:r><w:t>Page two</w:t></w:r></w:p>
    <w:sectPr>
      <w:footerReference w:type="default" r:id="rIdFooter"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`;
  // The whole PAGE field lives inside a single <w:r> (begin + instrText + end),
  // the compact encoding some generators emit instead of one run per role.
  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:r>
      <w:fldChar w:fldCharType="begin"/>
      <w:instrText xml:space="preserve">PAGE</w:instrText>
      <w:fldChar w:fldCharType="end"/>
    </w:r>
  </w:p>
</w:ftr>`;

  zip.file("word/document.xml", documentXml);
  zip.file("word/_rels/document.xml.rels", documentRelsXml);
  zip.file("word/footer1.xml", footerXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("DOCX headers and footers import", () => {
  it("loads images from header-specific relationships", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocxWithHeaderImage(),
    );
    const imageRun = document.sections?.[0]?.header
      ?.flatMap((block) => (block.type === "paragraph" ? block.runs : []))
      .find((run) => run.image);

    expect(imageRun?.text).toBe("￼");
    expect(imageRun?.image?.width).toBe(2);
    expect(imageRun?.image?.height).toBe(3);
    expect(imageRun?.image?.alt).toBe("Logo");
    expect(imageRun?.image?.src).toMatch(/^asset:/);

    const assetId = imageRun!.image!.src.slice("asset:".length);
    expect(document.assets?.[assetId]?.url).toMatch(/^data:image\/png;base64,/);
  });

  it("imports and projects first, even, and default headers by page type", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocxWithTypedHeaders(),
    );
    const section = document.sections?.[0];

    expect(section?.firstPageHeader?.[0]?.type).toBe("paragraph");
    expect(section?.evenPageHeader?.[0]?.type).toBe("paragraph");
    expect(section?.header?.[0]?.type).toBe("paragraph");
    expect(section?.firstPageFooter?.[0]?.type).toBe("paragraph");
    expect(section?.evenPageFooter?.[0]?.type).toBe("paragraph");
    expect(section?.footer?.[0]?.type).toBe("paragraph");

    const layout = projectDocumentLayout(document);
    const headerTexts = layout.pages
      .slice(0, 3)
      .map((page) => page.headerBlocks?.[0]?.layout?.text);
    const footerTexts = layout.pages
      .slice(0, 3)
      .map((page) => page.footerBlocks?.[0]?.layout?.text);

    expect(headerTexts).toEqual([
      "FIRST HEADER",
      "EVEN HEADER",
      "DEFAULT HEADER",
    ]);
    expect(footerTexts).toEqual([
      "FIRST FOOTER",
      "EVEN FOOTER",
      "DEFAULT FOOTER",
    ]);
  });

  it("recognizes a PAGE field encoded inside a single run and paginates it", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocxWithCompactFooterPageField(),
    );
    const footerRun = document.sections?.[0]?.footer
      ?.flatMap((block) => (block.type === "paragraph" ? block.runs : []))
      .find((run) => run.field);

    expect(footerRun?.field?.type).toBe("PAGE");

    const layout = projectDocumentLayout(document);
    const footerTexts = layout.pages
      .slice(0, 2)
      .map((page) => page.footerBlocks?.[0]?.layout?.text);
    expect(footerTexts).toEqual(["1", "2"]);
  });
});
