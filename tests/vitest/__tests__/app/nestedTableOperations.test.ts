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
  getDocumentParagraphs,
  getDocumentSectionsCanonical,
  paragraphOffsetToPosition,
  type EditorParagraphNode,
  type EditorState,
  type EditorTableNode,
} from "@/core/model.js";
import { createEditorTableOperations } from "@/app/controllers/useEditorTableOperations.js";

function createOperations() {
  return createEditorTableOperations({
    applyTransactionalState: (): void => undefined,
    applySelectionToStatePreservingStructure: (current, selection) => ({
      ...current,
      selection,
    }),
    focusInput: (): void => undefined,
  });
}

function selectParagraphs(
  state: EditorState,
  anchor: EditorParagraphNode,
  focus: EditorParagraphNode = anchor,
): EditorState {
  return {
    ...state,
    activeSectionIndex: 0,
    activeZone: "main",
    selection: {
      anchor: paragraphOffsetToPosition(anchor, 0),
      focus: paragraphOffsetToPosition(focus, 0),
    },
  };
}

function fixture() {
  const before = createEditorParagraph("before");
  const after = createEditorParagraph("after");
  const p00 = createEditorParagraph("00");
  const p01 = createEditorParagraph("01");
  const p10 = createEditorParagraph("10");
  const p11 = createEditorParagraph("11");
  const inner = createEditorTable([
    createEditorTableRow([
      createEditorTableCell([p00]),
      createEditorTableCell([p01]),
    ]),
    createEditorTableRow([
      createEditorTableCell([p10]),
      createEditorTableCell([p11]),
    ]),
  ]);
  const outer = createEditorTable([
    createEditorTableRow([
      createEditorTableCell([before, inner, after]),
    ]),
  ]);
  const state = createEditorStateFromDocument(createEditorDocument([outer]));
  return { state, before, after, p00, p01, p10, p11 };
}

function getOuterTable(state: EditorState): EditorTableNode {
  const block = getDocumentSectionsCanonical(state.document)[0]?.blocks[0];
  if (!block || block.type !== "table") {
    throw new Error("Expected outer table.");
  }
  return block;
}

function getInnerTable(state: EditorState): EditorTableNode {
  const outer = getOuterTable(state);
  const block = outer.rows[0]?.cells[0]?.blocks.find(
    (candidate) => candidate.type === "table",
  );
  if (!block || block.type !== "table") {
    throw new Error("Expected nested table.");
  }
  return block;
}

function outerStoryTypes(state: EditorState): string[] {
  return (
    getOuterTable(state).rows[0]?.cells[0]?.blocks.map((block) => block.type) ??
    []
  );
}

describe("nested table structural operations", () => {
  it("inserts and deletes rows only in the innermost table", () => {
    const { state, p00 } = fixture();
    const operations = createOperations();

    const inserted = operations.insertSelectedTableRow(
      selectParagraphs(state, p00),
      1,
    );
    expect(getInnerTable(inserted).rows).toHaveLength(3);
    expect(getOuterTable(inserted).rows).toHaveLength(1);
    expect(outerStoryTypes(inserted)).toEqual([
      "paragraph",
      "table",
      "paragraph",
    ]);

    const deleted = operations.deleteSelectedTableRow(inserted);
    expect(getInnerTable(deleted).rows).toHaveLength(2);
    expect(getOuterTable(deleted).rows).toHaveLength(1);
  });

  it("inserts and deletes columns only in the innermost table", () => {
    const { state, p00 } = fixture();
    const operations = createOperations();

    const inserted = operations.insertSelectedTableColumn(
      selectParagraphs(state, p00),
      1,
    );
    expect(getInnerTable(inserted).rows[0]?.cells).toHaveLength(3);
    expect(getOuterTable(inserted).rows[0]?.cells).toHaveLength(1);

    const deleted = operations.deleteSelectedTableColumn(inserted);
    expect(getInnerTable(deleted).rows[0]?.cells).toHaveLength(2);
    expect(getOuterTable(deleted).rows[0]?.cells).toHaveLength(1);
  });

  it("merges and splits horizontal cells in the innermost table", () => {
    const { state, p00, p01 } = fixture();
    const operations = createOperations();
    const selected = selectParagraphs(state, p00, p01);

    expect(operations.canMergeSelectedTableCells(selected)).toBe(true);
    const merged = operations.mergeSelectedTableCells(selected);
    expect(getInnerTable(merged).rows[0]?.cells).toHaveLength(1);
    expect(getInnerTable(merged).rows[0]?.cells[0]?.colSpan).toBe(2);
    expect(getOuterTable(merged).rows[0]?.cells).toHaveLength(1);

    expect(operations.canSplitSelectedTableCell(merged)).toBe(true);
    const split = operations.splitSelectedTableCell(merged);
    expect(getInnerTable(split).rows[0]?.cells).toHaveLength(2);
    expect(getInnerTable(split).rows[0]?.cells[0]?.colSpan).toBeUndefined();
  });

  it("merges and splits vertical cells in the innermost table", () => {
    const { state, p00, p10 } = fixture();
    const operations = createOperations();
    const selected = selectParagraphs(state, p00, p10);

    expect(operations.canMergeSelectedTableRows(selected)).toBe(true);
    const merged = operations.mergeSelectedTableRows(selected);
    const mergedInner = getInnerTable(merged);
    expect(mergedInner.rows[0]?.cells[0]?.rowSpan).toBe(2);
    expect(mergedInner.rows[0]?.cells[0]?.vMerge).toBe("restart");
    expect(mergedInner.rows[1]?.cells[0]?.vMerge).toBe("continue");

    expect(operations.canSplitSelectedTableCellVertically(merged)).toBe(true);
    const split = operations.splitSelectedTableCellVertically(merged);
    expect(getInnerTable(split).rows[0]?.cells[0]?.rowSpan).toBeUndefined();
    expect(getInnerTable(split).rows[1]?.cells[0]?.vMerge).toBeUndefined();
  });

  it("does not merge a selection crossing outer and inner table levels", () => {
    const { state, before, p00 } = fixture();
    const operations = createOperations();
    const selected = selectParagraphs(state, before, p00);

    expect(operations.canMergeSelectedTable(selected)).toBe(false);
    expect(operations.mergeSelectedTable(selected)).toBe(selected);
  });

  it("preserves sibling tables during table-aware paragraph edits", () => {
    const { state, before } = fixture();
    const operations = createOperations();

    const edited = operations.applyTableAwareParagraphEdit(
      selectParagraphs(state, before),
      (temporary) => {
        const paragraph = getDocumentParagraphs(temporary.document).find(
          (candidate) => candidate.id === before.id,
        );
        if (!paragraph) throw new Error("Expected target paragraph.");
        paragraph.runs[0]!.text = "edited";
        return temporary;
      },
    );

    expect(outerStoryTypes(edited)).toEqual([
      "paragraph",
      "table",
      "paragraph",
    ]);
    expect(getInnerTable(edited).rows).toHaveLength(2);
    expect(
      getDocumentParagraphs(edited.document).find(
        (paragraph) => paragraph.id === before.id,
      )?.runs[0]?.text,
    ).toBe("edited");
    expect(before.runs[0]?.text).toBe("before");
  });
});
