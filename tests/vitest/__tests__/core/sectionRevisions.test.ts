import { describe, expect, it } from "vitest";
import type { EditorDocument, EditorPageSettings } from "@/core/model.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import { collectSectionRevisions } from "@/core/commands/cellRevisions.js";
import {
  acceptRevision,
  collectAllRevisionIds,
  collectSelectedRevisionIds,
  rejectRevision,
} from "@/core/commands/history.js";

function pageSettings(
  overrides: Partial<EditorPageSettings> = {},
): EditorPageSettings {
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
    ...overrides,
  };
}

function paragraph(id: string, text: string): unknown {
  return {
    id,
    type: "paragraph",
    runs: [{ id: `${id}-r`, kind: "text", text }],
  };
}

/** The `previous` snapshot carried by a `w:sectPrChange` revision. */
function previous() {
  return {
    pageSettings: pageSettings({
      width: 1056,
      height: 816,
      orientation: "landscape",
    }),
    pageNumbering: { start: 7, format: "upperRoman" },
    verticalAlignment: "center",
    bidi: true,
    nextBreakType: "continuous",
  };
}

function sectionDoc(): EditorDocument {
  return {
    id: "doc",
    sections: [
      {
        id: "s1",
        pageSettings: pageSettings(),
        blocks: [
          paragraph("p1", "First section paragraph."),
          {
            id: "t1",
            type: "table",
            rows: [
              {
                id: "r1",
                cells: [
                  {
                    id: "c1",
                    blocks: [paragraph("pc1", "Nested cell text")],
                  },
                ],
              },
            ],
          },
          paragraph("p2", "End of first."),
        ],
        propertyRevision: {
          id: "sect-rev",
          type: "property",
          author: "Section author",
          date: 1234,
          previous: previous(),
        },
      },
      {
        id: "s2",
        pageSettings: pageSettings(),
        blocks: [paragraph("p3", "Second section.")],
        breakType: "nextPage",
      },
    ],
  } as unknown as EditorDocument;
}

const state = () => createEditorStateFromDocument(sectionDoc());

describe("collectSectionRevisions", () => {
  it("describes a section property revision with its body paragraphs", () => {
    const revisions = collectSectionRevisions(state());
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({
      id: "sect-rev",
      type: "property",
      author: "Section author",
      date: 1234,
      sectionId: "s1",
      sectionIndex: 0,
      paragraphIds: ["p1", "pc1", "p2"],
      snippet: "First section paragraph.Nested cell textEnd of first.",
    });
  });

  it("de-duplicates a repeated id across sections", () => {
    const doc = sectionDoc();
    (doc.sections![1] as unknown as Record<string, unknown>).propertyRevision =
      {
        id: "sect-rev",
        type: "property",
        author: "Another author",
        date: 9,
        previous: previous(),
      };
    expect(
      collectSectionRevisions(createEditorStateFromDocument(doc)),
    ).toHaveLength(1);
  });

  it("returns nothing when no section is revised", () => {
    const doc = sectionDoc();
    delete (doc.sections![0] as unknown as Record<string, unknown>)
      .propertyRevision;
    expect(collectSectionRevisions(createEditorStateFromDocument(doc))).toEqual(
      [],
    );
  });
});

describe("section revisions in the accept/reject model", () => {
  it("collectAllRevisionIds counts the section id (Accept All / Reject All)", () => {
    expect(collectAllRevisionIds(state()).has("sect-rev")).toBe(true);
  });

  it("collectSelectedRevisionIds offers the id for a touched section", () => {
    // The default selection sits on section 0's first body paragraph.
    expect(collectSelectedRevisionIds(state()).has("sect-rev")).toBe(true);
  });

  it("acceptRevision resolves the marker and keeps the new properties", () => {
    const accepted = acceptRevision(state(), "sect-rev");
    expect(collectAllRevisionIds(accepted).has("sect-rev")).toBe(false);
    const first = accepted.document.sections![0]!;
    expect(first.propertyRevision).toBeUndefined();
    expect(first.pageSettings.width).toBe(816);
    expect(first.pageSettings.orientation).toBe("portrait");
    // Accept does not touch the following section's breakType.
    expect(accepted.document.sections![1]!.breakType).toBe("nextPage");
  });

  it("rejectRevision restores previous properties and the next breakType", () => {
    const rejected = rejectRevision(state(), "sect-rev");
    expect(collectAllRevisionIds(rejected).has("sect-rev")).toBe(false);
    const first = rejected.document.sections![0]!;
    expect(first.propertyRevision).toBeUndefined();
    expect(first.pageSettings.width).toBe(1056);
    expect(first.pageSettings.orientation).toBe("landscape");
    expect(first.pageNumbering).toMatchObject({
      start: 7,
      format: "upperRoman",
    });
    expect(first.verticalAlignment).toBe("center");
    expect(first.bidi).toBe(true);
    // Reject is cross-section, mirroring resolveAllTrackedRevisions.
    expect(rejected.document.sections![1]!.breakType).toBe("continuous");
  });

  it("an unrelated revision id leaves the section untouched", () => {
    const before = state();
    const after = acceptRevision(before, "some-other-id");
    expect(after.document.sections![0]!.propertyRevision).toBeDefined();
    expect(collectAllRevisionIds(after).has("sect-rev")).toBe(true);
  });
});
