import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "../../export/docx/exportEditorDocumentToDocx.js";
import { exportEditorDocumentToPdfBlob } from "../../export/pdf/exportEditorDocumentToPdf.js";
import type { EditorTableCellNode } from "../../core/model.js";
import {
  getPageContentWidth,
  resolveEffectiveTextStyleForParagraph,
} from "../../core/model.js";
import { createEditorStateFromDocument } from "../../core/editorState.js";
import {
  estimateTableBlockHeight,
  projectDocumentLayout,
} from "../../layoutProjection/index.js";
import { buildCanvasTableLayout } from "../../ui/canvas/CanvasTableLayout.js";
import {
  getDocumentTables,
  importComplexDocument,
  importLoremComplexDocument,
  pdfColorCommand,
} from "./docxTestHelpers.js";

const POINT_TO_PX = 96 / 72;
const DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX = 28;

function getCellContentWidth(cell: EditorTableCellNode): number {
  const widthPx =
    typeof cell.style?.width === "number"
      ? cell.style.width * POINT_TO_PX
      : 624;
  const horizontalPaddingPx =
    cell.style?.padding !== undefined
      ? cell.style.padding * POINT_TO_PX * 2
      : DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX;
  return Math.max(24, widthPx - horizontalPaddingPx);
}

async function buildDocxWithPageBreakBeforeTable(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Before break</w:t></w:r></w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    <w:tbl>
      <w:tblPr><w:tblW w:type="auto" w:w="0"/></w:tblPr>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:t>Table after break</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("DOCX table import", () => {
  it("preserves a manual page break before a table", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocxWithPageBreakBeforeTable(),
    );
    const table = getDocumentTables(document)[0]!;

    expect(table.style?.pageBreakBefore).toBe(true);

    const layout = projectDocumentLayout(document);
    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0]!.blocks.map((block) => block.blockType)).toEqual([
      "paragraph",
    ]);
    expect(layout.pages[1]!.blocks[0]?.blockType).toBe("table");
    expect(layout.pages[1]!.blocks[0]?.sourceBlockId).toBe(table.id);
  });

  it("preserves complex document table cell shading, widths, and cell font sizes", async () => {
    const document = await importComplexDocument();
    const tables = getDocumentTables(document);
    const firstTable = tables[0];

    expect(firstTable).toBeDefined();
    expect(
      firstTable!.rows[0]!.cells.map((cell) => cell.style?.shading),
    ).toEqual(["#D9EAF7", "#D9EAF7", "#D9EAF7", "#D9EAF7"]);
    expect(firstTable!.rows[0]!.cells.map((cell) => cell.style?.width)).toEqual(
      [34, 326, 62.35, 62.35],
    );

    const tableFontSizes = tables.flatMap((table) =>
      table.rows.flatMap((row) =>
        row.cells.flatMap((cell) =>
          cell.blocks.flatMap((paragraph) =>
            paragraph.runs.map(
              (run) =>
                resolveEffectiveTextStyleForParagraph(
                  run.styles,
                  paragraph.style?.styleId,
                  document.styles,
                ).fontSize,
            ),
          ),
        ),
      ),
    );

    expect(tableFontSizes).toContain(12);
    expect(tableFontSizes).toContain(10.6667);
  });

  it("imports table grid column widths (gridCols) from DOCX", async () => {
    const document = await importLoremComplexDocument();
    const table = getDocumentTables(document)[0];

    expect(table).toBeDefined();
    // lorem_ipsum_complex_document.docx has 4 columns with w="2484" (124.2pt)
    expect(table!.gridCols).toBeDefined();
    expect(table!.gridCols).toHaveLength(4);
    table!.gridCols!.forEach((width) => {
      expect(width).toBeCloseTo(124.2, 1);
    });
  });

  it("keeps imported table layout height aligned with canvas table rendering", async () => {
    const document = await importLoremComplexDocument();
    const table = getDocumentTables(document)[0]!;
    const pageSettings =
      document.sections?.[0]?.pageSettings ?? document.pageSettings;
    const contentWidth = pageSettings ? getPageContentWidth(pageSettings) : 662;
    const estimatedHeight = estimateTableBlockHeight(
      table,
      document.styles,
      contentWidth,
    );
    const canvasLayout = buildCanvasTableLayout({
      table,
      state: createEditorStateFromDocument(document),
      pageIndex: 0,
      layoutMode: "fast",
      originX: 0,
      originY: 0,
      contentWidth,
      estimatedHeight,
    });

    expect(table.rows).toHaveLength(5);
    expect(estimatedHeight).toBeCloseTo(canvasLayout.height, 4);
  });

  it("imports individual table cell margins (tcMar) from DOCX", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcMar>
              <w:top w:w="200" w:type="dxa"/>
              <w:bottom w:w="100" w:type="dxa"/>
              <w:left w:w="300" w:type="dxa"/>
              <w:right w:w="400" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          <w:p><w:r><w:t>Cell with margins</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", documentXml);
    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const table = getDocumentTables(document)[0]!;
    const cellStyle = table.rows[0]!.cells[0]!.style;

    expect(cellStyle?.paddingTop).toBe(10); // 200 / 20
    expect(cellStyle?.paddingBottom).toBe(5); // 100 / 20
    expect(cellStyle?.paddingLeft).toBe(15); // 300 / 20
    expect(cellStyle?.paddingRight).toBe(20); // 400 / 20
  });

  it("imports table cell vertical alignment from DOCX", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc>
          <w:tcPr><w:vAlign w:val="top"/></w:tcPr>
          <w:p><w:r><w:t>Top</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:r><w:t>Middle</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:vAlign w:val="bottom"/></w:tcPr>
          <w:p><w:r><w:t>Bottom</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:vAlign w:val="both"/></w:tcPr>
          <w:p><w:r><w:t>Unsupported</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", documentXml);

    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const cells = getDocumentTables(document)[0]!.rows[0]!.cells;

    expect(cells[0]!.style?.verticalAlign).toBe("top");
    expect(cells[1]!.style?.verticalAlign).toBe("middle");
    expect(cells[2]!.style?.verticalAlign).toBe("bottom");
    expect(cells[3]!.style?.verticalAlign).toBeUndefined();
  });

  it("collapses auto-spacing (beforeAutospacing/afterAutospacing) margins in table cells", async () => {
    const zip = new JSZip();
    // Mirrors HTML-origin DOCX content (e.g. the OCJ model): every paragraph carries
    // auto spacing, so Word ignores the literal before/after values and collapses the
    // first paragraph's leading margin and the last paragraph's trailing margin against
    // the cell edge, and collapses the adjacent auto margins between paragraphs.
    const autoSpacing = `<w:spacing w:before="100" w:beforeAutospacing="1" w:after="100" w:afterAutospacing="1" w:line="240" w:lineRule="auto"/>`;
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc>
          <w:p><w:pPr>${autoSpacing}</w:pPr></w:p>
          <w:p><w:pPr>${autoSpacing}</w:pPr><w:r><w:t>OFICIO</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", documentXml);

    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const cellBlocks =
      getDocumentTables(document)[0]!.rows[0]!.cells[0]!.blocks;

    // First paragraph: leading auto margin collapses to 0 against the cell top.
    expect(cellBlocks[0]!.style?.spacingBefore).toBe(0);
    // Last paragraph: trailing auto margin collapses to 0 against the cell bottom
    // (this is the extra height that made oasis cells taller than Word).
    expect(cellBlocks[1]!.style?.spacingAfter).toBe(0);
    // Adjacent auto margins between the two paragraphs collapse to a single gap
    // (max) rather than summing before + after.
    expect(cellBlocks[1]!.style?.spacingBefore).toBe(0);
  });

  it("imports table cell borders and carries them through DOCX and PDF export", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tblGrid><w:gridCol w:w="2400"/></w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2400" w:type="dxa"/>
            <w:tcBorders>
              <w:top w:val="single" w:sz="8" w:space="0" w:color="112233"/>
              <w:right w:val="dashed" w:sz="12" w:space="0" w:color="445566"/>
              <w:bottom w:val="nil"/>
              <w:left w:val="dotted" w:sz="6" w:space="0" w:color="778899"/>
            </w:tcBorders>
          </w:tcPr>
          <w:p><w:r><w:t>Bordered cell</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", documentXml);

    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const cellStyle = getDocumentTables(document)[0]!.rows[0]!.cells[0]!.style;

    expect(cellStyle?.borderTop).toEqual({
      width: 1,
      type: "solid",
      color: "#112233",
    });
    expect(cellStyle?.borderRight).toEqual({
      width: 1.5,
      type: "dashed",
      color: "#445566",
    });
    expect(cellStyle?.borderBottom).toEqual({
      width: 0,
      type: "none",
      color: "transparent",
    });
    expect(cellStyle?.borderLeft).toEqual({
      width: 0.75,
      type: "dotted",
      color: "#778899",
    });

    const exportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const exportedDocumentXml = await exportedZip
      .file("word/document.xml")
      ?.async("string");
    expect(exportedDocumentXml).toContain(
      '<w:top w:val="single" w:sz="8" w:space="0" w:color="112233"/>',
    );
    expect(exportedDocumentXml).toContain(
      '<w:right w:val="dashed" w:sz="12" w:space="0" w:color="445566"/>',
    );
    expect(exportedDocumentXml).toContain('<w:bottom w:val="nil"/>');
    expect(exportedDocumentXml).toContain(
      '<w:left w:val="dotted" w:sz="6" w:space="0" w:color="778899"/>',
    );

    const pdf = await (await exportEditorDocumentToPdfBlob(document)).text();
    expect(pdf).toContain(pdfColorCommand("#112233", "RG"));
    expect(pdf).toContain(pdfColorCommand("#445566", "RG"));
    expect(pdf).toContain(pdfColorCommand("#778899", "RG"));
    expect(pdf).not.toContain("transparent");
  });

  it("wraps imported table cell text using the cell width", async () => {
    const document = await importComplexDocument();
    const technicalSpecsTable = getDocumentTables(document)[1];
    const storageSpecCell = technicalSpecsTable!.rows.find((row) =>
      row.cells[0]?.blocks.some((paragraph) =>
        paragraph.runs.some((run) => run.text.includes("Armazenamento")),
      ),
    )!.cells[1]!;
    const paragraph = storageSpecCell.blocks[0]!;
    const layout = await import("../../layoutProjection/index.js").then((m) =>
      m.projectParagraphLayout(
        paragraph,
        undefined,
        undefined,
        document.styles,
        getCellContentWidth(storageSpecCell),
      ),
    );

    expect(layout.lines.length).toBeGreaterThan(1);
    expect(
      layout.lines[0]!.fragments.map((fragment) => fragment.text).join(""),
    ).not.toContain("rápido");
  });

  it("propagates w:tblBorders to outer and inner cell edges, with cell-level override winning", async () => {
    const zip = new JSZip();
    // 2×2 table: tblBorders defines all 6 edges with distinct colors.
    // Cell (0,0) also sets an explicit tcBorder top to a different color.
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tblPr>
        <w:tblBorders>
          <w:top    w:val="single" w:sz="8"  w:space="0" w:color="AA0000"/>
          <w:left   w:val="single" w:sz="8"  w:space="0" w:color="00AA00"/>
          <w:bottom w:val="single" w:sz="8"  w:space="0" w:color="0000AA"/>
          <w:right  w:val="single" w:sz="8"  w:space="0" w:color="AAAA00"/>
          <w:insideH w:val="single" w:sz="6" w:space="0" w:color="AA00AA"/>
          <w:insideV w:val="single" w:sz="6" w:space="0" w:color="00AAAA"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="2400"/>
        <w:gridCol w:w="2400"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2400" w:type="dxa"/>
            <w:tcBorders>
              <w:top w:val="single" w:sz="16" w:space="0" w:color="FF0000"/>
            </w:tcBorders>
          </w:tcPr>
          <w:p><w:r><w:t>R0C0</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>R0C1</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>R1C0</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>R1C1</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", documentXml);

    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const rows = getDocumentTables(document)[0]!.rows;
    const r0c0 = rows[0]!.cells[0]!.style;
    const r0c1 = rows[0]!.cells[1]!.style;
    const r1c0 = rows[1]!.cells[0]!.style;
    const r1c1 = rows[1]!.cells[1]!.style;

    // Cell-level tcBorder top overrides tblBorder top for R0C0.
    expect(r0c0?.borderTop?.color).toBe("#FF0000");

    // Table outer borders on first row.
    expect(r0c1?.borderTop?.color).toBe("#AA0000");
    // Table left border on first column.
    expect(r0c0?.borderLeft?.color).toBe("#00AA00");
    // Table right border on last column.
    expect(r0c1?.borderRight?.color).toBe("#AAAA00");

    // insideH → bottom edge of non-last rows.
    expect(r0c0?.borderBottom?.color).toBe("#AA00AA");
    expect(r0c1?.borderBottom?.color).toBe("#AA00AA");

    // insideV → right edge of non-last columns.
    expect(r0c0?.borderRight?.color).toBe("#00AAAA");
    expect(r1c0?.borderRight?.color).toBe("#00AAAA");

    // Table outer borders on last row.
    expect(r1c0?.borderBottom?.color).toBe("#0000AA");
    expect(r1c1?.borderBottom?.color).toBe("#0000AA");

    // Table left/right on last row.
    expect(r1c0?.borderLeft?.color).toBe("#00AA00");
    expect(r1c1?.borderRight?.color).toBe("#AAAA00");
  });
});
