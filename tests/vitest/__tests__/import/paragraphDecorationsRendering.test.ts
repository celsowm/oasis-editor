import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToPdfBlob } from "@/export/pdf/exportEditorDocumentToPdf.js";
import { resolveTextAlignmentBaselineOffset } from "@/core/layoutConstants.js";
import { paragraphBetweenBorderMatches } from "@/layoutProjection/index.js";
import {
  decodePdf,
  pdfColorCommand,
  getDocumentParagraphs,
} from "./docxTestHelpers.js";

describe("resolveTextAlignmentBaselineOffset", () => {
  it("returns 0 for auto/baseline/absent (no shift to default layout)", () => {
    expect(resolveTextAlignmentBaselineOffset("auto", 11, 18)).toBe(0);
    expect(resolveTextAlignmentBaselineOffset("baseline", 11, 18)).toBe(0);
    expect(resolveTextAlignmentBaselineOffset(null, 11, 18)).toBe(0);
    expect(resolveTextAlignmentBaselineOffset(undefined, 11, 18)).toBe(0);
  });

  it("returns 0 when the run fills the line (fontSize >= lineHeight)", () => {
    expect(resolveTextAlignmentBaselineOffset("top", 18, 18)).toBe(0);
    expect(resolveTextAlignmentBaselineOffset("center", 20, 18)).toBe(0);
    expect(resolveTextAlignmentBaselineOffset("bottom", 18, 16)).toBe(0);
  });

  it("shifts top-aligned smaller runs up", () => {
    // 0.8 * (11 - 18) = -5.6
    expect(resolveTextAlignmentBaselineOffset("top", 11, 18)).toBeCloseTo(
      -5.6,
      5,
    );
  });

  it("shifts center-aligned smaller runs up halfway", () => {
    // 0.3 * (11 - 18) = -2.1
    expect(resolveTextAlignmentBaselineOffset("center", 11, 18)).toBeCloseTo(
      -2.1,
      5,
    );
  });

  it("shifts bottom-aligned smaller runs down", () => {
    // 0.2 * (18 - 11) = 1.4
    expect(resolveTextAlignmentBaselineOffset("bottom", 11, 18)).toBeCloseTo(
      1.4,
      5,
    );
  });
});

describe("paragraphBetweenBorderMatches", () => {
  const make = (border: unknown) => ({ borderBetween: border as never });
  const solid = {
    width: 0.5,
    type: "solid" as const,
    color: "#FF0000",
  };

  it("returns false when either side has no between border", () => {
    expect(paragraphBetweenBorderMatches(make(null), make(solid))).toBe(false);
    expect(paragraphBetweenBorderMatches(make(solid), make(null))).toBe(false);
    expect(paragraphBetweenBorderMatches(make(null), make(null))).toBe(false);
  });

  it("returns true when both sides match", () => {
    expect(paragraphBetweenBorderMatches(make(solid), make({ ...solid }))).toBe(
      true,
    );
  });

  it("returns false when color differs", () => {
    expect(
      paragraphBetweenBorderMatches(
        make(solid),
        make({ width: 0.5, type: "solid", color: "#00FF00" }),
      ),
    ).toBe(false);
  });

  it("returns false when width differs", () => {
    expect(
      paragraphBetweenBorderMatches(
        make(solid),
        make({ width: 1, type: "solid", color: "#FF0000" }),
      ),
    ).toBe(false);
  });
});

// ---- PDF rendering tests ----

async function buildDocx(bodyXml: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${bodyXml}` +
    `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>` +
    `<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>` +
    `</w:sectPr></w:body></w:document>`;
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

async function exportToPdfString(docx: ArrayBuffer): Promise<string> {
  const document = await importDocxToEditorDocument(docx);
  const pdfBlob = await exportEditorDocumentToPdfBlob(document);
  const buffer = await pdfBlob.arrayBuffer();
  return decodePdf(buffer);
}

describe("PDF rendering: w:pBdr bar", () => {
  it("draws a vertical bar stroke in the PDF content stream", async () => {
    const docx = await buildDocx(
      `<w:p><w:pPr><w:pBdr>` +
        `<w:bar w:val="single" w:sz="12" w:space="0" w:color="FF0000"/>` +
        `</w:pBdr></w:pPr>` +
        `<w:r><w:t>Bar paragraph</w:t></w:r></w:p>`,
    );
    const pdf = await exportToPdfString(docx);
    // The bar color (red) must appear as a stroke color command in the PDF.
    expect(pdf).toContain(pdfColorCommand("#FF0000", "RG"));
    // A stroke operator must follow somewhere after the color command.
    const colorIdx = pdf.indexOf(pdfColorCommand("#FF0000", "RG"));
    const afterColor = pdf.slice(colorIdx);
    expect(afterColor).toMatch(/S/);
  });

  it("does not draw a bar when borderBar is absent", async () => {
    const docx = await buildDocx(
      `<w:p><w:pPr><w:pBdr>` +
        `<w:top w:val="single" w:sz="8" w:space="0" w:color="111827"/>` +
        `</w:pBdr></w:pPr>` +
        `<w:r><w:t>Plain border</w:t></w:r></w:p>`,
    );
    const pdf = await exportToPdfString(docx);
    // Red should not appear as a stroke color (the border is dark gray, not red).
    expect(pdf).not.toContain(pdfColorCommand("#FF0000", "RG"));
  });
});

describe("PDF rendering: w:pBdr between", () => {
  it("draws a between border when two consecutive paragraphs match", async () => {
    const between = `<w:between w:val="single" w:sz="4" w:space="0" w:color="0000FF"/>`;
    const docx = await buildDocx(
      `<w:p><w:pPr><w:pBdr>${between}</w:pBdr></w:pPr>` +
        `<w:r><w:t>First</w:t></w:r></w:p>` +
        `<w:p><w:pPr><w:pBdr>${between}</w:pBdr></w:pPr>` +
        `<w:r><w:t>Second</w:t></w:r></w:p>`,
    );
    const document = await importDocxToEditorDocument(docx);
    const paragraphs = getDocumentParagraphs(document);
    expect(paragraphs[0]?.style?.borderBetween).toBeDefined();
    expect(paragraphs[1]?.style?.borderBetween).toBeDefined();

    const pdfBlob = await exportEditorDocumentToPdfBlob(document);
    const pdf = decodePdf(await pdfBlob.arrayBuffer());
    // The between color (blue) must appear as a stroke color in the PDF.
    expect(pdf).toContain(pdfColorCommand("#0000FF", "RG"));
  });

  it("does not draw a between border when only one paragraph has it", async () => {
    const docx = await buildDocx(
      `<w:p><w:pPr><w:pBdr>` +
        `<w:between w:val="single" w:sz="4" w:space="0" w:color="0000FF"/>` +
        `</w:pBdr></w:pPr>` +
        `<w:r><w:t>First</w:t></w:r></w:p>` +
        `<w:p><w:r><w:t>Second</w:t></w:r></w:p>`,
    );
    const pdf = await exportToPdfString(docx);
    // Blue should not appear (no matching pair).
    expect(pdf).not.toContain(pdfColorCommand("#0000FF", "RG"));
  });
});
