import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import { distributeSelectedTableColumns } from "@/core/commands/table/tableColumnCommands.js";
import {
  setSelectedTableRowHeader,
  setSelectedTableRowStyleValue,
} from "@/core/commands/table/tableRowCommands.js";
import {
  getDocumentSectionsCanonical,
  paragraphOffsetToPosition,
  type EditorState,
  type EditorTableNode,
} from "@/core/model.js";

function fixture(): { state: EditorState; innerId: string } {
  const active = createEditorParagraph("active");
  const sibling = createEditorParagraph("sibling");
  const inner = createEditorTable(
    [
      createEditorTableRow([
        createEditorTableCell([active]),
        createEditorTableCell([sibling]),
      ]),
      createEditorTableRow([
        createEditorTableCell([createEditorParagraph("lower-left")]),
        createEditorTableCell([createEditorParagraph("lower-right")]),
      ]),
    ],
    [80, 160],
  );
  const outer = createEditorTable([
    createEditorTableRow([
      createEditorTableCell([
        createEditorParagraph("before"),
        inner,
        createEditorParagraph("after"),
      ]),
    ]),
  ]);
  const base = createEditorStateFromDocument(createEditorDocument([outer]));
  const position = paragraphOffsetToPosition(active, 0);
  return {
    innerId: inner.id,
    state: {
      ...base,
      activeSectionIndex: 0,
      activeZone: "main",
      selection: { anchor: position, focus: position },
    },
  };
}

function tables(state: EditorState): {
  outer: EditorTableNode;
  inner: EditorTableNode;
} {
  const outer = getDocumentSectionsCanonical(state.document)[0]?.blocks[0];
  if (!outer || outer.type !== "table") {
    throw new Error("Expected outer table.");
  }
  const inner = outer.rows[0]?.cells[0]?.blocks.find(
    (block) => block.type === "table",
  );
  if (!inner || inner.type !== "table") {
    throw new Error("Expected inner table.");
  }
  return { outer, inner };
}

describe("nested core table commands", () => {
  it("updates only the selected inner row", () => {
    const { state } = fixture();
    const headed = setSelectedTableRowHeader(state, true);
    const styled = setSelectedTableRowStyleValue(
      headed,
      "cantSplit",
      true,
    );
    const { outer, inner } = tables(styled);

    expect(inner.rows[0]?.isHeader).toBe(true);
    expect(inner.rows[0]?.style?.cantSplit).toBe(true);
    expect(inner.rows[1]?.isHeader).toBeUndefined();
    expect(outer.rows[0]?.isHeader).toBeUndefined();
    expect(outer.rows[0]?.style?.cantSplit).toBeUndefined();
  });

  it("distributes columns only in the active inner table", () => {
    const { state, innerId } = fixture();
    const distributed = distributeSelectedTableColumns(state);
    const { outer, inner } = tables(distributed);

    expect(inner.id).toBe(innerId);
    expect(inner.gridCols).toEqual([120, 120]);
    expect(inner.rows[0]?.cells[0]?.style?.width).toBe(120);
    expect(inner.rows[0]?.cells[1]?.style?.width).toBe(120);
    expect(outer.gridCols).toBeUndefined();
    expect(outer.rows[0]?.cells[0]?.style?.width).toBeUndefined();
  });
});
