import { describe, it, expect } from "vitest";
import { createEditor2Paragraph } from "../../core/editorState.js";
import { projectDocumentLayout } from "../../ui/layoutProjection.js";

describe("Sections Layout", () => {
  it("projects multiple sections into distinct pages", () => {
    const p1 = createEditor2Paragraph("Section 1");
    const p2 = createEditor2Paragraph("Section 2");
    
    const doc = {
      id: "doc:1",
      blocks: [],
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
    
    const layout = projectDocumentLayout(doc);
    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0].blocks[0].sourceBlockId).toBe(p1.id);
    expect(layout.pages[0].pageSettings.orientation).toBe("portrait");
    
    expect(layout.pages[1].blocks[0].sourceBlockId).toBe(p2.id);
    expect(layout.pages[1].pageSettings.orientation).toBe("landscape");
  });

  it("attaches header and footer blocks to each page of a section", () => {
    const headerP = createEditor2Paragraph("Header");
    const bodyP1 = createEditor2Paragraph("Body 1");
    const bodyP2 = createEditor2Paragraph("Body 2");
    const footerP = createEditor2Paragraph("Footer");
    
    // Force pagination of body paragraphs
    const doc = {
      id: "doc:1",
      blocks: [],
      sections: [
        {
          id: "section:1",
          header: [headerP],
          blocks: [bodyP1, bodyP2],
          footer: [footerP],
          pageSettings: { width: 816, height: 100, margins: { top: 20, right: 20, bottom: 20, left: 20, header: 10, footer: 10, gutter: 0 } }
        }
      ]
    };
    
    // pageContentHeight = 100 - 20 - 20 = 60
    // bodyP1 height (estimated) is > 30 usually, so two body paragraphs should split into two pages
    const layout = projectDocumentLayout(doc, 60);
    
    expect(layout.pages.length).toBeGreaterThanOrEqual(2);
    for (const page of layout.pages) {
      expect(page.headerBlocks).toHaveLength(1);
      expect(page.headerBlocks![0].sourceBlockId).toBe(headerP.id);
      expect(page.footerBlocks).toHaveLength(1);
      expect(page.footerBlocks![0].sourceBlockId).toBe(footerP.id);
    }
  });
});
