import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { getRunImage } from "@/core/model.js";
import type { EditorImageRunData } from "@/core/model.js";
import { getDocumentParagraphs } from "./docxTestHelpers.js";

/** A 1x1 transparent PNG — enough for `loadEmbeddedImage` to resolve. */
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * Builds a DOCX with one inline picture. `spPrExtra` is injected inside
 * `pic:spPr` right after `a:prstGeom`, and `blipFillExtra` inside
 * `pic:blipFill` — the two places an `a:ln` can plausibly turn up.
 */
async function buildDocxWithImage(options: {
  spPrExtra?: string;
  blipFillExtra?: string;
}): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`,
  );
  zip.file("word/media/image1.png", TINY_PNG_BASE64, { base64: true });
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
  <w:body>
    <w:p>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="1905000" cy="952500"/>
            <wp:docPr id="1" name="Picture 1"/>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr><pic:cNvPr id="0" name="Picture 1"/><pic:cNvPicPr/></pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="rId1"/>
                    ${options.blipFillExtra ?? ""}
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm><a:off x="0" y="0"/><a:ext cx="1905000" cy="952500"/></a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                    ${options.spPrExtra ?? ""}
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>
  </w:body>
</w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

async function importImage(options: {
  spPrExtra?: string;
  blipFillExtra?: string;
}): Promise<EditorImageRunData> {
  const document = await importDocxToEditorDocument(
    await buildDocxWithImage(options),
  );
  for (const paragraph of getDocumentParagraphs(document)) {
    for (const run of paragraph.runs) {
      const image = getRunImage(run);
      if (image) return image;
    }
  }
  throw new Error("no image run imported");
}

describe("DOCX import: picture border (pic:spPr/a:ln)", () => {
  it("reads colour, weight and dash preset", async () => {
    const image = await importImage({
      spPrExtra:
        '<a:ln w="28575"><a:solidFill><a:srgbClr val="C00000"/></a:solidFill><a:prstDash val="dash"/></a:ln>',
    });
    expect(image.border).toEqual({
      color: "#C00000",
      widthPt: 2.25,
      dash: "dash",
    });
  });

  it("defaults weight and dash when the outline omits them", async () => {
    const image = await importImage({
      spPrExtra:
        '<a:ln><a:solidFill><a:srgbClr val="4472C4"/></a:solidFill></a:ln>',
    });
    expect(image.border).toEqual({ color: "#4472C4" });
  });

  it("ignores an unsupported prstDash value rather than importing it", async () => {
    const image = await importImage({
      spPrExtra:
        '<a:ln w="12700"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:prstDash val="sysDashDotDot"/></a:ln>',
    });
    expect(image.border).toEqual({ color: "#000000", widthPt: 1 });
  });

  it("drops an outline with no solid colour", async () => {
    const image = await importImage({
      spPrExtra: '<a:ln w="12700"><a:noFill/></a:ln>',
    });
    expect(image.border).toBeUndefined();
  });

  it("does not mistake an a:ln nested elsewhere in the drawing for the border", async () => {
    // An `a:ln` outside `pic:spPr` (here inside blipFill) must not be picked up.
    const image = await importImage({
      blipFillExtra:
        '<a:ln w="76200"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:ln>',
    });
    expect(image.border).toBeUndefined();
  });

  it("has no border when the picture has no outline at all", async () => {
    const image = await importImage({});
    expect(image.border).toBeUndefined();
  });
});
