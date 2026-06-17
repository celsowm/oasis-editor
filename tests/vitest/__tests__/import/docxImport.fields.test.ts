import { describe, expect, it, beforeEach } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { resetEditorIds } from "@/core/editorState.js";
import { getDocumentParagraphs } from "./docxTestHelpers.js";
import type {
  EditorDocument,
  EditorTextRun,
} from "@/core/model.js";

beforeEach(() => {
  resetEditorIds();
});

async function buildDocx(bodyXml: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>${bodyXml}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

/** All body runs in document order. */
function allRuns(document: EditorDocument): EditorTextRun[] {
  return getDocumentParagraphs(document).flatMap((p) => p.runs);
}

function fieldCharKinds(
  document: EditorDocument,
): Array<"begin" | "separate" | "end"> {
  return allRuns(document).flatMap((r) =>
    r.fieldChar ? [r.fieldChar.kind] : [],
  );
}

function instructions(document: EditorDocument): string[] {
  return allRuns(document)
    .map((r) => r.fieldInstruction)
    .filter((i): i is string => i !== undefined);
}

async function exportXml(document: EditorDocument): Promise<string> {
  const zip = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
  return (await zip.file("word/document.xml")?.async("string")) ?? "";
}

async function roundTrip(bodyXml: string): Promise<{
  imported: EditorDocument;
  xml: string;
  reimported: EditorDocument;
}> {
  const imported = await importDocxToEditorDocument(await buildDocx(bodyXml));
  const xml = await exportXml(imported);
  const reimported = await importDocxToEditorDocument(
    await exportEditorDocumentToDocx(imported),
  );
  return { imported, xml, reimported };
}

describe("DOCX import: complex fields (REF / PAGEREF / TOC)", () => {
  it("preserves a SEQ Figure caption field", async () => {
    const { imported, xml } = await roundTrip(
      `<w:p>
        <w:pPr><w:pStyle w:val="Caption"/></w:pPr>
        <w:r><w:t>Figure </w:t></w:r>
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText xml:space="preserve"> SEQ Figure \\* ARABIC </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:r><w:t>4</w:t></w:r>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
        <w:r><w:t>: Imported caption</w:t></w:r>
      </w:p>`,
    );

    expect(getDocumentParagraphs(imported)[0]?.style?.styleId).toBe("Caption");
    expect(fieldCharKinds(imported)).toEqual(["begin", "separate", "end"]);
    expect(instructions(imported)).toEqual([" SEQ Figure \\* ARABIC "]);
    expect(xml).toContain(
      '<w:instrText xml:space="preserve"> SEQ Figure \\* ARABIC </w:instrText>',
    );
  });

  it("preserves a REF cross-reference field with its instruction and cached result", async () => {
    const { imported, xml, reimported } = await roundTrip(
      `<w:p>
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText xml:space="preserve"> REF Target \\h </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:r><w:t>Result text</w:t></w:r>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
      </w:p>`,
    );

    expect(fieldCharKinds(imported)).toEqual(["begin", "separate", "end"]);
    expect(instructions(imported)).toEqual([" REF Target \\h "]);
    // The cached result survives as a normal run.
    expect(allRuns(imported).some((r) => r.text === "Result text")).toBe(true);

    // Exported XML reproduces the complex-field sequence 1:1.
    expect(xml).toContain('<w:fldChar w:fldCharType="begin"/>');
    expect(xml).toContain(
      '<w:instrText xml:space="preserve"> REF Target \\h </w:instrText>',
    );
    expect(xml).toContain('<w:fldChar w:fldCharType="separate"/>');
    expect(xml).toContain('<w:fldChar w:fldCharType="end"/>');

    // And it survives a second round-trip.
    expect(fieldCharKinds(reimported)).toEqual(["begin", "separate", "end"]);
    expect(instructions(reimported)).toEqual([" REF Target \\h "]);
  });

  it("preserves a PAGEREF field", async () => {
    const { imported, xml } = await roundTrip(
      `<w:p>
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText xml:space="preserve"> PAGEREF _Ref1 \\h </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:r><w:t>3</w:t></w:r>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
      </w:p>`,
    );
    expect(instructions(imported)).toEqual([" PAGEREF _Ref1 \\h "]);
    // PAGEREF must NOT collapse into a PAGE field.
    expect(allRuns(imported).some((r) => r.field)).toBe(false);
    expect(xml).toContain(
      '<w:instrText xml:space="preserve"> PAGEREF _Ref1 \\h </w:instrText>',
    );
  });

  it("preserves a TOC field whose begin/end span multiple paragraphs", async () => {
    const { imported, xml, reimported } = await roundTrip(
      `<w:p>
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:hyperlink w:anchor="_Toc1"><w:r><w:t>Heading One</w:t></w:r></w:hyperlink>
      </w:p>
      <w:p>
        <w:hyperlink w:anchor="_Toc2"><w:r><w:t>Heading Two</w:t></w:r></w:hyperlink>
      </w:p>
      <w:p>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
      </w:p>`,
    );

    // begin/separate live in the first paragraph, end in the last — preserved.
    expect(fieldCharKinds(imported)).toEqual(["begin", "separate", "end"]);
    expect(instructions(imported)).toEqual([` TOC \\o "1-3" \\h `]);
    // The internal hyperlinks (cached TOC entries) survive too.
    const links = allRuns(imported)
      .map((r) => r.styles?.link)
      .filter(Boolean);
    expect(links).toEqual(["#_Toc1", "#_Toc2"]);

    // Re-export keeps begin before end across paragraphs.
    expect(xml.indexOf('w:fldCharType="begin"')).toBeGreaterThanOrEqual(0);
    expect(xml.indexOf('w:fldCharType="begin"')).toBeLessThan(
      xml.indexOf('w:fldCharType="end"'),
    );
    expect(fieldCharKinds(reimported)).toEqual(["begin", "separate", "end"]);
  });

  it("preserves an unknown complex field verbatim", async () => {
    const { imported } = await roundTrip(
      `<w:p>
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText xml:space="preserve"> DATE \\@ "yyyy-MM-dd" </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:r><w:t>2026-06-12</w:t></w:r>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
      </w:p>`,
    );
    expect(fieldCharKinds(imported)).toEqual(["begin", "separate", "end"]);
    expect(instructions(imported)).toEqual([` DATE \\@ "yyyy-MM-dd" `]);
    expect(allRuns(imported).some((r) => r.field)).toBe(false);
  });

  it("still collapses a complete single-paragraph PAGE field to a PAGE run", async () => {
    const { imported } = await roundTrip(
      `<w:p>
        <w:r>
          <w:fldChar w:fldCharType="begin"/>
          <w:instrText xml:space="preserve">PAGE</w:instrText>
          <w:fldChar w:fldCharType="end"/>
        </w:r>
      </w:p>`,
    );
    expect(allRuns(imported).some((r) => r.field?.type === "PAGE")).toBe(true);
    // Collapsed: no preserved fldChar markers for PAGE.
    expect(fieldCharKinds(imported)).toEqual([]);
  });

  it("round-trips a bookmark target together with a REF pointing at it", async () => {
    const { reimported, xml } = await roundTrip(
      `<w:p>
        <w:bookmarkStart w:id="0" w:name="Target"/>
        <w:r><w:t>Anchored</w:t></w:r>
        <w:bookmarkEnd w:id="0"/>
      </w:p>
      <w:p>
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText xml:space="preserve"> REF Target \\h </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:r><w:t>Anchored</w:t></w:r>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
      </w:p>`,
    );
    // Bookmark and field both survive the full round-trip.
    expect(reimported.bookmarks?.order.length).toBe(1);
    const bm = reimported.bookmarks!.items[reimported.bookmarks!.order[0]!]!;
    expect(bm.name).toBe("Target");
    expect(instructions(reimported)).toEqual([" REF Target \\h "]);
    expect(xml).toContain('<w:bookmarkStart w:id="0" w:name="Target"/>');
  });
});
