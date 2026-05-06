import { describe, it, expect } from "vitest";
import {
  createEditorParagraph,
  createEditorParagraphFromRuns,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "../../core/editorState.js";
import { projectDocumentLayout } from "../../ui/layoutProjection.js";

describe("Sections Layout", () => {
  it("projects multiple sections into distinct pages", () => {
    const p1 = createEditorParagraph("Section 1");
    const p2 = createEditorParagraph("Section 2");
    
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
    const headerP = createEditorParagraph("Header");
    const bodyP1 = createEditorParagraph("Body 1");
    const bodyP2 = createEditorParagraph("Body 2");
    const footerP = createEditorParagraph("Footer");
    
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
    
    const layout = projectDocumentLayout(
      doc,
      60,
      {
        [bodyP1.id]: 40,
        [bodyP2.id]: 40,
      },
    );
    
    expect(layout.pages.length).toBeGreaterThanOrEqual(2);
    for (const page of layout.pages) {
      expect(page.headerBlocks).toHaveLength(1);
      expect(page.headerBlocks![0].sourceBlockId).toBe(headerP.id);
      expect(page.footerBlocks).toHaveLength(1);
      expect(page.footerBlocks![0].sourceBlockId).toBe(footerP.id);
    }
  });

  it("reduces body pagination height when the footer reference crosses into the body area", () => {
    const table1 = createEditorTable([
      createEditorTableRow([createEditorTableCell([createEditorParagraphFromRuns([{ text: "A1" }])])]),
    ]);
    const table2 = createEditorTable([
      createEditorTableRow([createEditorTableCell([createEditorParagraphFromRuns([{ text: "B1" }])])]),
    ]);

    const doc = {
      id: "doc:1",
      blocks: [],
      sections: [
        {
          id: "section:1",
          blocks: [table1, table2],
          pageSettings: {
            width: 816,
            height: 150,
            margins: { top: 20, right: 20, bottom: 20, left: 20, header: 10, footer: 30, gutter: 0 },
          },
        },
      ],
    };

    const layout = projectDocumentLayout(doc, undefined, {
      [table1.id]: 52,
      [table2.id]: 52,
    });

    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0].maxHeight).toBe(100);
    expect(layout.pages[0].blocks).toHaveLength(1);
    expect(layout.pages[1].blocks).toHaveLength(1);
  });

  it("pushes the body down when header content is taller than the top margin", () => {
    const header1 = createEditorParagraph("Header 1");
    const header2 = createEditorParagraph("Header 2");
    const body = createEditorParagraph("Body");

    const doc = {
      id: "doc:1",
      blocks: [],
      sections: [
        {
          id: "section:1",
          header: [header1, header2],
          blocks: [body],
          pageSettings: {
            width: 816,
            height: 200,
            margins: { top: 20, right: 20, bottom: 20, left: 20, header: 10, footer: 10, gutter: 0 },
          },
        },
      ],
    };

    const layout = projectDocumentLayout(doc, undefined, {
      [header1.id]: 18,
      [header2.id]: 18,
      [body.id]: 20,
    });

    expect(layout.pages).toHaveLength(1);
    expect(layout.pages[0]?.bodyTop).toBe(46);
    expect(layout.pages[0]?.maxHeight).toBe(134);
  });
});
