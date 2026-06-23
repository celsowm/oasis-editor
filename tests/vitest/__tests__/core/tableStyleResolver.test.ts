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

  it("applies conditional tblPr, trPr, and full tcPr from a tblStylePr bucket", () => {
    const styles: Record<string, EditorNamedStyle> = {
      Cond: {
        id: "Cond",
        name: "Cond",
        type: "table",
        isDefault: true,
        tableStyle: {
          conditionalFormats: {
            firstRow: {
              // Full w:tcPr (not just shading/borders): vertical alignment plus
              // a cell border edge.
              cellStyle: {
                verticalAlign: "middle",
                borderBottom: { width: 2, type: "solid", color: "#123456" },
              },
              // Conditional w:trPr -> row style.
              rowStyle: { height: 48 },
              // Conditional w:tblPr -> table style override for matching cells.
              tableStyle: { cellSpacing: 12 },
            },
          },
        },
      },
    };
    const table = createEditorTable([
      createEditorTableRow([
        createEditorTableCell([createEditorParagraph("header")]),
      ]),
      createEditorTableRow([
        createEditorTableCell([createEditorParagraph("body")]),
      ]),
    ]);
    table.style = {
      styleId: "Cond",
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
      verticalAlign: "middle",
      borderBottom: { width: 2, type: "solid", color: "#123456" },
    });
    expect(header.rowStyle).toMatchObject({ height: 48 });
    expect(header.tableStyle).toMatchObject({ cellSpacing: 12 });

    // The non-first row gets none of the firstRow conditional props.
    const body = resolveEffectiveTableCellFormatting({
      table,
      rowIndex: 1,
      cellIndex: 0,
      visualColumnIndex: 0,
      columnCount: 1,
      styles,
    });
    expect(body.cellStyle.verticalAlign).toBeUndefined();
    expect(body.rowStyle.height).toBeUndefined();
  });

  it("applies w:tblPrEx row exceptions over the table's own borders", () => {
    const table = createEditorTable([
      createEditorTableRow([
        createEditorTableCell([createEditorParagraph("exception row")]),
      ]),
      createEditorTableRow([
        createEditorTableCell([createEditorParagraph("normal row")]),
      ]),
    ]);
    table.style = {
      borders: {
        borderTop: { width: 1, type: "solid", color: "#000000" },
        borderInsideH: { width: 1, type: "solid", color: "#000000" },
      },
    };
    // Row 0 overrides the table's top border via tblPrEx.
    table.rows[0]!.propertyExceptions = {
      borders: {
        borderTop: { width: 3, type: "dashed", color: "#ff0000" },
      },
    };

    const exceptionRow = resolveEffectiveTableCellFormatting({
      table,
      rowIndex: 0,
      cellIndex: 0,
      visualColumnIndex: 0,
      columnCount: 1,
    });
    const normalRow = resolveEffectiveTableCellFormatting({
      table,
      rowIndex: 1,
      cellIndex: 0,
      visualColumnIndex: 0,
      columnCount: 1,
    });

    // The exception row's top edge uses the tblPrEx border...
    expect(exceptionRow.cellStyle.borderTop).toMatchObject({
      width: 3,
      type: "dashed",
      color: "#ff0000",
    });
    // ...while other rows still see the table's own border (interior edge here).
    expect(normalRow.cellStyle.borderTop).toMatchObject({
      width: 1,
      color: "#000000",
    });
  });
});
