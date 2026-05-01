import { describe, it, expect, beforeEach } from "vitest";
import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type { Editor2Section, Editor2PageMargins, Editor2BlockNode, Editor2ParagraphNode } from "../../core/model.js";
import { createEditor2Document, createEditor2Paragraph, resetEditor2Ids } from "../../core/editorState.js";
import { exportEditor2DocumentToDocx } from "../../export/docx/exportEditor2DocumentToDocx.js";
import { importDocxToEditor2Document } from "../../import/docx/importDocxToEditor2Document.js";
import { getDocumentSections } from "../../core/model.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const defaultMargins: Editor2PageMargins = { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 };

describe("exportMultiSection", () => {
  beforeEach(() => {
    resetEditor2Ids();
  });

  it("exports document with sections as separate sectPr elements in body", async () => {
    const s1Block = createEditor2Paragraph("Section 1");
    const s2Block = createEditor2Paragraph("Section 2");

    const doc = createEditor2Document([s1Block]);
    // Override to add sections
    (doc as any).sections = [
      {
        id: "section:1",
        blocks: [s1Block],
        pageSettings: { width: 816, height: 1056, margins: defaultMargins },
      },
      {
        id: "section:2",
        blocks: [s2Block],
        pageSettings: { width: 1056, height: 816, orientation: "landscape", margins: defaultMargins },
      },
    ];
    doc.blocks = []; // Clear top-level blocks when sections exist

    const buffer = await exportEditor2DocumentToDocx(doc);

    // Extract and parse document.xml from zip
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    expect(documentXml).toBeDefined();

    const parsed = new DOMParser().parseFromString(documentXml!, "application/xml");
    const body = parsed.getElementsByTagNameNS(WORD_NS, "body")[0];
    expect(body).toBeDefined();

    // Count sectPr elements - should have 2 (one per section)
    const sectPrElements: XmlElement[] = [];
    for (let i = 0; i < body.childNodes.length; i++) {
      const node = body.childNodes[i];
      if (node?.nodeType === node.ELEMENT_NODE && (node as XmlElement).localName === "sectPr") {
        sectPrElements.push(node as XmlElement);
      }
    }
    expect(sectPrElements).toHaveLength(2);

    // First section should be portrait (816x1056 in px = 12240x15840 in twips)
    const pgSz1 = sectPrElements[0]?.getElementsByTagNameNS(WORD_NS, "pgSz")[0];
    expect(pgSz1?.getAttribute("w:w")).toBe("12240"); // 816 * 1440/96
    expect(pgSz1?.getAttribute("w:h")).toBe("15840"); // 1056 * 1440/96

    // Second section should be landscape (1056x816 in px = 15840x12240 in twips)
    const pgSz2 = sectPrElements[1]?.getElementsByTagNameNS(WORD_NS, "pgSz")[0];
    expect(pgSz2?.getAttribute("w:w")).toBe("15840"); // 1056 * 1440/96
    expect(pgSz2?.getAttribute("w:h")).toBe("12240"); // 816 * 1440/96
  });

  it("round-trips a single section document", async () => {
    const p1 = createEditor2Paragraph("Hello");
    const p2 = createEditor2Paragraph("World");

    const doc = createEditor2Document([p1, p2]);

    const buffer = await exportEditor2DocumentToDocx(doc);
    resetEditor2Ids();
    const imported = await importDocxToEditor2Document(buffer);

    // Should have same number of blocks
    expect(imported.blocks.length).toBe(2);
    expect((imported.blocks[0] as Editor2ParagraphNode).runs[0].text).toBe("Hello");
    expect((imported.blocks[1] as Editor2ParagraphNode).runs[0].text).toBe("World");
  });

  it("round-trips a document with sections", async () => {
    const s1Block = createEditor2Paragraph("Section 1");
    const s2Block = createEditor2Paragraph("Section 2");

    const doc = createEditor2Document([]);
    (doc as any).sections = [
      {
        id: "section:1",
        blocks: [s1Block],
        pageSettings: { width: 816, height: 1056, margins: defaultMargins },
      },
      {
        id: "section:2",
        blocks: [s2Block],
        pageSettings: { width: 1056, height: 816, orientation: "landscape", margins: defaultMargins },
      },
    ];

    const buffer = await exportEditor2DocumentToDocx(doc);
    resetEditor2Ids();
    const imported = await importDocxToEditor2Document(buffer);

    // After import, should be able to get sections from the imported document
    const sections = getDocumentSections(imported);
    expect(sections.length).toBeGreaterThanOrEqual(1);
  });
});
