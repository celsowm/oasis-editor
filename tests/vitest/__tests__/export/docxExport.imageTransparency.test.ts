import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
} from "@/core/editorState.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { getDocumentParagraphs, getRunImage } from "@/core/model.js";

async function exportImageXml(
  transparency: number | undefined,
): Promise<string> {
  const paragraph = createEditorParagraphFromRuns([
    {
      text: "￼",
      image: {
        src: "data:image/png;base64,AAAA",
        width: 120,
        height: 80,
        ...(transparency !== undefined ? { transparency } : {}),
      },
    },
  ]);
  const buffer = await exportEditorDocumentToDocx(
    createEditorDocument([paragraph]),
  );
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("Missing word/document.xml");
  return xml;
}

describe("DOCX export: picture transparency (a:alphaModFix)", () => {
  it("emits a:alphaModFix inside the blip with a per-mille amount", async () => {
    const xml = await exportImageXml(0.25);
    const amt = Math.round((1 - 0.25) * 100000);
    expect(xml).toContain(`<a:alphaModFix amt="${amt}"/>`);
    expect(xml).toContain("<a:blip ");
    const blipMatch = xml.match(
      /<a:blip[^>]*>.*?<\/a:blip>/,
    );
    expect(blipMatch).toBeTruthy();
    expect(blipMatch![0]).toContain("a:alphaModFix");
  });

  it("emits no a:alphaModFix for a fully opaque picture", async () => {
    const xml = await exportImageXml(undefined);
    expect(xml).not.toContain("a:alphaModFix");
  });

  it("round-trips the transparency value back through import", async () => {
    const paragraph = createEditorParagraphFromRuns([
      {
        text: "￼",
        image: {
          src: "data:image/png;base64,iVBORw0KGgo=",
          width: 120,
          height: 80,
          transparency: 0.6,
        },
      },
    ]);
    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([paragraph]),
    );
    const reimported = await importDocxToEditorDocument(buffer);
    const run = getDocumentParagraphs(reimported)
      .flatMap((p) => p.runs)
      .find((r) => getRunImage(r));
    expect(getRunImage(run!)!.transparency).toBeCloseTo(0.6, 2);
  });
});
