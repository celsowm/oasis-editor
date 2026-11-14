import { describe, expect, it } from "vitest";
import type {
  EditorDocument,
  EditorPageSettings,
  EditorParagraphNode,
  EditorTextRun,
} from "@/core/model.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import {
  collectMarkupAuthors,
  isMarkupAuthorShown,
  isMarkupSectionShown,
  applyShowMarkup,
  markupOptionsSnapshot,
  setMarkupAuthors,
  toggleMarkupAuthor,
  toggleShowMarkupSection,
  visibleMarkupAuthors,
} from "@/core/commands/reviewMarkup.js";

function pageSettings(): EditorPageSettings {
  return {
    width: 816,
    height: 1056,
    orientation: "portrait",
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
  revision?: {
    id: string;
    type: "insert" | "delete";
    author: string;
    date: number;
  },
): EditorTextRun {
  return {
    id,
    kind: "text",
    text,
    ...(revision ? { revision } : {}),
  } as EditorTextRun;
}

function paragraph(id: string, runs: EditorTextRun[]): EditorParagraphNode {
  return { id, type: "paragraph", runs } as EditorParagraphNode;
}

function document(
  paragraphs: EditorParagraphNode[],
  comments?: EditorDocument["comments"],
): EditorDocument {
  return {
    id: "doc",
    sections: [{ id: "s1", blocks: paragraphs, pageSettings: pageSettings() }],
    ...(comments ? { comments } : {}),
  } as unknown as EditorDocument;
}

function state(
  paragraphs: EditorParagraphNode[],
  comments?: EditorDocument["comments"],
) {
  return createEditorStateFromDocument(document(paragraphs, comments));
}

describe("isMarkupSectionShown", () => {
  it("defaults every section on", () => {
    const s = state([paragraph("p1", [textRun("r1", "hi")])]);
    expect(isMarkupSectionShown(s, "insertions")).toBe(true);
    expect(isMarkupSectionShown(s, "deletions")).toBe(true);
    expect(isMarkupSectionShown(s, "comments")).toBe(true);
  });

  it("reflects the flags once toggled", () => {
    let s = state([paragraph("p1", [textRun("r1", "hi")])]);
    s = toggleShowMarkupSection(s, "insertions");
    expect(isMarkupSectionShown(s, "insertions")).toBe(false);
    s = toggleShowMarkupSection(s, "insertions");
    expect(isMarkupSectionShown(s, "insertions")).toBe(true);
  });
});

describe("isMarkupAuthorShown", () => {
  it("shows every author until an allow-list exists", () => {
    const s = state([paragraph("p1", [textRun("r1", "hi")])]);
    expect(isMarkupAuthorShown(s, "User")).toBe(true);
    expect(isMarkupAuthorShown(s, "Zoe")).toBe(true);
  });

  it("restricts to the allow-list", () => {
    let s = state([paragraph("p1", [textRun("r1", "hi")])]);
    s = setMarkupAuthors(s, ["User"]);
    expect(isMarkupAuthorShown(s, "User")).toBe(true);
    expect(isMarkupAuthorShown(s, "Zoe")).toBe(false);
  });
});

describe("collectMarkupAuthors", () => {
  it("collects revision and comment authors, sorted and unique", () => {
    const s = state(
      [
        paragraph("p1", [
          textRun("r1", "a", {
            id: "rev1",
            type: "insert",
            author: "Zoe",
            date: 1,
          }),
          textRun("r2", "b", {
            id: "rev2",
            type: "delete",
            author: "User",
            date: 2,
          }),
          textRun("r3", "c", {
            id: "rev3",
            type: "insert",
            author: "User",
            date: 3,
          }),
        ]),
      ],
      {
        order: ["c1"],
        items: {
          c1: { id: "c1", author: "Anna", text: "note" },
        },
      } as unknown as EditorDocument["comments"],
    );
    expect(collectMarkupAuthors(s)).toEqual(["Anna", "User", "Zoe"]);
  });

  it("returns an empty list when nothing is marked", () => {
    const s = state([paragraph("p1", [textRun("r1", "hi")])]);
    expect(collectMarkupAuthors(s)).toEqual([]);
  });
});

describe("toggleMarkupAuthor", () => {
  const known = ["User", "Zoe"];
  const emptyDoc = (): ReturnType<typeof state> =>
    state([paragraph("p1", [textRun("r1", "hi")])]);

  it("isolates to the other author on the first toggle", () => {
    const next = toggleMarkupAuthor(emptyDoc(), "User", known);
    expect(next.markupAuthors).toEqual(["Zoe"]);
  });

  it("collapses back to all authors when every author is visible again", () => {
    let s = toggleMarkupAuthor(emptyDoc(), "User", known);
    s = toggleMarkupAuthor(s, "User", known);
    expect(s.markupAuthors).toBeUndefined();
    expect(isMarkupAuthorShown(s, "User")).toBe(true);
    expect(isMarkupAuthorShown(s, "Zoe")).toBe(true);
  });

  it("keeps an explicit empty list when the last author is unchecked", () => {
    let s = toggleMarkupAuthor(emptyDoc(), "Zoe", known);
    expect(s.markupAuthors).toEqual(["User"]);
    s = toggleMarkupAuthor(s, "User", known);
    expect(s.markupAuthors).toEqual([]);
    expect(isMarkupAuthorShown(s, "User")).toBe(false);
    expect(isMarkupAuthorShown(s, "Zoe")).toBe(false);
  });

  it("adds an author back from the empty list", () => {
    const none = setMarkupAuthors(emptyDoc(), []);
    const s = toggleMarkupAuthor(none, "Zoe", known);
    expect(s.markupAuthors).toEqual(["Zoe"]);
  });

  it("compares the visible set by value, not just length", () => {
    // ["Ghost"] is one author; adding "Zoe" produces a two-author set whose
    // length equals the known set but whose members differ. A length-only
    // check would wrongly collapse this back to "all authors".
    const s = toggleMarkupAuthor(
      setMarkupAuthors(emptyDoc(), ["Ghost"]),
      "Zoe",
      known,
    );
    expect(s.markupAuthors).toEqual(["Ghost", "Zoe"]);
  });

  it("collapses an explicit full list once it is toggled back to all", () => {
    const full = setMarkupAuthors(emptyDoc(), ["User", "Zoe"]);
    let s = toggleMarkupAuthor(full, "Zoe", known);
    expect(s.markupAuthors).toEqual(["User"]);
    s = toggleMarkupAuthor(s, "Zoe", known);
    expect(s.markupAuthors).toBeUndefined();
  });

  it("sorts the resulting allow-list for a stable menu", () => {
    const s = toggleMarkupAuthor(emptyDoc(), "User", ["Zoe", "User"]);
    expect(s.markupAuthors).toEqual(["Zoe"]);
  });
});

describe("setMarkupAuthors", () => {
  const emptyDoc = (): ReturnType<typeof state> =>
    state([paragraph("p1", [textRun("r1", "hi")])]);

  it("is a no-op when the explicit list is unchanged", () => {
    const s = setMarkupAuthors(emptyDoc(), ["User"]);
    expect(setMarkupAuthors(s, ["User"])).toBe(s);
    const pristine = emptyDoc();
    expect(setMarkupAuthors(pristine, undefined)).toBe(pristine);
  });

  it("restores all authors with undefined", () => {
    const s = setMarkupAuthors(
      setMarkupAuthors(emptyDoc(), ["User"]),
      undefined,
    );
    expect(s.markupAuthors).toBeUndefined();
    expect(isMarkupAuthorShown(s, "Zoe")).toBe(true);
  });
});

describe("visibleMarkupAuthors", () => {
  it("reports null for all authors and the explicit list otherwise", () => {
    const s = state([paragraph("p1", [textRun("r1", "hi")])]);
    expect(visibleMarkupAuthors(s)).toBeNull();
    expect(visibleMarkupAuthors(setMarkupAuthors(s, ["User"]))).toEqual([
      "User",
    ]);
  });
});

describe("markupOptionsSnapshot / applyShowMarkup", () => {
  const marked = (): ReturnType<typeof state> =>
    state([
      paragraph("p1", [
        textRun("r1", "a", {
          id: "rev1",
          type: "insert",
          author: "User",
          date: 1,
        }),
        textRun("r2", "b", {
          id: "rev2",
          type: "delete",
          author: "Zoe",
          date: 2,
        }),
      ]),
    ]);

  it("snapshots all-on defaults and the collected authors", () => {
    const snapshot = markupOptionsSnapshot(marked());
    expect(snapshot).toEqual({
      insertions: true,
      deletions: true,
      comments: true,
      allAuthors: true,
      visibleAuthors: [],
      knownAuthors: ["User", "Zoe"],
    });
  });

  it("toggles a section without touching revision data", () => {
    const before = marked();
    const next = applyShowMarkup(before, { section: "deletions" });
    expect(next.document).toBe(before.document);
    expect(markupOptionsSnapshot(next).deletions).toBe(false);
    expect(markupOptionsSnapshot(next).insertions).toBe(true);
  });

  it("isolates a reviewer and restores all reviewers", () => {
    const next = applyShowMarkup(marked(), { author: "User" });
    expect(markupOptionsSnapshot(next)).toMatchObject({
      allAuthors: false,
      visibleAuthors: ["Zoe"],
    });
    const all = applyShowMarkup(next, { allAuthors: true });
    expect(markupOptionsSnapshot(all).allAuthors).toBe(true);
  });

  it("hides every reviewer with allAuthors:false", () => {
    const next = applyShowMarkup(marked(), { allAuthors: false });
    const snapshot = markupOptionsSnapshot(next);
    expect(snapshot.allAuthors).toBe(false);
    expect(snapshot.visibleAuthors).toEqual([]);
    expect(isMarkupAuthorShown(next, "User")).toBe(false);
    expect(isMarkupAuthorShown(next, "Zoe")).toBe(false);
  });

  it("ignores an empty payload", () => {
    const before = marked();
    expect(applyShowMarkup(before, {})).toBe(before);
  });
});
