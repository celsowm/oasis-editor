import { describe, it, expect } from "vitest";
import { createEditorDocument, createEditorParagraph } from "../../core/editorState.js";
import { getDocumentSections, getDocumentParagraphs, findParagraphLocation, getActiveSectionIndex, getActiveZone } from "../../core/model.js";
import type { EditorState, EditorDocument } from "../../core/model.js";

describe("Sections Model", () => {
  it("returns a virtual section if no sections are defined", () => {
    const p1 = createEditorParagraph("P1");
    const doc = createEditorDocument([p1]);
    
    const sections = getDocumentSections(doc);
    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe("section:default");
    expect(sections[0].blocks).toContain(p1);
  });

  it("returns defined sections", () => {
    const p1 = createEditorParagraph("P1");
    const p2 = createEditorParagraph("P2");
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
    const headerP = createEditorParagraph("Header");
    const bodyP = createEditorParagraph("Body");
    const footerP = createEditorParagraph("Footer");
    
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

  it("findParagraphLocation locates paragraph in main zone", () => {
    const bodyP = createEditorParagraph("Body");
    const doc = {
      id: "doc:1",
      blocks: [],
      sections: [
        {
          id: "section:1",
          blocks: [bodyP],
          pageSettings: { width: 816, height: 1056, margins: { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 } }
        }
      ]
    };

    const location = findParagraphLocation(doc, bodyP.id);
    expect(location).toEqual({ sectionIndex: 0, zone: "main", paragraphIndexInSection: 0 });
  });

  it("findParagraphLocation locates paragraph in header zone", () => {
    const headerP = createEditorParagraph("Header");
    const bodyP = createEditorParagraph("Body");
    const doc = {
      id: "doc:1",
      blocks: [],
      sections: [
        {
          id: "section:1",
          blocks: [bodyP],
          header: [headerP],
          pageSettings: { width: 816, height: 1056, margins: { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 } }
        }
      ]
    };

    const location = findParagraphLocation(doc, headerP.id);
    expect(location).toEqual({ sectionIndex: 0, zone: "header", paragraphIndexInSection: 0 });
  });

  it("findParagraphLocation locates paragraph in footer zone", () => {
    const footerP = createEditorParagraph("Footer");
    const bodyP = createEditorParagraph("Body");
    const doc = {
      id: "doc:1",
      blocks: [],
      sections: [
        {
          id: "section:1",
          blocks: [bodyP],
          footer: [footerP],
          pageSettings: { width: 816, height: 1056, margins: { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 } }
        }
      ]
    };

    const location = findParagraphLocation(doc, footerP.id);
    expect(location).toEqual({ sectionIndex: 0, zone: "footer", paragraphIndexInSection: 0 });
  });

  it("findParagraphLocation returns null for unknown paragraph", () => {
    const bodyP = createEditorParagraph("Body");
    const doc = {
      id: "doc:1",
      blocks: [],
      sections: [
        {
          id: "section:1",
          blocks: [bodyP],
          pageSettings: { width: 816, height: 1056, margins: { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 } }
        }
      ]
    };

    const location = findParagraphLocation(doc, "paragraph:nonexistent");
    expect(location).toBeNull();
  });

  it("getActiveSectionIndex and getActiveZone return defaults when unset", () => {
    const state: EditorState = {
      document: { id: "doc:1", blocks: [] },
      selection: { anchor: { paragraphId: "", runId: "", offset: 0 }, focus: { paragraphId: "", runId: "", offset: 0 } },
    };
    expect(getActiveSectionIndex(state)).toBe(0);
    expect(getActiveZone(state)).toBe("main");
  });

  it("getActiveSectionIndex and getActiveZone return set values", () => {
    const state: EditorState = {
      document: { id: "doc:1", blocks: [] },
      selection: { anchor: { paragraphId: "", runId: "", offset: 0 }, focus: { paragraphId: "", runId: "", offset: 0 } },
      activeSectionIndex: 2,
      activeZone: "header",
    };
    expect(getActiveSectionIndex(state)).toBe(2);
    expect(getActiveZone(state)).toBe("header");
  });
});
