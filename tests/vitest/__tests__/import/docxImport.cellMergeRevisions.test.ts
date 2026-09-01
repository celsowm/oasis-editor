import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { EditorParagraphNode, EditorTableNode } from "@/core/model.js";
import { projectTrackedRevisions } from "@/core/document/trackedRevisions.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function paragraphText(cell: EditorTableNode["rows"][number]["cells"][number]): string {
  return cell.blocks
    .filter((block): block is EditorParagraphNode => block.type === "paragraph")
    .flatMap((block) => block.runs)
    .map((run) => run.text)
    .join("");
}

async function importMergeDocument(
  currentSecond: "restart" | "continue",
  originalSecond: "restart" | "continue",
) {
  const zip = new JSZip();
  const currentToken = currentSecond === "restart" ? "rest" : "cont";
  const originalToken = originalSecond === "restart" ? "rest" : "cont";
  const currentElement = currentSecond === "restart"
    ? '<w:vMerge w:val="restart"/>'
    : '<w:vMerge/>';
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}"><w:body><w:tbl>
      <w:tblGrid><w:gridCol w:w="3000"/></w:tblGrid>
      <w:tr><w:tc><w:tcPr><w:vMerge w:val="restart"/></w:tcPr><w:p><w:r><w:t>Top</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:tcPr>${currentElement}<w:cellMerge w:id="50" w:author="Merge Author" w:date="2026-02-07T06:07:08Z" w:vMergeOrig="${originalToken}" w:vMerge="${currentToken}"/></w:tcPr><w:p><w:r><w:t>Bottom original</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl><w:sectPr/></w:body></w:document>`,
  );
  return importDocxToEditorDocument(await zip.generateAsync({ type: "arraybuffer" }));
}

describe("DOCX tracked vertical cell merges", () => {
  it("captures hidden pre-merge content and restores it in Original view", async () => {
    const document = await importMergeDocument("continue", "restart");
    const table = document.sections![0]!.blocks[0] as EditorTableNode;
    const currentTop = table.rows[0]!.cells[0]!;
    const currentBottom = table.rows[1]!.cells[0]!;

    expect(currentTop.rowSpan).toBe(2);
    expect(currentBottom.vMerge).toBe("continue");
    expect(currentBottom.blocks).toEqual([]);
    expect(currentBottom.style?.revision).toMatchObject({
      id: "50", type: "merge", previous: { vMerge: "restart" },
    });
    expect(currentBottom.mergeRevisionState).toMatchObject({
      revisionId: "50", orientation: "vertical", currentCellCount: 1,
    });
    expect(paragraphText(currentBottom.mergeRevisionState!.previousCells[0]!)).toBe(
      "Bottom original",
    );

    const original = projectTrackedRevisions(document, "original");
    expect(original.complete).toBe(true);
    const originalTable = original.document.sections![0]!.blocks[0] as EditorTableNode;
    expect(originalTable.rows[0]!.cells[0]!.rowSpan).toBe(1);
    expect(originalTable.rows[1]!.cells[0]!.vMerge).toBe("restart");
    expect(originalTable.rows[1]!.cells[0]!.rowSpan).toBe(1);
    expect(paragraphText(originalTable.rows[1]!.cells[0]!)).toBe("Bottom original");
    expect(originalTable.rows[1]!.cells[0]!.style?.revision).toBeUndefined();
    expect(originalTable.rows[1]!.cells[0]!.mergeRevisionState).toBeUndefined();

    const exported = await exportEditorDocumentToDocx(original.document);
    const exportedZip = await JSZip.loadAsync(exported);
    const xml = (await exportedZip.file("word/document.xml")?.async("string")) ?? "";
    expect(xml).not.toContain("cellMerge");
    expect(xml.split('<w:vMerge w:val="restart"/>').length - 1).toBe(2);

    const reimported = await importDocxToEditorDocument(exported);
    const reimportedTable = reimported.sections![0]!.blocks[0] as EditorTableNode;
    expect(paragraphText(reimportedTable.rows[1]!.cells[0]!)).toBe("Bottom original");
  });

  it("restores a previous continuation and recalculates the anchor rowSpan", async () => {
    const document = await importMergeDocument("restart", "continue");
    const table = document.sections![0]!.blocks[0] as EditorTableNode;
    expect(table.rows[1]!.cells[0]!.style?.revision?.previous).toEqual({
      vMerge: "continue",
    });

    const original = projectTrackedRevisions(document, "original");
    expect(original.complete).toBe(true);
    const originalTable = original.document.sections![0]!.blocks[0] as EditorTableNode;
    expect(originalTable.rows[0]!.cells[0]!.rowSpan).toBe(2);
    expect(originalTable.rows[1]!.cells[0]!.vMerge).toBe("continue");
    expect(originalTable.rows[1]!.cells[0]!.blocks).toEqual([]);

    const final = projectTrackedRevisions(document, "final");
    expect(final.complete).toBe(true);
    const finalTable = final.document.sections![0]!.blocks[0] as EditorTableNode;
    expect(finalTable.rows[0]!.cells[0]!.rowSpan).toBe(1);
    expect(finalTable.rows[1]!.cells[0]!.vMerge).toBe("restart");
    expect(finalTable.rows[1]!.cells[0]!.rowSpan).toBe(1);
    expect(paragraphText(finalTable.rows[1]!.cells[0]!)).toBe("Bottom original");
  });

  it("parses the exporter rest/cont tokens without flipping vMergeOrig", async () => {
    const document = await importMergeDocument("continue", "restart");
    const exported = await exportEditorDocumentToDocx(document);
    const reimported = await importDocxToEditorDocument(exported);
    const table = reimported.sections![0]!.blocks[0] as EditorTableNode;
    expect(table.rows[1]!.cells[0]!.style?.revision?.previous).toEqual({
      vMerge: "restart",
    });
  });
});
