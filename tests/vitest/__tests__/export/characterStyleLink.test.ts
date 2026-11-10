import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
} from "@/core/editorState.js";
import {
  getDocumentParagraphs,
  resolveEffectiveTextStyleForParagraph,
} from "@/core/model.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

describe("DOCX character style links", () => {
  it("retains the named style and direct overrides without freezing inherited effects", async () => {
    const paragraph = createEditorParagraphFromRuns([
      {
        text: "linked",
        styles: { styleId: "LinkedEmphasis", color: "#ff0000" },
      },
    ]);
    const doc = createEditorDocument([paragraph]);
    doc.styles = {
      ...doc.styles,
      LinkedEmphasis: {
        id: "LinkedEmphasis",
        name: "Linked emphasis",
        type: "character",
        textStyle: { italic: true, color: "#0000ff" },
      },
    };
    const bytes = await exportEditorDocumentToDocx(doc);
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain('<w:rStyle w:val="LinkedEmphasis"/>');
    expect(xml).toContain('<w:color w:val="FF0000"/>');
    expect(xml).not.toContain("<w:i/>");
    const restored = await importDocxToEditorDocument(bytes);
    const p = getDocumentParagraphs(restored)[0]!,
      run = p.runs[0]!;
    expect(run.styles?.styleId).toBe("LinkedEmphasis");
    const effective = () =>
      resolveEffectiveTextStyleForParagraph(
        run.styles,
        p.style?.styleId,
        restored.styles,
      );
    expect(effective().italic).toBe(true);
    expect(effective().color?.toLowerCase()).toBe("#ff0000");
    restored.styles!.LinkedEmphasis!.textStyle = {
      italic: false,
      color: "#00ff00",
    };
    expect(effective().italic).toBe(false);
    expect(effective().color?.toLowerCase()).toBe("#ff0000");
  });
});
