import { describe, it, expect, beforeEach } from "vitest";
import type { EditorState, EditorSection, EditorBlockNode, EditorPageMargins, EditorParagraphNode } from "../../core/model.js";
import { getParagraphs, getActiveSectionIndex, getActiveZone, findParagraphLocation } from "../../core/model.js";
import {
  insertTextAtSelection,
  splitBlockAtSelection,
  deleteBackward,
} from "../../core/editorCommands.js";
import { createEditorParagraph, createEditorStateFromDocument } from "../../core/editorState.js";

const defaultMargins: EditorPageMargins = { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 };

function makeSectionedState(
  sections: Array<{ id: string; blocks: EditorBlockNode[]; header?: EditorParagraphNode[]; footer?: EditorParagraphNode[] }>,
  options?: { activeSectionIndex?: number; activeZone?: "main" | "header" | "footer" },
) {

  return {
    document: {
      id: "doc:1",
      blocks: [],
      sections: sections.map((s) => ({
        id: s.id,
        blocks: s.blocks,
        header: s.header,
        footer: s.footer,
        pageSettings: { width: 816, height: 1056, margins: defaultMargins },
      })),
    },
    selection: {
      anchor: { paragraphId: "", runId: "", offset: 0 },
      focus: { paragraphId: "", runId: "", offset: 0 },
    },
    activeSectionIndex: options?.activeSectionIndex ?? 0,
    activeZone: options?.activeZone ?? "main",
  };
}

describe("editor commands with sections", () => {
  beforeEach(() => {
    // Reset ID counters to ensure predictable IDs
  });

  it("getParagraphs returns only main zone paragraphs when activeZone is main", () => {
    const headerP = createEditorParagraph("Header");
    const bodyP1 = createEditorParagraph("Body1");
    const bodyP2 = createEditorParagraph("Body2");
    const footerP = createEditorParagraph("Footer");

    const state = makeSectionedState(
      [{ id: "section:1", blocks: [bodyP1, bodyP2], header: [headerP], footer: [footerP] }],
    );

    const paragraphs = getParagraphs(state);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].id).toBe(bodyP1.id);
    expect(paragraphs[1].id).toBe(bodyP2.id);
  });

  it("getParagraphs returns header paragraphs when activeZone is header", () => {
    const headerP = createEditorParagraph("Header");
    const bodyP = createEditorParagraph("Body");
    const footerP = createEditorParagraph("Footer");

    const state = makeSectionedState(
      [{ id: "section:1", blocks: [bodyP], header: [headerP], footer: [footerP] }],
      { activeZone: "header" },
    );

    const paragraphs = getParagraphs(state);
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].id).toBe(headerP.id);
  });

  it("getParagraphs returns footer paragraphs when activeZone is footer", () => {
    const headerP = createEditorParagraph("Header");
    const bodyP = createEditorParagraph("Body");
    const footerP = createEditorParagraph("Footer");

    const state = makeSectionedState(
      [{ id: "section:1", blocks: [bodyP], header: [headerP], footer: [footerP] }],
      { activeZone: "footer" },
    );

    const paragraphs = getParagraphs(state);
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].id).toBe(footerP.id);
  });

  it("insertTextAtSelection modifies the paragraph in the active zone", () => {
    const headerP = createEditorParagraph("Header");
    const bodyP = createEditorParagraph("Body");
    const footerP = createEditorParagraph("Footer");

    const state: EditorState = {
      document: {
        id: "doc:1",
        blocks: [],
        sections: [{
          id: "section:1",
          blocks: [bodyP],
          header: [headerP],
          footer: [footerP],
          pageSettings: { width: 816, height: 1056, margins: defaultMargins },
        }],
      },
      selection: {
        anchor: { paragraphId: headerP.id, runId: headerP.runs[0].id, offset: 6 },
        focus: { paragraphId: headerP.id, runId: headerP.runs[0].id, offset: 6 },
      },
      activeSectionIndex: 0,
      activeZone: "header",
    };

    const newState = insertTextAtSelection(state, " Edited");

    // Header section was modified
    const newSection = newState.document.sections![0];
    expect((newSection.header![0] as EditorParagraphNode).runs[0].text).toBe("Header Edited");
    // Body section remains unchanged
    expect((newSection.blocks[0] as EditorParagraphNode).runs[0].text).toBe("Body");
  });

  it("splitBlockAtSelection splits within the active zone", () => {
    const headerP = createEditorParagraph("HeaderLine1");
    const bodyP = createEditorParagraph("Body");

    const state: EditorState = {
      document: {
        id: "doc:1",
        blocks: [],
        sections: [{
          id: "section:1",
          blocks: [bodyP],
          header: [headerP],
          pageSettings: { width: 816, height: 1056, margins: defaultMargins },
        }],
      },
      selection: {
        anchor: { paragraphId: headerP.id, runId: headerP.runs[0].id, offset: 5 },
        focus: { paragraphId: headerP.id, runId: headerP.runs[0].id, offset: 5 },
      },
      activeSectionIndex: 0,
      activeZone: "header",
    };

    const newState = splitBlockAtSelection(state);

    // Header should now have 2 paragraphs
    const newSection = newState.document.sections![0];
    expect(newSection.header).toHaveLength(2);
    expect((newSection.header![0] as EditorParagraphNode).runs[0].text).toBe("Heade");
    expect((newSection.header![1] as EditorParagraphNode).runs[0].text).toBe("rLine1");
    // Body unchanged
    expect((newSection.blocks[0] as EditorParagraphNode).runs[0].text).toBe("Body");
  });

  it("deleteBackward at zone boundary stays within zone", () => {
    const headerP1 = createEditorParagraph("H1");
    const headerP2 = createEditorParagraph("H2");
    const bodyP = createEditorParagraph("Body");

    const state: EditorState = {
      document: {
        id: "doc:1",
        blocks: [],
        sections: [{
          id: "section:1",
          blocks: [bodyP],
          header: [headerP1, headerP2],
          pageSettings: { width: 816, height: 1056, margins: defaultMargins },
        }],
      },
      selection: {
        anchor: { paragraphId: headerP2.id, runId: headerP2.runs[0].id, offset: 0 },
        focus: { paragraphId: headerP2.id, runId: headerP2.runs[0].id, offset: 0 },
      },
      activeSectionIndex: 0,
      activeZone: "header",
    };

    const newState = deleteBackward(state);

    // headerP2 merged with headerP1 within the header zone
    const newSection = newState.document.sections![0];
    expect(newSection.header).toHaveLength(1);
    expect((newSection.header![0] as EditorParagraphNode).runs[0].text).toBe("H1H2");
    // Body unchanged
    expect((newSection.blocks[0] as EditorParagraphNode).runs[0].text).toBe("Body");
  });

  it("multi-section: activeSectionIndex selects the right section", () => {
    const s1Body = createEditorParagraph("S1 Body");
    const s2Body = createEditorParagraph("S2 Body");

    const state = makeSectionedState(
      [
        { id: "section:1", blocks: [s1Body] },
        { id: "section:2", blocks: [s2Body] },
      ],
      { activeSectionIndex: 1 },
    );

    const paragraphs = getParagraphs(state);
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].id).toBe(s2Body.id);
    expect(getActiveSectionIndex(state)).toBe(1);
    expect(getActiveZone(state)).toBe("main");
  });

  it("findParagraphLocation works across multiple sections", () => {
    const s1Body = createEditorParagraph("S1 Body");
    const s1Header = createEditorParagraph("S1 Header");
    const s2Body = createEditorParagraph("S2 Body");
    const s2Footer = createEditorParagraph("S2 Footer");

    const doc = {
      id: "doc:1",
      blocks: [],
      sections: [
        {
          id: "section:1",
          blocks: [s1Body],
          header: [s1Header],
          pageSettings: { width: 816, height: 1056, margins: defaultMargins },
        },
        {
          id: "section:2",
          blocks: [s2Body],
          footer: [s2Footer],
          pageSettings: { width: 816, height: 1056, margins: defaultMargins },
        },
      ],
    };

    expect(findParagraphLocation(doc, s1Body.id)).toEqual({ sectionIndex: 0, zone: "main", paragraphIndexInSection: 0 });
    expect(findParagraphLocation(doc, s1Header.id)).toEqual({ sectionIndex: 0, zone: "header", paragraphIndexInSection: 0 });
    expect(findParagraphLocation(doc, s2Body.id)).toEqual({ sectionIndex: 1, zone: "main", paragraphIndexInSection: 0 });
    expect(findParagraphLocation(doc, s2Footer.id)).toEqual({ sectionIndex: 1, zone: "footer", paragraphIndexInSection: 0 });
  });
});
