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
  canSetActiveTableAutoFit,
  setActiveTableAutoFit,
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

function tableOf(state: EditorState): EditorTableNode {
  return getDocumentSectionsCanonical(state.document)[0]!.blocks[0] as
    EditorTableNode;
}

function activeCellParagraph(state: EditorState): string {
  const table = tableOf(state);
  return table.rows[1]!.cells[0]!.blocks[0].id;
}

describe("table auto-fit", () => {
  it("exposes a capability only inside a table", () => {
    const initialState = createEditorStateFromDocument(
      createEditorDocument([buildTable()]),
    );
    const state = placeCaretIn(initialState, activeCellParagraph(initialState));
    expect(canSetActiveTableAutoFit(state)).toBe(true);

    const outside = createEditorStateFromDocument(
      createEditorDocument([createEditorParagraph("body")]),
    );
    expect(canSetActiveTableAutoFit(outside)).toBe(false);
  });

  it("sets fixed layout", () => {
    const initialState = createEditorStateFromDocument(
      createEditorDocument([buildTable()]),
    );
    const state = placeCaretIn(initialState, activeCellParagraph(initialState));
    const next = setActiveTableAutoFit(state, "fixed");
    expect(next).not.toBe(state);
    expect(tableOf(next).style?.layout).toBe("fixed");
  });

  it("sets contents autofit and clears the explicit width", () => {
    const initialState = createEditorStateFromDocument(
      createEditorDocument([buildTable()]),
    );
    const state = placeCaretIn(initialState, activeCellParagraph(initialState));
    const withWidth = setActiveTableAutoFit(state, "window");
    expect(tableOf(withWidth).style?.width).toBe("100%");

    const next = setActiveTableAutoFit(withWidth, "contents");
    expect(tableOf(next).style?.layout).toBe("autofit");
    expect(tableOf(next).style?.width).toBeUndefined();
  });

  it("sets window autofit with 100% width", () => {
    const initialState = createEditorStateFromDocument(
      createEditorDocument([buildTable()]),
    );
    const state = placeCaretIn(initialState, activeCellParagraph(initialState));
    const next = setActiveTableAutoFit(state, "window");
    expect(tableOf(next).style?.layout).toBe("autofit");
    expect(tableOf(next).style?.width).toBe("100%");
  });

  it("no-ops when the caret is outside a table", () => {
    const initialState = createEditorStateFromDocument(
      createEditorDocument([createEditorParagraph("body")]),
    );
    expect(setActiveTableAutoFit(initialState, "window")).toBe(initialState);
  });
});
