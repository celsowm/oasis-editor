import { describe, expect, it } from "vitest";
import {
  createEditorParagraph,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import {
  resolveEffectiveTableCellFormatting,
  type EditorNamedStyle,
} from "@/core/model.js";

describe("table style resolver", () => {
  it("resolves basedOn, conditions, and direct overrides without materializing", () => {
    const styles: Record<string, EditorNamedStyle> = {
      Base: {
        id: "Base",
        name: "Base",
        type: "table",
        isDefault: true,
        tableStyle: {
          defaultCellMargins: { top: 6, left: 8 },
          conditionalFormats: {
            wholeTable: { cellStyle: { noWrap: true } },
            firstRow: {
              cellStyle: { shading: "#00ff00" },
              textStyle: { bold: true },
            },
          },
        },
      },
      Derived: {
        id: "Derived",
        name: "Derived",
        type: "table",
        basedOn: "Base",
        tableStyle: {
          conditionalFormats: {
            firstRow: { textStyle: { color: "#ffffff" } },
          },
        },
      },
    };
    const firstCell = createEditorTableCell([createEditorParagraph("head")]);
    firstCell.style = { shading: "#ff0000" };
    const table = createEditorTable([
      createEditorTableRow([firstCell]),
      createEditorTableRow([
        createEditorTableCell([createEditorParagraph("body")]),
      ]),
    ]);
    table.style = {
      styleId: "Derived",
      tblLook: {
        firstRow: true,
        lastRow: false,
        firstCol: false,
        lastCol: false,
        noHBand: true,
        noVBand: true,
      },
    };

    const header = resolveEffectiveTableCellFormatting({
      table,
      rowIndex: 0,
      cellIndex: 0,
      visualColumnIndex: 0,
      columnCount: 1,
      styles,
    });
    expect(header.cellStyle).toMatchObject({
      shading: "#ff0000",
      noWrap: true,
      paddingTop: 6,
      paddingLeft: 8,
    });
    expect(header.textStyle).toMatchObject({ bold: true, color: "#ffffff" });
    expect(firstCell.style).toEqual({ shading: "#ff0000" });
  });
});
