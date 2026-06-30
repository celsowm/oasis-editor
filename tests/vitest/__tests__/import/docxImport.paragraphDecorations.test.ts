import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { getDocumentParagraphs } from "./docxTestHelpers.js";

/**
 * Round-trip tests for the paragraph decoration properties (CJK typography,
 * RTL, legacy/positional flags, pBdr `between`/`bar`, and non-drop-cap
 * `w:framePr`). These are round-trip-only — the editor does not render them on
 * canvas/PDF — so each test asserts both the imported model field and that the
 * element survives re-export back to DOCX.
 */

const WORD_DOC_SHELL = (pPrInner: string): string =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
  `<w:body><w:p><w:pPr>${pPrInner}</w:pPr>` +
  `<w:r><w:t>Decorated paragraph</w:t></w:r></w:p>` +
  `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>` +
  `<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>` +
  `</w:sectPr></w:body></w:document>`;

async function buildDocx(pPrInner: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file("word/document.xml", WORD_DOC_SHELL(pPrInner));
  return zip.generateAsync({ type: "arraybuffer" });
}

async function readDocumentXml(docx: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(docx);
  return zip.file("word/document.xml")!.async("string");
}

async function importSingleParagraph(pPrInner: string): Promise<{
  model: ReturnType<typeof getDocumentParagraphs>[number];
  xml: string;
}> {
  const document = await importDocxToEditorDocument(await buildDocx(pPrInner));
  const model = getDocumentParagraphs(document)[0]!;
  const xml = await readDocumentXml(await exportEditorDocumentToDocx(document));
  return { model, xml };
}

describe("DOCX import/export: paragraph decorations", () => {
  describe("on/off booleans (default-off)", () => {
    it("round-trips w:suppressLineNumbers", async () => {
      const { model, xml } = await importSingleParagraph(
        `<w:suppressLineNumbers/>`,
      );
      expect(model.style?.suppressLineNumbers).toBe(true);
      expect(xml).toContain("<w:suppressLineNumbers/>");
    });

    it("round-trips w:suppressAutoHyphens", async () => {
      const { model, xml } = await importSingleParagraph(
        `<w:suppressAutoHyphens/>`,
      );
      expect(model.style?.suppressAutoHyphens).toBe(true);
      expect(xml).toContain("<w:suppressAutoHyphens/>");
    });

    it("round-trips w:bidi", async () => {
      const { model, xml } = await importSingleParagraph(`<w:bidi/>`);
      expect(model.style?.bidi).toBe(true);
      expect(xml).toContain("<w:bidi/>");
    });

    it("round-trips w:topLinePunct", async () => {
      const { model, xml } = await importSingleParagraph(`<w:topLinePunct/>`);
      expect(model.style?.topLinePunct).toBe(true);
      expect(xml).toContain("<w:topLinePunct/>");
    });
  });

  describe('default-on flags honor explicit w:val="0"', () => {
    it("round-trips w:kinsoku off", async () => {
      const { model, xml } = await importSingleParagraph(
        `<w:kinsoku w:val="0"/>`,
      );
      expect(model.style?.kinsoku).toBe(false);
      expect(xml).toContain('<w:kinsoku w:val="0"/>');
    });

    it("round-trips w:wordWrap off", async () => {
      const { model, xml } = await importSingleParagraph(
        `<w:wordWrap w:val="0"/>`,
      );
      expect(model.style?.wordWrap).toBe(false);
      expect(xml).toContain('<w:wordWrap w:val="0"/>');
    });

    it("round-trips w:overflowPunct off", async () => {
      const { model, xml } = await importSingleParagraph(
        `<w:overflowPunct w:val="0"/>`,
      );
      expect(model.style?.overflowPunct).toBe(false);
      expect(xml).toContain('<w:overflowPunct w:val="0"/>');
    });

    it("round-trips w:autoSpaceDE off", async () => {
      const { model, xml } = await importSingleParagraph(
        `<w:autoSpaceDE w:val="0"/>`,
      );
      expect(model.style?.autoSpaceDE).toBe(false);
      expect(xml).toContain('<w:autoSpaceDE w:val="0"/>');
    });

    it("round-trips w:autoSpaceDN off", async () => {
      const { model, xml } = await importSingleParagraph(
        `<w:autoSpaceDN w:val="0"/>`,
      );
      expect(model.style?.autoSpaceDN).toBe(false);
      expect(xml).toContain('<w:autoSpaceDN w:val="0"/>');
    });

    it("round-trips w:adjustRightInd off", async () => {
      const { model, xml } = await importSingleParagraph(
        `<w:adjustRightInd w:val="0"/>`,
      );
      expect(model.style?.adjustRightInd).toBe(false);
      expect(xml).toContain('<w:adjustRightInd w:val="0"/>');
    });

    it("does not emit default-on flags when left at their default (on)", async () => {
      const { xml } = await importSingleParagraph(`<w:keepNext/>`);
      expect(xml).not.toContain("w:kinsoku");
      expect(xml).not.toContain("w:wordWrap");
      expect(xml).not.toContain("w:overflowPunct");
      expect(xml).not.toContain("w:autoSpaceDE");
      expect(xml).not.toContain("w:autoSpaceDN");
      expect(xml).not.toContain("w:adjustRightInd");
    });
  });

  describe("enum-valued properties", () => {
    it("round-trips w:textAlignment", async () => {
      const { model, xml } = await importSingleParagraph(
        `<w:textAlignment w:val="center"/>`,
      );
      expect(model.style?.textAlignment).toBe("center");
      expect(xml).toContain('<w:textAlignment w:val="center"/>');
    });

    it("round-trips w:textboxTightWrap", async () => {
      const { model, xml } = await importSingleParagraph(
        `<w:textboxTightWrap w:val="allLines"/>`,
      );
      expect(model.style?.textboxTightWrap).toBe("allLines");
      expect(xml).toContain('<w:textboxTightWrap w:val="allLines"/>');
    });

    it("ignores invalid w:textAlignment values", async () => {
      const { model } = await importSingleParagraph(
        `<w:textAlignment w:val="bogus"/>`,
      );
      expect(model.style?.textAlignment).toBeUndefined();
    });
  });

  describe("w:divId", () => {
    it("round-trips a numeric div id", async () => {
      const { model, xml } = await importSingleParagraph(
        `<w:divId w:val="42"/>`,
      );
      expect(model.style?.divId).toBe(42);
      expect(xml).toContain('<w:divId w:val="42"/>');
    });
  });

  describe("w:cnfStyle (conditional style flags)", () => {
    it("round-trips the 12-bit bitmask", async () => {
      // firstRow (bit 0) + lastRowLastColumn/seCell (bit 11) = "100000000001"
      const { model, xml } = await importSingleParagraph(
        `<w:cnfStyle w:val="100000000001"/>`,
      );
      expect(model.style?.conditionalStyle?.firstRow).toBe(true);
      expect(model.style?.conditionalStyle?.seCell).toBe(true);
      expect(model.style?.conditionalStyle?.lastRow).toBeUndefined();
      expect(xml).toContain('<w:cnfStyle w:val="100000000001"/>');
    });
  });

  describe("w:pBdr between and bar edges", () => {
    it("round-trips between and bar borders alongside the four edges", async () => {
      const { model, xml } = await importSingleParagraph(
        `<w:pBdr>` +
          `<w:top w:val="single" w:sz="8" w:space="0" w:color="111827"/>` +
          `<w:between w:val="single" w:sz="4" w:space="0" w:color="FF0000"/>` +
          `<w:bar w:val="single" w:sz="12" w:space="0" w:color="00AA00"/>` +
          `</w:pBdr>`,
      );
      expect(model.style?.borderTop).toEqual({
        width: 1,
        type: "solid",
        color: "#111827",
      });
      expect(model.style?.borderBetween).toEqual({
        width: 0.5,
        type: "solid",
        color: "#FF0000",
      });
      expect(model.style?.borderBar).toEqual({
        width: 1.5,
        type: "solid",
        color: "#00AA00",
      });
      expect(xml).toContain("<w:pBdr>");
      expect(xml).toContain(
        '<w:between w:val="single" w:sz="4" w:space="0" w:color="FF0000"/>',
      );
      expect(xml).toContain(
        '<w:bar w:val="single" w:sz="12" w:space="0" w:color="00AA00"/>',
      );
    });
  });

  describe("w:framePr (non-drop-cap positioned text frame)", () => {
    it("preserves a non-drop-cap framePr verbatim and does not discard the paragraph", async () => {
      const framePr =
        `<w:framePr w:w="3000" w:h="2000" w:x="1000" w:y="500"` +
        ` w:wrap="around" w:hAnchor="margin" w:vAnchor="margin"/>`;
      const { model, xml } = await importSingleParagraph(framePr);

      // The paragraph is emitted (not swallowed as a drop cap).
      expect(model.runs.map((r) => r.text).join("")).toContain("Decorated");
      // The framePr XML is captured verbatim.
      expect(model.style?.framePrXml).toContain("w:framePr");
      expect(model.style?.framePrXml).toContain('w:wrap="around"');
      // It round-trips back into the exported document.
      expect(xml).toContain('w:wrap="around"');
      expect(xml).toContain('w:hAnchor="margin"');
    });

    it("does not capture a dropCap framePr as framePrXml (owned by the drop-cap path)", async () => {
      const zip = new JSZip();
      const documentXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
        `<w:body>` +
        `<w:p><w:pPr><w:framePr w:dropCap="drop" w:lines="3" w:wrap="around"/>` +
        `<w:spacing w:after="0"/></w:pPr>` +
        `<w:r><w:rPr><w:sz w:val="129"/></w:rPr><w:t>L</w:t></w:r></w:p>` +
        `<w:p><w:r><w:t>orem ipsum</w:t></w:r></w:p>` +
        `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>` +
        `<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>` +
        `</w:sectPr></w:body></w:document>`;
      zip.file("word/document.xml", documentXml);
      const document = await importDocxToEditorDocument(
        await zip.generateAsync({ type: "arraybuffer" }),
      );
      const paragraphs = getDocumentParagraphs(document);
      const body = paragraphs.find((p) => p.dropCap);
      expect(body).toBeDefined();
      // The body paragraph must not have a stray framePrXml from the drop cap.
      expect(body!.style?.framePrXml).toBeUndefined();
    });
  });

  describe("combined decorations survive together", () => {
    it("round-trips a paragraph carrying many decorations at once", async () => {
      const { model, xml } = await importSingleParagraph(
        `<w:bidi/>` +
          `<w:kinsoku w:val="0"/>` +
          `<w:wordWrap w:val="0"/>` +
          `<w:overflowPunct w:val="0"/>` +
          `<w:autoSpaceDE w:val="0"/>` +
          `<w:autoSpaceDN w:val="0"/>` +
          `<w:adjustRightInd w:val="0"/>` +
          `<w:suppressLineNumbers/>` +
          `<w:topLinePunct/>` +
          `<w:textAlignment w:val="baseline"/>` +
          `<w:textboxTightWrap w:val="none"/>` +
          `<w:divId w:val="7"/>` +
          `<w:cnfStyle w:val="001000000000"/>`,
      );
      expect(model.style?.bidi).toBe(true);
      expect(model.style?.kinsoku).toBe(false);
      expect(model.style?.suppressLineNumbers).toBe(true);
      expect(model.style?.topLinePunct).toBe(true);
      expect(model.style?.textAlignment).toBe("baseline");
      expect(model.style?.textboxTightWrap).toBe("none");
      expect(model.style?.divId).toBe(7);
      expect(model.style?.conditionalStyle?.firstCol).toBe(true);

      // All the elements re-appear in the exported XML.
      expect(xml).toContain("<w:bidi/>");
      expect(xml).toContain('<w:kinsoku w:val="0"/>');
      expect(xml).toContain('<w:wordWrap w:val="0"/>');
      expect(xml).toContain('<w:overflowPunct w:val="0"/>');
      expect(xml).toContain('<w:autoSpaceDE w:val="0"/>');
      expect(xml).toContain('<w:autoSpaceDN w:val="0"/>');
      expect(xml).toContain('<w:adjustRightInd w:val="0"/>');
      expect(xml).toContain("<w:suppressLineNumbers/>");
      expect(xml).toContain("<w:topLinePunct/>");
      expect(xml).toContain('<w:textAlignment w:val="baseline"/>');
      expect(xml).toContain('<w:textboxTightWrap w:val="none"/>');
      expect(xml).toContain('<w:divId w:val="7"/>');
      expect(xml).toContain('<w:cnfStyle w:val="001000000000"/>');
    });
  });
});
