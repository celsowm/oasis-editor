import { expect, test } from "@playwright/test";
import JSZip from "jszip";

async function buildDocx(documentXml: string, relsXml?: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>`,
  );
  zip.file("word/document.xml", documentXml);
  if (relsXml) {
    zip.file("word/_rels/document.xml.rels", relsXml);
  }
  return Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
}

test.describe("Oasis Editor 2 DOCX", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`BROWSER ERROR: ${msg.text()}`);
      }
    });

    await page.goto("/oasis-editor/");
    await page.waitForSelector("#oasis-editor-loading", { state: "detached" });
  });

  test("imports a DOCX with paragraph and table content", async ({ page }) => {
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>Imported paragraph</w:t></w:r></w:p>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>A1</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>B1</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    await page.locator('[data-testid="editor-import-docx-input"]').setInputFiles({
      name: "import.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: file,
    });

    await expect(page.locator('[data-testid="editor-block"]').first()).toContainText("Imported paragraph");
    await expect(page.locator('[data-testid="editor-table-cell"]').first()).toContainText("A1");
    await expect(page.locator('[data-testid="editor-table-cell"]').nth(1)).toContainText("B1");
  });

  test("exports the imported DOCX back to a downloadable file", async ({ page }) => {
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>Round trip</w:t></w:r></w:p>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>R1C1</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>R1C2</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    await page.locator('[data-testid="editor-import-docx-input"]').setInputFiles({
      name: "roundtrip.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: file,
    });

    const downloadPromise = page.waitForEvent("download");
    await page.locator('[data-testid="editor-toolbar-file-dropdown"]').click();
    await page.locator('[data-testid="editor-toolbar-export-docx"]').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("oasis-editor.docx");

    const exported = await download.createReadStream();
    if (!exported) {
      throw new Error("Expected a readable DOCX download");
    }

    const chunks: Buffer[] = [];
    for await (const chunk of exported) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const zip = await JSZip.loadAsync(Buffer.concat(chunks));
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toContain("Round trip");
    expect(documentXml).toContain("R1C1");
    expect(documentXml).toContain("R1C2");
  });

  test("round-trips hyperlinks through import and export", async ({ page }) => {
    const file = await buildDocx(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <w:body>
          <w:p>
            <w:r><w:t>Visit </w:t></w:r>
            <w:hyperlink r:id="rIdLink1">
              <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>site</w:t></w:r>
            </w:hyperlink>
          </w:p>
        </w:body>
      </w:document>`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdLink1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>
      </Relationships>`,
    );

    await page.locator('[data-testid="editor-import-docx-input"]').setInputFiles({
      name: "hyperlink.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: file,
    });

    await expect(page.locator('[data-testid="editor-link"]')).toHaveAttribute("href", "https://example.com");

    const downloadPromise = page.waitForEvent("download");
    await page.locator('[data-testid="editor-toolbar-file-dropdown"]').click();
    await page.locator('[data-testid="editor-toolbar-export-docx"]').click();
    const download = await downloadPromise;
    const exported = await download.createReadStream();
    if (!exported) {
      throw new Error("Expected a readable DOCX download");
    }

    const chunks: Buffer[] = [];
    for await (const chunk of exported) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const zip = await JSZip.loadAsync(Buffer.concat(chunks));
    const documentXml = await zip.file("word/document.xml")?.async("string");
    const relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");

    expect(documentXml).toContain("<w:hyperlink");
    expect(relsXml).toContain('Target="https://example.com"');
  });
});
