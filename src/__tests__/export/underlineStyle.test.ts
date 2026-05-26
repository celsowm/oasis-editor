import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
} from "../../core/editorState.js";
import { exportEditorDocumentToDocx } from "../../export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import type { EditorParagraphNode, EditorUnderlineStyle } from "../../core/model.js";
import { UNDERLINE_STYLE_OPTIONS } from "../../ui/components/Toolbar/underlineStyles.js";

async function readDocumentXml(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("Missing word/document.xml");
  return xml;
}

const STYLES_TO_TEST: EditorUnderlineStyle[] = UNDERLINE_STYLE_OPTIONS.map((option) => option.value);

describe("DOCX underline style", () => {
  for (const style of STYLES_TO_TEST) {
    it(`exports <w:u w:val="${style}"/> when underlineStyle is "${style}"`, async () => {
      const document = createEditorDocument([
        createEditorParagraphFromRuns([
          { text: "x", styles: { underline: true, underlineStyle: style === "single" ? null : style } },
        ]),
      ]);
      const xml = await readDocumentXml(await exportEditorDocumentToDocx(document));
      expect(xml).toContain(`<w:u w:val="${style}"/>`);
    });

    it(`re-imports the underline style "${style}" from a round-trip`, async () => {
      const document = createEditorDocument([
        createEditorParagraphFromRuns([
          { text: "x", styles: { underline: true, underlineStyle: style === "single" ? null : style } },
        ]),
      ]);

      const docx = await exportEditorDocumentToDocx(document);
      const reimported = await importDocxToEditorDocument(docx);

      const paragraphs = (reimported.sections ?? []).flatMap((section) => section.blocks);
      const firstParagraph = paragraphs.find(
        (block): block is EditorParagraphNode => block.type === "paragraph",
      );
      expect(firstParagraph).toBeDefined();

      const run = firstParagraph!.runs[0]!;
      expect(run.styles?.underline).toBe(true);
      if (style === "single") {
        // "single" is the default and may be stripped from the model.
        expect(run.styles?.underlineStyle ?? null).toBeNull();
      } else {
        expect(run.styles?.underlineStyle).toBe(style);
      }
    });
  }
});
