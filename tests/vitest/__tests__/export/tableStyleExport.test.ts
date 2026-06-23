import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import type { EditorNamedStyle } from "@/core/model.js";

function buildDocumentWithTableStyle() {
  const styles: Record<string, EditorNamedStyle> = {
    GridAccent: {
      id: "GridAccent",
      name: "Grid Accent",
      type: "table",
      tableStyle: {
        rowBandSize: 1,
        borders: {
          borderTop: { width: 1, type: "solid", color: "#333333" },
          borderInsideH: { width: 0.5, type: "solid", color: "#999999" },
        },
        defaultCellMargins: { top: 2, left: 5, bottom: 2, right: 5 },
        conditionalFormats: {
          firstRow: {
            shading: "#4472c4",
            textStyle: { bold: true, color: "#ffffff" },
            cellStyle: {
              verticalAlign: "middle",
              borderBottom: { width: 2, type: "solid", color: "#2f5496" },
            },
          },
          band1Horz: {
            shading: "#d9e2f3",
          },
        },
      },
    },
  };
  const table = createEditorTable(
    [
      createEditorTableRow([
        createEditorTableCell([createEditorParagraph("Header")]),
      ]),
      createEditorTableRow([
        createEditorTableCell([createEditorParagraph("Body")]),
      ]),
    ],
    [200],
  );
  table.style = { styleId: "GridAccent" };
  return createEditorDocument([table], undefined, undefined, styles);
}

async function readStylesXml(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/styles.xml")?.async("string");
  if (!xml) {
    throw new Error("Missing word/styles.xml");
  }
  return xml;
}

describe("table style definition export", () => {
  it("serializes a table style with tblPr and conditional tblStylePr buckets", async () => {
    const buffer = await exportEditorDocumentToDocx(
      buildDocumentWithTableStyle(),
    );
    const xml = await readStylesXml(buffer);

    expect(xml).toContain('<w:style w:type="table" w:styleId="GridAccent">');
    expect(xml).toContain('<w:name w:val="Grid Accent"/>');
    expect(xml).toContain("<w:tblStyleRowBandSize w:val=\"1\"/>");
    expect(xml).toContain("<w:tblBorders>");
    expect(xml).toContain("<w:tblCellMar>");
    // Conditional buckets emitted with their type attribute.
    expect(xml).toContain('<w:tblStylePr w:type="firstRow">');
    expect(xml).toContain('<w:tblStylePr w:type="band1Horz">');
    // firstRow precedes band1Horz? No — Word's order puts bands before firstRow.
    expect(xml.indexOf('w:type="band1Horz"')).toBeLessThan(
      xml.indexOf('w:type="firstRow"'),
    );
  });

  it("round-trips the table style definition back through import", async () => {
    const buffer = await exportEditorDocumentToDocx(
      buildDocumentWithTableStyle(),
    );
    const reimported = await importDocxToEditorDocument(buffer);
    const style = reimported.styles?.["GridAccent"];

    expect(style?.type).toBe("table");
    expect(style?.tableStyle?.rowBandSize).toBe(1);
    const firstRow = style?.tableStyle?.conditionalFormats?.["firstRow"];
    expect(firstRow?.shading).toBeTruthy();
    expect(firstRow?.textStyle?.bold).toBe(true);
    expect(firstRow?.cellStyle?.verticalAlign).toBe("middle");
  });
});
