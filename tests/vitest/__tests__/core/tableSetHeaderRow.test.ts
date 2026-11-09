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
  canSetActiveTableRowHeader,
  setSelectedTableRowHeader,
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

function twoRowFixture(): {
  state: EditorState;
  paragraph: ReturnType<typeof createEditorParagraph>;
} {
  const paragraph = createEditorParagraph("a");
  const table = createEditorTable([
    createEditorTableRow([createEditorTableCell([paragraph])]),
    createEditorTableRow([
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

describe("set active table row header (w:tblHeader)", () => {
  it("sets the active row as a header (isHeader true)", () => {
    const { state, paragraph } = twoRowFixture();
    const next = setSelectedTableRowHeader(caretIn(state, paragraph), true);
    expect(firstTable(next).rows[0]!.isHeader).toBe(true);
  });

  it("clears the header flag with false/null", () => {
    const { state, paragraph } = twoRowFixture();
    const headed = setSelectedTableRowHeader(caretIn(state, paragraph), true);
    const cleared = setSelectedTableRowHeader(
      caretIn(headed, paragraph),
      null,
    );
    expect(firstTable(cleared).rows[0]!.isHeader).toBeUndefined();
  });

  it("affects only the active row", () => {
    const { state, paragraph } = twoRowFixture();
    const next = setSelectedTableRowHeader(caretIn(state, paragraph), true);
    const table = firstTable(next);
    expect(table.rows[0]!.isHeader).toBe(true);
    expect(table.rows[1]!.isHeader).toBeUndefined();
  });

  it("reports applicability from a collapsed caret inside a table", () => {
    const { state, paragraph } = twoRowFixture();
    expect(canSetActiveTableRowHeader(caretIn(state, paragraph))).toBe(true);
  });

  it("is not applicable when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canSetActiveTableRowHeader(state)).toBe(false);
    const next = setSelectedTableRowHeader(state, true);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveProperty("type", "paragraph");
  });
});
