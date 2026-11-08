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
  canSelectActiveTable,
  selectActiveTable,
  selectActiveTableCell,
  selectActiveTableColumn,
  selectActiveTableRow,
  selectActiveTableWholeTable,
} from "@/core/commands/table.js";
import {
  getDocumentSectionsCanonical,
  type EditorParagraphNode,
  type EditorState,
  type EditorTableNode,
} from "@/core/model.js";

function placeCaretIn(state: EditorState, paragraphId: string): EditorState {
  return {
    ...state,
    selection: {
      anchor: { paragraphId, runId: "", offset: 0 },
      focus: { paragraphId, runId: "", offset: 0 },
    },
  };
}

function para(textValue: string): EditorParagraphNode {
  return createEditorParagraph(textValue);
}

function text(paragraph: EditorParagraphNode): string {
  return paragraph.runs.map((run) => run.text).join("");
}

/** Cells are addressed as `text|r:c` to make assertions readable. */
function cell(textValue: string) {
  return createEditorTableCell([para(textValue)]);
}

function buildTable(rows: string[][]): EditorTableNode {
  return createEditorTable(
    rows.map((row) => createEditorTableRow(row.map((value) => cell(value)))),
    rows[0]!.map(() => 100),
  );
}

function readCell(state: EditorState, rowIndex: number, cellIndex: number) {
  const table = getDocumentSectionsCanonical(state.document)[0]!.blocks[0] as
    EditorTableNode;
  return table.rows[rowIndex]!.cells[cellIndex]!;
}

function caretInCell(state: EditorState, rowIndex: number, cellIndex: number) {
  const paragraph = readCell(state, rowIndex, cellIndex).blocks[0];
  return placeCaretIn(state, (paragraph as EditorParagraphNode).id);
}

function selectionSpan(state: EditorState): {
  anchorText: string;
  focusText: string;
  anchorParaId: string;
  focusParaId: string;
} {
  const anchorId = state.selection.anchor.paragraphId;
  const focusId = state.selection.focus.paragraphId;
  const doc = getDocumentSectionsCanonical(state.document)[0]!;
  const anchorPara = findParagraphById(doc, anchorId)!;
  const focusPara = findParagraphById(doc, focusId)!;
  return {
    anchorText: text(anchorPara),
    focusText: text(focusPara),
    anchorParaId: anchorId,
    focusParaId: focusId,
  };
}

function findParagraphById(
  docElement: ReturnType<typeof getDocumentSectionsCanonical>[number],
  paragraphId: string,
): EditorParagraphNode | undefined {
  for (const block of docElement.blocks) {
    if (block.type === "table") {
      for (const row of block.rows) {
        for (const c of row.cells) {
          for (const child of c.blocks) {
            if (child.type === "paragraph" && child.id === paragraphId) {
              return child;
            }
          }
        }
      }
    } else if (block.type === "paragraph" && block.id === paragraphId) {
      return block;
    }
  }
  return undefined;
}

describe("canSelectActiveTable", () => {
  it("is true inside a table and false outside", () => {
    const table = buildTable([
      ["a", "b"],
      ["c", "d"],
    ]);
    const inTable = caretInCell(
      createEditorStateFromDocument(createEditorDocument([table])),
      1,
      0,
    );
    expect(canSelectActiveTable(inTable)).toBe(true);

    const outside = createEditorStateFromDocument(
      createEditorDocument([para("body")]),
    );
    expect(canSelectActiveTable(outside)).toBe(false);
  });
});

describe("selectActiveTableCell", () => {
  it("selects the content of the active cell only", () => {
    const table = buildTable([
      ["a", "b"],
      ["c", "d"],
    ]);
    const state = caretInCell(
      createEditorStateFromDocument(createEditorDocument([table])),
      1,
      0,
    );
    const next = selectActiveTableCell(state);
    const span = selectionSpan(next);
    expect(span.anchorText).toBe("c");
    expect(span.focusText).toBe("c");
  });
});

describe("selectActiveTableRow", () => {
  it("spans the whole row containing the caret", () => {
    const table = buildTable([
      ["a", "b"],
      ["c", "d"],
    ]);
    const state = caretInCell(
      createEditorStateFromDocument(createEditorDocument([table])),
      1,
      1,
    );
    const next = selectActiveTableRow(state);
    const span = selectionSpan(next);
    expect(span.anchorText).toBe("c");
    expect(span.focusText).toBe("d");
  });
});

describe("selectActiveTableColumn", () => {
  it("spans the whole column containing the caret", () => {
    const table = buildTable([
      ["a", "b"],
      ["c", "d"],
    ]);
    const state = caretInCell(
      createEditorStateFromDocument(createEditorDocument([table])),
      0,
      0,
    );
    const next = selectActiveTableColumn(state);
    const span = selectionSpan(next);
    expect(span.anchorText).toBe("a");
    expect(span.focusText).toBe("c");
  });
});

describe("selectActiveTableWholeTable", () => {
  it("spans every cell in document order", () => {
    const table = buildTable([
      ["a", "b"],
      ["c", "d"],
    ]);
    const state = caretInCell(
      createEditorStateFromDocument(createEditorDocument([table])),
      1,
      1,
    );
    const next = selectActiveTableWholeTable(state);
    const span = selectionSpan(next);
    expect(span.anchorText).toBe("a");
    expect(span.focusText).toBe("d");
  });
});

describe("selectActiveTable (kind dispatch)", () => {
  it("dispatches each kind", () => {
    const table = buildTable([
      ["a", "b"],
      ["c", "d"],
    ]);
    const state = caretInCell(
      createEditorStateFromDocument(createEditorDocument([table])),
      1,
      1,
    );
    expect(selectionSpan(selectActiveTable(state, "cell")).focusText).toBe("d");
    expect(selectionSpan(selectActiveTable(state, "row")).anchorText).toBe("c");
    expect(
      selectionSpan(selectActiveTable(state, "column")).focusText,
    ).toBe("d");
    expect(
      selectionSpan(selectActiveTable(state, "table")).anchorText,
    ).toBe("a");
  });

  it("is a no-op outside a table", () => {
    const state = createEditorStateFromDocument(createEditorDocument([para("x")]));
    expect(selectActiveTable(state, "table")).toBe(state);
  });
});
