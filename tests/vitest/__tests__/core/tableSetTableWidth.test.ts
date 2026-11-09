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
  canSetActiveTableWidth,
  setActiveTableWidth,
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

function tableFixture(): {
  state: EditorState;
  paragraph: ReturnType<typeof createEditorParagraph>;
  table: EditorTableNode;
} {
  const paragraph = createEditorParagraph("a");
  const table = createEditorTable([
    createEditorTableRow([createEditorTableCell([paragraph])]),
  ]);
  const state = createEditorStateFromDocument(createEditorDocument([table]));
  return { state, paragraph, table };
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

describe("set active table width (w:tblW preferred width)", () => {
  it("sets the active table's preferred width", () => {
    const { state, paragraph } = tableFixture();
    const next = setActiveTableWidth(caretIn(state, paragraph), "80%");
    expect(firstTable(next).style?.width).toBe("80%");
  });

  it("clears the preferred width with a null payload", () => {
    const { state, paragraph } = tableFixture();
    const sized = setActiveTableWidth(caretIn(state, paragraph), "80%");
    expect(firstTable(sized).style?.width).toBe("80%");
    const next = setActiveTableWidth(caretIn(sized, paragraph), null);
    expect(firstTable(next).style?.width).toBeUndefined();
  });

  it("reports applicability from a collapsed caret inside a table", () => {
    const { state, paragraph } = tableFixture();
    expect(canSetActiveTableWidth(caretIn(state, paragraph))).toBe(true);
  });

  it("is not applicable when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canSetActiveTableWidth(state)).toBe(false);
    const next = setActiveTableWidth(state, "80%");
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveProperty("type", "paragraph");
  });
});
