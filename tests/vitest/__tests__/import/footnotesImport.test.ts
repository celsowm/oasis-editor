import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "../../../../src/import/docx/importDocxToEditorDocument.js";
import { collectFootnoteReferences } from "../../../../src/core/footnotes.js";

interface BuildOptions {
  /**
   * Body paragraphs of the document. Each entry is a list of "tokens" — either
   * a literal text fragment or a `{ footnoteId }` marker that becomes a
   * `<w:footnoteReference>` run.
   */
  body: Array<Array<string | { footnoteId: number }>>;
  /** Footnote bodies keyed by id (`w:id` value in `word/footnotes.xml`). */
  footnotes: Record<number, string>;
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
  tokens: Array<string | { footnoteId: number }>,
): string {
  const runs = tokens
    .map((token) => {
      if (typeof token === "string") {
        return `<w:r><w:t xml:space="preserve">${escapeXml(token)}</w:t></w:r>`;
      }
      return `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteReference w:id="${token.footnoteId}"/></w:r>`;
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
  <Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>
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
  <Relationship Id="rIdFootnotes" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>
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
    ? `<w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>
       <w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>`
    : "";

  const footnoteEntries = Object.entries(options.footnotes)
    .map(([idStr, text]) => {
      const id = Number(idStr);
      return `<w:footnote w:id="${id}">
        <w:p>
          <w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr>
          <w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r>
          <w:r><w:t xml:space="preserve"> ${escapeXml(text)}</w:t></w:r>
        </w:p>
      </w:footnote>`;
    })
    .join("\n");

  zip.file(
    "word/footnotes.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  ${specials}
  ${footnoteEntries}
</w:footnotes>`,
  );
  if (options.settingsXml) {
    zip.file("word/settings.xml", options.settingsXml);
  }

  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return buffer;
}

describe("DOCX import: footnotes", () => {
  it("imports a single footnote with inline reference and body", async () => {
    const buffer = await buildDocxFixture({
      body: [["Hello ", { footnoteId: 1 }, " world"]],
      footnotes: { 1: "First note." },
    });

    const doc = await importDocxToEditorDocument(buffer);

    // Registry has exactly one footnote.
    expect(doc.footnotes).toBeDefined();
    expect(Object.keys(doc.footnotes!.items)).toHaveLength(1);

    // The body paragraph carries a reference run with text "1".
    const refs = collectFootnoteReferences(doc);
    expect(refs).toHaveLength(1);
    expect(refs[0].run.text).toBe("1");
    expect(refs[0].run.footnoteReference).toBeDefined();
    expect(refs[0].run.styles?.superscript).toBe(true);

    // The footnote body contains the user text (the imported footnoteRef
    // marker run inside the body is dropped by the importer).
    const footnoteId = refs[0].run.footnoteReference!.footnoteId;
    const body = doc.footnotes!.items[footnoteId].blocks;
    expect(body.length).toBeGreaterThan(0);
    const paragraph = body[0];
    expect(paragraph.type).toBe("paragraph");
    if (paragraph.type !== "paragraph") return;
    const text = paragraph.runs.map((r) => r.text).join("");
    expect(text).toContain("First note.");
  });

  it("numbers multiple footnotes in document order (1, 2, 3)", async () => {
    const buffer = await buildDocxFixture({
      body: [
        ["alpha", { footnoteId: 10 }, " "],
        ["beta", { footnoteId: 11 }, " "],
        ["gamma", { footnoteId: 12 }],
      ],
      footnotes: {
        10: "First.",
        11: "Second.",
        12: "Third.",
      },
    });

    const doc = await importDocxToEditorDocument(buffer);
    const refs = collectFootnoteReferences(doc);
    expect(refs.map((r) => r.run.text)).toEqual(["1", "2", "3"]);
    expect(Object.keys(doc.footnotes!.items)).toHaveLength(3);
  });

  it("imports footnote numbering settings from settings.xml", async () => {
    const buffer = await buildDocxFixture({
      body: [["alpha", { footnoteId: 10 }, " beta", { footnoteId: 11 }]],
      footnotes: {
        10: "First.",
        11: "Second.",
      },
      settingsXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:footnotePr>
    <w:numFmt w:val="lowerRoman"/>
    <w:numStart w:val="4"/>
    <w:numRestart w:val="eachSect"/>
  </w:footnotePr>
</w:settings>`,
    });

    const doc = await importDocxToEditorDocument(buffer);
    const refs = collectFootnoteReferences(doc);

    expect(doc.footnotes?.settings).toEqual({
      numberFormat: "lowerRoman",
      startAt: 4,
      restart: "eachSection",
    });
    expect(refs.map((r) => r.run.text)).toEqual(["iv", "v"]);
  });

  it("ignores the separator and continuationSeparator special footnotes", async () => {
    const buffer = await buildDocxFixture({
      body: [["text ", { footnoteId: 1 }]],
      footnotes: { 1: "note" },
      includeSeparators: true,
    });
    const doc = await importDocxToEditorDocument(buffer);
    // Only one real note; the special ids must not pollute the registry.
    expect(Object.keys(doc.footnotes!.items)).toHaveLength(1);
  });

  it("imports documents without footnotes unchanged", async () => {
    // Build a DOCX without footnotes.xml.
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

    expect(doc.footnotes).toBeUndefined();
    expect(collectFootnoteReferences(doc)).toHaveLength(0);
  });
});
