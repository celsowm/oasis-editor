import { describe, expect, it } from "vitest";
import type {
  EditorDocument,
  EditorPageSettings,
  EditorParagraphNode,
  EditorTextRun,
} from "@/core/model.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import {
  collectChangeBarParagraphIds,
  collectMarkupAuthors,
  isMarkupAuthorShown,
  isMarkupSectionShown,
  applyShowMarkup,
  isRevisionMarkupShown,
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
    expect(isMarkupSectionShown(s, "formatting")).toBe(true);
  });

  it("reflects the flags once toggled", () => {
    let s = state([paragraph("p1", [textRun("r1", "hi")])]);
    s = toggleShowMarkupSection(s, "insertions");
    expect(isMarkupSectionShown(s, "insertions")).toBe(false);
    s = toggleShowMarkupSection(s, "insertions");
    expect(isMarkupSectionShown(s, "insertions")).toBe(true);
    s = toggleShowMarkupSection(s, "formatting");
    expect(isMarkupSectionShown(s, "formatting")).toBe(false);
    expect(s.showMarkupFormatting).toBe(false);
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

  it("collects run-level formatting (property) revision authors", () => {
    const run = {
      id: "r1",
      kind: "text",
      text: "formatted",
      styles: {
        propertyRevision: {
          id: "fmt1",
          type: "property",
          author: "Formatting author",
          date: 1,
          previous: {},
        },
      },
    } as unknown as EditorTextRun;
    const s = state([paragraph("p1", [run])]);
    expect(collectMarkupAuthors(s)).toEqual(["Formatting author"]);
  });

  it("collects table/row/cell structural and property revision authors", () => {
    const table = {
      id: "t1",
      type: "table",
      rows: [
        {
          id: "row1",
          cells: [
            {
              id: "cell1",
              blocks: [paragraph("p1", [textRun("r1", "plain")])],
              style: {
                revision: {
                  id: "cell-ins",
                  type: "insert",
                  author: "Cell author",
                  date: 1,
                },
              },
            },
            {
              id: "cell2",
              blocks: [paragraph("p2", [textRun("r2", "plain")])],
              style: {
                propertyRevision: {
                  id: "cell-prop",
                  type: "property",
                  author: "Cell format author",
                  date: 2,
                  previous: {},
                },
              },
            },
          ],
          style: {
            propertyRevision: {
              id: "row-prop",
              type: "property",
              author: "Row author",
              date: 3,
              previous: {},
            },
          },
        },
      ],
      style: {
        revision: {
          id: "table-ins",
          type: "insert",
          author: "Table author",
          date: 4,
        },
      },
    };
    const doc = {
      id: "doc",
      sections: [{ id: "s1", blocks: [table], pageSettings: pageSettings() }],
    } as unknown as EditorDocument;
    const s = createEditorStateFromDocument(doc);
    expect(collectMarkupAuthors(s)).toEqual([
      "Cell author",
      "Cell format author",
      "Row author",
      "Table author",
    ]);
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

describe("isRevisionMarkupShown", () => {
  const base = (): ReturnType<typeof state> =>
    state([paragraph("p1", [textRun("r1", "hi")])]);

  it("shows both categories and every author by default", () => {
    const s = base();
    expect(isRevisionMarkupShown(s, "insert", "User")).toBe(true);
    expect(isRevisionMarkupShown(s, "delete", "Zoe")).toBe(true);
    expect(isRevisionMarkupShown(s, "property", "Zoe")).toBe(true);
  });

  it("honours category flags", () => {
    const s = applyShowMarkup(base(), { section: "insertions" });
    expect(isRevisionMarkupShown(s, "insert", "User")).toBe(false);
    expect(isRevisionMarkupShown(s, "delete", "User")).toBe(true);
  });

  it("honours the reviewer allow-list", () => {
    const s = setMarkupAuthors(base(), ["User"]);
    expect(isRevisionMarkupShown(s, "insert", "User")).toBe(true);
    expect(isRevisionMarkupShown(s, "delete", "Zoe")).toBe(false);
  });

  it("does not hide formatting revisions via the deletions category", () => {
    const s = applyShowMarkup(base(), { section: "deletions" });
    expect(isRevisionMarkupShown(s, "property", "User")).toBe(true);
  });

  it("hides only formatting revisions when the formatting category is off", () => {
    const s = applyShowMarkup(base(), { section: "formatting" });
    expect(isRevisionMarkupShown(s, "property", "User")).toBe(false);
    expect(isRevisionMarkupShown(s, "insert", "User")).toBe(true);
    expect(isRevisionMarkupShown(s, "delete", "User")).toBe(true);
    expect(isRevisionMarkupShown(s, "merge", "User")).toBe(true);
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
      formatting: true,
      allAuthors: true,
      visibleAuthors: [],
      knownAuthors: ["User", "Zoe"],
    });
  });

  it("toggles the formatting category through applyShowMarkup", () => {
    const before = marked();
    const next = applyShowMarkup(before, { section: "formatting" });
    expect(next.document).toBe(before.document);
    expect(markupOptionsSnapshot(next).formatting).toBe(false);
    expect(markupOptionsSnapshot(next).deletions).toBe(true);
    const restored = applyShowMarkup(next, { section: "formatting" });
    expect(markupOptionsSnapshot(restored).formatting).toBe(true);
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

describe("collectChangeBarParagraphIds", () => {
  const tracked = () =>
    state([
      paragraph("p-plain", [textRun("r0", "unchanged")]),
      paragraph("p-insert", [
        textRun("r1", "hi "),
        textRun("r2", "added", {
          id: "i1",
          type: "insert",
          author: "Reference author",
          date: 1,
        }),
      ]),
      paragraph("p-delete", [
        textRun("r3", "gone", {
          id: "d1",
          type: "delete",
          author: "User",
          date: 2,
        }),
      ]),
    ]);

  it("returns only paragraphs with insert/delete revisions", () => {
    const ids = collectChangeBarParagraphIds(tracked());
    expect([...ids].sort()).toEqual(["p-delete", "p-insert"]);
  });

  it("is empty for an untracked document", () => {
    expect(
      collectChangeBarParagraphIds(
        state([paragraph("p1", [textRun("r1", "plain")])]),
      ).size,
    ).toBe(0);
  });

  it("drops a hidden category's paragraph", () => {
    const hidden = applyShowMarkup(tracked(), { section: "insertions" });
    expect([...collectChangeBarParagraphIds(hidden)]).toEqual(["p-delete"]);
  });

  it("drops a hidden reviewer's paragraph", () => {
    const filtered = setMarkupAuthors(tracked(), ["User"]);
    expect([...collectChangeBarParagraphIds(filtered)]).toEqual(["p-delete"]);
  });

  it("drops every paragraph when no reviewer is visible", () => {
    const none = applyShowMarkup(tracked(), { allAuthors: false });
    expect(collectChangeBarParagraphIds(none).size).toBe(0);
  });

  it("includes a paragraph with only a formatting (property) revision", () => {
    const run = {
      id: "r1",
      kind: "text",
      text: "formatted",
      styles: {
        propertyRevision: {
          id: "fmt1",
          type: "property",
          author: "Formatting author",
          date: 1,
          previous: {},
        },
      },
    } as unknown as EditorTextRun;
    const s = state([
      paragraph("p-plain", [textRun("r0", "plain")]),
      paragraph("p-format", [run]),
    ]);
    expect([...collectChangeBarParagraphIds(s)]).toEqual(["p-format"]);
    // Reviewer filtering still applies to formatting revisions.
    const hidden = setMarkupAuthors(s, ["Someone else"]);
    expect(collectChangeBarParagraphIds(hidden).size).toBe(0);
    // The dedicated Formatting category removes the formatting paragraph's bar.
    const noFormatting = applyShowMarkup(s, { section: "formatting" });
    expect(collectChangeBarParagraphIds(noFormatting).size).toBe(0);
  });
});
