import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "../../export/docx/exportEditorDocumentToDocx.js";
import { exportEditorDocumentToPdfBlob } from "../../export/pdf/exportEditorDocumentToPdf.js";
import {
  getPageContentWidth,
  getParagraphText,
  getParagraphById,
  resolveEffectiveParagraphStyle,
} from "../../core/model.js";
import { createEditorStateFromDocument } from "../../core/editorState.js";
import {
  projectDocumentLayout,
  projectParagraphLayout,
} from "../../layoutProjection/index.js";
import {
  getDocumentParagraphs,
  importComplexDocument,
  importLoremComplexDocument,
  pdfColorCommand,
} from "./docxTestHelpers.js";

async function buildDocxWithSingleParagraph(
  indAttributes: string,
): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:ind ${indAttributes}/>
      </w:pPr>
      <w:r><w:t>Indented paragraph</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

async function buildDocxWithContextualSpacing(
  paragraphProperties: string,
  stylesXml?: string,
  settingsXml?: string,
): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>${paragraphProperties}</w:pPr>
      <w:r><w:t>Contextual spacing</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  zip.file("word/document.xml", documentXml);
  if (stylesXml) {
    zip.file("word/styles.xml", stylesXml);
  }
  if (settingsXml) {
    zip.file("word/settings.xml", settingsXml);
  }
  return zip.generateAsync({ type: "arraybuffer" });
}

async function buildDocxWithNormalFirstLineAndExplicitZero(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:ind w:firstLine="0"/></w:pPr>
      <w:r><w:t>14    DA CLASSIFICAÇÃO NOS TERMOS DA LEI DE ACESSO A INFORMAÇÃO</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:ind w:firstLine="720"/></w:pPr>
  </w:style>
</w:styles>`;
  zip.file("word/document.xml", documentXml);
  zip.file("word/styles.xml", stylesXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

async function buildDocxWithLastRenderedPageBreak(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Before rendered break</w:t></w:r></w:p>
    <w:p><w:r><w:lastRenderedPageBreak/><w:t>After rendered break</w:t></w:r></w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("DOCX paragraph import", () => {
  it("preserves long lorem paragraphs and page-break-only paragraphs structurally", async () => {
    const document = await importLoremComplexDocument();
    const paragraphs = getDocumentParagraphs(document);
    const firstChapter = paragraphs.find(
      (paragraph) => getParagraphText(paragraph) === "Capítulo 1",
    );
    const secondChapter = paragraphs.find(
      (paragraph) => getParagraphText(paragraph) === "Capítulo 2",
    );
    const firstLorem =
      paragraphs[
        paragraphs.findIndex((paragraph) => paragraph === firstChapter) + 1
      ]!;

    expect(firstChapter?.style?.styleId?.toLowerCase()).toBe("heading1");
    expect(secondChapter?.style?.pageBreakBefore).toBe(true);
    expect(getParagraphText(firstLorem)).toHaveLength(2015);
    expect(getParagraphText(firstLorem)).not.toContain("\n");
    expect(firstLorem.style?.align).toBe("justify");
    expect(
      paragraphs.some((paragraph) =>
        getParagraphText(paragraph).includes("\f"),
      ),
    ).toBe(false);
    expect(
      paragraphs.filter(
        (paragraph) => getParagraphText(paragraph).length === 0,
      ),
    ).toHaveLength(0);
  });

  it("creates a valid canonical selection when imported doc uses sections with empty legacy blocks", async () => {
    const document = await importLoremComplexDocument();
    expect((document.sections?.length ?? 0) > 0).toBe(true);

    const state = createEditorStateFromDocument(document);
    const focusedParagraph = getParagraphById(
      state.document,
      state.selection.focus.paragraphId,
    );

    expect(state.activeZone).toBe("main");
    expect(focusedParagraph).toBeDefined();
  });

  it("lays out imported lorem text by wrapping one real paragraph instead of forced line breaks", async () => {
    const document = await importLoremComplexDocument();
    const paragraphs = getDocumentParagraphs(document);
    const firstLorem = paragraphs.find(
      (paragraph) => getParagraphText(paragraph).length === 2015,
    )!;
    const pageSettings =
      document.sections?.[0]?.pageSettings ?? document.pageSettings;
    const layout = projectParagraphLayout(
      firstLorem,
      undefined,
      undefined,
      document.styles,
      pageSettings ? getPageContentWidth(pageSettings) : undefined,
    );
    const lineTexts = layout.lines.map((line) =>
      line.fragments
        .map((fragment) => fragment.text)
        .join("")
        .trim(),
    );

    expect(getParagraphText(firstLorem)).not.toContain("\n");
    expect(layout.lines.length).toBeGreaterThan(10);
    expect(lineTexts).not.toContain("Sed");
  });

  it("keeps Heading 1 spacing before at the top of the first imported page", async () => {
    const document = await importLoremComplexDocument();
    const paragraphs = getDocumentParagraphs(document);
    const firstChapter = paragraphs.find(
      (paragraph) => getParagraphText(paragraph) === "Capítulo 1",
    )!;
    const effectiveStyle = resolveEffectiveParagraphStyle(
      firstChapter.style,
      document.styles,
    );
    const layout = projectDocumentLayout(
      document,
      undefined,
      undefined,
      undefined,
      { layoutMode: "wordParity" },
    );
    const firstBlock = layout.pages[0]!.blocks[0]!;
    const lineHeights = firstBlock.layout!.lines.reduce(
      (sum, line) => sum + line.height,
      0,
    );

    expect(effectiveStyle.spacingBefore).toBe(32);
    expect(effectiveStyle.spacingAfter).toBe(0);
    expect(firstBlock.sourceBlockId).toBe(firstChapter.id);
    expect(firstBlock.layout?.startOffset).toBe(0);
    expect(firstBlock.estimatedHeight).toBeCloseTo(lineHeights + 32, 4);
  });

  it("imports direct DOCX contextual paragraph spacing", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocxWithContextualSpacing("<w:contextualSpacing/>"),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;
    const effectiveStyle = resolveEffectiveParagraphStyle(
      paragraph.style,
      document.styles,
    );

    expect(paragraph.style?.contextualSpacing).toBe(true);
    expect(effectiveStyle.contextualSpacing).toBe(true);
  });

  it("inherits DOCX contextual paragraph spacing from a named paragraph style", async () => {
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="SameStyle">
    <w:name w:val="Same Style"/>
    <w:pPr><w:contextualSpacing/></w:pPr>
  </w:style>
</w:styles>`;
    const document = await importDocxToEditorDocument(
      await buildDocxWithContextualSpacing(
        '<w:pStyle w:val="SameStyle"/>',
        stylesXml,
      ),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;
    const effectiveStyle = resolveEffectiveParagraphStyle(
      paragraph.style,
      document.styles,
    );

    expect(paragraph.style?.styleId).toBe("SameStyle");
    expect(document.styles?.SameStyle?.paragraphStyle?.contextualSpacing).toBe(
      true,
    );
    expect(effectiveStyle.contextualSpacing).toBe(true);
  });

  it("does not enable DOCX contextual spacing when the value is off", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocxWithContextualSpacing('<w:contextualSpacing w:val="0"/>'),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;
    const effectiveStyle = resolveEffectiveParagraphStyle(
      paragraph.style,
      document.styles,
    );

    // Explicit `w:val="0"` is retained as `false` so it can override an
    // inherited style that turns contextual spacing on.
    expect(paragraph.style?.contextualSpacing).toBe(false);
    expect(effectiveStyle.contextualSpacing).toBe(false);
  });

  it("imports DOCX paragraph tab stops", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocxWithContextualSpacing(`
        <w:tabs>
          <w:tab w:val="left" w:pos="720"/>
          <w:tab w:val="right" w:pos="1440" w:leader="dot"/>
          <w:tab w:val="decimal" w:pos="2160" w:leader="hyphen"/>
          <w:tab w:val="bar" w:pos="2880"/>
          <w:tab w:val="clear" w:pos="3600"/>
        </w:tabs>
      `),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;

    expect(paragraph.style?.tabs).toEqual([
      { position: 36, type: "left" },
      { position: 72, type: "right", leader: "dot" },
      { position: 108, type: "decimal", leader: "hyphen" },
      { position: 144, type: "bar" },
      { position: 180, type: "clear" },
    ]);
  });

  it("imports DOCX default tab stop from settings and uses it for tab layout", async () => {
    const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="480"/>
</w:settings>`;
    const document = await importDocxToEditorDocument(
      await buildDocxWithContextualSpacing("", undefined, settingsXml),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;
    paragraph.runs[0]!.text = "a\tb";
    const layout = projectParagraphLayout(
      paragraph,
      undefined,
      undefined,
      document.styles,
      600,
      "wordParity",
      undefined,
      document.settings?.defaultTabStop,
    );
    const afterTab = layout.lines[0]!.slots.find((slot) => slot.offset === 2);

    expect(document.settings?.defaultTabStop).toBe(24);
    expect(afterTab?.left).toBeCloseTo(32, 4);
  });

  it("imports DOCX no-break and soft hyphen run content", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>non</w:t>
        <w:noBreakHyphen/>
        <w:t>breaking soft</w:t>
        <w:softHyphen/>
        <w:t>hyphen</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", documentXml);

    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;

    expect(getParagraphText(paragraph)).toBe("non‑breaking soft­hyphen");
  });

  it("preserves first-line indentation from DOCX in projected layout slots", async () => {
    const document = await importLoremComplexDocument();
    const paragraphs = getDocumentParagraphs(document);
    const firstIndentedParagraph = paragraphs.find(
      (paragraph) => (paragraph.style?.indentFirstLine ?? 0) > 0,
    );
    const pageSettings =
      document.sections?.[0]?.pageSettings ?? document.pageSettings;

    expect(firstIndentedParagraph).toBeDefined();
    expect(firstIndentedParagraph!.style?.indentFirstLine).toBeCloseTo(29, 0);

    const layout = projectParagraphLayout(
      firstIndentedParagraph!,
      undefined,
      undefined,
      document.styles,
      pageSettings ? getPageContentWidth(pageSettings) : undefined,
    );

    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines[0]!.slots[0]?.left ?? 0).toBeCloseTo(29, 0);
    expect(layout.lines[1]!.slots[0]?.left ?? 0).toBeCloseTo(0, 0);
  });

  it("imports images with correct dimensions from DOCX", async () => {
    const document = await importLoremComplexDocument();
    const paragraphs = getDocumentParagraphs(document);
    const imageParagraph = paragraphs.find((p) => p.runs.some((r) => r.image));

    expect(imageParagraph).toBeDefined();
    const imageRun = imageParagraph!.runs.find((r) => r.image)!;
    expect(imageRun.text).toBe("￼");
    expect(imageRun.image?.width).toBe(557);
    expect(imageRun.image?.height).toBe(278);
    expect(imageRun.image?.src).toMatch(/^asset:/);

    const assetId = imageRun.image!.src.split(":")[1]!;
    expect(document.assets?.[assetId]).toBeDefined();
    expect(document.assets?.[assetId]?.url).toMatch(/^data:image\/png;base64,/);
  });

  it("imports paragraph borders and shading, round-tripping back to DOCX", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pBdr>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="111827"/>
          <w:left w:val="dotted" w:sz="6" w:space="0" w:color="64748B"/>
          <w:bottom w:val="dashed" w:sz="4" w:space="0" w:color="334155"/>
          <w:right w:val="nil"/>
        </w:pBdr>
        <w:shd w:val="clear" w:color="auto" w:fill="FEF3C7"/>
      </w:pPr>
      <w:r><w:t>Boxed paragraph</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", documentXml);

    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;

    expect(paragraph.style?.shading).toBe("#FEF3C7");
    expect(paragraph.style?.borderTop).toEqual({
      width: 1,
      type: "solid",
      color: "#111827",
    });
    expect(paragraph.style?.borderLeft).toEqual({
      width: 0.75,
      type: "dotted",
      color: "#64748B",
    });
    expect(paragraph.style?.borderBottom).toEqual({
      width: 0.5,
      type: "dashed",
      color: "#334155",
    });
    expect(paragraph.style?.borderRight).toEqual({
      width: 0,
      type: "none",
      color: "transparent",
    });

    const zip2 = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const reexported = await zip2.file("word/document.xml")?.async("string");
    expect(reexported).toContain("<w:pBdr>");
    expect(reexported).toContain(
      '<w:top w:val="single" w:sz="8" w:space="0" w:color="111827"/>',
    );
    expect(reexported).toContain(
      '<w:shd w:val="clear" w:color="auto" w:fill="FEF3C7"/>',
    );
  });

  it("honors explicit w:keepNext w:val='0' overriding a paragraph style", async () => {
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Sticky">
    <w:name w:val="Sticky"/>
    <w:pPr><w:keepNext/></w:pPr>
  </w:style>
</w:styles>`;
    const document = await importDocxToEditorDocument(
      await buildDocxWithContextualSpacing(
        '<w:pStyle w:val="Sticky"/><w:keepNext w:val="0"/>',
        stylesXml,
      ),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;

    expect(paragraph.style?.keepWithNext).toBe(false);
    expect(
      resolveEffectiveParagraphStyle(paragraph.style, document.styles)
        .keepWithNext,
    ).toBe(false);
  });

  it("maps OOXML start/end indents and applies hanging precedence over firstLine", async () => {
    const buffer = await buildDocxWithSingleParagraph(
      'w:start="720" w:end="360" w:firstLine="300" w:hanging="180"',
    );
    const document = await importDocxToEditorDocument(buffer);
    const paragraph = getDocumentParagraphs(document)[0]!;

    expect(paragraph.style?.indentLeft).toBe(48);
    expect(paragraph.style?.indentRight).toBe(24);
    expect(paragraph.style?.indentHanging).toBe(12);
    expect(paragraph.style?.indentFirstLine).toBeUndefined();
  });

  it("preserves explicit zero first-line indentation over imported Normal style", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocxWithNormalFirstLineAndExplicitZero(),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;
    const pageSettings =
      document.sections?.[0]?.pageSettings ?? document.pageSettings;

    expect(document.styles?.Normal?.paragraphStyle?.indentFirstLine).toBe(48);
    expect(paragraph.style?.indentFirstLine).toBe(0);

    const layout = projectParagraphLayout(
      paragraph,
      undefined,
      undefined,
      document.styles,
      pageSettings ? getPageContentWidth(pageSettings) : undefined,
    );

    expect(layout.lines[0]!.slots[0]?.left).toBe(0);
  });

  it("preserves manual page breaks as paragraph page breaks", async () => {
    const document = await importComplexDocument();
    const paragraphs = getDocumentParagraphs(document);
    const summary = paragraphs.find((paragraph) =>
      paragraph.runs.some((run) => run.text.includes("Sumário")),
    );
    const secondTitle = paragraphs.find(
      (paragraph, index) =>
        index > 20 &&
        paragraph.runs.some((run) => run.text.includes("TERMO DE REFERÊNCIA")),
    );
    const renderedBreakContinuation = paragraphs.find((paragraph) =>
      paragraph.runs.some((run) =>
        run.text.includes("dispositivos iOS/iPadOS e simuladores"),
      ),
    );
    const footerPageField = document.sections?.[0]?.footer
      ?.flatMap((block) => (block.type === "paragraph" ? block.runs : []))
      .find((run) => run.field?.type === "PAGE");

    expect(summary?.style?.pageBreakBefore).toBe(true);
    expect(secondTitle?.style?.pageBreakBefore).toBe(true);
    expect(renderedBreakContinuation?.style?.pageBreakBefore).toBeUndefined();
    expect(footerPageField?.field?.type).toBe("PAGE");
    expect(
      paragraphs.some((paragraph) =>
        paragraph.runs.some((run) => run.text.includes("\f")),
      ),
    ).toBe(false);
  });

  it("ignores Word lastRenderedPageBreak markers on import", async () => {
    const document = await importDocxToEditorDocument(
      await buildDocxWithLastRenderedPageBreak(),
    );
    const paragraphs = getDocumentParagraphs(document);

    expect(paragraphs.map(getParagraphText)).toEqual([
      "Before rendered break",
      "After rendered break",
    ]);
    expect(paragraphs[1]?.style?.pageBreakBefore).toBeUndefined();
  });

  it("imports paragraph borders and carries them through PDF export", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pBdr>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="112233"/>
          <w:left w:val="dotted" w:sz="6" w:space="0" w:color="778899"/>
        </w:pBdr>
      </w:pPr>
      <w:r><w:t>Bordered paragraph</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", documentXml);
    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );

    const pdf = await (await exportEditorDocumentToPdfBlob(document)).text();
    expect(pdf).toContain(pdfColorCommand("#112233", "RG"));
    expect(pdf).toContain(pdfColorCommand("#778899", "RG"));
  });
});
