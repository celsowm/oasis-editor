import { describe, expect, it } from "vitest";
import type { EditorDocument, EditorPageSettings } from "@/core/model.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import { collectRevisionDescriptors } from "@/core/commands/revisionDescriptors.js";

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

const insert = (id: string) => ({
  id,
  type: "insert" as const,
  author: "Insert author",
  date: 100,
});
const del = (id: string) => ({
  id,
  type: "delete" as const,
  author: "Delete author",
  date: 200,
});

function doc(): EditorDocument {
  return {
    id: "doc",
    sections: [
      {
        id: "s1",
        pageSettings: pageSettings(),
        blocks: [
          {
            id: "p1",
            type: "paragraph",
            runs: [
              {
                id: "r1",
                kind: "text",
                text: "Inserted ",
                revision: insert("ins-1"),
              },
              {
                id: "r2",
                kind: "text",
                text: "deleted",
                revision: del("del-1"),
              },
              { id: "r3", kind: "text", text: "plain " },
              {
                id: "r4",
                kind: "text",
                text: "formatted",
                styles: {
                  propertyRevision: {
                    id: "prop-1",
                    type: "property",
                    author: "Format author",
                    date: 300,
                    previous: { bold: false },
                  },
                },
              },
            ],
          },
          {
            id: "t1",
            type: "table",
            style: {
              revision: {
                id: "table-prop",
                type: "property",
                author: "Table author",
                date: 400,
                previous: {},
              },
            },
            gridRevision: {
              id: "grid-rev",
              type: "grid",
              author: "Grid author",
              date: 410,
              previous: [],
            },
            rows: [
              {
                id: "row1",
                cells: [
                  {
                    id: "c1",
                    blocks: [
                      {
                        id: "pc1",
                        type: "paragraph",
                        runs: [{ id: "rc1", kind: "text", text: "Cell text" }],
                      },
                    ],
                    style: {
                      revision: {
                        id: "cell-ins",
                        type: "insert",
                        author: "Cell author",
                        date: 420,
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
        propertyRevision: {
          id: "sect-rev",
          type: "property",
          author: "Section author",
          date: 500,
          previous: { pageSettings: pageSettings() },
        },
      },
    ],
  } as unknown as EditorDocument;
}

const state = () => createEditorStateFromDocument(doc());
const byId = () =>
  new Map(collectRevisionDescriptors(state()).map((d) => [d.id, d]));

describe("collectRevisionDescriptors", () => {
  it("covers every revision kind with metadata", () => {
    const ids = collectRevisionDescriptors(state()).map((d) => d.id);
    expect(ids).toEqual([
      "ins-1",
      "del-1",
      "prop-1",
      "table-prop",
      "grid-rev",
      "cell-ins",
      "sect-rev",
    ]);
  });

  it("describes run-level insert/delete/formatting revisions", () => {
    const map = byId();
    expect(map.get("ins-1")).toMatchObject({
      type: "insert",
      author: "Insert author",
      date: 100,
      scope: "run",
      paragraphIds: ["p1"],
      snippet: "Inserted",
    });
    expect(map.get("del-1")).toMatchObject({
      type: "delete",
      author: "Delete author",
      snippet: "deleted",
    });
    expect(map.get("prop-1")).toMatchObject({
      type: "property",
      author: "Format author",
      snippet: "formatted",
    });
  });

  it("describes table/row/cell/grid descriptors with their paragraph ids", () => {
    const map = byId();
    expect(map.get("table-prop")).toMatchObject({
      type: "property",
      author: "Table author",
      scope: "table",
    });
    expect(map.get("grid-rev")).toMatchObject({
      type: "grid",
      author: "Grid author",
      scope: "table",
    });
    expect(map.get("cell-ins")).toMatchObject({
      type: "insert",
      scope: "cell",
      paragraphIds: ["pc1"],
      snippet: "Cell text",
    });
  });

  it("describes section-level revisions", () => {
    expect(byId().get("sect-rev")).toMatchObject({
      type: "property",
      author: "Section author",
      scope: "section",
      paragraphIds: ["p1", "pc1"],
    });
  });

  it("de-duplicates an id shared across paragraphs and scopes", () => {
    const d = doc();
    (d.sections![0]!.blocks[0] as unknown as { runs: unknown[] }).runs.push({
      id: "r5",
      kind: "text",
      text: " more",
      revision: insert("ins-1"),
    });
    const found = collectRevisionDescriptors(
      createEditorStateFromDocument(d),
    ).filter((entry) => entry.id === "ins-1");
    expect(found).toHaveLength(1);
    expect(found[0]!.snippet).toBe("Inserted  more");
    expect(found[0]!.paragraphIds).toEqual(["p1"]);
  });

  it("truncates long snippets", () => {
    const d = doc();
    (d.sections![0]!.blocks[0] as unknown as { runs: unknown[] }).runs[0] = {
      id: "r1",
      kind: "text",
      text: "x".repeat(140),
      revision: insert("ins-1"),
    };
    const snippet = collectRevisionDescriptors(
      createEditorStateFromDocument(d),
    ).find((entry) => entry.id === "ins-1")!.snippet;
    expect(snippet).toHaveLength(94);
    expect(snippet.endsWith("…")).toBe(true);
  });

  it("returns nothing for a plain document", () => {
    const plain = {
      id: "doc",
      sections: [
        {
          id: "s1",
          pageSettings: pageSettings(),
          blocks: [
            {
              id: "p1",
              type: "paragraph",
              runs: [{ id: "r1", kind: "text", text: "Plain" }],
            },
          ],
        },
      ],
    } as unknown as EditorDocument;
    expect(
      collectRevisionDescriptors(createEditorStateFromDocument(plain)),
    ).toEqual([]);
  });
});
