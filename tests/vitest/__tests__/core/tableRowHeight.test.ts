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
  canSetActiveTableRowHeight,
  setActiveTableRowHeight,
} from "@/core/commands/table.js";
import {
  getDocumentSectionsCanonical,
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

function cell(textValue: string) {
  return createEditorTableCell([createEditorParagraph(textValue)]);
}

function buildTable() {
  return createEditorTable(
    [
      createEditorTableRow([cell("a"), cell("b")]),
      createEditorTableRow([cell("c"), cell("d")]),
    ],
    [100, 100],
  );
}

function activeCellParagraph(state: EditorState): string {
  const table = getDocumentSectionsCanonical(state.document)[0]!.blocks[0] as
    EditorTableNode;
  const paragraph = table.rows[1]!.cells[0]!.blocks[0];
  return paragraph.id;
}

function readRowStyle(state: EditorState): Record<string, unknown> {
  const table = getDocumentSectionsCanonical(state.document)[0]!.blocks[0] as
    EditorTableNode;
  return { ...(table.rows[1]!.style ?? {}) };
}

describe("table row height", () => {
  it("exposes a capability only inside a table", () => {
    const initialState = createEditorStateFromDocument(
      createEditorDocument([buildTable()]),
    );
    const state = placeCaretIn(initialState, activeCellParagraph(initialState));
    expect(canSetActiveTableRowHeight(state)).toBe(true);

    const outside = createEditorStateFromDocument(
      createEditorDocument([createEditorParagraph("body")]),
    );
    expect(canSetActiveTableRowHeight(outside)).toBe(false);
  });

  it("sets the height of the row containing the caret", () => {
    const initialState = createEditorStateFromDocument(
      createEditorDocument([buildTable()]),
    );
    const state = placeCaretIn(initialState, activeCellParagraph(initialState));
    const next = setActiveTableRowHeight(state, {
      height: 42,
      heightRule: "atLeast",
    });
    expect(next).not.toBe(state);
    expect(readRowStyle(next).height).toBe(42);
    expect(readRowStyle(next).heightRule).toBe("atLeast");
  });

  it("leaves other rows untouched and can clear the height", () => {
    const initialState = createEditorStateFromDocument(
      createEditorDocument([buildTable()]),
    );
    const state = placeCaretIn(initialState, activeCellParagraph(initialState));
    const next = setActiveTableRowHeight(state, { height: null });

    const table = getDocumentSectionsCanonical(next.document)[0]!.blocks[0] as
      EditorTableNode;
    expect(table.rows[1]!.style?.height).toBeUndefined();
    expect(table.rows[0]!.style?.height).toBeUndefined();
  });
});
