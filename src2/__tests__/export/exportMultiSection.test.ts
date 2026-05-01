import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import {
  createEditor2Document,
  createEditor2Paragraph,
  resetEditor2Ids,
} from "../../core/editorState.js";
import { exportEditor2DocumentToDocx } from "../../export/docx/exportEditor2DocumentToDocx.js";

describe("exportEditor2DocumentToDocx (Multi-section)", () => {
  it("exports a document with multiple sections and headers/footers", async () => {
    resetEditor2Ids();
    const doc = createEditor2Document([createEditor2Paragraph("Section 1 Body")]);
    
    // Add a second section
    doc.sections.push({
      id: "section:2",
      blocks: [createEditor2Paragraph("Section 2 Body")],
      pageSettings: {
        width: 816,
        height: 1056,
        orientation: "portrait",
        margins: { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 },
      },
      header: [createEditor2Paragraph("Section 2 Header")],
      footer: [createEditor2Paragraph("Section 2 Footer")],
    });

    const buffer = await exportEditor2DocumentToDocx(doc);
    const zip = await JSZip.loadAsync(buffer);
    
    // Check main document
    const documentXml = await zip.file("word/document.xml")?.async("string");
    expect(documentXml).toContain("Section 1 Body");
    expect(documentXml).toContain("Section 2 Body");
    
    // Check if header/footer files exist
    expect(zip.file("word/header1.xml")).not.toBeNull();
    expect(zip.file("word/footer1.xml")).not.toBeNull();
    
    const headerXml = await zip.file("word/header1.xml")?.async("string");
    expect(headerXml).toContain("Section 2 Header");
    
    const footerXml = await zip.file("word/footer1.xml")?.async("string");
    expect(footerXml).toContain("Section 2 Footer");
  });
});
