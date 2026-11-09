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
  canSetActiveTableAlignment,
  setActiveTableAlignment,
  type TableAlignment,
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

describe("table alignment (w:jc)", () => {
  it("sets the alignment on the active table", () => {
    const { state, paragraph } = twoCellFixture();
    const inside = caretIn(state, paragraph);
    const next = setActiveTableAlignment(inside, "center");
    expect(firstTable(next).style?.align).toBe("center");
  });

  it("sets each of the three valid alignments", () => {
    for (const a of ["left", "center", "right"] as const) {
      const { state, paragraph } = twoCellFixture();
      const next = setActiveTableAlignment(caretIn(state, paragraph), a);
      expect(firstTable(next).style?.align).toBe(a);
    }
  });

  it("is a no-op when the alignment is unchanged", () => {
    const { state, paragraph } = twoCellFixture();
    const inside = caretIn(state, paragraph);
    const centered = setActiveTableAlignment(inside, "center");
    expect(setActiveTableAlignment(centered, "center")).toBe(centered);
  });

  it("clears the alignment with null (Word's default)", () => {
    const { state, paragraph } = twoCellFixture();
    const inside = caretIn(state, paragraph);
    const centered = setActiveTableAlignment(inside, "right");
    const cleared = setActiveTableAlignment(centered, null);
    expect(firstTable(cleared).style?.align).toBeUndefined();
  });

  it("ignores invalid alignments by clearing", () => {
    const { state, paragraph } = twoCellFixture();
    const cleared = setActiveTableAlignment(
      caretIn(state, paragraph),
      "justify" as TableAlignment,
    );
    expect(firstTable(cleared).style?.align).toBeUndefined();
  });

  it("reports applicability from a collapsed caret inside a table", () => {
    const { state, paragraph } = twoCellFixture();
    expect(canSetActiveTableAlignment(caretIn(state, paragraph))).toBe(true);
  });

  it("is not applicable when the caret is outside a table", () => {
    const p = createEditorParagraph("body");
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    expect(canSetActiveTableAlignment(state)).toBe(false);
    const next = setActiveTableAlignment(state, "center");
    const blocks = getDocumentSectionsCanonical(next.document)[0]!.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveProperty("type", "paragraph");
  });
});
