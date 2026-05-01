import { describe, it, expect } from "vitest";
import { createEditor2Document, createEditor2Paragraph } from "../../core/editorState.js";
import { getDocumentSections, getDocumentParagraphs } from "../../core/model.js";

describe("Sections Model", () => {
  it("returns a virtual section if no sections are defined", () => {
    const p1 = createEditor2Paragraph("P1");
    const doc = createEditor2Document([p1]);
    
    const sections = getDocumentSections(doc);
    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe("section:default");
    expect(sections[0].blocks).toContain(p1);
  });

  it("returns defined sections", () => {
    const p1 = createEditor2Paragraph("P1");
    const p2 = createEditor2Paragraph("P2");
    const doc = {
      id: "doc:1",
      blocks: [], // Legacy blocks
      sections: [
        {
          id: "section:1",
          blocks: [p1],
          pageSettings: { width: 816, height: 1056, margins: { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 } }
        },
        {
          id: "section:2",
          blocks: [p2],
          pageSettings: { width: 1056, height: 816, orientation: "landscape" as const, margins: { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 } }
        }
      ]
    };
    
    const sections = getDocumentSections(doc);
    expect(sections).toHaveLength(2);
    expect(sections[0].blocks).toContain(p1);
    expect(sections[1].blocks).toContain(p2);
  });

  it("includes header/footer paragraphs in getDocumentParagraphs", () => {
    const headerP = createEditor2Paragraph("Header");
    const bodyP = createEditor2Paragraph("Body");
    const footerP = createEditor2Paragraph("Footer");
    
    const doc = {
      id: "doc:1",
      blocks: [],
      sections: [
        {
          id: "section:1",
          blocks: [bodyP],
          header: [headerP],
          footer: [footerP],
          pageSettings: { width: 816, height: 1056, margins: { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 } }
        }
      ]
    };
    
    const paragraphs = getDocumentParagraphs(doc);
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0].id).toBe(headerP.id);
    expect(paragraphs[1].id).toBe(bodyP.id);
    expect(paragraphs[2].id).toBe(footerP.id);
  });
});
