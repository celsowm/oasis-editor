import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
} from "@/core/editorState.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { getDocumentParagraphs, getRunImage } from "@/core/model.js";
import type { EditorImageBorder } from "@/core/model.js";

async function exportImageXml(
  border: EditorImageBorder | undefined,
): Promise<string> {
  const paragraph = createEditorParagraphFromRuns([
    {
      text: "￼",
      image: {
        src: "data:image/png;base64,AAAA",
        width: 120,
        height: 80,
        ...(border ? { border } : {}),
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

describe("DOCX export: picture border (pic:spPr/a:ln)", () => {
  it("emits a:ln after a:prstGeom, inside pic:spPr", async () => {
    const xml = await exportImageXml({
      color: "#C00000",
      widthPt: 2.25,
      dash: "dash",
    });
    expect(xml).toContain(
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' +
        '<a:ln w="28575">' +
        '<a:solidFill><a:srgbClr val="C00000"/></a:solidFill>' +
        '<a:prstDash val="dash"/>' +
        "</a:ln></pic:spPr>",
    );
  });

  it("converts the weight from points to EMU", async () => {
    const xml = await exportImageXml({ color: "#000000", widthPt: 1 });
    expect(xml).toContain('<a:ln w="12700">');
  });

  it("omits the weight attribute and prstDash when unset", async () => {
    const xml = await exportImageXml({ color: "#4472C4" });
    expect(xml).toContain(
      '<a:ln><a:solidFill><a:srgbClr val="4472C4"/></a:solidFill></a:ln>',
    );
    expect(xml).not.toContain("a:prstDash");
  });

  it("emits no a:ln at all for a picture without a border", async () => {
    const xml = await exportImageXml(undefined);
    expect(xml).not.toContain("<a:ln");
  });

  it("round-trips colour, weight and dash back through import", async () => {
    const border: EditorImageBorder = {
      color: "#4472C4",
      widthPt: 4.5,
      dash: "lgDashDotDot",
    };
    const paragraph = createEditorParagraphFromRuns([
      {
        text: "￼",
        image: {
          src: "data:image/png;base64,iVBORw0KGgo=",
          width: 120,
          height: 80,
          border,
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
    expect(getRunImage(run!)!.border).toEqual(border);
  });
});
