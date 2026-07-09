import { describe, expect, it } from "vitest";
import { unzlibSync } from "fflate";
import { PdfContentStream } from "@/export/pdf/writer/PdfContentStream.js";
import type { OasisPdfPage } from "@/export/pdf/writer/pdfTypes.js";
import type { PdfFontTable } from "@/export/pdf/writer/PdfFontTable.js";
import type { PdfImageTable } from "@/export/pdf/writer/PdfImageTable.js";
import type { PdfShadingTable } from "@/export/pdf/writer/PdfShadingTable.js";
import { exportEditorDocumentToPdfBlob } from "@/export/pdf/exportEditorDocumentToPdf.js";
import type { EditorDocument, EditorImageBorder } from "@/core/model.js";

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

function makeStream(page: OasisPdfPage): PdfContentStream {
  const images = { has: (): boolean => true } as unknown as PdfImageTable;
  return new PdfContentStream(
    page,
    {} as PdfFontTable,
    images,
    {} as PdfShadingTable,
  );
}

/** Inflates every FlateDecode stream so content operators become searchable. */
function decodePdf(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let raw = "";
  for (let i = 0; i < bytes.length; i += 1) {
    raw += String.fromCharCode(bytes[i]!);
  }
  let out = "";
  let copiedTo = 0;
  let cursor = 0;
  for (;;) {
    const at = raw.indexOf("/FlateDecode", cursor);
    if (at === -1) break;
    const streamStart = raw.indexOf("stream\n", at);
    if (streamStart === -1) break;
    const dataStart = streamStart + "stream\n".length;
    const dataEnd = raw.indexOf("\nendstream", dataStart);
    if (dataEnd === -1) break;
    const compressed = new Uint8Array(dataEnd - dataStart);
    for (let i = 0; i < compressed.length; i += 1) {
      compressed[i] = raw.charCodeAt(dataStart + i) & 0xff;
    }
    try {
      out +=
        raw.slice(copiedTo, dataStart) +
        new TextDecoder().decode(unzlibSync(compressed));
      copiedTo = dataEnd;
    } catch {
      // Not a real inflate match; leave the bytes untouched.
    }
    cursor = dataEnd + 1;
  }
  return out + raw.slice(copiedTo);
}

function createBorderedImageDocument(options: {
  border?: EditorImageBorder;
  rotation?: number;
}): EditorDocument {
  return {
    id: "pdf-image-border-document",
    assets: { tiny: { id: "tiny", url: "data:image/jpeg;base64,/9j/2Q==" } },
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
            style: { spacingAfter: 0 },
            runs: [
              {
                id: "image-run",
                text: "￼",
                kind: "image" as const,
                image: {
                  src: "asset:tiny",
                  width: 32,
                  height: 24,
                  rotation: options.rotation,
                  border: options.border,
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

async function exportContent(options: {
  border?: EditorImageBorder;
  rotation?: number;
}): Promise<string> {
  const blob = await exportEditorDocumentToPdfBlob(
    createBorderedImageDocument(options),
  );
  return decodePdf(await blob.arrayBuffer());
}

describe("PdfContentStream.drawRect dash support", () => {
  it("emits the d operator for a dashed stroke", () => {
    const page = makePage();
    makeStream(page).drawRect({
      x: 10,
      y: 10,
      width: 100,
      height: 50,
      stroke: "#000000",
      lineWidth: 2.25,
      dashArray: [3.75, 2.25],
    });
    const content = page.commands.join("\n");
    expect(content).toContain("2.25 w");
    expect(content).toContain("[3.75 2.25] 0 d");
    expect(content).toContain("S");
  });

  it("omits the d operator when there is no dash pattern", () => {
    const page = makePage();
    makeStream(page).drawRect({
      x: 10,
      y: 10,
      width: 100,
      height: 50,
      stroke: "#000000",
    });
    expect(page.commands.join("\n")).not.toContain(" d\n");
  });
});

describe("PDF export: picture border", () => {
  it("strokes the displayed box in the border colour", async () => {
    const content = await exportContent({
      border: { color: "#FF0000", widthPt: 3 },
    });
    // 32x24 px at 0.75 pt/px -> 24x18 pt.
    expect(content).toMatch(/1 0 0 RG\n3 w\n[-\d.]+ [-\d.]+ 24 18 re\nS/);
  });

  it("emits the dash pattern shared with the canvas renderer", async () => {
    const content = await exportContent({
      border: { color: "#000000", widthPt: 1, dash: "dash" },
    });
    expect(content).toContain("[3.75 2.25] 0 d");
  });

  it("omits the dash operator for a solid border", async () => {
    const content = await exportContent({
      border: { color: "#000000", dash: "solid" },
    });
    expect(content).not.toContain("] 0 d");
  });

  it("rotates the border with the image, around the box centre", async () => {
    const content = await exportContent({
      border: { color: "#000000", widthPt: 1 },
      rotation: 90,
    });
    // A rotation `cm` must wrap the stroke rect inside its own q/Q pair.
    expect(content).toMatch(/\nq\n0 -1 1 0 [-\d.]+ [-\d.]+ cm\nq\n/);
    expect(content).toMatch(/re\nS\nQ\nQ/);
  });

  it("draws no stroke rect when the picture has no border", async () => {
    const content = await exportContent({});
    expect(content).not.toContain("re\nS");
  });
});
