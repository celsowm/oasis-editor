import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraph,
} from "@/core/editorState.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { getDocumentParagraphs } from "@/core/model.js";

async function readDocumentXml(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) {
    throw new Error("Missing word/document.xml");
  }
  return xml;
}

function justifiedParagraph(): ReturnType<typeof createEditorParagraph> {
  const paragraph = createEditorParagraph("justified text");
  paragraph.style = { align: "justify" };
  return paragraph;
}

describe("DOCX paragraph justification", () => {
  it("serializes the model's justify alignment as OOXML `both`", async () => {
    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([justifiedParagraph()]),
    );
    const xml = await readDocumentXml(buffer);
    expect(xml).toContain('<w:jc w:val="both"/>');
    expect(xml).not.toContain('<w:jc w:val="justify"/>');
  });

  it("round-trips justified text back to the model's justify alignment", async () => {
    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([justifiedParagraph()]),
    );
    const document = await importDocxToEditorDocument(buffer);
    expect(getDocumentParagraphs(document)[0]!.style?.align).toBe("justify");
  });
});
