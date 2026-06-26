import {
  getRunImage,
  getRunTextBox,
  getRunField,
  getRunFieldChar,
  getRunFieldInstruction,
  getRunFootnoteReference,
  getRunEndnoteReference,
  getRunSym,
} from "@/core/model.js";
import { describe, expect, it } from "vitest";
import type {
  EditorDocument,
  EditorImageRunData,
  EditorLayoutLine,
} from "@/core/model.js";
import {
  createEditorFootnote,
  createEditorParagraph,
  createEditorStateFromDocument,
  createFootnoteReferenceRun,
} from "@/core/editorState.js";
import { PdfFontRegistry } from "@/export/pdf/fonts/PdfFontRegistry.js";
import { resolveMetricCompatibleFamily } from "@/export/pdf/fonts/officeFontAssets.js";
import { layoutPdfParagraph } from "@/export/pdf/layout/layoutParagraph.js";
import { PdfTextMeasurer } from "@/export/pdf/layout/PdfTextMeasurer.js";
import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import { exportEditorDocumentToPdfBlob } from "@/export/pdf/exportEditorDocumentToPdf.js";
import { buildCanvasTableLayout } from "@/ui/canvas/CanvasTableLayout.js";
import { projectDocumentLayout } from "@/layoutProjection/index.js";

function decodePdf(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

const PX_TO_PT = 72 / 96;

function pxToPt(value: number): number {
  return value * PX_TO_PT;
}

const WIN_ANSI_OVERRIDES = new Map<number, number>([[0x2022, 0x95]]);

function pdfHex(value: string): string {
  return Array.from(value)
    .map((char) => {
      const codePoint = char.codePointAt(0) ?? 0x3f;
      const byte =
        (codePoint >= 0x20 && codePoint <= 0x7e) ||
        (codePoint >= 0xa0 && codePoint <= 0xff)
          ? codePoint
          : (WIN_ANSI_OVERRIDES.get(codePoint) ?? 0x3f);
      return byte.toString(16).padStart(2, "0").toUpperCase();
    })
    .join("");
}

function pdfUtf16Hex(value: string): string {
  const units: number[] = [];
  for (let codePoint of Array.from(value).map(
    (char) => char.codePointAt(0) ?? 0xfffd,
  )) {
    if (codePoint > 0xffff) {
      codePoint -= 0x10000;
      units.push(((codePoint >>> 10) & 0x3ff) | 0xd800);
      units.push((codePoint & 0x3ff) | 0xdc00);
    } else {
      units.push(codePoint);
    }
  }
  return units
    .map((unit) => unit.toString(16).padStart(4, "0").toUpperCase())
    .join("");
}

function pdfTextMarker(text: string): string {
  return `% OasisText ${pdfUtf16Hex(text)}`;
}

function expectPdfText(pdf: string, text: string): void {
  expect(
    pdf.includes(`<${pdfHex(text)}> Tj`) || pdf.includes(pdfTextMarker(text)),
  ).toBe(true);
}

function expectPdfTextFragment(pdf: string, text: string): void {
  expect(pdf.includes(pdfHex(text)) || pdf.includes(pdfUtf16Hex(text))).toBe(
    true,
  );
}

function countPdfText(pdf: string, text: string): number {
  const markerCount = pdf.split(pdfTextMarker(text)).length - 1;
  return markerCount > 0
    ? markerCount
    : pdf.split(`<${pdfHex(text)}> Tj`).length - 1;
}

function findTextTopY(pdf: string, pageHeight: number, text: string): number {
  const match =
    new RegExp(
      `${pdfTextMarker(text)}\\nBT\\n[^\\n]+\\n/[^\\n]+\\n([\\d.]+) ([\\d.]+) Td`,
    ).exec(pdf) ??
    new RegExp(`([\\d.]+) ([\\d.]+) Td\\n<${pdfHex(text)}> Tj`).exec(pdf);
  if (!match) {
    throw new Error(`Unable to find PDF text command for "${text}"`);
  }
  return pageHeight - Number(match[2]);
}

function findTextX(pdf: string, text: string): number {
  const match =
    new RegExp(
      `${pdfTextMarker(text)}\\nBT\\n[^\\n]+\\n/[^\\n]+\\n([\\d.]+) ([\\d.]+) Td`,
    ).exec(pdf) ??
    new RegExp(`([\\d.]+) ([\\d.]+) Td\\n<${pdfHex(text)}> Tj`).exec(pdf);
  if (!match) {
    throw new Error(`Unable to find PDF text command for "${text}"`);
  }
  return Number(match[1]);
}

interface PdfImageDraw {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

function findImageDraws(pdf: string): PdfImageDraw[] {
  const matches = pdf.matchAll(
    /\nq\n([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) cm\n\/Im\d+ Do\nQ/g,
  );
  const draws = Array.from(matches, (match) => ({
    a: Number(match[1]),
    b: Number(match[2]),
    c: Number(match[3]),
    d: Number(match[4]),
    e: Number(match[5]),
    f: Number(match[6]),
  }));
  if (draws.length === 0) {
    throw new Error("Unable to find PDF image draw command");
  }
  return draws;
}

function findImageDraw(pdf: string): PdfImageDraw {
  return findImageDraws(pdf)[0]!;
}

function resolveImageDrawCenter(draw: PdfImageDraw): { x: number; y: number } {
  return {
    x: draw.e + 0.5 * draw.a + 0.5 * draw.c,
    y: draw.f + 0.5 * draw.b + 0.5 * draw.d,
  };
}

function createInlineImageDocument(options?: {
  id?: string;
  imageWidth?: number;
  imageHeight?: number;
  rotation?: number;
  floating?: EditorImageRunData["floating"];
}): EditorDocument {
  const imageWidth = options?.imageWidth ?? 32;
  const imageHeight = options?.imageHeight ?? 24;
  return {
    id: options?.id ?? "pdf-inline-image-document",
    assets: {
      tiny: {
        id: "tiny",
        url: "data:image/jpeg;base64,/9j/2Q==",
      },
    },
    sections: [
      {
        id: "section-1",
        pageSettings: {
          width: 240,
          height: 240,
          orientation: "portrait",
          margins: {
            top: 48,
            right: 48,
            bottom: 48,
            left: 48,
            header: 24,
            footer: 24,
            gutter: 0,
          },
        },
        blocks: [
          {
            id: "image-paragraph",
            type: "paragraph",
            style: { spacingAfter: 0, indentLeft: 16 },
            runs: [
              { id: "before-run", text: "A", kind: "text" as const },
              {
                id: "image-run",
                text: "\uFFFC",
                kind: "image" as const,
                image: {
                  src: "asset:tiny",
                  width: imageWidth,
                  height: imageHeight,
                  alt: "Tiny image",
                  rotation: options?.rotation,
                  floating: options?.floating,
                },
              },
              { id: "after-run", text: "B", kind: "text" as const },
            ],
          },
        ],
      },
    ],
  };
}

describe("PdfFontRegistry", () => {
  it("resolves Open Sans to its bundled family", () => {
    expect(resolveMetricCompatibleFamily("Open Sans")).toBe("Open Sans");
    expect(resolveMetricCompatibleFamily("OpenSans")).toBe("Open Sans");
    expect(resolveMetricCompatibleFamily("Open Sans, sans-serif")).toBe(
      "Open Sans",
    );
  });

  it("loads Open Sans as a requested bundled Unicode family without falling back to Roboto", async () => {
    const registry = new PdfFontRegistry();
    await registry.loadBundledUnicodeFaces({ families: ["Open Sans"] });

    expect(
      registry.resolveFontFace({ fontFamily: "Open Sans", bold: true })
        .writerResourceName,
    ).toBe("OpenSansBold");
    expect(
      registry.getPdfFontResources().map((resource) => resource.resourceName),
    ).toEqual([
      "F1",
      "F2",
      "F3",
      "F4",
      "OpenSansRegular",
      "OpenSansBold",
      "OpenSansItalic",
      "OpenSansBolditalic",
    ]);
  });

  it("resolves bundled Unicode faces and keeps built-in Helvetica fallbacks", async () => {
    const registry = new PdfFontRegistry();
    await registry.loadBundledUnicodeFaces();

    expect(registry.resolveFontFace({}).writerResourceName).toBe("F1");
    expect(registry.resolveFontFace({ bold: true }).writerResourceName).toBe(
      "F2",
    );
    expect(registry.resolveFontFace({ italic: true }).writerResourceName).toBe(
      "F3",
    );
    expect(
      registry.resolveFontFace({ bold: true, italic: true }).writerResourceName,
    ).toBe("F4");
    expect(
      registry.resolveFontFace({ fontFamily: "Helvetica", bold: true })
        .writerResourceName,
    ).toBe("F2");
    expect(
      registry.resolveFontFace({ fontFamily: "Unknown Font", bold: true })
        .writerResourceName,
    ).toBe("RobotoBold");
    expect(
      registry.resolveFontFace({ fontFamily: "Calibri" }).writerResourceName,
    ).toBe("CarlitoRegular");
    expect(
      registry.resolveFontFace({ fontFamily: "Aptos", bold: true })
        .writerResourceName,
    ).toBe("CarlitoBold");
    expect(
      registry.resolveFontFace({ fontFamily: "Arial", italic: true })
        .writerResourceName,
    ).toBe("ArimoItalic");
    expect(
      registry.resolveFontFace({
        fontFamily: "Times New Roman",
        bold: true,
        italic: true,
      }).writerResourceName,
    ).toBe("TinosBolditalic");
    expect(
      registry.resolveFontFace({ fontFamily: "Open Sans" }).writerResourceName,
    ).toBe("OpenSansRegular");
    expect(
      registry.resolveFontFace({ fontFamily: "OpenSans", bold: true })
        .writerResourceName,
    ).toBe("OpenSansBold");
    expect(
      registry.getPdfFontResources().map((resource) => resource.resourceName),
    ).toEqual([
      "F1",
      "F2",
      "F3",
      "F4",
      "CarlitoRegular",
      "CarlitoBold",
      "CarlitoItalic",
      "CarlitoBolditalic",
      "ArimoRegular",
      "ArimoBold",
      "ArimoItalic",
      "ArimoBolditalic",
      "TinosRegular",
      "TinosBold",
      "TinosItalic",
      "TinosBolditalic",
      "OpenSansRegular",
      "OpenSansBold",
      "OpenSansItalic",
      "OpenSansBolditalic",
      "RobotoRegular",
      "RobotoBold",
      "RobotoItalic",
      "RobotoBolditalic",
    ]);
  });

  it("exports Office-compatible font aliases as embedded Unicode fonts", async () => {
    const document: EditorDocument = {
      id: "office-compatible-fonts-document",
      metadata: {},
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 816,
            height: 1056,
            orientation: "portrait",
            margins: {
              top: 96,
              right: 96,
              bottom: 96,
              left: 96,
              header: 48,
              footer: 48,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "calibri",
              type: "paragraph",
              runs: [
                {
                  id: "calibri-run",
                  text: "Calibri sample",
                  kind: "text" as const,
                  styles: { fontFamily: "Calibri" },
                },
              ],
            },
            {
              id: "aptos",
              type: "paragraph",
              runs: [
                {
                  id: "aptos-run",
                  text: "Aptos sample",
                  kind: "text" as const,
                  styles: { fontFamily: "Aptos", bold: true },
                },
              ],
            },
            {
              id: "arial",
              type: "paragraph",
              runs: [
                {
                  id: "arial-run",
                  text: "Arial sample",
                  kind: "text" as const,
                  styles: { fontFamily: "Arial", italic: true },
                },
              ],
            },
            {
              id: "times",
              type: "paragraph",
              runs: [
                {
                  id: "times-run",
                  text: "Times sample",
                  kind: "text" as const,
                  styles: {
                    fontFamily: "Times New Roman",
                    bold: true,
                    italic: true,
                  },
                },
              ],
            },
            {
              id: "open-sans",
              type: "paragraph",
              runs: [
                {
                  id: "open-sans-run",
                  text: "Open Sans sample",
                  kind: "text" as const,
                  styles: { fontFamily: "Open Sans", bold: true },
                },
              ],
            },
          ],
        },
      ],
    };

    const pdf = decodePdf(
      await (await exportEditorDocumentToPdfBlob(document)).arrayBuffer(),
    );

    expect(pdf).toContain("/CarlitoRegular");
    expect(pdf).toContain("/CarlitoBold");
    expect(pdf).toContain("/ArimoItalic");
    expect(pdf).toContain("/TinosBolditalic");
    expect(pdf).toContain("/OpenSansBold");
    expectPdfText(pdf, "Calibri sample");
    expectPdfText(pdf, "Aptos sample");
    expectPdfText(pdf, "Arial sample");
    expectPdfText(pdf, "Times sample");
    expectPdfText(pdf, "Open Sans sample");
  });
});

describe("PdfTextMeasurer", () => {
  it("measures text using cached PDF font metrics", () => {
    const measurer = new PdfTextMeasurer();

    expect(
      measurer.measureTextWidth({ text: "iii", fontSize: 10 }),
    ).toBeCloseTo(6.66, 2);
    expect(
      measurer.measureTextWidth({ text: "WWW", fontSize: 10 }),
    ).toBeCloseTo(28.32, 2);
    expect(
      measurer.measureTextWidth({ text: "Hello", fontSize: 12 }),
    ).toBeCloseTo(27.34, 2);
    expect(measurer.getCacheSize()).toBe(3);

    expect(
      measurer.measureTextWidth({ text: "Hello", fontSize: 12 }),
    ).toBeCloseTo(27.34, 2);
    expect(measurer.getCacheSize()).toBe(3);
  });
});

describe("layoutPdfParagraph", () => {
  it("wraps paragraph text into measured lines in linear order", () => {
    const measurer = new PdfTextMeasurer();
    const layout = layoutPdfParagraph({
      paragraph: {
        id: "wrapped-paragraph",
        type: "paragraph",
        runs: [
          {
            id: "run-1",
            text: "Alpha beta gamma delta",
            kind: "text" as const,
          },
        ],
      },
      maxWidth: 70,
      context: { pageNumber: 1, totalPages: 1, measurer },
      defaultFontSize: 11.25,
      defaultLineHeight: 16,
      pxToPt,
    });

    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines.every((line) => line.width <= 70)).toBe(true);
    expect(
      layout.lines
        .map((line) => line.fragments.map((fragment) => fragment.text).join(""))
        .join(""),
    ).toBe("Alpha beta gamma delta");
  });
});

describe("OasisPdfWriter", () => {
  it("writes a structurally valid PDF with basic drawing commands", () => {
    const writer = new OasisPdfWriter();
    const pageIndex = writer.addPage({ width: 612, height: 792 });

    writer.drawRect(pageIndex, {
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      fill: "#ffffff",
      stroke: "#111827",
      lineWidth: 1,
    });
    writer.drawLine(pageIndex, {
      x1: 10,
      y1: 90,
      x2: 110,
      y2: 90,
      stroke: "#d1d5db",
      lineWidth: 0.75,
    });
    writer.drawText(pageIndex, {
      x: 24,
      y: 48,
      text: "Hello PDF",
      fontSize: 12,
      color: "#111827",
    });
    writer.drawText(pageIndex, {
      x: 24,
      y: 68,
      text: "Bold italic PDF",
      fontSize: 14,
      color: "#ff0000",
      bold: true,
      italic: true,
    });

    const blob = writer.toBlob();
    const pdf = decodePdf(writer.toArrayBuffer());

    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("/Catalog");
    expect(pdf).toContain("/Pages");
    expect(pdf).toContain("/Page");
    expect(pdf).toContain("/MediaBox [0 0 612 792]");
    expect(pdf).toContain("/Contents");
    expect(pdf).toContain("/Font");
    expect(pdf).toContain("/Helvetica");
    expect(pdf).toContain("/Helvetica-Bold");
    expect(pdf).toContain("/Helvetica-Oblique");
    expect(pdf).toContain("/Helvetica-BoldOblique");
    expect(pdf).toContain("/Encoding /WinAnsiEncoding");
    expectPdfText(pdf, "Hello PDF");
    expectPdfText(pdf, "Bold italic PDF");
    expect(pdf).toContain("/F4 14 Tf");
    expect(pdf).toContain("1 0 0 rg");
    expect(pdf).toContain("xref");
    expect(pdf).toContain("trailer");
    expect(pdf).toContain("startxref");
    expect(pdf.trim().endsWith("%%EOF")).toBe(true);
  });

  it("uses explicitly registered font resource names", () => {
    const writer = new OasisPdfWriter([
      { kind: "base14", resourceName: "CustomRegular", baseFont: "Helvetica" },
      {
        kind: "base14",
        resourceName: "CustomBold",
        baseFont: "Helvetica-Bold",
      },
    ]);
    const pageIndex = writer.addPage({ width: 300, height: 300 });

    writer.drawText(pageIndex, {
      x: 24,
      y: 48,
      text: "Custom font resource",
      fontSize: 12,
      fontResourceName: "CustomBold",
    });

    const pdf = decodePdf(writer.toArrayBuffer());

    expect(pdf).toContain("/CustomRegular");
    expect(pdf).toContain("/CustomBold");
    expect(pdf).toContain("/CustomBold 12 Tf");
    expect(pdf).toContain("/Helvetica-Bold");
  });

  it("exports an editor document to an application/pdf blob with paragraph text and basic inline styles", async () => {
    const document: EditorDocument = {
      id: "pdf-smoke-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 816,
            height: 1056,
            orientation: "portrait",
            margins: {
              top: 96,
              right: 96,
              bottom: 96,
              left: 96,
              header: 48,
              footer: 48,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "paragraph-1",
              type: "paragraph",
              runs: [
                { id: "run-1", text: "Smoke test", kind: "text" as const },
              ],
            },
            {
              id: "paragraph-2",
              type: "paragraph",
              runs: [
                {
                  id: "run-2",
                  text: "Second ",
                  kind: "text" as const,
                  styles: { bold: true, underline: true, highlight: "#ffff00" },
                },
                {
                  id: "run-3",
                  text: "paragraph",
                  kind: "text" as const,
                  styles: {
                    italic: true,
                    strike: true,
                    color: "#ff0000",
                    fontSize: 20,
                  },
                },
              ],
            },
            {
              id: "paragraph-3",
              type: "paragraph",
              style: { align: "center" },
              runs: [{ id: "run-4", text: "Centered", kind: "text" as const }],
            },
            {
              id: "paragraph-4",
              type: "paragraph",
              style: { align: "right" },
              runs: [
                { id: "run-5", text: "Right aligned", kind: "text" as const },
              ],
            },
            {
              id: "paragraph-5",
              type: "paragraph",
              style: {
                spacingBefore: 8,
                spacingAfter: 16,
                indentLeft: 48,
                indentRight: 24,
                indentFirstLine: 24,
              },
              runs: [
                {
                  id: "run-6",
                  text: "Indented paragraph",
                  kind: "text" as const,
                },
              ],
            },
            {
              id: "paragraph-6",
              type: "paragraph",
              style: { indentLeft: 48, indentHanging: 24 },
              runs: [
                {
                  id: "run-7",
                  text: "Hanging paragraph",
                  kind: "text" as const,
                },
              ],
            },
            {
              id: "paragraph-7",
              type: "paragraph",
              list: { kind: "bullet" },
              runs: [
                { id: "run-8", text: "Bullet item", kind: "text" as const },
              ],
            },
            {
              id: "paragraph-8",
              type: "paragraph",
              list: { kind: "ordered", startAt: 3 },
              runs: [
                { id: "run-9", text: "Ordered item", kind: "text" as const },
              ],
            },
            {
              id: "paragraph-9",
              type: "paragraph",
              list: { kind: "ordered", format: "upperLetter" },
              runs: [
                { id: "run-10", text: "Letter item", kind: "text" as const },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();

    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("/MediaBox [0 0 612 792]");
    expect(pdf).not.toContain("Oasis PDF section");
    expectPdfText(pdf, "Smoke test");
    expectPdfText(pdf, "Second ");
    expectPdfText(pdf, "paragraph");
    expectPdfText(pdf, "Centered");
    expectPdfText(pdf, "Right aligned");
    expectPdfText(pdf, "Indented paragraph");
    expectPdfText(pdf, "Hanging paragraph");
    expectPdfText(pdf, "Bullet item");
    expectPdfText(pdf, "Ordered item");
    expectPdfText(pdf, "Letter item");
    expectPdfText(pdf, "•");
    expectPdfText(pdf, "3.");
    expectPdfText(pdf, "D.");
    expect(pdf).not.toContain(`<${pdfHex("4.")}> Tj`);
    expect(pdf).toContain("/CarlitoBold 11 Tf");
    expect(pdf).toContain("/CarlitoItalic 15 Tf");
    expect(pdf).toContain("1 0 0 rg");
    expect(pdf).toContain("1 1 0 rg");
    expect(pdf).toContain("285.319 659.147 Td");
    expect(pdf).toContain("481.847 637.705 Td");
    expect(pdf).toContain("126 610.264 Td");
    expect(pdf).toContain("90 582.822 Td");
    expect((pdf.match(/\nS\nQ/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("exports canvas footnotes at the bottom of the reference page", async () => {
    const footnote = createEditorFootnote([
      createEditorParagraph("PDF footnote body"),
    ]);
    const document: EditorDocument = {
      id: "pdf-footnote-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 816,
            height: 1056,
            orientation: "portrait",
            margins: {
              top: 96,
              right: 96,
              bottom: 96,
              left: 96,
              header: 48,
              footer: 48,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "paragraph-main",
              type: "paragraph",
              runs: [
                {
                  id: "run-before",
                  text: "Body with note",
                  kind: "text" as const,
                },
                createFootnoteReferenceRun(footnote.id, "1"),
              ],
            },
          ],
        },
      ],
      footnotes: {
        items: {
          [footnote.id]: footnote,
        },
      },
    };

    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
    );
    const page = layout.pages[0]!;
    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const pageHeight = pxToPt(page.pageSettings.height);

    expect(page.footnoteSeparatorTop).toBeDefined();
    expect(page.footnoteTop).toBeDefined();
    expectPdfText(pdf, "Body with note");
    expectPdfText(pdf, "PDF footnote body");
    expect(findTextTopY(pdf, pageHeight, "PDF footnote body")).toBeGreaterThan(
      pxToPt(page.footnoteSeparatorTop!),
    );
    expect(findTextX(pdf, "PDF footnote body")).toBeCloseTo(
      pxToPt(page.pageSettings.margins.left + 24),
      3,
    );
    expect(findTextTopY(pdf, pageHeight, "Body with note")).toBeLessThan(
      pxToPt(page.footnoteSeparatorTop!),
    );
  });

  it("exports footnotes only on the page that owns the inline reference", async () => {
    const footnote = createEditorFootnote([
      createEditorParagraph("Only first page footnote"),
    ]);
    const document: EditorDocument = {
      id: "pdf-footnote-reference-page-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 300,
            height: 360,
            orientation: "portrait",
            margins: {
              top: 36,
              right: 36,
              bottom: 36,
              left: 36,
              header: 18,
              footer: 18,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "paragraph-with-footnote",
              type: "paragraph",
              style: { spacingAfter: 0 },
              runs: [
                {
                  id: "run-with-footnote",
                  text: "First page owner",
                  kind: "text" as const,
                },
                createFootnoteReferenceRun(footnote.id, "1"),
              ],
            },
            ...Array.from({ length: 20 }, (_, index) => ({
              id: `spill-paragraph-${index + 1}`,
              type: "paragraph" as const,
              style: { spacingAfter: 0 },
              runs: [
                {
                  id: `spill-run-${index + 1}`,
                  text: `Later page body ${index + 1}`,
                  kind: "text" as const,
                },
              ],
            })),
          ],
        },
      ],
      footnotes: {
        items: {
          [footnote.id]: footnote,
        },
      },
    };

    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
    );
    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const pageCount = (pdf.match(/\/Type \/Page\n/g) ?? []).length;

    expect(layout.pages.length).toBeGreaterThan(1);
    expect(pageCount).toBe(layout.pages.length);
    expect(layout.pages[0]!.footnoteReferenceIds).toEqual([footnote.id]);
    expect(
      layout.pages
        .slice(1)
        .every(
          (page) => !(page.footnoteReferenceIds ?? []).includes(footnote.id),
        ),
    ).toBe(true);
    expect(countPdfText(pdf, "Only first page footnote")).toBe(1);
    expectPdfText(pdf, "Later page body 20");
  });

  it("exports styled underline variants as distinct PDF line patterns", async () => {
    const document: EditorDocument = {
      id: "pdf-underline-style-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 816,
            height: 1056,
            orientation: "portrait",
            margins: {
              top: 96,
              right: 96,
              bottom: 96,
              left: 96,
              header: 48,
              footer: 48,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "underline-single",
              type: "paragraph",
              runs: [
                {
                  id: "run-single",
                  text: "Single underline",
                  kind: "text" as const,
                  styles: { underline: true },
                },
              ],
            },
            {
              id: "underline-double",
              type: "paragraph",
              runs: [
                {
                  id: "run-double",
                  text: "Double underline",
                  kind: "text" as const,
                  styles: { underline: true, underlineStyle: "double" },
                },
              ],
            },
            {
              id: "underline-dotted",
              type: "paragraph",
              runs: [
                {
                  id: "run-dotted",
                  text: "Dotted underline",
                  kind: "text" as const,
                  styles: { underline: true, underlineStyle: "dotted" },
                },
              ],
            },
            {
              id: "underline-dash",
              type: "paragraph",
              runs: [
                {
                  id: "run-dash",
                  text: "Dash underline",
                  kind: "text" as const,
                  styles: { underline: true, underlineStyle: "dash" },
                },
              ],
            },
            {
              id: "underline-dash-long",
              type: "paragraph",
              runs: [
                {
                  id: "run-dash-long",
                  text: "Long dash underline",
                  kind: "text" as const,
                  styles: { underline: true, underlineStyle: "dashLong" },
                },
              ],
            },
            {
              id: "underline-dot-dash",
              type: "paragraph",
              runs: [
                {
                  id: "run-dot-dash",
                  text: "Dot dash underline",
                  kind: "text" as const,
                  styles: { underline: true, underlineStyle: "dotDash" },
                },
              ],
            },
            {
              id: "underline-dot-dot-dash",
              type: "paragraph",
              runs: [
                {
                  id: "run-dot-dot-dash",
                  text: "Dot dot dash underline",
                  kind: "text" as const,
                  styles: { underline: true, underlineStyle: "dotDotDash" },
                },
              ],
            },
            {
              id: "underline-wave",
              type: "paragraph",
              runs: [
                {
                  id: "run-wave",
                  text: "Wave underline",
                  kind: "text" as const,
                  styles: { underline: true, underlineStyle: "wave" },
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();

    expectPdfText(pdf, "Single underline");
    expectPdfText(pdf, "Double underline");
    expectPdfText(pdf, "Dotted underline");
    expectPdfText(pdf, "Dash underline");
    expectPdfText(pdf, "Long dash underline");
    expectPdfText(pdf, "Dot dash underline");
    expectPdfText(pdf, "Dot dot dash underline");
    expectPdfText(pdf, "Wave underline");
    expect(pdf).toContain("[1.5 2.5] 0 d");
    expect(pdf).toContain("[4 3] 0 d");
    expect(pdf).toContain("[8 3] 0 d");
    expect(pdf).toContain("[4 2 1 2] 0 d");
    expect(pdf).toContain("[4 2 1 2 1 2] 0 d");
    expect((pdf.match(/\nS\nQ/g) ?? []).length).toBeGreaterThan(18);
  });

  it("strokes a dashed paragraph border with a real PDF dash pattern", async () => {
    const document: EditorDocument = {
      id: "pdf-paragraph-border-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 480,
            height: 480,
            orientation: "portrait",
            margins: {
              top: 48,
              right: 48,
              bottom: 48,
              left: 48,
              header: 24,
              footer: 24,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "boxed-paragraph",
              type: "paragraph",
              style: {
                shading: "#fef3c7",
                borderTop: { width: 1, type: "dashed", color: "#111827" },
                borderRight: { width: 1, type: "dashed", color: "#111827" },
                borderBottom: { width: 1, type: "dashed", color: "#111827" },
                borderLeft: { width: 1, type: "dashed", color: "#111827" },
              },
              runs: [
                {
                  id: "boxed-run",
                  text: "Dashed boxed paragraph",
                  kind: "text" as const,
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();

    expectPdfText(pdf, "Dashed boxed paragraph");
    // Shading fill rectangle in the paragraph's shading color (#fef3c7).
    expect(pdf).toContain("0.996 0.953 0.78 rg");
    // Dashed edges emit a PDF dash pattern ([pxToPt(5) pxToPt(3)] = [3.75 2.25]).
    expect(pdf).toContain("[3.75 2.25] 0 d");
  });

  it("wraps long paragraphs and creates additional pages when lines overflow the section content area", async () => {
    const document: EditorDocument = {
      id: "pdf-overflow-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 240,
            height: 240,
            orientation: "portrait",
            margins: {
              top: 48,
              right: 48,
              bottom: 48,
              left: 48,
              header: 24,
              footer: 24,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "overflow-paragraph",
              type: "paragraph",
              runs: [
                {
                  id: "overflow-run",
                  kind: "text" as const,
                  text: Array.from(
                    { length: 36 },
                    (_, index) => `word${index + 1}`,
                  ).join(" "),
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const pageCount = (pdf.match(/\/Type \/Page\n/g) ?? []).length;

    expect(blob.type).toBe("application/pdf");
    expect(pageCount).toBeGreaterThan(1);
    expect(pdf).toContain(`/Count ${pageCount}`);
    expectPdfTextFragment(pdf, "word1 ");
    expectPdfTextFragment(pdf, "word36");
    expect(pdf).not.toContain("Oasis PDF section");
  });

  it("renders section headers and footers on every generated page with total page count", async () => {
    const document: EditorDocument = {
      id: "pdf-header-footer-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 240,
            height: 240,
            orientation: "portrait",
            margins: {
              top: 48,
              right: 48,
              bottom: 48,
              left: 48,
              header: 24,
              footer: 24,
              gutter: 0,
            },
          },
          header: [
            {
              id: "header-paragraph",
              type: "paragraph",
              runs: [
                {
                  id: "header-run",
                  text: "Document header",
                  kind: "text" as const,
                },
              ],
            },
          ],
          footer: [
            {
              id: "footer-paragraph",
              type: "paragraph",
              runs: [
                { id: "footer-label", text: "Page ", kind: "text" as const },
                {
                  id: "footer-page",
                  text: "",
                  kind: "field",
                  field: { type: "PAGE" },
                },
                { id: "footer-of", text: " of ", kind: "text" as const },
                {
                  id: "footer-total",
                  text: "",
                  kind: "field",
                  field: { type: "NUMPAGES" },
                },
              ],
            },
          ],
          blocks: Array.from({ length: 36 }, (_, index) => ({
            id: `body-paragraph-${index + 1}`,
            type: "paragraph" as const,
            runs: [
              {
                id: `body-run-${index + 1}`,
                text: `Body paragraph ${index + 1}`,
                kind: "text" as const,
              },
            ],
          })),
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const pageCount = (pdf.match(/\/Type \/Page\n/g) ?? []).length;

    expect(blob.type).toBe("application/pdf");
    expect(pageCount).toBeGreaterThan(1);
    expect(pdf).toContain(`/Count ${pageCount}`);
    expect(countPdfText(pdf, "Document header")).toBe(pageCount);
    expect(countPdfText(pdf, "Page ")).toBe(pageCount);
    expect(countPdfText(pdf, " of ")).toBe(pageCount);
    expectPdfText(pdf, "1");
    expectPdfText(pdf, String(pageCount));
  });

  it("applies inherited named paragraph text styles such as Heading1", async () => {
    const document: EditorDocument = {
      id: "pdf-heading-style-document",
      styles: {
        Heading1: {
          id: "Heading1",
          name: "Heading 1",
          type: "paragraph",
          paragraphStyle: { spacingAfter: 0 },
          textStyle: { bold: true, fontSize: 24, color: "#336699" },
        },
      },
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 816,
            height: 1056,
            orientation: "portrait",
            margins: {
              top: 96,
              right: 96,
              bottom: 96,
              left: 96,
              header: 48,
              footer: 48,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "heading-paragraph",
              type: "paragraph",
              style: { styleId: "Heading1" },
              runs: [
                {
                  id: "heading-run",
                  text: "Capítulo 1",
                  kind: "text" as const,
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();

    expectPdfText(pdf, "Capítulo 1");
    expect(pdf).toContain("/CarlitoBold 18 Tf");
    expect(pdf).toContain("0.2 0.4 0.6 rg");
  });

  it("uses first-line indent only for the first projected line", async () => {
    const document: EditorDocument = {
      id: "pdf-first-line-indent-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 240,
            height: 360,
            orientation: "portrait",
            margins: {
              top: 48,
              right: 48,
              bottom: 48,
              left: 48,
              header: 24,
              footer: 24,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "indented-paragraph",
              type: "paragraph",
              style: { spacingAfter: 0, indentLeft: 20, indentFirstLine: 40 },
              runs: [
                {
                  id: "indented-run",
                  kind: "text" as const,
                  text: "Alpha beta gamma delta epsilon zeta eta theta iota kappa",
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
    );
    const page = layout.pages[0]!;
    const paragraphLayout = page.blocks[0]!.layout!;
    const firstText = paragraphLayout.lines[0]!.fragments.map(
      (fragment) => fragment.text,
    ).join("");
    const secondText = paragraphLayout.lines[1]!.fragments.map(
      (fragment) => fragment.text,
    ).join("");

    expect(paragraphLayout.lines.length).toBeGreaterThan(1);
    expect(findTextX(pdf, firstText)).toBeCloseTo(
      pxToPt(
        page.pageSettings.margins.left +
          paragraphLayout.lines[0]!.slots[0]!.left,
      ),
      3,
    );
    expect(findTextX(pdf, secondText)).toBeCloseTo(
      pxToPt(
        page.pageSettings.margins.left +
          paragraphLayout.lines[1]!.slots[0]!.left,
      ),
      3,
    );
    expect(findTextX(pdf, firstText) - findTextX(pdf, secondText)).toBeCloseTo(
      pxToPt(40),
      3,
    );
  });

  it("keeps long lorem pagination aligned with the canvas projection", async () => {
    const phrase =
      "facilisis luctus, massa risus pretium velit, ac porta enim erat non neque. ";
    const document: EditorDocument = {
      id: "pdf-lorem-pagination-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 360,
            height: 360,
            orientation: "portrait",
            margins: {
              top: 48,
              right: 48,
              bottom: 48,
              left: 48,
              header: 24,
              footer: 24,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "lorem-paragraph",
              type: "paragraph",
              style: { spacingAfter: 0, indentFirstLine: 28, align: "justify" },
              runs: [
                {
                  id: "lorem-run",
                  kind: "text" as const,
                  text: Array.from(
                    { length: 20 },
                    () => `Integer luctus, orci non ${phrase}`,
                  ).join(""),
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const pageCount = (pdf.match(/\/Type \/Page\n/g) ?? []).length;
    const projectedPageCount = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
    ).pages.length;

    expect(pageCount).toBe(projectedPageCount);
    expect(pageCount).toBeGreaterThan(1);
    // Justified paragraphs render one PDF text command per word so per-word
    // shifts (computed by the layout) are preserved in the output.
    expectPdfTextFragment(pdf, "facilisis");
    expectPdfTextFragment(pdf, "luctus,");
    expectPdfTextFragment(pdf, "non");
    expectPdfTextFragment(pdf, "neque.");
  });

  it("writes accented text through embedded Unicode fonts instead of corrupt UTF-8 literals", async () => {
    const document: EditorDocument = {
      id: "pdf-accented-text-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 816,
            height: 1056,
            orientation: "portrait",
            margins: {
              top: 96,
              right: 96,
              bottom: 96,
              left: 96,
              header: 48,
              footer: 48,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "accented-paragraph",
              type: "paragraph",
              runs: [
                {
                  id: "accented-run",
                  text: "Página Capítulo ação não",
                  kind: "text" as const,
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();

    expectPdfText(pdf, "Página Capítulo ação não");
    expect(pdf).not.toContain("Página");
    expect(pdf).toContain("/Subtype /Type0");
    expect(pdf).toContain("/Subtype /CIDFontType2");
    expect(pdf).toContain("/Encoding /Identity-H");
    expect(pdf).toContain("/ToUnicode");
    expect(pdf).toContain("/FontFile2");
    expect(pdf).toContain("<00E1>");
    expect(pdf).not.toContain(`<${pdfHex("Página Capítulo ação não")}> Tj`);
  });

  it("uses simple glyph advances for embedded Unicode text without shaping", async () => {
    const registry = new PdfFontRegistry();
    await registry.loadBundledUnicodeFaces();
    const writer = new OasisPdfWriter(registry.getPdfFontResources());
    const pageIndex = writer.addPage({ width: 300, height: 200 });

    writer.drawText(pageIndex, {
      x: 24,
      y: 48,
      text: "AV",
      fontSize: 24,
      fontResourceName: registry.resolveFontFace({ fontFamily: "Unknown Font" })
        .writerResourceName,
    });

    const pdf = decodePdf(writer.toArrayBuffer());

    expectPdfText(pdf, "AV");
    expect(pdf).toContain("/Subtype /Type0");
    expect(pdf).toContain("/Encoding /Identity-H");
    expect(pdf).toContain(" Tj");
    expect(pdf).not.toContain(" TJ");
  });

  it("applies GSUB ligature substitution when the run enables features", async () => {
    const registry = new PdfFontRegistry();
    await registry.loadBundledUnicodeFaces();
    const face = registry.resolveFontFace({
      fontFamily: "Calibri",
    }).writerResourceName;

    // Same text/font, with and without the standard-ligatures feature.
    const withFeature = new OasisPdfWriter(registry.getPdfFontResources());
    let pageIndex = withFeature.addPage({ width: 300, height: 200 });
    withFeature.drawText(pageIndex, {
      x: 24,
      y: 48,
      text: "fi",
      fontSize: 24,
      fontResourceName: face,
      fontFeatures: ["liga"],
    });
    const shaped = decodePdf(withFeature.toArrayBuffer());

    const plain = new OasisPdfWriter(registry.getPdfFontResources());
    pageIndex = plain.addPage({ width: 300, height: 200 });
    plain.drawText(pageIndex, {
      x: 24,
      y: 48,
      text: "fi",
      fontSize: 24,
      fontResourceName: face,
    });
    const unshaped = decodePdf(plain.toArrayBuffer());

    // The ligature collapses "f" + "i" into a single glyph (Carlito gid 67 =
    // <0043>), so the shaped show command differs from the 1:1 one.
    expect(shaped).toContain("<0043> Tj");
    expect(unshaped).not.toContain("<0043> Tj");
    // Copy/search stays correct: the ligature glyph maps back to "fi" in ToUnicode.
    expect(shaped).toContain("/ToUnicode");
    expect(shaped).toContain("00660069");
  });

  it("applies GPOS pair kerning when the run enables the kern feature", async () => {
    const registry = new PdfFontRegistry();
    await registry.loadBundledUnicodeFaces();
    const face = registry.resolveFontFace({
      fontFamily: "Calibri",
    }).writerResourceName;

    // Same text/font, with and without the kern feature. "AV" is a strong
    // negative kerning pair in Carlito.
    const kerned = new OasisPdfWriter(registry.getPdfFontResources());
    let pageIndex = kerned.addPage({ width: 300, height: 200 });
    kerned.drawText(pageIndex, {
      x: 24,
      y: 48,
      text: "AV",
      fontSize: 24,
      fontResourceName: face,
      fontFeatures: ["kern"],
    });
    const withKern = decodePdf(kerned.toArrayBuffer());

    const plain = new OasisPdfWriter(registry.getPdfFontResources());
    pageIndex = plain.addPage({ width: 300, height: 200 });
    plain.drawText(pageIndex, {
      x: 24,
      y: 48,
      text: "AV",
      fontSize: 24,
      fontResourceName: face,
    });
    const noKern = decodePdf(plain.toArrayBuffer());

    // Kerning emits a TJ array with a positive advance adjustment between the
    // glyphs (PDF moves the next glyph left), whereas the plain run is a flat Tj.
    expect(withKern).toContain(" TJ");
    expect(noKern).not.toContain(" TJ");
    expect(noKern).toContain(" Tj");
    // The glyph identities are unchanged, so copy/search still yields "AV".
    expect(withKern).toContain("/ToUnicode");
    expect(withKern).toContain("0041");
    expect(withKern).toContain("0056");
  });

  it("maps simple glyphs back through ToUnicode", async () => {
    const registry = new PdfFontRegistry();
    await registry.loadBundledUnicodeFaces();
    const writer = new OasisPdfWriter(registry.getPdfFontResources());
    const pageIndex = writer.addPage({ width: 300, height: 200 });

    writer.drawText(pageIndex, {
      x: 24,
      y: 48,
      text: "office",
      fontSize: 24,
      fontResourceName: registry.resolveFontFace({ fontFamily: "Unknown Font" })
        .writerResourceName,
    });

    const pdf = decodePdf(writer.toArrayBuffer());

    expectPdfText(pdf, "office");
    expect(pdf).toContain("/ToUnicode");
    expect(pdf).toContain("<006F>");
    expect(pdf).toContain("<0066>");
    expect(pdf).toContain("<0069>");
  });

  it("positions header, body, and footer from real section margins instead of fixed PDF offsets", async () => {
    const pageHeight = pxToPt(240);
    const document: EditorDocument = {
      id: "pdf-header-footer-geometry-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 240,
            height: 240,
            orientation: "portrait",
            margins: {
              top: 48,
              right: 48,
              bottom: 24,
              left: 48,
              header: 12,
              footer: 24,
              gutter: 0,
            },
          },
          header: [
            {
              id: "small-header",
              type: "paragraph",
              style: { spacingAfter: 0 },
              runs: [
                {
                  id: "small-header-run",
                  text: "HeaderOnly",
                  kind: "text" as const,
                },
              ],
            },
          ],
          footer: [
            {
              id: "small-footer",
              type: "paragraph",
              style: { spacingAfter: 0 },
              runs: [
                {
                  id: "small-footer-run",
                  text: "FooterOnly",
                  kind: "text" as const,
                },
              ],
            },
          ],
          blocks: [
            {
              id: "body-paragraph",
              type: "paragraph",
              style: { spacingAfter: 0 },
              runs: [
                { id: "body-run", text: "BodyOnly", kind: "text" as const },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
    );
    const page = layout.pages[0]!;
    const headerLine = page.headerBlocks?.[0]?.layout
      ?.lines[0] as EditorLayoutLine;
    const bodyLine = page.blocks[0]?.layout?.lines[0] as EditorLayoutLine;
    const footerLine = page.footerBlocks?.[0]?.layout
      ?.lines[0] as EditorLayoutLine;

    expect(findTextTopY(pdf, pageHeight, "HeaderOnly")).toBeCloseTo(
      pxToPt((page.headerTop ?? 0) + headerLine.top + headerLine.height * 0.8),
      3,
    );
    expect(findTextTopY(pdf, pageHeight, "BodyOnly")).toBeCloseTo(
      pxToPt((page.bodyTop ?? 0) + bodyLine.top + bodyLine.height * 0.8),
      3,
    );
    expect(findTextTopY(pdf, pageHeight, "FooterOnly")).toBeCloseTo(
      pxToPt((page.footerTop ?? 0) + footerLine.top + footerLine.height * 0.8),
      3,
    );
    expect(findTextTopY(pdf, pageHeight, "HeaderOnly")).not.toBeCloseTo(56, 3);
  });

  it("preserves header and footer geometry on every generated page", async () => {
    const pageHeight = pxToPt(300);
    const document: EditorDocument = {
      id: "pdf-repeated-header-footer-geometry-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 240,
            height: 300,
            orientation: "portrait",
            margins: {
              top: 24,
              right: 48,
              bottom: 24,
              left: 48,
              header: 12,
              footer: 24,
              gutter: 0,
            },
          },
          header: [
            {
              id: "repeat-header",
              type: "paragraph",
              style: { spacingAfter: 0 },
              runs: [
                {
                  id: "repeat-header-run",
                  text: "RepeatHeader",
                  kind: "text" as const,
                },
              ],
            },
          ],
          footer: [
            {
              id: "repeat-footer",
              type: "paragraph",
              style: { spacingAfter: 0 },
              runs: [
                {
                  id: "repeat-footer-run",
                  text: "RepeatFooter",
                  kind: "text" as const,
                },
              ],
            },
          ],
          blocks: Array.from({ length: 18 }, (_, index) => ({
            id: `paged-body-${index + 1}`,
            type: "paragraph" as const,
            style: { spacingAfter: 0 },
            runs: [
              {
                id: `paged-body-run-${index + 1}`,
                text: `PagedBody${index + 1}`,
                kind: "text" as const,
              },
            ],
          })),
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const pageCount = (pdf.match(/\/Type \/Page\n/g) ?? []).length;

    expect(pageCount).toBeGreaterThan(1);
    expect(countPdfText(pdf, "RepeatHeader")).toBe(pageCount);
    expect(countPdfText(pdf, "RepeatFooter")).toBe(pageCount);
    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
    );
    const firstPage = layout.pages[0]!;
    const headerLine = firstPage.headerBlocks?.[0]?.layout
      ?.lines[0] as EditorLayoutLine;
    const footerLine = firstPage.footerBlocks?.[0]?.layout
      ?.lines[0] as EditorLayoutLine;
    expect(findTextTopY(pdf, pageHeight, "RepeatHeader")).toBeCloseTo(
      pxToPt(
        (firstPage.headerTop ?? 0) + headerLine.top + headerLine.height * 0.8,
      ),
      3,
    );
    expect(findTextTopY(pdf, pageHeight, "RepeatFooter")).toBeCloseTo(
      pxToPt(
        (firstPage.footerTop ?? 0) + footerLine.top + footerLine.height * 0.8,
      ),
      3,
    );
  });

  it("renders table cell text, borders and shading for table blocks", async () => {
    const document: EditorDocument = {
      id: "pdf-table-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 480,
            height: 480,
            orientation: "portrait",
            margins: {
              top: 48,
              right: 48,
              bottom: 48,
              left: 48,
              header: 24,
              footer: 24,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "table-1",
              type: "table",
              gridCols: [120, 120],
              rows: [
                {
                  id: "row-1",
                  isHeader: true,
                  cells: [
                    {
                      id: "cell-1-1",
                      style: { shading: "#eeeeee" },
                      blocks: [
                        {
                          id: "p-1-1",
                          type: "paragraph",
                          runs: [
                            {
                              id: "r-1-1",
                              text: "HeaderA",
                              kind: "text" as const,
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: "cell-1-2",
                      blocks: [
                        {
                          id: "p-1-2",
                          type: "paragraph",
                          runs: [
                            {
                              id: "r-1-2",
                              text: "HeaderB",
                              kind: "text" as const,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: "row-2",
                  cells: [
                    {
                      id: "cell-2-1",
                      blocks: [
                        {
                          id: "p-2-1",
                          type: "paragraph",
                          runs: [
                            {
                              id: "r-2-1",
                              text: "BodyA",
                              kind: "text" as const,
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: "cell-2-2",
                      blocks: [
                        {
                          id: "p-2-2",
                          type: "paragraph",
                          runs: [
                            {
                              id: "r-2-2",
                              text: "BodyB",
                              kind: "text" as const,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();

    expectPdfText(pdf, "HeaderA");
    expectPdfText(pdf, "HeaderB");
    expectPdfText(pdf, "BodyA");
    expectPdfText(pdf, "BodyB");
    // Cell borders are emitted as PDF line segments.
    expect(pdf).toMatch(
      /\d+(\.\d+)? \d+(\.\d+)? m\n\d+(\.\d+)? \d+(\.\d+)? l\nS/,
    );
    // Shading on the first header cell produces a filled rectangle in the
    // cell's shading color.
    expect(pdf).toContain("0.933 0.933 0.933 rg");
  });

  it("exports vertically aligned table cell text using projected table geometry", async () => {
    const document: EditorDocument = {
      id: "pdf-table-vertical-align-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 240,
            height: 240,
            orientation: "portrait",
            margins: {
              top: 48,
              right: 48,
              bottom: 48,
              left: 48,
              header: 24,
              footer: 24,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "table-vertical-align",
              type: "table",
              gridCols: [120],
              rows: [
                {
                  id: "row-1",
                  style: { height: 90 },
                  cells: [
                    {
                      id: "cell-1-1",
                      style: { verticalAlign: "bottom" },
                      blocks: [
                        {
                          id: "p-1-1",
                          type: "paragraph",
                          runs: [
                            {
                              id: "r-1-1",
                              text: "BottomCell",
                              kind: "text" as const,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const projected = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
    );
    const page = projected.pages[0]!;
    const tableBlock = page.blocks[0]!;
    if (tableBlock.sourceBlock.type !== "table") {
      throw new Error("Expected projected table block");
    }
    const tableLayout = buildCanvasTableLayout({
      table: tableBlock.sourceBlock,
      state: createEditorStateFromDocument(document),
      pageIndex: 0,
      originX: 0,
      originY: 0,
      contentWidth:
        page.pageSettings.width -
        page.pageSettings.margins.left -
        page.pageSettings.margins.right,
      estimatedHeight: tableBlock.estimatedHeight,
    });
    const paragraph = tableLayout.cells[0]!.paragraphs[0]!;
    const line = paragraph.lines[0]!;
    const pageHeight = pxToPt(page.pageSettings.height);

    expectPdfText(pdf, "BottomCell");
    expect(findTextTopY(pdf, pageHeight, "BottomCell")).toBeCloseTo(
      pxToPt(
        (page.bodyTop ?? page.pageSettings.margins.top) +
          paragraph.originY +
          line.top +
          line.height * 0.8,
      ),
      3,
    );
    expect(paragraph.originY).toBeGreaterThan(tableLayout.cells[0]!.contentTop);
  });

  it("embeds and positions inline images using the projected layout geometry", async () => {
    const imageWidth = 32;
    const imageHeight = 24;
    const document = createInlineImageDocument({ imageWidth, imageHeight });

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
    );
    const page = layout.pages[0]!;
    const line = page.blocks[0]!.layout!.lines[0]!;
    const imageFragment = line.fragments.find((fragment) => fragment.image)!;
    const imageSlot = line.slots.find(
      (slot) => slot.offset === imageFragment.startOffset,
    )!;
    const drawnImage = findImageDraw(pdf);
    const pageHeightPt = pxToPt(page.pageSettings.height);

    expect(blob.type).toBe("application/pdf");
    expect(pdf).toContain("/Subtype /Image");
    expect(pdf).toContain("/XObject << /Im1");
    expect(pdf).toContain("/Filter [/ASCIIHexDecode /DCTDecode]");
    expect(pdf).toContain("/Im1 Do");
    expect(drawnImage.a).toBeCloseTo(pxToPt(imageWidth), 3);
    expect(drawnImage.b).toBeCloseTo(0, 3);
    expect(drawnImage.c).toBeCloseTo(0, 3);
    expect(drawnImage.d).toBeCloseTo(pxToPt(imageHeight), 3);
    expect(drawnImage.e).toBeCloseTo(
      pxToPt(page.pageSettings.margins.left + imageSlot.left),
      3,
    );
    expect(pageHeightPt - drawnImage.f - drawnImage.d).toBeCloseTo(
      pxToPt(
        (page.bodyTop ?? page.pageSettings.margins.top) +
          line.top +
          line.height -
          imageHeight,
      ),
      3,
    );
  });

  it("positions floating images from their page anchor instead of the inline slot", async () => {
    const document = createInlineImageDocument({
      id: "pdf-floating-image-document",
      imageWidth: 32,
      imageHeight: 24,
      floating: {
        type: "floating",
        wrap: "square",
        positionH: { relativeFrom: "page", offset: 952500 },
        positionV: { relativeFrom: "page", offset: 1428750 },
      },
    });
    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const draw = findImageDraw(pdf);
    const pageSettings = document.sections![0]!.pageSettings;
    const pageHeightPt = pxToPt(pageSettings.height);

    expect(draw.e).toBeCloseTo(pxToPt(100), 3);
    expect(pageHeightPt - draw.f - draw.d).toBeCloseTo(pxToPt(150), 3);
  });

  it("draws both table-cell diagonal borders in PDF", async () => {
    const document: EditorDocument = {
      id: "pdf-diagonal-table",
      sections: [
        {
          id: "s1",
          pageSettings: {
            width: 800,
            height: 1000,
            margins: {
              top: 80,
              right: 80,
              bottom: 80,
              left: 80,
              header: 40,
              footer: 40,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "t1",
              type: "table",
              gridCols: [120],
              rows: [
                {
                  id: "row1",
                  cells: [
                    {
                      id: "cell1",
                      style: {
                        borderTopLeftToBottomRight: {
                          width: 1,
                          type: "solid",
                          color: "#ff0000",
                        },
                        borderTopRightToBottomLeft: {
                          width: 1,
                          type: "solid",
                          color: "#0000ff",
                        },
                      },
                      blocks: [createEditorParagraph("diagonal")],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const pdf = await (await exportEditorDocumentToPdfBlob(document)).text();
    expect(pdf).toContain("1 0 0 RG");
    expect(pdf).toContain("0 0 1 RG");
  });

  it("rotates inline images 90 degrees around the projected box center", async () => {
    const imageWidth = 32;
    const imageHeight = 24;
    const document = createInlineImageDocument({
      id: "pdf-inline-image-rotated-90-document",
      imageWidth,
      imageHeight,
      rotation: 90,
    });

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
    );
    const page = layout.pages[0]!;
    const line = page.blocks[0]!.layout!.lines[0]!;
    const imageFragment = line.fragments.find((fragment) => fragment.image)!;
    const imageSlot = line.slots.find(
      (slot) => slot.offset === imageFragment.startOffset,
    )!;
    const drawnImages = findImageDraws(pdf);
    const drawnImage = drawnImages[0]!;
    const pageHeightPt = pxToPt(page.pageSettings.height);
    const center = resolveImageDrawCenter(drawnImage);
    const expectedCenterX = pxToPt(
      page.pageSettings.margins.left + imageSlot.left + imageWidth / 2,
    );
    const expectedTop = pxToPt(
      (page.bodyTop ?? page.pageSettings.margins.top) +
        line.top +
        line.height -
        imageHeight,
    );
    const expectedCenterY =
      pageHeightPt - expectedTop - pxToPt(imageHeight) / 2;

    expect(drawnImages).toHaveLength(1);
    expect(pdf).toContain("/Im1 Do");
    expect(pdf).not.toContain(
      `${pxToPt(imageWidth)} 0 0 ${pxToPt(imageHeight)}`,
    );
    expect(drawnImage.a).toBeCloseTo(0, 3);
    expect(drawnImage.b).toBeCloseTo(-pxToPt(imageWidth), 3);
    expect(drawnImage.c).toBeCloseTo(pxToPt(imageHeight), 3);
    expect(drawnImage.d).toBeCloseTo(0, 3);
    expect(center.x).toBeCloseTo(expectedCenterX, 3);
    expect(center.y).toBeCloseTo(expectedCenterY, 3);
  });

  it("renders an inline shape's geometry and fill instead of the object-replacement glyph", async () => {
    const document: EditorDocument = {
      id: "pdf-inline-shape-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 240,
            height: 240,
            orientation: "portrait",
            margins: {
              top: 48,
              right: 48,
              bottom: 48,
              left: 48,
              header: 24,
              footer: 24,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "shape-paragraph",
              type: "paragraph",
              runs: [
                {
                  id: "shape-run",
                  text: "￼",
                  kind: "textBox" as const,
                  textBox: {
                    width: 80,
                    height: 60,
                    blocks: [],
                    shape: {
                      preset: "diamond",
                      fill: "#4472C4",
                      borderColor: "#2F528F",
                      borderWidthPt: 1,
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();

    // Fill color #4472C4 → rgb fill command, and a filled+stroked path (B).
    expect(pdf).toContain("0.267 0.447 0.769 rg");
    expect(pdf).toMatch(
      /\d+(\.\d+)? \d+(\.\d+)? m\n(\d+(\.\d+)? \d+(\.\d+)? l\n)+h\nB/,
    );
    // The object-replacement character is not drawn as text.
    expect(pdf).not.toContain(`<${pdfHex("￼")}> Tj`);
  });

  it("positions a floating shape at its anchor instead of overflowing above the body", async () => {
    const shapeHeight = 200;
    const document: EditorDocument = {
      id: "pdf-floating-shape-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 480,
            height: 600,
            orientation: "portrait",
            margins: {
              top: 96,
              right: 48,
              bottom: 48,
              left: 48,
              header: 48,
              footer: 24,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "shape-paragraph",
              type: "paragraph",
              runs: [
                {
                  id: "shape-run",
                  text: "￼",
                  kind: "textBox" as const,
                  textBox: {
                    width: 240,
                    height: shapeHeight,
                    blocks: [],
                    shape: {
                      preset: "rect",
                      fill: "#4472C4",
                      borderColor: "#2F528F",
                      borderWidthPt: 1,
                    },
                    floating: {
                      type: "floating",
                      wrap: "none",
                      behindDoc: false,
                      allowOverlap: true,
                      positionH: { relativeFrom: "column", offset: 0 },
                      positionV: { relativeFrom: "paragraph", offset: 0 },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
    );
    const page = layout.pages[0]!;
    const pageHeightPt = pxToPt(page.pageSettings.height);
    const bodyTop = page.bodyTop ?? page.pageSettings.margins.top;

    // The shape's rectangle path starts at its top-left corner (anchor = body
    // top, offset 0). In PDF (bottom-left origin) that y is pageHeight - bodyTop.
    const move = new RegExp(
      "0\\.267 0\\.447 0\\.769 rg\\n[^\\n]*RG\\n[^\\n]*w\\n([\\d.]+) ([\\d.]+) m",
    ).exec(pdf);
    expect(move).not.toBeNull();
    const topEdgeY = Number(move![2]);
    expect(topEdgeY).toBeCloseTo(pageHeightPt - pxToPt(bodyTop), 1);
    // The top edge must stay within the page body, not up in the header band.
    expect(pageHeightPt - topEdgeY).toBeGreaterThanOrEqual(
      pxToPt(bodyTop) - 0.5,
    );
  });

  it("renders a shape's inner text content inside the box", async () => {
    const document: EditorDocument = {
      id: "pdf-shape-inner-text-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 480,
            height: 480,
            orientation: "portrait",
            margins: {
              top: 48,
              right: 48,
              bottom: 48,
              left: 48,
              header: 24,
              footer: 24,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "shape-paragraph",
              type: "paragraph",
              runs: [
                {
                  id: "shape-run",
                  text: "￼",
                  kind: "textBox" as const,
                  textBox: {
                    width: 200,
                    height: 120,
                    blocks: [
                      {
                        id: "inner-paragraph",
                        type: "paragraph",
                        runs: [
                          {
                            id: "inner-run",
                            text: "InsideShape",
                            kind: "text" as const,
                          },
                        ],
                      },
                    ],
                    shape: { preset: "rect", fill: "#4472C4" },
                    floating: {
                      type: "floating",
                      wrap: "none",
                      positionH: { relativeFrom: "column", offset: 0 },
                      positionV: { relativeFrom: "paragraph", offset: 0 },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();

    expectPdfText(pdf, "InsideShape");
    // The inner content is clipped to the box (W n clip operator emitted).
    expect(pdf).toContain("W\nn");
  });

  it("rotates a shape about its center using a cm transform", async () => {
    const rotation = 30;
    const document: EditorDocument = {
      id: "pdf-shape-rotation-document",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 480,
            height: 480,
            orientation: "portrait",
            margins: {
              top: 48,
              right: 48,
              bottom: 48,
              left: 48,
              header: 24,
              footer: 24,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: "shape-paragraph",
              type: "paragraph",
              runs: [
                {
                  id: "shape-run",
                  text: "￼",
                  kind: "textBox" as const,
                  textBox: {
                    width: 200,
                    height: 120,
                    blocks: [],
                    rotation,
                    shape: { preset: "rect", fill: "#4472C4" },
                    floating: {
                      type: "floating",
                      wrap: "none",
                      positionH: { relativeFrom: "column", offset: 0 },
                      positionV: { relativeFrom: "paragraph", offset: 0 },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();

    // Clockwise 30° → PDF math angle -30°: cos(30°)=0.866, sin(-30°)=-0.5.
    const cos = Number(Math.cos((-rotation * Math.PI) / 180).toFixed(3));
    const sin = Number(Math.sin((-rotation * Math.PI) / 180).toFixed(3));
    const matrix = new RegExp(
      `${cos} ${sin} ${-sin} ${cos} [-\\d.]+ [-\\d.]+ cm`,
    );
    expect(pdf).toMatch(matrix);
    expect(pdf).toContain("0.267 0.447 0.769 rg");
  });

  it("rotates inline images by arbitrary angles with a single transformed draw", async () => {
    const imageWidth = 32;
    const imageHeight = 24;
    const rotation = 30;
    const document = createInlineImageDocument({
      id: "pdf-inline-image-rotated-30-document",
      imageWidth,
      imageHeight,
      rotation,
    });

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();
    const draws = findImageDraws(pdf);
    const draw = draws[0]!;
    const radians = (-rotation * Math.PI) / 180;

    expect(draws).toHaveLength(1);
    expect(pdf).toContain("/Im1 Do");
    expect(draw.a).toBeCloseTo(pxToPt(imageWidth) * Math.cos(radians), 3);
    expect(draw.b).toBeCloseTo(pxToPt(imageWidth) * Math.sin(radians), 3);
    expect(draw.c).toBeCloseTo(-pxToPt(imageHeight) * Math.sin(radians), 3);
    expect(draw.d).toBeCloseTo(pxToPt(imageHeight) * Math.cos(radians), 3);
  });

  it("renders composite and legal list labels through the shared numbering path", async () => {
    const parent = createEditorParagraph("Parent");
    parent.list = {
      kind: "ordered",
      level: 0,
      instanceId: "pdf-list",
      format: "upperRoman",
      levelFormats: ["upperRoman", "lowerLetter"],
      levelText: "%1.",
    };
    const child = createEditorParagraph("Child");
    child.list = {
      kind: "ordered",
      level: 1,
      instanceId: "pdf-list",
      format: "lowerLetter",
      levelFormats: ["upperRoman", "lowerLetter"],
      levelText: "%1.%2)",
      legal: true,
      alignment: "right",
    };
    const document: EditorDocument = {
      id: "pdf-advanced-numbering",
      sections: [
        {
          id: "section-1",
          pageSettings: {
            width: 816,
            height: 1056,
            margins: {
              top: 96,
              right: 96,
              bottom: 96,
              left: 96,
              header: 48,
              footer: 48,
              gutter: 0,
            },
          },
          blocks: [parent, child],
        },
      ],
    };

    const pdf = await (await exportEditorDocumentToPdfBlob(document)).text();
    expectPdfText(pdf, "I.");
    expectPdfText(pdf, "1.1)");
  });
});
