import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "../../../../src/import/docx/importDocxToEditorDocument.js";
import { collectEndnoteReferences } from "../../../../src/core/endnotes.js";

interface BuildOptions {
  /**
   * Body paragraphs. Each entry is a list of "tokens" — either a literal text
   * fragment or a `{ endnoteId }` marker that becomes a `<w:endnoteReference>`.
   */
  body: Array<Array<string | { endnoteId: number }>>;
  /** Endnote bodies keyed by id (`w:id` value in `word/endnotes.xml`). */
  endnotes: Record<number, string>;
  /** Whether to emit separator/continuationSeparator entries. Default true. */
  includeSeparators?: boolean;
  /** Optional word/settings.xml content. */
  settingsXml?: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildBodyParagraph(
  tokens: Array<string | { endnoteId: number }>,
): string {
  const runs = tokens
    .map((token) => {
      if (typeof token === "string") {
        return `<w:r><w:t xml:space="preserve">${escapeXml(token)}</w:t></w:r>`;
      }
      return `<w:r><w:rPr><w:rStyle w:val="EndnoteReference"/><w:vertAlign w:val="superscript"/></w:rPr><w:endnoteReference w:id="${token.endnoteId}"/></w:r>`;
    })
    .join("");
  return `<w:p>${runs}</w:p>`;
}

async function buildDocxFixture(options: BuildOptions): Promise<ArrayBuffer> {
  const includeSeparators = options.includeSeparators !== false;
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/endnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"/>
  ${options.settingsXml ? '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' : ""}
</Types>`,
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );

  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdEndnotes" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes" Target="endnotes.xml"/>
</Relationships>`,
  );

  const bodyXml = options.body.map(buildBodyParagraph).join("");
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
  </w:body>
</w:document>`,
  );

  const specials = includeSeparators
    ? `<w:endnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:endnote>
       <w:endnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:endnote>`
    : "";

  const endnoteEntries = Object.entries(options.endnotes)
    .map(([idStr, text]) => {
      const id = Number(idStr);
      return `<w:endnote w:id="${id}">
        <w:p>
          <w:pPr><w:pStyle w:val="EndnoteText"/></w:pPr>
          <w:r><w:rPr><w:rStyle w:val="EndnoteReference"/></w:rPr><w:endnoteRef/></w:r>
          <w:r><w:t xml:space="preserve"> ${escapeXml(text)}</w:t></w:r>
        </w:p>
      </w:endnote>`;
    })
    .join("\n");

  zip.file(
    "word/endnotes.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:endnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  ${specials}
  ${endnoteEntries}
</w:endnotes>`,
  );
  if (options.settingsXml) {
    zip.file("word/settings.xml", options.settingsXml);
  }

  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return buffer;
}

describe("DOCX import: endnotes", () => {
  it("imports a single endnote with inline reference and body", async () => {
    const buffer = await buildDocxFixture({
      body: [["Hello ", { endnoteId: 1 }, " world"]],
      endnotes: { 1: "First note." },
    });

    const doc = await importDocxToEditorDocument(buffer);

    expect(doc.endnotes).toBeDefined();
    expect(Object.keys(doc.endnotes!.items)).toHaveLength(1);

    const refs = collectEndnoteReferences(doc);
    expect(refs).toHaveLength(1);
    expect(refs[0].run.text).toBe("1");
    expect(refs[0].run.endnoteReference).toBeDefined();
    expect(refs[0].run.styles?.superscript).toBe(true);

    const endnoteId = refs[0].run.endnoteReference!.endnoteId;
    const body = doc.endnotes!.items[endnoteId].blocks;
    expect(body.length).toBeGreaterThan(0);
    const paragraph = body[0];
    expect(paragraph.type).toBe("paragraph");
    if (paragraph.type !== "paragraph") return;
    const text = paragraph.runs.map((r) => r.text).join("");
    expect(text).toContain("First note.");
  });

  it("numbers multiple endnotes in document order (1, 2, 3)", async () => {
    const buffer = await buildDocxFixture({
      body: [
        ["alpha", { endnoteId: 10 }, " "],
        ["beta", { endnoteId: 11 }, " "],
        ["gamma", { endnoteId: 12 }],
      ],
      endnotes: {
        10: "First.",
        11: "Second.",
        12: "Third.",
      },
    });

    const doc = await importDocxToEditorDocument(buffer);
    const refs = collectEndnoteReferences(doc);
    expect(refs.map((r) => r.run.text)).toEqual(["1", "2", "3"]);
    expect(Object.keys(doc.endnotes!.items)).toHaveLength(3);
  });

  it("imports endnote numbering settings from settings.xml", async () => {
    const buffer = await buildDocxFixture({
      body: [["alpha", { endnoteId: 10 }, " beta", { endnoteId: 11 }]],
      endnotes: {
        10: "First.",
        11: "Second.",
      },
      settingsXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:endnotePr>
    <w:numFmt w:val="upperLetter"/>
    <w:numStart w:val="3"/>
    <w:numRestart w:val="continuous"/>
  </w:endnotePr>
</w:settings>`,
    });

    const doc = await importDocxToEditorDocument(buffer);
    const refs = collectEndnoteReferences(doc);

    expect(doc.endnotes?.settings).toEqual({
      numberFormat: "upperLetter",
      startAt: 3,
      restart: "continuous",
    });
    expect(refs.map((r) => r.run.text)).toEqual(["C", "D"]);
  });

  it("ignores the separator and continuationSeparator special endnotes", async () => {
    const buffer = await buildDocxFixture({
      body: [["text ", { endnoteId: 1 }]],
      endnotes: { 1: "note" },
      includeSeparators: true,
    });
    const doc = await importDocxToEditorDocument(buffer);
    expect(Object.keys(doc.endnotes!.items)).toHaveLength(1);
  });

  it("imports documents without endnotes unchanged", async () => {
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
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>plain</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    );
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const doc = await importDocxToEditorDocument(buffer);

    expect(doc.endnotes).toBeUndefined();
    expect(collectEndnoteReferences(doc)).toHaveLength(0);
  });
});
