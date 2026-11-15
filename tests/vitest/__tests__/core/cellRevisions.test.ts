import { describe, expect, it } from "vitest";
import type {
  EditorDocument,
  EditorPageSettings,
  EditorTableCellNode,
} from "@/core/model.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import {
  collectCellRevisions,
  collectTableRevisions,
} from "@/core/commands/cellRevisions.js";
import {
  applyShowMarkup,
  collectChangeBarParagraphIds,
  setMarkupAuthors,
} from "@/core/commands/reviewMarkup.js";
import {
  collectNavigableRevisions,
  focusRevisionById,
} from "@/core/commands/reviewNavigation.js";
import {
  acceptRevisionsInSelection,
  collectAllRevisionIds,
  rejectRevisionsInSelection,
} from "@/core/commands/history.js";

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

function cell(
  id: string,
  paragraphId: string,
  text: string,
  style?: EditorTableCellNode["style"],
  extraBlocks: unknown[] = [],
): EditorTableCellNode {
  return {
    id,
    blocks: [
      {
        id: paragraphId,
        type: "paragraph",
        runs: [{ id: `${paragraphId}-r`, kind: "text", text }],
      },
      ...extraBlocks,
    ],
    ...(style ? { style } : {}),
  } as unknown as EditorTableCellNode;
}

interface TableExtras {
  cell2Style?: EditorTableCellNode["style"];
  cell3Style?: EditorTableCellNode["style"];
  row1Style?: unknown;
  tableStyle?: unknown;
  gridRevision?: unknown;
}

function tableDocument(extras: TableExtras = {}): EditorDocument {
  return {
    id: "doc",
    sections: [
      {
        id: "s1",
        pageSettings: pageSettings(),
        blocks: [
          {
            id: "t1",
            type: "table",
            ...(extras.tableStyle ? { style: extras.tableStyle } : {}),
            ...(extras.gridRevision
              ? { gridRevision: extras.gridRevision }
              : {}),
            rows: [
              {
                id: "row0",
                cells: [cell("c0", "p0", "Item"), cell("c1", "p1", "Qty")],
              },
              {
                id: "row1",
                ...(extras.row1Style ? { style: extras.row1Style } : {}),
                cells: [
                  cell("c2", "p2", "Alpha", extras.cell2Style),
                  cell("c3", "p3", "2", extras.cell3Style),
                ],
              },
            ],
          },
          {
            id: "p4",
            type: "paragraph",
            runs: [{ id: "p4-r", kind: "text", text: "After the table." }],
          },
        ],
      },
    ],
  } as unknown as EditorDocument;
}

const insertStyle = (): EditorTableCellNode["style"] =>
  ({
    revision: {
      id: "cell-ins",
      type: "insert",
      author: "Table author",
      date: 1000,
    },
  }) as EditorTableCellNode["style"];

const propertyStyle = (): EditorTableCellNode["style"] =>
  ({
    propertyRevision: {
      id: "cell-prop",
      type: "property",
      author: "Table author",
      date: 2000,
      previous: {},
    },
  }) as EditorTableCellNode["style"];

const state = () =>
  createEditorStateFromDocument(
    tableDocument({ cell2Style: insertStyle(), cell3Style: propertyStyle() }),
  );

describe("collectCellRevisions", () => {
  it("describes cell-level structural and property revisions", () => {
    const cells = collectCellRevisions(state());
    expect(cells.map((c) => c.id)).toEqual(["cell-ins", "cell-prop"]);
    expect(cells.map((c) => c.type)).toEqual(["insert", "property"]);
    expect(cells.map((c) => c.author)).toEqual([
      "Table author",
      "Table author",
    ]);
    expect(cells.map((c) => c.date)).toEqual([1000, 2000]);
    expect(cells.map((c) => c.paragraphIds)).toEqual([["p2"], ["p3"]]);
    expect(cells.map((c) => c.snippet)).toEqual(["Alpha", "2"]);
  });

  it("returns nothing for a table without cell revisions", () => {
    expect(
      collectCellRevisions(createEditorStateFromDocument(tableDocument())),
    ).toEqual([]);
  });

  it("collects nested-table paragraph ids and text", () => {
    const nested = {
      id: "nested-table",
      type: "table",
      rows: [
        {
          id: "nrow",
          cells: [cell("nc", "p-nested", "Nested")],
        },
      ],
    };
    const doc = tableDocument({ cell2Style: insertStyle() });
    const table = doc.sections![0]!.blocks[0] as unknown as {
      rows: { cells: EditorTableCellNode[] }[];
    };
    table.rows[1]!.cells[0]!.blocks.push(nested as never);
    const cells = collectCellRevisions(createEditorStateFromDocument(doc));
    expect(cells[0]!.paragraphIds).toEqual(["p2", "p-nested"]);
    expect(cells[0]!.snippet).toBe("AlphaNested");
  });

  it("emits both descriptors when a cell has structural and property changes", () => {
    const both = {
      ...insertStyle(),
      ...propertyStyle(),
    } as EditorTableCellNode["style"];
    const cells = collectCellRevisions(
      createEditorStateFromDocument(tableDocument({ cell2Style: both })),
    );
    expect(cells.map((c) => c.id)).toEqual(["cell-ins", "cell-prop"]);
    expect(cells.every((c) => c.paragraphIds[0] === "p2")).toBe(true);
  });
});

describe("cell revisions in Simple Markup change bars", () => {
  it("bars every paragraph inside a revised cell", () => {
    expect([...collectChangeBarParagraphIds(state())].sort()).toEqual([
      "p2",
      "p3",
    ]);
  });

  it("drops the insert cell bar when Insertions is hidden", () => {
    const hidden = applyShowMarkup(state(), { section: "insertions" });
    expect([...collectChangeBarParagraphIds(hidden)]).toEqual(["p3"]);
  });

  it("drops the property cell bar when Formatting is hidden", () => {
    const hidden = applyShowMarkup(state(), { section: "formatting" });
    expect([...collectChangeBarParagraphIds(hidden)]).toEqual(["p2"]);
  });

  it("drops both cell bars when the reviewer is hidden", () => {
    const hidden = setMarkupAuthors(state(), ["Someone else"]);
    expect(collectChangeBarParagraphIds(hidden).size).toBe(0);
  });
});

describe("cell revisions in navigation and the Reviewing Pane", () => {
  it("lists cell ids in document order", () => {
    expect(collectNavigableRevisions(state()).map((r) => r.id)).toEqual([
      "cell-ins",
      "cell-prop",
    ]);
  });

  it("focuses a cell revision onto its first paragraph", () => {
    const focused = focusRevisionById(state(), "cell-ins");
    expect(focused).not.toBe(state());
    expect(focused.selection.anchor.paragraphId).toBe("p2");
  });

  it("per-row Accept / Reject resolve the cell marker", () => {
    const initial = state();
    expect([...collectAllRevisionIds(initial)].sort()).toEqual([
      "cell-ins",
      "cell-prop",
    ]);

    const accepted = acceptRevisionsInSelection(
      focusRevisionById(initial, "cell-ins"),
    );
    expect(collectAllRevisionIds(accepted).has("cell-ins")).toBe(false);
    expect(collectAllRevisionIds(accepted).has("cell-prop")).toBe(true);

    const rejected = rejectRevisionsInSelection(
      focusRevisionById(initial, "cell-prop"),
    );
    expect(collectAllRevisionIds(rejected).has("cell-prop")).toBe(false);
    expect(collectAllRevisionIds(rejected).has("cell-ins")).toBe(true);
  });
});

describe("row/table/grid-level revisions", () => {
  const rowStructural = {
    revision: {
      id: "row-ins",
      type: "insert",
      author: "Row author",
      date: 3000,
    },
  };
  const rowProperty = {
    propertyRevision: {
      id: "row-prop",
      type: "property",
      author: "Row author",
      date: 3100,
      previous: {},
    },
  };
  const tableProperty = {
    revision: {
      id: "table-prop",
      type: "property",
      author: "Table author",
      date: 3200,
      previous: {},
    },
  };
  const grid = {
    id: "grid-rev",
    type: "grid",
    author: "Table author",
    date: 3300,
    previous: [],
  };

  const fullState = () =>
    createEditorStateFromDocument(
      tableDocument({
        cell2Style: insertStyle(),
        row1Style: { ...rowStructural, ...rowProperty },
        tableStyle: tableProperty,
        gridRevision: grid,
      }),
    );

  it("describes row, table and grid revisions with their scopes", () => {
    const revisions = collectTableRevisions(fullState());
    expect(revisions.map((entry) => entry.id)).toEqual([
      "table-prop",
      "grid-rev",
      "row-ins",
      "row-prop",
      "cell-ins",
    ]);
    const byId = new Map(revisions.map((entry) => [entry.id, entry]));
    expect(byId.get("table-prop")).toMatchObject({
      scope: "table",
      type: "property",
      tableId: "t1",
      rowIndex: undefined,
      paragraphIds: ["p0", "p1", "p2", "p3"],
      snippet: "ItemQtyAlpha2",
    });
    expect(byId.get("grid-rev")).toMatchObject({
      scope: "table",
      type: "grid",
    });
    expect(byId.get("row-ins")).toMatchObject({
      scope: "row",
      type: "insert",
      rowIndex: 1,
      paragraphIds: ["p2", "p3"],
      snippet: "Alpha2",
    });
    expect(byId.get("row-prop")).toMatchObject({
      scope: "row",
      type: "property",
    });
    expect(byId.get("cell-ins")).toMatchObject({ scope: "cell" });
  });

  it("collectCellRevisions stays limited to cell scope", () => {
    expect(collectCellRevisions(fullState()).map((entry) => entry.id)).toEqual([
      "cell-ins",
    ]);
  });

  it("change bars cover all paragraphs under a row/table scope", () => {
    const ids = collectChangeBarParagraphIds(fullState());
    expect([...ids].sort()).toEqual(["p0", "p1", "p2", "p3"]);
    // Grid has no category, so a reviewer filter is what clears every bar.
    const hidden = setMarkupAuthors(fullState(), ["Someone else"]);
    expect(collectChangeBarParagraphIds(hidden).size).toBe(0);
  });

  it("navigation lists row/table/grid ids in document order", () => {
    expect(
      collectNavigableRevisions(fullState()).map((range) => range.id),
    ).toEqual(["table-prop", "grid-rev", "row-ins", "row-prop", "cell-ins"]);
  });

  it("focuses a row revision onto its first paragraph", () => {
    const focused = focusRevisionById(fullState(), "row-ins");
    expect(focused).not.toBe(fullState());
    expect(focused.selection.anchor.paragraphId).toBe("p2");
  });

  it("per-row Accept resolves a row-level marker", () => {
    const initial = fullState();
    expect(collectAllRevisionIds(initial).has("row-ins")).toBe(true);
    const accepted = acceptRevisionsInSelection(
      focusRevisionById(initial, "row-ins"),
    );
    expect(collectAllRevisionIds(accepted).has("row-ins")).toBe(false);
  });
});
