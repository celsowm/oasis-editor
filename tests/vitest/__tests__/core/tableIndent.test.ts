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
  canSetActiveTableIndent,
  setActiveTableIndent,
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

describe("table indent (w:tblInd)", () => {
  it("sets the indent from left on the active table", () => {
    const { state, paragraph } = twoCellFixture();
    const inside = caretIn(state, paragraph);
    const next = setActiveTableIndent(inside, 20);
    expect(firstTable(next).style?.indentLeft).toBe(20);
  });

  it("rounds the indent to half-points", () => {
    const { state, paragraph } = twoCellFixture();
    const inside = caretIn(state, paragraph);
    const next = setActiveTableIndent(inside, 20.37);
    expect(firstTable(next).style?.indentLeft).toBe(20.5);
  });

  it("clears the indent with null (Word's default)", () => {
    const { state, paragraph } = twoCellFixture();
    const inside = caretIn(state, paragraph);
    const withIndent = setActiveTableIndent(inside, 30);
    const cleared = setActiveTableIndent(withIndent, null);
    expect(firstTable(cleared).style?.indentLeft).toBeUndefined();
  });

  it("ignores negative, NaN and non-finite values by clearing", () => {
    const { state, paragraph } = twoCellFixture();
    const cleared = setActiveTableIndent(caretIn(state, paragraph), -5);
    expect(firstTable(cleared).style?.indentLeft).toBeUndefined();
    const clearedNan = setActiveTableIndent(
      caretIn(state, paragraph),
      Number.NaN,
    );
    expect(firstTable(clearedNan).style?.indentLeft).toBeUndefined();
  });

  it("reports applicability from a collapsed caret inside a table", () => {
    const { state, paragraph } = twoCellFixture();
    expect(canSetActiveTableIndent(caretIn(state, paragraph))).toBe(true);
  });

  it("is not applicable when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canSetActiveTableIndent(state)).toBe(false);
    const next = setActiveTableIndent(state, 20);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveProperty("type", "paragraph");
  });
});
