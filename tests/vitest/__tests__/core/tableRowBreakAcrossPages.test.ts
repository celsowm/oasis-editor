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
  canSetActiveTableRowBreakAcrossPages,
  setActiveTableRowBreakAcrossPages,
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

describe("table row break across pages (w:cantSplit)", () => {
  it("disallows breaking the active row (stores cantSplit true)", () => {
    const { state, paragraph } = twoRowFixture();
    const inside = caretIn(state, paragraph);
    const next = setActiveTableRowBreakAcrossPages(inside, false);
    expect(firstTable(next).rows[0]!.style?.cantSplit).toBe(true);
  });

  it("allows breaking the active row (stores cantSplit false)", () => {
    const { state, paragraph } = twoRowFixture();
    const inside = caretIn(state, paragraph);
    const next = setActiveTableRowBreakAcrossPages(inside, true);
    expect(firstTable(next).rows[0]!.style?.cantSplit).toBe(false);
  });

  it("clears the key with null (Word's default)", () => {
    const { state, paragraph } = twoRowFixture();
    const inside = caretIn(state, paragraph);
    const disallowed = setActiveTableRowBreakAcrossPages(inside, false);
    const cleared = setActiveTableRowBreakAcrossPages(disallowed, null);
    expect(firstTable(cleared).rows[0]!.style?.cantSplit).toBeUndefined();
  });

  it("affects only the active row", () => {
    const { state, paragraph } = twoRowFixture();
    const inside = caretIn(state, paragraph);
    const next = setActiveTableRowBreakAcrossPages(inside, false);
    const table = firstTable(next);
    expect(table.rows[0]!.style?.cantSplit).toBe(true);
    expect(table.rows[1]!.style?.cantSplit).toBeUndefined();
  });

  it("reports applicability from a collapsed caret inside a table", () => {
    const { state, paragraph } = twoRowFixture();
    expect(canSetActiveTableRowBreakAcrossPages(caretIn(state, paragraph))).toBe(
      true,
    );
  });

  it("is not applicable when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canSetActiveTableRowBreakAcrossPages(state)).toBe(false);
    const next = setActiveTableRowBreakAcrossPages(state, false);
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveProperty("type", "paragraph");
  });
});
