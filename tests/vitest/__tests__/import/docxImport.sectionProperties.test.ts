import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { getDocumentSections } from "@/core/model.js";
import { projectDocumentLayout } from "@/layoutProjection/index.js";

const PG_SZ = `<w:pgSz w:w="12240" w:h="15840"/>`;
const PG_MAR = `<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>`;

/** Build a single-section DOCX whose sectPr carries the given extra markup. */
async function importSingleSectionSectionPr(
  sectPrExtra: string,
  bodyContent = `<w:p><w:r><w:t>Body</w:t></w:r></w:p>`,
) {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyContent}<w:sectPr>${sectPrExtra}${PG_SZ}${PG_MAR}</w:sectPr></w:body>
</w:document>`,
  );
  return importDocxToEditorDocument(
    await zip.generateAsync({ type: "arraybuffer" }),
  );
}

/**
 * Build a two-section DOCX where the first section ends with a sectPr nested
 * inside the last paragraph's `w:pPr` (the way Word writes intermediate breaks),
 * and the second section ends with the body-direct sectPr.
 */
async function importTwoSectionDocx(firstSectPrExtra: string) {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Section one</w:t></w:r></w:p>
    <w:p>
      <w:pPr>
        <w:sectPr>${firstSectPrExtra}${PG_SZ}${PG_MAR}</w:sectPr>
      </w:pPr>
    </w:p>
    <w:p><w:r><w:t>Section two</w:t></w:r></w:p>
    <w:sectPr>${PG_SZ}${PG_MAR}</w:sectPr>
  </w:body>
</w:document>`,
  );
  return importDocxToEditorDocument(
    await zip.generateAsync({ type: "arraybuffer" }),
  );
}

async function reexportDocumentXml(
  document: Awaited<ReturnType<typeof importDocxToEditorDocument>>,
) {
  const zip = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
  return (await zip.file("word/document.xml")?.async("string")) ?? "";
}

describe("DOCX section break type (w:type)", () => {
  it("maps the break type onto the following section (off-by-one)", async () => {
    const document = await importTwoSectionDocx(`<w:type w:val="continuous"/>`);
    const sections = getDocumentSections(document);
    expect(sections).toHaveLength(2);
    expect(sections[0]!.breakType).toBeUndefined();
    expect(sections[1]!.breakType).toBe("continuous");
  });

  it("preserves evenPage / oddPage / nextColumn break types", async () => {
    for (const value of ["evenPage", "oddPage", "nextColumn"] as const) {
      const document = await importTwoSectionDocx(
        `<w:type w:val="${value}"/>`,
      );
      const sections = getDocumentSections(document);
      expect(sections[1]!.breakType).toBe(value);
    }
  });

  it("round-trips w:type back onto the previous section's sectPr", async () => {
    const document = await importTwoSectionDocx(`<w:type w:val="continuous"/>`);
    const xml = await reexportDocumentXml(document);
    const firstSectPr = xml.match(/<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>/)?.[0];
    expect(firstSectPr).toBeDefined();
    expect(firstSectPr).toMatch(/<w:type w:val="continuous"\/>/);
    const lastSectPr = xml.match(/.*(<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>)/)?.[1];
    expect(lastSectPr).toBeDefined();
    expect(lastSectPr).not.toMatch(/<w:type\b/);
  });

  it("renders a continuous section on the same page as the previous one", async () => {
    const document = await importTwoSectionDocx(`<w:type w:val="continuous"/>`);
    const layout = projectDocumentLayout(document);
    expect(layout.pages.length).toBe(1);
  });

  it("starts a nextPage section on a fresh page", async () => {
    const document = await importTwoSectionDocx(`<w:type w:val="nextPage"/>`);
    const sections = getDocumentSections(document);
    expect(sections[1]!.breakType).toBe("nextPage");
    const layout = projectDocumentLayout(document);
    expect(layout.pages.length).toBe(2);
  });
});

describe("DOCX page numbering (w:pgNumType)", () => {
  it("parses start, format, chapter style and separator", async () => {
    const document = await importSingleSectionSectionPr(
      `<w:pgNumType w:start="5" w:fmt="upperRoman" w:chapStyle="Heading1" w:chapSep="hyphen"/>`,
    );
    const section = getDocumentSections(document)[0]!;
    expect(section.pageNumbering).toEqual({
      start: 5,
      format: "upperRoman",
      chapterStyle: "Heading1",
      chapterSeparator: "hyphen",
    });
  });

  it("round-trips w:pgNumType attributes", async () => {
    const document = await importSingleSectionSectionPr(
      `<w:pgNumType w:start="3" w:fmt="lowerLetter"/>`,
    );
    const xml = await reexportDocumentXml(document);
    expect(xml).toMatch(/<w:pgNumType w:start="3" w:fmt="lowerLetter"\/>/);
  });

  it("omits w:pgNumType when absent", async () => {
    const document = await importSingleSectionSectionPr(``);
    const section = getDocumentSections(document)[0]!;
    expect(section.pageNumbering).toBeUndefined();
  });
});

describe("DOCX section vertical alignment (w:vAlign)", () => {
  it("parses non-default vertical alignment", async () => {
    const document = await importSingleSectionSectionPr(
      `<w:vAlign w:val="center"/>`,
    );
    const section = getDocumentSections(document)[0]!;
    expect(section.verticalAlignment).toBe("center");
  });

  it("round-trips w:vAlign", async () => {
    const document = await importSingleSectionSectionPr(
      `<w:vAlign w:val="bottom"/>`,
    );
    const xml = await reexportDocumentXml(document);
    expect(xml).toMatch(/<w:vAlign w:val="bottom"\/>/);
  });

  it("omits w:vAlign for the default (top)", async () => {
    const document = await importSingleSectionSectionPr(
      `<w:vAlign w:val="top"/>`,
    );
    const section = getDocumentSections(document)[0]!;
    expect(section.verticalAlignment).toBeUndefined();
  });
});

describe("DOCX section bidi (w:bidi)", () => {
  it("parses an on/off bidi element", async () => {
    const document = await importSingleSectionSectionPr(`<w:bidi/>`);
    const section = getDocumentSections(document)[0]!;
    expect(section.bidi).toBe(true);
  });

  it("treats w:bidi w:val='0' as off", async () => {
    const document = await importSingleSectionSectionPr(
      `<w:bidi w:val="0"/>`,
    );
    const section = getDocumentSections(document)[0]!;
    expect(section.bidi).toBeFalsy();
  });

  it("round-trips w:bidi", async () => {
    const document = await importSingleSectionSectionPr(`<w:bidi/>`);
    const xml = await reexportDocumentXml(document);
    expect(xml).toMatch(/<w:bidi\/>/);
  });
});

describe("DOCX paragraph-scoped sectPr (intermediate section breaks)", () => {
  it("splits the body into multiple sections via pPr/sectPr", async () => {
    const document = await importTwoSectionDocx(``);
    const sections = getDocumentSections(document);
    expect(sections).toHaveLength(2);
    expect(sections[0]!.blocks).toHaveLength(2);
    expect(sections[1]!.blocks).toHaveLength(1);
  });

  it("preserves all section properties together in a multi-section doc", async () => {
    const document = await importTwoSectionDocx(
      `<w:type w:val="continuous"/><w:pgNumType w:start="10"/>`,
    );
    const sections = getDocumentSections(document);
    expect(sections[1]!.breakType).toBe("continuous");
    expect(sections[0]!.pageNumbering).toEqual({ start: 10 });
    const xml = await reexportDocumentXml(document);
    const firstSectPr = xml.match(/<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>/)?.[0];
    expect(firstSectPr).toMatch(/<w:type w:val="continuous"\/>/);
    expect(firstSectPr).toMatch(/<w:pgNumType w:start="10"\/>/);
  });
});