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
  canSetTableCellMargins,
  setActiveTableCellMargins,
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

function collapsedCaretIn(
  state: EditorState,
  paragraph: ReturnType<typeof createEditorParagraph>,
): EditorState {
  return {
    ...state,
    selection: {
      anchor: { paragraphId: paragraph.id, runId: "", offset: 0 },
      focus: { paragraphId: paragraph.id, runId: "", offset: 0 },
    },
  };
}

describe("table cell margins", () => {
  it("sets all four cell margins on the selected cells", () => {
    const { state, paragraphA, paragraphB } = twoCellFixture();
    const selected = selectTableCells(state, paragraphA, paragraphB);
    const next = setActiveTableCellMargins(selected, {
      top: 10,
      right: 12,
      bottom: 8,
      left: 14,
    });
    const table = firstTable(next);
    const style0 = table.rows[0]!.cells[0]!.style!;
    const style1 = table.rows[0]!.cells[1]!.style!;
    expect(style0.paddingTop).toBe(10);
    expect(style0.paddingRight).toBe(12);
    expect(style0.paddingBottom).toBe(8);
    expect(style0.paddingLeft).toBe(14);
    expect(style1.paddingTop).toBe(10);
    expect(style1.paddingRight).toBe(12);
    expect(style1.paddingBottom).toBe(8);
    expect(style1.paddingLeft).toBe(14);
  });

  it("updates only the provided edges", () => {
    const { state, paragraphA, paragraphB } = twoCellFixture();
    const selected = selectTableCells(state, paragraphA, paragraphB);
    const next = setActiveTableCellMargins(selected, { top: 20 });
    const style = firstTable(next).rows[0]!.cells[0]!.style!;
    expect(style.paddingTop).toBe(20);
    expect(style.paddingRight).toBeUndefined();
    expect(style.paddingBottom).toBeUndefined();
    expect(style.paddingLeft).toBeUndefined();
  });

  it("is a no-op when no edge is provided", () => {
    const { state, paragraphA, paragraphB } = twoCellFixture();
    const selected = selectTableCells(state, paragraphA, paragraphB);
    expect(setActiveTableCellMargins(selected, {})).toBe(selected);
  });

  it("reports applicability from a collapsed caret inside a table", () => {
    const { state, paragraphA } = twoCellFixture();
    const inside = collapsedCaretIn(state, paragraphA);
    expect(canSetTableCellMargins(inside)).toBe(true);
  });

  it("is not applicable when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canSetTableCellMargins(state)).toBe(false);
    const next = setActiveTableCellMargins(state, { top: 10 });
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveProperty("type", "paragraph");
  });
});
