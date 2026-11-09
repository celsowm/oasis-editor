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
  canSetActiveTableCellSpacing,
  setActiveTableCellSpacing,
} from "@/core/commands/table.js";
import {
  getDocumentSectionsCanonical,
  type EditorState,
  type EditorTableNode,
} from "@/core/model.js";

function firstTable(state: EditorState): EditorTableNode {
  const table = getDocumentSectionsCanonical(state.document)[0]!.blocks[0]!;
  expect(table.type).toBe("table");
  return table as EditorTableNode;
}

function twoCellFixture(): {
  state: EditorState;
  paragraph: ReturnType<typeof createEditorParagraph>;
} {
  const paragraph = createEditorParagraph("a");
  const table = createEditorTable([
    createEditorTableRow([
      createEditorTableCell([paragraph]),
      createEditorTableCell([createEditorParagraph("b")]),
    ]),
  ]);
  const state = createEditorStateFromDocument(createEditorDocument([table]));
  return { state, paragraph };
}

function caretIn(
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

describe("table cell spacing (w:tblCellSpacing)", () => {
  it("sets the cell spacing on the active table", () => {
    const { state, paragraph } = twoCellFixture();
    const inside = caretIn(state, paragraph);
    const next = setActiveTableCellSpacing(inside, 3);
    expect(firstTable(next).style?.cellSpacing).toBe(3);
  });

  it("clears the cell spacing with null (Word's default)", () => {
    const { state, paragraph } = twoCellFixture();
    const inside = caretIn(state, paragraph);
    const withSpacing = setActiveTableCellSpacing(inside, 4);
    const cleared = setActiveTableCellSpacing(withSpacing, null);
    expect(firstTable(cleared).style?.cellSpacing).toBeUndefined();
  });

  it("reports applicability from a collapsed caret inside a table", () => {
    const { state, paragraph } = twoCellFixture();
    expect(canSetActiveTableCellSpacing(caretIn(state, paragraph))).toBe(true);
  });

  it("is not applicable when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canSetActiveTableCellSpacing(state)).toBe(false);
    const next = setActiveTableCellSpacing(state, 3);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveProperty("type", "paragraph");
  });
});
