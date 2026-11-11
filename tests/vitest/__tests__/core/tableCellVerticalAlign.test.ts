import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import {
  setTableCellAlignment,
  setTableCellStyleValue,
} from "@/core/commands/table.js";
import {
  getDocumentSectionsCanonical,
  type EditorState,
  type EditorTableNode,
} from "@/core/model.js";

function selectTableCells(
  state: EditorState,
  firstParagraph: ReturnType<typeof createEditorParagraph>,
  lastParagraph: ReturnType<typeof createEditorParagraph>,
): EditorState {
  return {
    ...state,
    selection: {
      anchor: {
        paragraphId: firstParagraph.id,
        runId: firstParagraph.runs[0]!.id,
        offset: 0,
      },
      focus: {
        paragraphId: lastParagraph.id,
        runId: lastParagraph.runs[0]!.id,
        offset: 0,
      },
    },
  };
}

function firstTable(state: EditorState): EditorTableNode {
  const table = getDocumentSectionsCanonical(state.document)[0]!.blocks[0]!;
  expect(table.type).toBe("table");
  return table as EditorTableNode;
}

function twoCellFixture(): {
  state: EditorState;
  paragraphA: ReturnType<typeof createEditorParagraph>;
  paragraphB: ReturnType<typeof createEditorParagraph>;
} {
  const paragraphA = createEditorParagraph("a");
  const paragraphB = createEditorParagraph("b");
  const table = createEditorTable([
    createEditorTableRow([
      createEditorTableCell([paragraphA]),
      createEditorTableCell([paragraphB]),
    ]),
  ]);
  const state = createEditorStateFromDocument(createEditorDocument([table]));
  return { state, paragraphA, paragraphB };
}

describe("table cell vertical alignment and text direction", () => {
  it("sets verticalAlign on the selected cells and round-trips through accept", () => {
    const { state, paragraphA, paragraphB } = twoCellFixture();
    const selected = selectTableCells(state, paragraphA, paragraphB);
    const next = setTableCellStyleValue(selected, "verticalAlign", "middle");
    const table = firstTable(next);
    expect(table.rows[0]!.cells[0]!.style?.verticalAlign).toBe("middle");
    expect(table.rows[0]!.cells[1]!.style?.verticalAlign).toBe("middle");
  });

  it("sets horizontal and vertical alignment together on selected cells", () => {
    const { state, paragraphA, paragraphB } = twoCellFixture();
    const selected = selectTableCells(state, paragraphA, paragraphB);
    const next = setTableCellAlignment(selected, "center", "bottom");
    const table = firstTable(next);
    for (const cell of table.rows[0]!.cells) {
      expect(cell.style?.horizontalAlign).toBe("center");
      expect(cell.style?.verticalAlign).toBe("bottom");
    }
  });

  it("records both original alignment values in a single property revision", () => {
    const { state, paragraphA, paragraphB } = twoCellFixture();
    const original = setTableCellAlignment(
      selectTableCells(state, paragraphA, paragraphB),
      "right",
      "top",
    );
    const tracked = {
      ...original,
      trackChangesEnabled: true,
    };
    const next = setTableCellAlignment(tracked, "left", "middle");
    const cell = firstTable(next).rows[0]!.cells[0]!;
    expect(cell.style?.horizontalAlign).toBe("left");
    expect(cell.style?.verticalAlign).toBe("middle");
    expect(cell.style?.propertyRevision?.previous).toMatchObject({
      horizontalAlign: "right",
      verticalAlign: "top",
    });
  });

  it("sets textDirection on the selected cells", () => {
    const { state, paragraphA, paragraphB } = twoCellFixture();
    const selected = selectTableCells(state, paragraphA, paragraphB);
    const next = setTableCellStyleValue(selected, "textDirection", "tbRl");
    const table = firstTable(next);
    expect(table.rows[0]!.cells[0]!.style?.textDirection).toBe("tbRl");
    expect(table.rows[0]!.cells[1]!.style?.textDirection).toBe("tbRl");
  });

  it("records a property revision when tracking is enabled", () => {
    const { state, paragraphA, paragraphB } = twoCellFixture();
    const selected = {
      ...selectTableCells(state, paragraphA, paragraphB),
      trackChangesEnabled: true,
    };
    const next = setTableCellStyleValue(selected, "verticalAlign", "bottom");
    const table = firstTable(next);
    const cell = table.rows[0]!.cells[0]!;
    expect(cell.style?.verticalAlign).toBe("bottom");
    expect(cell.style?.propertyRevision).toBeDefined();
    expect(cell.style?.propertyRevision?.previous).not.toHaveProperty(
      "verticalAlign",
    );
  });

  it("clears verticalAlign when passed null", () => {
    const { state, paragraphA, paragraphB } = twoCellFixture();
    const selected = selectTableCells(state, paragraphA, paragraphB);
    const setNext = setTableCellStyleValue(selected, "verticalAlign", "top");
    const cleared = setTableCellStyleValue(setNext, "verticalAlign", null);
    const table = firstTable(cleared);
    expect(table.rows[0]!.cells[0]!.style?.verticalAlign).toBeUndefined();
  });
});
