import { describe, expect, it } from "vitest";
import type {
  EditorBlockNode,
  EditorDocument,
  EditorPageSettings,
  EditorParagraphNode,
  EditorTextRun,
} from "@/core/model.js";
import {
  acceptAllRevisions,
  collectAllRevisionIds,
  hasRevisionsInDocument,
  rejectAllRevisions,
} from "@/core/commands/history.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";

function pageSettings(width = 816, height = 1056): EditorPageSettings {
  return {
    width,
    height,
    orientation: width > height ? "landscape" : "portrait",
    margins: {
      top: 96,
      right: 96,
      bottom: 96,
      left: 96,
      header: 48,
      footer: 48,
      gutter: 0,
    },
  };
}

function textRun(
  id: string,
  text: string,
  extra: Partial<EditorTextRun> = {},
): EditorTextRun {
  return { id, kind: "text", text, ...extra } as EditorTextRun;
}

function paragraph(
  id: string,
  runs: EditorTextRun[],
  extra: Partial<EditorParagraphNode> = {},
): EditorParagraphNode {
  return { id, type: "paragraph", runs, ...extra };
}

function documentWithBlocks(blocks: EditorBlockNode[]): EditorDocument {
  return {
    id: "doc",
    sections: [{ id: "s1", blocks, pageSettings: pageSettings() }],
  };
}

function textOf(paragraph: EditorParagraphNode): string {
  return paragraph.runs.map((run) => run.text).join("");
}

describe("whole-document accept/reject all revisions", () => {
  it("collectAllRevisionIds finds run insertions and deletions across sections", () => {
    const p1 = paragraph("p1", [
      textRun("a", "A", {
        revision: { id: "ins", type: "insert", author: "A", date: 1 },
      }),
      textRun("b", "B", {
        revision: { id: "del", type: "delete", author: "A", date: 2 },
      }),
    ]);
    const p2 = paragraph("p2", [
      textRun("c", "C", {
        revision: { id: "ins2", type: "insert", author: "A", date: 3 },
      }),
    ]);
    const document: EditorDocument = {
      id: "doc",
      sections: [
        { id: "s1", blocks: [p1], pageSettings: pageSettings() },
        { id: "s2", blocks: [p2], pageSettings: pageSettings() },
      ],
    };
    const state = createEditorStateFromDocument(document);

    const ids = collectAllRevisionIds(state);
    expect(ids.has("ins")).toBe(true);
    expect(ids.has("del")).toBe(true);
    expect(ids.has("ins2")).toBe(true);
    expect(hasRevisionsInDocument(state)).toBe(true);
  });

  it("acceptAllRevisions keeps insertions and drops deletions across the whole document", () => {
    const p1 = paragraph("p1", [
      textRun("a", "A", { revision: { id: "ins", type: "insert", author: "A", date: 1 } }),
      textRun("b", "B", { revision: { id: "del", type: "delete", author: "A", date: 2 } }),
      textRun("c", "C", { revision: { id: "ins2", type: "insert", author: "A", date: 3 } }),
    ]);
    const p2 = paragraph("p2", [
      textRun("d", "D", { revision: { id: "del2", type: "delete", author: "A", date: 4 } }),
    ]);
    const document: EditorDocument = {
      id: "doc",
      sections: [
        { id: "s1", blocks: [p1], pageSettings: pageSettings() },
        { id: "s2", blocks: [p2], pageSettings: pageSettings() },
      ],
    };
    const state = createEditorStateFromDocument(document);

    const next = acceptAllRevisions(state);
    const sections = next.document.sections!;
    const [resultP1, resultP2] = [
      sections[0]!.blocks[0] as EditorParagraphNode,
      sections[1]!.blocks[0] as EditorParagraphNode,
    ];
    expect(textOf(resultP1)).toBe("AC");
    expect(resultP1.runs.every((run) => !run.revision)).toBe(true);
    expect(textOf(resultP2)).toBe("");
    expect(resultP2.runs.every((run) => !run.revision)).toBe(true);
    expect(hasRevisionsInDocument(next)).toBe(false);
  });

  it("rejectAllRevisions drops insertions and restores deletions across the whole document", () => {
    const p1 = paragraph("p1", [
      textRun("a", "B", { revision: { id: "ins", type: "insert", author: "A", date: 1 } }),
      textRun("b", "A", { revision: { id: "del", type: "delete", author: "A", date: 2 } }),
    ]);
    const state = createEditorStateFromDocument(documentWithBlocks([p1]));

    const next = rejectAllRevisions(state);
    const result = next.document.sections![0]!.blocks[0] as EditorParagraphNode;
    expect(textOf(result)).toBe("A");
    expect(result.runs.every((run) => !run.revision)).toBe(true);
    expect(hasRevisionsInDocument(next)).toBe(false);
  });

  it("collects revisions inside table cells and header stories", () => {
    const cellParagraph = paragraph("cellp", [
      textRun("x", "X", { revision: { id: "cell", type: "insert", author: "A", date: 1 } }),
    ]);
    const table: EditorBlockNode = {
      id: "t1",
      type: "table",
      rows: [
        {
          id: "row1",
          cells: [{ id: "cell1", blocks: [cellParagraph] }],
        },
      ],
    };
    const headerParagraph = paragraph("hp", [
      textRun("h", "H", { revision: { id: "hdr", type: "insert", author: "A", date: 2 } }),
    ]);
    const document: EditorDocument = {
      id: "doc",
      sections: [
        {
          id: "s1",
          blocks: [table],
          header: [headerParagraph],
          pageSettings: pageSettings(),
        },
      ],
    };
    const state = createEditorStateFromDocument(document);

    const ids = collectAllRevisionIds(state);
    expect(ids.has("cell")).toBe(true);
    expect(ids.has("hdr")).toBe(true);

    const next = acceptAllRevisions(state);
    const section = next.document.sections![0]!;
    const resultHeader = section.header![0] as EditorParagraphNode;
    expect(textOf(resultHeader)).toBe("H");
    expect(resultHeader.runs.every((run) => !run.revision)).toBe(true);
  });

  it("collects section and table property revisions", () => {
    const sectionRevision = {
      id: "secrev",
      type: "property" as const,
      author: "A",
      date: 1,
      previous: { pageSettings: pageSettings() },
    };
    const tableParagraph = paragraph("p1", [textRun("a", "A")]);
    const table: EditorBlockNode = {
      id: "t1",
      type: "table",
      style: {
        revision: { id: "tablerev", type: "property" as const, author: "A", date: 2, previous: {} },
      },
      rows: [
        { id: "row1", cells: [{ id: "cell1", blocks: [tableParagraph] }] },
      ],
    };
    const document: EditorDocument = {
      id: "doc",
      sections: [
        {
          id: "s1",
          blocks: [table],
          propertyRevision: sectionRevision,
          pageSettings: pageSettings(),
        },
      ],
    };
    const state = createEditorStateFromDocument(document);

    const ids = collectAllRevisionIds(state);
    expect(ids.has("secrev")).toBe(true);
    expect(ids.has("tablerev")).toBe(true);
  });

  it("preserves selection by paragraph offsets when accepting whole-document revisions", () => {
    const p1 = paragraph("p1", [
      textRun("a", "AAA", { revision: { id: "del", type: "delete", author: "A", date: 1 } }),
      textRun("b", "BBB"),
    ]);
    const state = createEditorStateFromDocument(documentWithBlocks([p1]));
    const start = { ...state, selection: {
      anchor: paragraphOffsetToPosition(p1, 1),
      focus: paragraphOffsetToPosition(p1, 4),
    } as const };

    const next = acceptAllRevisions(start);
    const resultParagraph = getParagraphs(next)[0]!;
    expect(textOf(resultParagraph)).toBe("BBB");
    // caret clamps to within the resolved paragraph
    expect(next.selection.anchor.paragraphId).toBe("p1");
    expect(next.selection.focus.paragraphId).toBe("p1");

    // sanity: whole document no longer has revisions afterwards
    expect(hasRevisionsInDocument(next)).toBe(false);
  });

  it("is a no-op when the document has no tracked revisions", () => {
    const p1 = paragraph("p1", [textRun("a", "hello")]);
    const state = createEditorStateFromDocument(documentWithBlocks([p1]));
    expect(hasRevisionsInDocument(state)).toBe(false);
    expect(acceptAllRevisions(state)).toBe(state);
    expect(rejectAllRevisions(state)).toBe(state);
  });
});
