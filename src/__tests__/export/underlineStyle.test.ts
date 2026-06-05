import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
} from "../../core/editorState.js";
import { exportEditorDocumentToDocx } from "../../export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import type {
  EditorParagraphNode,
  EditorUnderlineStyle,
} from "../../core/model.js";
import { UNDERLINE_STYLE_OPTIONS } from "../../ui/components/Toolbar/underlineStyles.js";

async function readDocumentXml(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("Missing word/document.xml");
  return xml;
}

const STYLES_TO_TEST: EditorUnderlineStyle[] = UNDERLINE_STYLE_OPTIONS.map(
  (option) => option.value,
);

describe("DOCX underline style", () => {
  for (const style of STYLES_TO_TEST) {
    it(`exports <w:u w:val="${style}"/> when underlineStyle is "${style}"`, async () => {
      const document = createEditorDocument([
        createEditorParagraphFromRuns([
          {
            text: "x",
            styles: {
              underline: true,
              underlineStyle: style === "single" ? null : style,
            },
          },
        ]),
      ]);
      const xml = await readDocumentXml(
        await exportEditorDocumentToDocx(document),
      );
      expect(xml).toContain(`<w:u w:val="${style}"/>`);
    });

    it(`re-imports the underline style "${style}" from a round-trip`, async () => {
      const document = createEditorDocument([
        createEditorParagraphFromRuns([
          {
            text: "x",
            styles: {
              underline: true,
              underlineStyle: style === "single" ? null : style,
            },
          },
        ]),
      ]);

      const docx = await exportEditorDocumentToDocx(document);
      const reimported = await importDocxToEditorDocument(docx);

      const paragraphs = (reimported.sections ?? []).flatMap(
        (section) => section.blocks,
      );
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

  it("round-trips underline color and advanced run flags", async () => {
    const document = createEditorDocument([
      createEditorParagraphFromRuns([
        {
          text: "x",
          styles: {
            underline: true,
            underlineStyle: "single",
            underlineColor: "#ff0000",
            doubleStrike: true,
            smallCaps: true,
            allCaps: true,
            hidden: true,
            characterScale: 120,
            characterSpacing: -1.5,
            baselineShift: 2,
            kerningThreshold: 14,
            ligatures: "standardContextual",
            numberSpacing: "tabular",
            numberForm: "oldStyle",
            stylisticSet: 7,
            contextualAlternates: true,
          },
        },
      ]),
    ]);

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(document),
    );
    expect(xml).toContain('<w:u w:val="single" w:color="ff0000"/>');
    expect(xml).toContain("<w:dstrike/>");
    expect(xml).toContain("<w:smallCaps/>");
    expect(xml).toContain("<w:caps/>");
    expect(xml).toContain("<w:vanish/>");
    expect(xml).toContain('<w:w w:val="120"/>');
    expect(xml).toContain('<w:spacing w:val="-30"/>');
    expect(xml).toContain('<w:position w:val="4"/>');
    expect(xml).toContain('<w:kern w:val="28"/>');
    expect(xml).toContain('<w14:ligatures w14:val="standardContextual"/>');
    expect(xml).toContain('<w14:numSpacing w14:val="tabular"/>');
    expect(xml).toContain('<w14:numForm w14:val="oldStyle"/>');
    expect(xml).toContain('<w14:stylisticSets w14:val="00000040"/>');
    expect(xml).toContain('<w14:cntxtAlts w14:val="1"/>');

    const reimported = await importDocxToEditorDocument(
      await exportEditorDocumentToDocx(document),
    );
    const paragraphs = (reimported.sections ?? []).flatMap(
      (section) => section.blocks,
    );
    const firstParagraph = paragraphs.find(
      (block): block is EditorParagraphNode => block.type === "paragraph",
    );
    expect(firstParagraph).toBeDefined();
    const run = firstParagraph!.runs[0]!;
    expect(run.styles?.underlineColor).toBe("#ff0000");
    expect(run.styles?.doubleStrike).toBe(true);
    expect(run.styles?.smallCaps).toBe(true);
    expect(run.styles?.allCaps).toBe(true);
    expect(run.styles?.hidden).toBe(true);
    expect(run.styles?.characterScale).toBe(120);
    expect(run.styles?.characterSpacing).toBe(-1.5);
    expect(run.styles?.baselineShift).toBe(2);
    expect(run.styles?.kerningThreshold).toBe(14);
    expect(run.styles?.ligatures).toBe("standardContextual");
    expect(run.styles?.numberSpacing).toBe("tabular");
    expect(run.styles?.numberForm).toBe("oldStyle");
    expect(run.styles?.stylisticSet).toBe(7);
    expect(run.styles?.contextualAlternates).toBe(true);
  });
});
