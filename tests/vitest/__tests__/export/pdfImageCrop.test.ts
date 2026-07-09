import { describe, expect, it } from "vitest";
import { PdfContentStream } from "@/export/pdf/writer/PdfContentStream.js";
import type {
  OasisPdfPage,
  OasisPdfImageOptions,
} from "@/export/pdf/writer/pdfTypes.js";
import type { PdfFontTable } from "@/export/pdf/writer/PdfFontTable.js";
import type { PdfImageTable } from "@/export/pdf/writer/PdfImageTable.js";
import type { PdfShadingTable } from "@/export/pdf/writer/PdfShadingTable.js";

function makePage(): OasisPdfPage {
  return {
    width: 600,
    height: 800,
    commands: [],
    imageResourceNames: new Set(),
    shadingResourceNames: new Set(),
    annotations: [],
  };
}

/** A content stream whose image table reports every resource as present. */
function makeStream(page: OasisPdfPage): PdfContentStream {
  const images = { has: (): boolean => true } as unknown as PdfImageTable;
  const fonts = {} as PdfFontTable;
  const shadings = {} as PdfShadingTable;
  return new PdfContentStream(page, fonts, images, shadings);
}

const baseOptions: OasisPdfImageOptions = {
  resourceName: "Im1",
  x: 100,
  y: 100,
  width: 200,
  height: 100,
};

describe("PDF image crop", () => {
  it("draws the full image, scaled and clipped, when cropped", () => {
    const page = makePage();
    makeStream(page).drawImage({
      ...baseOptions,
      crop: { left: 0.25, right: 0.25 }, // show the centre half horizontally
    });
    const content = page.commands.join("\n");

    // Clips to the displayed box (box-local, since rotation is identity here).
    expect(content).toContain("0 0 200 100 re W n");
    // Full image is twice as wide (fw = 0.5) → 400, offset left by 0.25*400=100.
    expect(content).toContain("400 0 0 100 -100 0 cm");
    expect(content).toContain("/Im1 Do");
  });

  it("keeps the simple (non-clipped) path when there is no crop", () => {
    const page = makePage();
    makeStream(page).drawImage(baseOptions);
    const content = page.commands.join("\n");
    expect(content).not.toContain("re W n");
    expect(content).toContain("/Im1 Do");
  });
});
