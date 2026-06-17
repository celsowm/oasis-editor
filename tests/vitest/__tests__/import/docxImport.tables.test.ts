import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { exportEditorDocumentToPdfBlob } from "@/export/pdf/exportEditorDocumentToPdf.js";
import type { EditorTableCellNode } from "@/core/model.js";
import {
  getPageContentWidth,
  resolveEffectiveTextStyleForParagraph,
} from "@/core/model.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import {
  estimateTableBlockHeight,
  projectDocumentLayout,
} from "@/layoutProjection/index.js";
import { buildCanvasTableLayout } from "@/ui/canvas/CanvasTableLayout.js";
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
    const layout = await import("@/layoutProjection/index.js").then((m) =>
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

async function buildDocxWithTableProps(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="2500" w:type="pct"/>
        <w:jc w:val="center"/>
        <w:tblCellSpacing w:w="120" w:type="dxa"/>
        <w:tblInd w:w="720" w:type="dxa"/>
        <w:tblLayout w:type="autofit"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="2880"/>
        <w:gridCol w:w="2880"/>
      </w:tblGrid>
      <w:tr>
        <w:tblPrEx>
          <w:tblCellSpacing w:w="80" w:type="dxa"/>
          <w:tblLayout w:type="fixed"/>
        </w:tblPrEx>
        <w:trPr>
          <w:gridBefore w:val="1"/>
          <w:gridAfter w:val="2"/>
          <w:wBefore w:w="600" w:type="dxa"/>
          <w:wAfter w:w="500" w:type="pct"/>
          <w:trHeight w:val="480" w:hRule="exact"/>
          <w:tblHeader/>
        </w:trPr>
        <w:tc><w:p><w:r><w:t>Cell</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:trPr>
          <w:wBefore w:w="0" w:type="auto"/>
        </w:trPr>
        <w:tc><w:p><w:r><w:t>Cell 2</w:t></w:r></w:p></w:tc>
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

async function buildDocxWithAdvancedTableProps(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="dxa"/>
        <w:tblpPr w:leftFromText="120" w:rightFromText="160" w:vertAnchor="page" w:horzAnchor="margin" w:tblpX="240" w:tblpY="360"/>
        <w:tblCellMar>
          <w:top w:w="120" w:type="dxa"/>
          <w:start w:w="180" w:type="dxa"/>
          <w:end w:w="220" w:type="dxa"/>
        </w:tblCellMar>
        <w:bidiVisual/>
        <w:tblOverlap w:val="never"/>
        <w:tblPrChange w:id="1" w:author="A" w:date="2026-06-12T00:00:00Z"><w:tblPr/></w:tblPrChange>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="1800"/>
        <w:gridCol w:w="1800"/>
        <w:tblGridChange w:id="2" w:author="A" w:date="2026-06-12T00:00:00Z"><w:tblGrid/></w:tblGridChange>
      </w:tblGrid>
      <w:tr>
        <w:trPr>
          <w:tblCellSpacing w:w="40" w:type="dxa"/>
          <w:cantSplit/>
          <w:trPrChange w:id="3" w:author="A" w:date="2026-06-12T00:00:00Z"><w:trPr/></w:trPrChange>
        </w:trPr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1800" w:type="dxa"/>
            <w:noWrap/>
            <w:tcFitText/>
            <w:headers w:val="h1 h2"/>
            <w:tcMar>
              <w:start w:w="300" w:type="dxa"/>
              <w:end w:w="340" w:type="dxa"/>
            </w:tcMar>
            <w:tcBorders>
              <w:start w:val="single" w:sz="16" w:space="0" w:color="FF0000"/>
              <w:end w:val="dashed" w:sz="8" w:space="0" w:color="00FF00"/>
              <w:tl2br w:val="dotted" w:sz="4" w:space="0" w:color="0000FF"/>
              <w:tr2bl w:val="single" w:sz="12" w:space="0" w:color="111111"/>
            </w:tcBorders>
            <w:textDirection w:val="tbRl"/>
            <w:hideMark/>
            <w:cellMerge w:id="4" w:author="A" w:date="2026-06-12T00:00:00Z" w:vMerge="cont"/>
          </w:tcPr>
          <w:p><w:r><w:t>Advanced cell</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:p><w:r><w:t>Second</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:trPr><w:hidden/></w:trPr>
        <w:tc><w:p><w:r><w:t>Hidden row</w:t></w:r></w:p></w:tc>
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

async function readExportedDocumentXml(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) {
    throw new Error("Missing word/document.xml");
  }
  return xml;
}

describe("DOCX table property round-trip", () => {
  it("imports table-level and row-level properties", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocxWithTableProps(),
    );
    const table = getDocumentTables(document)[0]!;

    expect(table.style?.styleId).toBe("TableGrid");
    expect(table.style?.width).toBe("50%");
    expect(table.style?.align).toBe("center");
    expect(table.style?.cellSpacing).toBe(6);
    expect(table.style?.indentLeft).toBe(36);
    expect(table.style?.layout).toBe("autofit");

    const row = table.rows[0]!;
    expect(row.style?.gridBefore).toBe(1);
    expect(row.style?.gridAfter).toBe(2);
    expect(row.style?.widthBefore).toBe(30);
    expect(row.style?.widthAfter).toBe("10%");
    expect(row.style?.height).toBe(24);
    expect(row.style?.heightRule).toBe("exact");
    expect(row.isHeader).toBe(true);
    expect(row.tblPrExXml).toContain("tblPrEx");
    expect(row.tblPrExXml).toContain("tblCellSpacing");

    expect(table.rows[1]!.style?.widthBefore).toBe("auto");
  });

  it("round-trips table properties through export", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocxWithTableProps(),
    );
    const xml = await readExportedDocumentXml(
      await exportEditorDocumentToDocx(document),
    );

    expect(xml).toContain('<w:tblStyle w:val="TableGrid"/>');
    expect(xml).toContain('<w:tblW w:w="2500" w:type="pct"/>');
    expect(xml).toContain('<w:jc w:val="center"/>');
    expect(xml).toContain('<w:tblCellSpacing w:w="120" w:type="dxa"/>');
    expect(xml).toContain('<w:tblInd w:w="720" w:type="dxa"/>');
    expect(xml).toContain('<w:tblLayout w:type="autofit"/>');
    expect(xml).toContain('<w:gridBefore w:val="1"/>');
    expect(xml).toContain('<w:gridAfter w:val="2"/>');
    expect(xml).toContain('<w:wBefore w:w="600" w:type="dxa"/>');
    expect(xml).toContain('<w:wAfter w:w="500" w:type="pct"/>');
    expect(xml).toContain('<w:trHeight w:val="480" w:hRule="exact"/>');
    expect(xml).toContain("<w:tblHeader/>");
    expect(xml).toContain('<w:wBefore w:w="0" w:type="auto"/>');
    expect(xml).toContain("tblPrEx");

    // tblPr child ordering: tblW < jc < tblCellSpacing < tblInd < tblLayout
    expect(xml.indexOf("<w:tblW")).toBeLessThan(xml.indexOf("<w:jc"));
    expect(xml.indexOf("<w:jc")).toBeLessThan(xml.indexOf("<w:tblCellSpacing"));
    expect(xml.indexOf("<w:tblCellSpacing")).toBeLessThan(
      xml.indexOf("<w:tblInd"),
    );
    expect(xml.indexOf("<w:tblInd")).toBeLessThan(xml.indexOf("<w:tblLayout"));

    // trPr child ordering: gridBefore < gridAfter < wBefore < wAfter < trHeight < tblHeader
    expect(xml.indexOf("<w:gridBefore")).toBeLessThan(
      xml.indexOf("<w:gridAfter"),
    );
    expect(xml.indexOf("<w:gridAfter")).toBeLessThan(xml.indexOf("<w:wBefore"));
    expect(xml.indexOf("<w:wBefore")).toBeLessThan(xml.indexOf("<w:wAfter"));
    expect(xml.indexOf("<w:wAfter")).toBeLessThan(xml.indexOf("<w:trHeight"));
    expect(xml.indexOf("<w:trHeight")).toBeLessThan(
      xml.indexOf("<w:tblHeader"),
    );

    // tblPrEx must precede trPr inside the row.
    expect(xml.indexOf("tblPrEx")).toBeLessThan(xml.indexOf("<w:trPr"));
  });

  it("round-trips advanced table metadata and layout-visible flags", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocxWithAdvancedTableProps(),
    );
    const table = getDocumentTables(document)[0]!;
    const row = table.rows[0]!;
    const cell = row.cells[0]!;

    expect(table.style).toMatchObject({
      bidiVisual: true,
      tblOverlap: "never",
      floating: {
        leftFromText: "120",
        rightFromText: "160",
        vertAnchor: "page",
        horzAnchor: "margin",
        tblpX: "240",
        tblpY: "360",
      },
      defaultCellMargins: {
        top: 6,
        start: 9,
        end: 11,
      },
    });
    expect(table.style?.revisionXml?.join("")).toContain("tblPrChange");
    expect(table.tblGridChangeXml).toContain("tblGridChange");
    expect(row.style).toMatchObject({
      cellSpacing: 2,
      cantSplit: true,
    });
    expect(row.style?.revisionXml?.join("")).toContain("trPrChange");
    expect(table.rows[1]!.style?.hidden).toBe(true);
    expect(cell.style).toMatchObject({
      paddingTop: 6,
      paddingStart: 15,
      paddingEnd: 17,
      noWrap: true,
      fitText: true,
      hideMark: true,
      headers: "h1 h2",
      textDirection: "tbRl",
    });
    expect(cell.style?.borderStart).toMatchObject({
      width: 2,
      type: "solid",
      color: "#FF0000",
    });
    expect(cell.style?.borderEnd).toMatchObject({
      width: 1,
      type: "dashed",
      color: "#00FF00",
    });
    expect(cell.style?.borderTopLeftToBottomRight).toMatchObject({
      width: 0.5,
      type: "dotted",
      color: "#0000FF",
    });
    expect(cell.style?.revisionXml?.join("")).toContain("cellMerge");

    const state = createEditorStateFromDocument(document);
    const layout = buildCanvasTableLayout({
      table,
      state,
      pageIndex: 0,
      originX: 100,
      originY: 50,
      contentWidth: 624,
      estimatedHeight: 80,
    });
    expect(layout.rowHeights[1]).toBe(0);
    expect(layout.cells.length).toBe(2);
    expect(layout.cells[0]!.left).toBeGreaterThan(layout.cells[1]!.left);

    const xml = await readExportedDocumentXml(
      await exportEditorDocumentToDocx(document),
    );
    expect(xml).toContain("<w:tblpPr ");
    expect(xml).toContain('w:tblpX="240"');
    expect(xml).toContain("<w:bidiVisual/>");
    expect(xml).toContain('<w:tblOverlap w:val="never"/>');
    expect(xml).toContain("<w:tblCellMar>");
    expect(xml).toContain('<w:start w:w="180" w:type="dxa"/>');
    expect(xml).toContain("<w:tblPrChange");
    expect(xml).toContain("<w:tblGridChange");
    expect(xml).toContain('<w:tblCellSpacing w:w="40" w:type="dxa"/>');
    expect(xml).toContain("<w:cantSplit/>");
    expect(xml).toContain("<w:trPrChange");
    expect(xml).toContain("<w:hidden/>");
    expect(xml).toContain("<w:noWrap/>");
    expect(xml).toContain("<w:tcFitText/>");
    expect(xml).toContain('<w:headers w:val="h1 h2"/>');
    expect(xml).toContain('<w:start w:val="single" w:sz="16"');
    expect(xml).toContain('<w:end w:val="dashed" w:sz="8"');
    expect(xml).toContain('<w:tl2br w:val="dotted" w:sz="4"');
    expect(xml).toContain("<w:hideMark/>");
    expect(xml).toContain("<w:cellMerge");
  });
});

describe("table negative indent", () => {
  it("imports a negative tblInd and positions the table left of the content origin", async () => {
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="dxa"/>
        <w:tblInd w:w="-856" w:type="dxa"/>
      </w:tblPr>
      <w:tr><w:tc><w:p><w:r><w:t>Cell</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
    );
    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const table = getDocumentTables(document)[0]!;

    // -856 twips / 20 = -42.8 pt
    expect(table.style?.indentLeft).toBeCloseTo(-42.8, 1);

    // Canvas layout: originX=100, indentLeft=-42.8pt → left = 100 - 42.8*(96/72) ≈ 43
    const { buildCanvasTableLayout } =
      await import("@/ui/canvas/CanvasTableLayout.js");
    const { createEditorStateFromDocument } =
      await import("@/core/editorState.js");
    const state = createEditorStateFromDocument(document);
    const layout = buildCanvasTableLayout({
      table,
      state,
      pageIndex: 0,
      originX: 100,
      originY: 0,
      contentWidth: 624,
      estimatedHeight: 20,
    });
    // originX + toPx(-42.8) = 100 + (-42.8 * 96/72) ≈ 43
    expect(layout.left).toBeLessThan(100);
  });
});

describe("table style conditional formatting", () => {
  it("applies firstRow shading from a named table style to header row cells", async () => {
    const zip = new JSZip();
    zip.file(
      "word/styles.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="table" w:styleId="GreenHeader">
    <w:name w:val="Green Header"/>
    <w:tblStylePr w:type="firstRow">
      <w:tcPr>
        <w:shd w:val="clear" w:color="auto" w:fill="196B24"/>
      </w:tcPr>
    </w:tblStylePr>
    <w:tblStylePr w:type="lastRow">
      <w:tcPr>
        <w:shd w:val="clear" w:color="auto" w:fill="AAAAAA"/>
      </w:tcPr>
    </w:tblStylePr>
  </w:style>
</w:styles>`,
    );
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tblPr><w:tblStyle w:val="GreenHeader"/></w:tblPr>
      <w:tr>
        <w:trPr>
          <w:cnfStyle w:val="100000000000" w:firstRow="1" w:lastRow="0"/>
        </w:trPr>
        <w:tc><w:p><w:r><w:t>Header A</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Header B</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Body</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Row</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:trPr>
          <w:cnfStyle w:val="010000000000" w:firstRow="0" w:lastRow="1"/>
        </w:trPr>
        <w:tc><w:p><w:r><w:t>Footer</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Row</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
    );
    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const table = getDocumentTables(document)[0]!;

    // First row (firstRow=1): both cells should get the green shading
    expect(table.rows[0]!.cells[0]!.style?.shading).toBe("#196B24");
    expect(table.rows[0]!.cells[1]!.style?.shading).toBe("#196B24");

    // Middle row: no conditional shading
    expect(table.rows[1]!.cells[0]!.style?.shading).toBeUndefined();

    // Last row (lastRow=1): grey shading
    expect(table.rows[2]!.cells[0]!.style?.shading).toBe("#AAAAAA");
  });

  it("does not overwrite explicit cell shading with the conditional format shading", async () => {
    const zip = new JSZip();
    zip.file(
      "word/styles.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="table" w:styleId="GreenHeader">
    <w:name w:val="Green Header"/>
    <w:tblStylePr w:type="firstRow">
      <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="196B24"/></w:tcPr>
    </w:tblStylePr>
  </w:style>
</w:styles>`,
    );
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tblPr><w:tblStyle w:val="GreenHeader"/></w:tblPr>
      <w:tr>
        <w:trPr><w:cnfStyle w:val="100000000000" w:firstRow="1"/></w:trPr>
        <w:tc>
          <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="FF0000"/></w:tcPr>
          <w:p><w:r><w:t>Red explicit</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:p><w:r><w:t>No explicit shading</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
    );
    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const table = getDocumentTables(document)[0]!;

    // Explicit red shading on the cell takes priority over the style's green
    expect(table.rows[0]!.cells[0]!.style?.shading).toBe("#FF0000");
    // Second cell has no explicit shading → gets the conditional green
    expect(table.rows[0]!.cells[1]!.style?.shading).toBe("#196B24");
  });

  it("resolves position-based conditional formatting (header, bold first column, banding) gated by tblLook", async () => {
    const zip = new JSZip();
    // Mirrors the real-world "Table1" style: teal firstRow with white bold text,
    // bold firstCol, light-blue band1Horz and band1Vert. tblLook="04A0" enables
    // firstRow + firstColumn and disables vertical banding (noVBand).
    zip.file(
      "word/styles.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="table" w:styleId="Table1">
    <w:name w:val="Table1"/>
    <w:tblPr>
      <w:tblStyleRowBandSize w:val="1"/>
      <w:tblStyleColBandSize w:val="1"/>
    </w:tblPr>
    <w:tblStylePr w:type="band1Horz">
      <w:tcPr><w:shd w:val="clear" w:fill="dbeef3"/></w:tcPr>
    </w:tblStylePr>
    <w:tblStylePr w:type="band1Vert">
      <w:tcPr><w:shd w:val="clear" w:fill="dbeef3"/></w:tcPr>
    </w:tblStylePr>
    <w:tblStylePr w:type="firstCol">
      <w:rPr><w:b w:val="1"/></w:rPr>
    </w:tblStylePr>
    <w:tblStylePr w:type="firstRow">
      <w:rPr><w:b w:val="1"/><w:color w:val="ffffff"/></w:rPr>
      <w:tcPr><w:shd w:val="clear" w:fill="4bacc6"/></w:tcPr>
    </w:tblStylePr>
  </w:style>
</w:styles>`,
    );
    // Three rows × two columns, with NO per-row w:cnfStyle markers — Word derives
    // all formatting from cell position + tblLook.
    const cell = (text: string) =>
      `<w:tc><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:tc>`;
    const row = (a: string, b: string) => `<w:tr>${cell(a)}${cell(b)}</w:tr>`;
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tblPr><w:tblStyle w:val="Table1"/><w:tblLook w:val="04A0"/></w:tblPr>
      ${row("Head A", "Head B")}
      ${row("Data 1", "Val 1")}
      ${row("Data 2", "Val 2")}
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
    );
    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const table = getDocumentTables(document)[0]!;
    const firstRun = (cell: EditorTableCellNode) => cell.blocks[0]!.runs[0]!;

    // Header row: teal fill on every cell, white bold run text.
    expect(table.rows[0]!.cells[0]!.style?.shading).toBe("#4BACC6");
    expect(table.rows[0]!.cells[1]!.style?.shading).toBe("#4BACC6");
    expect(firstRun(table.rows[0]!.cells[0]!).styles).toMatchObject({
      bold: true,
      color: "#FFFFFF",
    });

    // First body row → band1Horz light blue; first column bold.
    expect(table.rows[1]!.cells[0]!.style?.shading).toBe("#DBEEF3");
    expect(firstRun(table.rows[1]!.cells[0]!).styles?.bold).toBe(true);
    // Second column is NOT bold and (noVBand) has the same row banding, not a
    // vertical band override.
    expect(firstRun(table.rows[1]!.cells[1]!).styles?.bold).toBeUndefined();
    expect(table.rows[1]!.cells[1]!.style?.shading).toBe("#DBEEF3");

    // Second body row → band2Horz (no fill defined) = unshaded.
    expect(table.rows[2]!.cells[0]!.style?.shading).toBeUndefined();
    // First column still bold across body rows.
    expect(firstRun(table.rows[2]!.cells[0]!).styles?.bold).toBe(true);
  });
});
