import { describe, expect, it, vi } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "../../core/editorState.js";
import {
  getDocumentSectionsCanonical,
  paragraphOffsetToPosition,
  type EditorState,
} from "../../core/model.js";
import { createTablePropertiesDialogBridge } from "../../ui/app/useTablePropertiesDialogBridge.js";
import type { TablePropertiesDialogApplyValues } from "../../ui/components/Dialogs/TablePropertiesDialog.js";

function createTableState() {
  const p00 = createEditorParagraph("A");
  const p01 = createEditorParagraph("B");
  const table = createEditorTable(
    [
      createEditorTableRow([
        createEditorTableCell([p00]),
        createEditorTableCell([p01]),
      ]),
    ],
    [100, 100],
  );
  const state = createEditorStateFromDocument(createEditorDocument([table]));
  return {
    table,
    state: {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(p00, 0),
        focus: paragraphOffsetToPosition(p00, 0),
      },
    },
  };
}

describe("createTablePropertiesDialogBridge", () => {
  it("opens with active table values and applies table, row, column, cell and alt text edits", () => {
    const setup = createTableState();
    let state: EditorState = setup.state;
    const setTablePropertiesDialog = vi.fn();
    const bridge = createTablePropertiesDialogBridge({
      state: () => state,
      isReadOnly: () => false,
      setTablePropertiesDialog,
      setContextMenu: vi.fn(),
      clearPreferredColumn: vi.fn(),
      resetTransactionGrouping: vi.fn(),
      applyTransactionalState: (producer) => {
        state = producer(state);
      },
      focusInput: vi.fn(),
    });

    bridge.openTablePropertiesDialog("cell");

    expect(setTablePropertiesDialog).toHaveBeenCalledOnce();
    expect(setTablePropertiesDialog.mock.calls[0]![0].initial.activeTab).toBe(
      "cell",
    );
    expect(setTablePropertiesDialog.mock.calls[0]![0].initial.columnWidth).toBe(
      "100",
    );

    const values: TablePropertiesDialogApplyValues = {
      tableWidth: "80%",
      tableAlign: "center",
      tableIndentLeft: 18,
      rowHeight: 30,
      rowHeightRule: "exact",
      repeatHeader: true,
      cantSplit: true,
      hiddenRow: true,
      columnWidth: 144,
      cellWidth: 72,
      cellVerticalAlign: "middle",
      cellTextDirection: "tbRl",
      cellNoWrap: true,
      cellFitText: true,
      cellHideMark: true,
      margins: { top: 5, right: 6, bottom: 7, left: 8 },
      borders: {
        top: { type: "solid", width: 1, color: "#111111" },
        right: { type: "dashed", width: 0.5, color: "#222222" },
        bottom: null,
        left: null,
      },
      shading: "#ffeeaa",
      altTitle: "Table title",
      altDescription: "Table description",
    };
    bridge.applyTablePropertiesDialogValues(values);

    const nextTable = getDocumentSectionsCanonical(state.document)[0]!
      .blocks[0];
    expect(nextTable.type).toBe("table");
    if (nextTable.type !== "table") return;
    expect(nextTable.style).toMatchObject({
      width: "80%",
      align: "center",
      indentLeft: 18,
      altTitle: "Table title",
      altDescription: "Table description",
    });
    expect(nextTable.gridCols?.[0]).toBe(144);
    expect(nextTable.rows[0]!.isHeader).toBe(true);
    expect(nextTable.rows[0]!.style).toMatchObject({
      height: 30,
      heightRule: "exact",
      cantSplit: true,
      hidden: true,
    });
    expect(nextTable.rows[0]!.cells[0]!.style).toMatchObject({
      width: 72,
      verticalAlign: "middle",
      textDirection: "tbRl",
      noWrap: true,
      fitText: true,
      hideMark: true,
      paddingTop: 5,
      paddingRight: 6,
      paddingBottom: 7,
      paddingLeft: 8,
      shading: "#ffeeaa",
    });
    expect(nextTable.rows[0]!.cells[0]!.style?.borderTop).toEqual({
      type: "solid",
      width: 1,
      color: "#111111",
    });
  });
});
