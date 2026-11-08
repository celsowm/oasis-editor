import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
} from "@/core/editorState.js";
import { COLUMN_BREAK_MARKER } from "@/core/units.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { getDocumentParagraphs, getParagraphText } from "@/core/model.js";

async function readDocumentXml(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("Missing word/document.xml");
  return xml;
}

describe("DOCX hard column break", () => {
  it("serializes the column break marker as <w:br w:type=\"column\"/>", async () => {
    const paragraph = createEditorParagraphFromRuns([
      { text: `Before${COLUMN_BREAK_MARKER}After` },
    ]);
    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    expect(xml).toContain('<w:br w:type="column"/>');
  });

  it("keeps the column break inline (not a standalone paragraph)", async () => {
    const paragraph = createEditorParagraphFromRuns([
      { text: `Before${COLUMN_BREAK_MARKER}After` },
    ]);
    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    // The whole phrase stays inside a single <w:p>, unlike a page break which
    // is emitted as its own paragraph.
    const pTag = "<w:p>";
    const paragraphStart = xml.indexOf(pTag);
    const paragraphEnd = xml.indexOf(pTag, paragraphStart + pTag.length);
    const within = xml.slice(paragraphStart, paragraphEnd);
    expect(within).toContain('<w:br w:type="column"/>');
  });

  it("round-trips a column break marker back through import", async () => {
    const paragraph = createEditorParagraphFromRuns([
      { text: `Before${COLUMN_BREAK_MARKER}After` },
    ]);
    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([paragraph]),
    );
    const imported = await importDocxToEditorDocument(buffer);

    const [result] = getDocumentParagraphs(imported);
    expect(getParagraphText(result)).toBe(`Before${COLUMN_BREAK_MARKER}After`);
  });
});
