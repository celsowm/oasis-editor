import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

async function importSectionRevisionDocument() {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${WORD_NS}"><w:body>
      <w:p><w:r><w:t>Section one</w:t></w:r></w:p>
      <w:sectPr>
        <w:type w:val="nextPage"/>
        <w:pgSz w:w="12240" w:h="15840"/>
        <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
        <w:sectPrChange w:id="30" w:author="Section Author" w:date="2026-02-04T05:06:07Z">
          <w:sectPr>
            <w:type w:val="continuous"/>
            <w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>
            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
            <w:pgNumType w:start="7" w:fmt="upperRoman"/>
            <w:vAlign w:val="center"/>
            <w:bidi/>
          </w:sectPr>
        </w:sectPrChange>
      </w:sectPr>
      <w:p><w:r><w:t>Section two</w:t></w:r></w:p>
      <w:sectPr>
        <w:pgSz w:w="12240" w:h="15840"/>
        <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      </w:sectPr>
    </w:body></w:document>`,
  );
  return importDocxToEditorDocument(await zip.generateAsync({ type: "arraybuffer" }));
}

describe("DOCX section property revisions", () => {
  it("imports the previous sectPr snapshot with explicit next-break semantics", async () => {
    const document = await importSectionRevisionDocument();
    const first = document.sections![0]!;
    expect(first.propertyRevision).toMatchObject({
      id: "30",
      type: "property",
      author: "Section Author",
      previous: {
        nextBreakType: "continuous",
        pageNumbering: { start: 7, format: "upperRoman" },
        verticalAlignment: "center",
        bidi: true,
      },
    });
    expect(first.propertyRevision?.previous.pageSettings.orientation).toBe("landscape");
    expect(document.sections![1]!.breakType).toBe("nextPage");
  });

  it("rebuilds edited section properties while retaining the previous sectPr", async () => {
    const document = await importSectionRevisionDocument();
    const first = document.sections![0]!;
    first.pageSettings = {
      ...first.pageSettings,
      margins: { ...first.pageSettings.margins, top: 120 },
    };
    first.pageNumbering = { start: 3, format: "decimal" };

    const exported = await exportEditorDocumentToDocx(document);
    const zip = await JSZip.loadAsync(exported);
    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
    expect(xml.match(/<w:sectPrChange\b/g)).toHaveLength(1);
    expect(xml).toMatch(/<w:sectPrChange\b[^>]*w:id="30"[^>]*w:author="Section Author"[^>]*>[\s\S]*?<w:sectPr>[\s\S]*?<w:type w:val="continuous"\/>[\s\S]*?<w:pgSz w:w="15840" w:h="12240" w:orient="landscape"\/>[\s\S]*?<w:pgNumType w:start="7" w:fmt="upperRoman"\/>[\s\S]*?<w:vAlign w:val="center"\/>[\s\S]*?<w:bidi\/>[\s\S]*?<\/w:sectPr>[\s\S]*?<\/w:sectPrChange>/);

    const reimported = await importDocxToEditorDocument(exported);
    expect(reimported.sections![0]!.propertyRevision).toMatchObject({
      id: "30",
      previous: { nextBreakType: "continuous", pageNumbering: { start: 7 } },
    });
  });
});
