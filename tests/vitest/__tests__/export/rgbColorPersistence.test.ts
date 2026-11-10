import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
} from "@/core/editorState.js";
import { getDocumentParagraphs } from "@/core/model.js";
import { normalizeOpaqueRgbColor } from "@/core/color.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { colorCommand } from "@/export/pdf/writer/pdfPrimitives.js";
import { blendColorWithWhite } from "@/export/pdf/draw/fragment/pdfColor.js";

describe("opaque RGB formatting persistence", () => {
  it("retains RGB foreground, highlight and shading in DOCX", async () => {
    const doc = createEditorDocument([
      createEditorParagraphFromRuns([
        {
          text: "colored",
          styles: {
            color: "rgb(255,0,0)",
            highlight: "rgb(0,255,255)",
            shading: "rgb(0,128,0)",
            underline: true,
            underlineColor: "rgb(0,0,255)",
          },
        },
      ]),
    ]);
    const bytes = await exportEditorDocumentToDocx(doc);
    const xml = await (
      await JSZip.loadAsync(bytes)
    )
      .file("word/document.xml")!
      .async("string");
    expect(xml).toContain('<w:color w:val="FF0000"/>');
    expect(xml).toContain('<w:highlight w:val="cyan"/>');
    expect(xml).toContain('w:fill="008000"');
    const restored = await importDocxToEditorDocument(bytes);
    const style = getDocumentParagraphs(restored)[0]!.runs[0]!.styles!;
    expect(style.color?.toLowerCase()).toBe("#ff0000");
    expect(style.shading?.toLowerCase()).toBe("#008000");
    expect(normalizeOpaqueRgbColor(style.highlight)).toBe("00FFFF");
    expect(style.underlineColor?.toLowerCase()).toBe("#0000ff");
  });
  it("writes RGB PDF drawing operators and blends the same color", () => {
    expect(colorCommand("rgb(255 0 0)", "rg", [0, 0, 0])).toBe("1 0 0 rg");
    expect(colorCommand("#f00", "RG", [0, 0, 0])).toBe("1 0 0 RG");
    expect(blendColorWithWhite("rgb(255,0,0)", 0.5)).toBe("#ff8080");
  });
});
