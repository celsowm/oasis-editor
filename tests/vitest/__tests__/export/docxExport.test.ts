import { getRunImage, getRunTextBox, getRunField, getRunFieldChar, getRunFieldInstruction, getRunFootnoteReference, getRunEndnoteReference, getRunSym } from "@/core/model.js";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { setSelectedImageWrapPreset } from "@/core/commands/image.js";
import { createImageCaptionParagraph } from "@/core/document/imageCaptions.js";
import type { WrapPreset } from "@/core/commands/floatingLayout.js";
import {
  getDocumentParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import type { EditorDocument } from "@/core/model.js";

async function readDocumentXml(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) {
    throw new Error("Missing word/document.xml");
  }
  return xml;
}

async function readZipText(buffer: ArrayBuffer, path: string): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file(path)?.async("string");
  if (!xml) {
    throw new Error(`Missing ${path}`);
  }
  return xml;
}

describe("DOCX export", () => {
  it("serializes image captions as Word SEQ fields", async () => {
    const imageParagraph = createEditorParagraphFromRuns([
      {
        text: "\uFFFC",
        image: {
          src: "data:image/png;base64,AAAA",
          width: 120,
          height: 80,
        },
      },
    ]);
    const caption = createImageCaptionParagraph("Vista geral", "Figura", 1);
    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(
        createEditorDocument([imageParagraph, caption]),
      ),
    );

    expect(xml).toContain('<w:pStyle w:val="Caption"/>');
    expect(xml).toContain('<w:fldChar w:fldCharType="begin"/>');
    expect(xml).toContain(
      '<w:instrText xml:space="preserve"> SEQ Figure \\* ARABIC </w:instrText>',
    );
    expect(xml).toContain('<w:fldChar w:fldCharType="separate"/>');
    expect(xml).toContain("<w:t>1</w:t>");
    expect(xml).toContain('<w:fldChar w:fldCharType="end"/>');
    expect(xml).toContain("<w:t>: Vista geral</w:t>");
  });

  it("serializes table geometry and cell styling details", async () => {
    const firstCell = createEditorTableCell([
      createEditorParagraph("Linha 1 Col 1"),
    ]);
    firstCell.style = {
      width: 72,
      shading: "#F1F5F9",
      paddingTop: 3,
      paddingRight: 6,
      paddingBottom: 4,
      paddingLeft: 5,
      borderTop: { width: 1, type: "solid", color: "#111827" },
      borderRight: { width: 0.5, type: "dashed", color: "#334155" },
      borderBottom: { width: 0, type: "none", color: "transparent" },
      borderLeft: { width: 0.75, type: "dotted", color: "#64748B" },
      verticalAlign: "middle",
      horizontalAlign: "center",
    };

    const secondCell = createEditorTableCell([
      createEditorParagraph("Linha 1 Col 2"),
    ]);
    secondCell.style = { verticalAlign: "top" };

    const thirdCell = createEditorTableCell([
      createEditorParagraph("Linha 1 Col 3"),
    ]);
    thirdCell.style = { verticalAlign: "bottom" };

    const row = createEditorTableRow([firstCell, secondCell, thirdCell], {
      isHeader: true,
    });
    row.style = { height: 24 };

    const table = createEditorTable([row], [72, 108, 90]);
    table.style = { width: 270, indentLeft: 18, align: "left" };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([table])),
    );

    expect(xml).toContain('<w:tblW w:w="5400" w:type="dxa"/>');
    expect(xml).toContain('<w:tblInd w:w="360" w:type="dxa"/>');
    expect(xml).toContain('<w:tblLayout w:type="fixed"/>');
    expect(xml).toContain('<w:gridCol w:w="1440"/>');
    expect(xml).toContain('<w:gridCol w:w="2160"/>');
    expect(xml).toContain('<w:gridCol w:w="1800"/>');
    expect(xml).toContain('<w:trHeight w:val="480" w:hRule="atLeast"/>');
    expect(xml).toContain('<w:tcW w:w="1440" w:type="dxa"/>');
    expect(xml).toContain(
      '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>',
    );
    expect(xml).toContain('<w:vAlign w:val="center"/>');
    expect(xml).toContain('<w:vAlign w:val="top"/>');
    expect(xml).toContain('<w:vAlign w:val="bottom"/>');
    expect(xml).toContain("<w:tcMar>");
    expect(xml).toContain('<w:top w:w="60" w:type="dxa"/>');
    expect(xml).toContain('<w:left w:w="100" w:type="dxa"/>');
    expect(xml).toContain('<w:bottom w:w="80" w:type="dxa"/>');
    expect(xml).toContain('<w:right w:w="120" w:type="dxa"/>');
    expect(xml).toContain(
      '<w:top w:val="single" w:sz="8" w:space="0" w:color="111827"/>',
    );
    expect(xml).toContain(
      '<w:right w:val="dashed" w:sz="4" w:space="0" w:color="334155"/>',
    );
    expect(xml).toContain('<w:bottom w:val="nil"/>');
    expect(xml).toContain(
      '<w:left w:val="dotted" w:sz="6" w:space="0" w:color="64748B"/>',
    );
    expect(xml).toContain('<w:jc w:val="center"/>');
  });

  it("serializes paragraph borders and shading", async () => {
    const paragraph = createEditorParagraph("Boxed paragraph");
    paragraph.style = {
      shading: "#FEF3C7",
      borderTop: { width: 1, type: "solid", color: "#111827" },
      borderRight: { width: 0.5, type: "dashed", color: "#334155" },
      borderBottom: { width: 0.75, type: "dotted", color: "#64748B" },
      borderLeft: { width: 0, type: "none", color: "transparent" },
    };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    expect(xml).toContain("<w:pBdr>");
    expect(xml).toContain(
      '<w:top w:val="single" w:sz="8" w:space="0" w:color="111827"/>',
    );
    expect(xml).toContain(
      '<w:right w:val="dashed" w:sz="4" w:space="0" w:color="334155"/>',
    );
    expect(xml).toContain(
      '<w:bottom w:val="dotted" w:sz="6" w:space="0" w:color="64748B"/>',
    );
    expect(xml).toContain('<w:left w:val="nil"/>');
    expect(xml).toContain(
      '<w:shd w:val="clear" w:color="auto" w:fill="FEF3C7"/>',
    );
  });

  it("serializes special paragraph indentation as mutually exclusive w:ind attributes", async () => {
    const firstLine = createEditorParagraph("First line indent");
    firstLine.style = { indentFirstLine: 48, indentHanging: null };
    const hanging = createEditorParagraph("Hanging indent");
    hanging.style = { indentFirstLine: null, indentHanging: 48 };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(
        createEditorDocument([firstLine, hanging]),
      ),
    );

    expect(xml).toMatch(/<w:ind\b[^>]*w:firstLine="720"[^>]*\/>/);
    expect(xml).toMatch(/<w:ind\b[^>]*w:hanging="720"[^>]*\/>/);
    expect(xml).not.toContain('w:firstLine="720" w:hanging="720"');
  });

  it("serializes an atLeast line rule as absolute twips and round-trips it", async () => {
    const paragraph = createEditorParagraph("At least spacing");
    // 1.6px ≈ 24 twips, stored as an absolute height with the atLeast rule.
    paragraph.style = { lineHeight: 1.6, lineRule: "atLeast" };

    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([paragraph]),
    );
    const xml = await readDocumentXml(buffer);
    expect(xml).toContain('w:line="24"');
    expect(xml).toContain('w:lineRule="atLeast"');

    const reimported = getDocumentParagraphs(
      await importDocxToEditorDocument(buffer),
    )[0]!;
    expect(reimported.style?.lineRule).toBe("atLeast");
    expect(reimported.style?.lineHeight).toBeCloseTo(1.6, 3);
  });

  it("serializes an auto line height as a 240ths multiplier", async () => {
    const paragraph = createEditorParagraph("Auto spacing");
    paragraph.style = { lineHeight: 1.5 };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );
    expect(xml).toContain('w:line="360"');
    expect(xml).not.toContain("w:lineRule=");
  });

  it("serializes run shading", async () => {
    const paragraph = createEditorParagraph("Shaded run");
    paragraph.runs[0]!.styles = { shading: "#FEF3C7" };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    expect(xml).toContain("<w:rPr>");
    expect(xml).toContain(
      '<w:shd w:val="clear" w:color="auto" w:fill="FEF3C7"/>',
    );
  });

  it("serializes run language tags", async () => {
    const paragraph = createEditorParagraph("Idioma");
    paragraph.runs[0]!.styles = {
      language: { value: "pt-BR", eastAsia: "ja-JP", bidi: "ar-SA" },
    };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    expect(xml).toContain(
      '<w:lang w:val="pt-BR" w:eastAsia="ja-JP" w:bidi="ar-SA"/>',
    );
  });

  it("serializes noProof run metadata", async () => {
    const paragraph = createEditorParagraph("CodeIdentifier");
    paragraph.runs[0]!.styles = { noProof: true };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    expect(xml).toContain("<w:noProof/>");
  });

  it("serializes webHidden run metadata", async () => {
    const paragraph = createEditorParagraph("Hidden in web view");
    paragraph.runs[0]!.styles = { webHidden: true };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    expect(xml).toContain("<w:webHidden/>");
  });

  it("serializes specVanish run metadata", async () => {
    const paragraph = createEditorParagraph("Special placeholder");
    paragraph.runs[0]!.styles = { specVanish: true };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    expect(xml).toContain("<w:specVanish/>");
  });

  it("serializes legacy text effect metadata", async () => {
    const paragraph = createEditorParagraph("Legacy effect");
    paragraph.runs[0]!.styles = { textEffect: "blinkBackground" };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    expect(xml).toContain('<w:effect w:val="blinkBackground"/>');
  });

  it("serializes contextual paragraph spacing", async () => {
    const paragraph = createEditorParagraph("Contextual spacing");
    paragraph.style = { contextualSpacing: true };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    expect(xml).toContain("<w:contextualSpacing/>");
  });

  it("serializes paragraph tab stops", async () => {
    const paragraph = createEditorParagraph("One\ttwo");
    paragraph.style = {
      tabs: [
        { position: 36, type: "left" },
        { position: 72, type: "right", leader: "dot" },
        { position: 108, type: "decimal", leader: "hyphen" },
        { position: 144, type: "bar" },
        { position: 180, type: "clear" },
      ],
    };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    expect(xml).toContain("<w:tabs>");
    expect(xml).toContain('<w:tab w:val="left" w:pos="720"/>');
    expect(xml).toContain('<w:tab w:val="right" w:pos="1440" w:leader="dot"/>');
    expect(xml).toContain(
      '<w:tab w:val="decimal" w:pos="2160" w:leader="hyphen"/>',
    );
    expect(xml).toContain('<w:tab w:val="bar" w:pos="2880"/>');
    expect(xml).toContain('<w:tab w:val="clear" w:pos="3600"/>');
    expect(xml).toContain("<w:tab/>");
  });

  it("serializes the document default tab stop in settings", async () => {
    const document = createEditorDocument([createEditorParagraph("Tabs")]);
    document.settings = { defaultTabStop: 24 };

    const settingsXml = await readZipText(
      await exportEditorDocumentToDocx(document),
      "word/settings.xml",
    );

    expect(settingsXml).toContain('<w:defaultTabStop w:val="480"/>');
  });

  it("serializes hyphenation settings", async () => {
    const document = createEditorDocument([createEditorParagraph("Hyph")]);
    document.settings = {
      autoHyphenation: true,
      consecutiveHyphenLimit: 2,
      hyphenationZone: 18,
      doNotHyphenateCaps: true,
    };

    const settingsXml = await readZipText(
      await exportEditorDocumentToDocx(document),
      "word/settings.xml",
    );

    expect(settingsXml).toContain("<w:autoHyphenation/>");
    expect(settingsXml).toContain('<w:consecutiveHyphenLimit w:val="2"/>');
    expect(settingsXml).toContain('<w:hyphenationZone w:val="360"/>');
    expect(settingsXml).toContain("<w:doNotHyphenateCaps/>");
  });

  it("serializes no-break and soft hyphen run content", async () => {
    const paragraph = createEditorParagraph(
      "non\u2011breaking soft\u00ADhyphen",
    );

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    expect(xml).toContain("<w:noBreakHyphen/>");
    expect(xml).toContain("<w:softHyphen/>");
    expect(xml).toContain("<w:t>non</w:t>");
    expect(xml).toContain("<w:t>breaking soft</w:t>");
    expect(xml).toContain("<w:t>hyphen</w:t>");
  });

  it("serializes only the edges that have a border (bottom-only box)", async () => {
    const paragraph = createEditorParagraph("Bottom rule only");
    paragraph.style = {
      borderBottom: { width: 1, type: "solid", color: "#111827" },
    };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    expect(xml).toContain("<w:pBdr>");
    expect(xml).toContain(
      '<w:bottom w:val="single" w:sz="8" w:space="0" w:color="111827"/>',
    );
    expect(xml).not.toContain("<w:top w:val=");
    expect(xml).not.toContain("<w:left w:val=");
    expect(xml).not.toContain("<w:right w:val=");
  });

  it("serializes a manual page break before tables that request it", async () => {
    const table = createEditorTable([
      createEditorTableRow([
        createEditorTableCell([createEditorParagraph("After break")]),
      ]),
    ]);
    table.style = { pageBreakBefore: true };

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(
        createEditorDocument([createEditorParagraph("Before break"), table]),
      ),
    );

    const breakIndex = xml.indexOf(
      '<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
    );
    const tableIndex = xml.indexOf("<w:tbl>");

    expect(breakIndex).toBeGreaterThan(-1);
    expect(tableIndex).toBeGreaterThan(breakIndex);
  });

  it("serializes inline image crop (a:srcRect) and transform (a:xfrm)", async () => {
    const pngDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const paragraph = createEditorParagraphFromRuns([
      {
        text: "\uFFFC",
        image: {
          src: pngDataUrl,
          width: 100,
          height: 50,
          alt: "alt text",
          crop: { left: 0.1, top: 0.05, right: 0.2 },
          rotation: 90,
          flipH: true,
        },
      },
    ]);

    const xml = await readDocumentXml(
      await exportEditorDocumentToDocx(createEditorDocument([paragraph])),
    );

    expect(xml).toContain('<a:srcRect l="10000" t="5000" r="20000" b="0"/>');
    expect(xml).toContain('<a:xfrm rot="5400000" flipH="1">');
    expect(xml).toContain('descr="alt text"');
    // docPrId is deterministic (derived from rIdImg1), not random.
    expect(xml).toContain('<wp:docPr id="2"');
  });

  it("round-trips inline image crop and transform through DOCX", async () => {
    const pngDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const paragraph = createEditorParagraphFromRuns([
      {
        text: "\uFFFC",
        image: {
          src: pngDataUrl,
          width: 100,
          height: 50,
          crop: { left: 0.1, top: 0.05, right: 0.2 },
          rotation: 90,
          flipV: true,
        },
      },
    ]);

    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([paragraph]),
    );
    const document = await importDocxToEditorDocument(buffer);
    const reimported = getDocumentParagraphs(document)[0]!;
    const imageRun = reimported.runs.find((r) => getRunImage(r))!;

    expect(getRunImage(imageRun)?.crop).toEqual({
      left: 0.1,
      top: 0.05,
      right: 0.2,
      bottom: undefined,
    });
    expect(getRunImage(imageRun)?.rotation).toBe(90);
    expect(getRunImage(imageRun)?.flipV).toBe(true);
    expect(getRunImage(imageRun)?.flipH).toBeUndefined();
  });

  it("exports the wrap element for each Layout Options preset", async () => {
    const pngDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    const cases: Array<{ preset: WrapPreset; expect: string }> = [
      { preset: "square", expect: "<wp:wrapSquare" },
      { preset: "tight", expect: "<wp:wrapTight" },
      { preset: "through", expect: "<wp:wrapThrough" },
      { preset: "topAndBottom", expect: "<wp:wrapTopAndBottom" },
      { preset: "behind", expect: 'behindDoc="1"' },
      { preset: "front", expect: "<wp:wrapNone" },
    ];

    for (const testCase of cases) {
      const paragraph = createEditorParagraphFromRuns([
        { text: "￼", image: { src: pngDataUrl, width: 100, height: 50 } },
        { text: "around the image" },
      ]);
      let state = createEditorStateFromDocument(
        createEditorDocument([paragraph]),
      );
      state = {
        ...state,
        selection: {
          anchor: paragraphOffsetToPosition(paragraph, 0),
          focus: paragraphOffsetToPosition(paragraph, 1),
        },
      };
      const next = setSelectedImageWrapPreset(state, testCase.preset);
      const xml = await readDocumentXml(
        await exportEditorDocumentToDocx(next.document),
      );
      expect(xml, `preset ${testCase.preset}`).toContain("<wp:anchor");
      expect(xml, `preset ${testCase.preset}`).toContain(testCase.expect);
    }
  });

  it("round-trips a wrapped (square) image applied via the command", async () => {
    const pngDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const paragraph = createEditorParagraphFromRuns([
      { text: "￼", image: { src: pngDataUrl, width: 100, height: 50 } },
    ]);
    let state = createEditorStateFromDocument(
      createEditorDocument([paragraph]),
    );
    state = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 0),
        focus: paragraphOffsetToPosition(paragraph, 1),
      },
    };
    const next = setSelectedImageWrapPreset(state, "square");

    const buffer = await exportEditorDocumentToDocx(next.document);
    const document = await importDocxToEditorDocument(buffer);
    const imageRun = getDocumentParagraphs(document)[0]!.runs.find(
      (r) => getRunImage(r),
    )!;

    expect(getRunImage(imageRun)?.floating?.wrap).toBe("square");
    expect(getRunImage(imageRun)?.floating?.behindDoc).toBeFalsy();
  });

  it("serializes and round-trips a tight wrap polygon (wp:wrapPolygon)", async () => {
    const pngDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const paragraph = createEditorParagraphFromRuns([
      {
        text: "￼",
        image: {
          src: pngDataUrl,
          width: 100,
          height: 50,
          floating: {
            type: "floating",
            wrap: "tight",
            positionH: { relativeFrom: "column", offset: 0 },
            positionV: { relativeFrom: "paragraph", offset: 0 },
          },
          wrapPolygon: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0.5, y: 1 },
          ],
        },
      },
    ]);

    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([paragraph]),
    );
    const xml = await readDocumentXml(buffer);
    expect(xml).toContain("<wp:wrapTight");
    expect(xml).toContain("<wp:wrapPolygon");
    expect(xml).toContain('<wp:start x="0" y="0"/>');
    expect(xml).toContain('<wp:lineTo x="21600" y="0"/>');
    expect(xml).toContain('<wp:lineTo x="10800" y="21600"/>');

    const document = await importDocxToEditorDocument(buffer);
    const imageRun = getDocumentParagraphs(document)[0]!.runs.find(
      (r) => getRunImage(r),
    )!;
    expect(getRunImage(imageRun)?.floating?.wrap).toBe("tight");
    expect(getRunImage(imageRun)?.wrapPolygon).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 1 },
    ]);
  });

  it("serializes and round-trips tile fill mode (a:tile)", async () => {
    const pngDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const paragraph = createEditorParagraphFromRuns([
      {
        text: "\uFFFC",
        image: {
          src: pngDataUrl,
          width: 100,
          height: 50,
          fillMode: "tile",
        },
      },
    ]);

    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([paragraph]),
    );
    const xml = await readDocumentXml(buffer);
    expect(xml).toContain("<a:tile/>");
    expect(xml).not.toContain("<a:stretch>");

    const document = await importDocxToEditorDocument(buffer);
    const imageRun = getDocumentParagraphs(document)[0]!.runs.find(
      (r) => getRunImage(r),
    )!;
    expect(getRunImage(imageRun)?.fillMode).toBe("tile");
  });

  it("serializes and round-trips floating image anchors (wp:anchor)", async () => {
    const pngDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const paragraph = createEditorParagraphFromRuns([
      {
        text: "\uFFFC",
        image: {
          src: pngDataUrl,
          width: 100,
          height: 50,
          floating: {
            type: "floating",
            distT: 0,
            distB: 0,
            distL: 114300,
            distR: 114300,
            relativeHeight: 251659264,
            behindDoc: false,
            locked: false,
            layoutInCell: true,
            allowOverlap: true,
            positionH: { relativeFrom: "margin", align: "center" },
            positionV: { relativeFrom: "paragraph", offset: 190500 },
            wrap: "square",
          },
        },
      },
    ]);

    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([paragraph]),
    );
    const xml = await readDocumentXml(buffer);

    expect(xml).toContain("<wp:anchor ");
    expect(xml).not.toContain("<wp:inline ");
    expect(xml).toContain('distL="114300"');
    expect(xml).toContain('relativeHeight="251659264"');
    expect(xml).toContain(
      '<wp:positionH relativeFrom="margin"><wp:align>center</wp:align></wp:positionH>',
    );
    expect(xml).toContain(
      '<wp:positionV relativeFrom="paragraph"><wp:posOffset>190500</wp:posOffset></wp:positionV>',
    );
    expect(xml).toContain('<wp:wrapSquare wrapText="bothSides"/>');

    const document = await importDocxToEditorDocument(buffer);
    const imageRun = getDocumentParagraphs(document)[0]!.runs.find(
      (r) => getRunImage(r),
    )!;
    expect(getRunImage(imageRun)?.floating).toEqual({
      type: "floating",
      distT: 0,
      distB: 0,
      distL: 114300,
      distR: 114300,
      simplePos: false,
      relativeHeight: 251659264,
      behindDoc: false,
      locked: false,
      layoutInCell: true,
      allowOverlap: true,
      positionH: { relativeFrom: "margin", align: "center" },
      positionV: { relativeFrom: "paragraph", offset: 190500 },
      wrap: "square",
    });
  });

  it("exports gif images with correct content type and media extension", async () => {
    // 1x1 transparent GIF.
    const gifDataUrl =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const paragraph = createEditorParagraphFromRuns([
      {
        text: "\uFFFC",
        image: { src: gifDataUrl, width: 10, height: 10 },
      },
    ]);

    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([paragraph]),
    );
    const zip = await JSZip.loadAsync(buffer);
    const contentTypes = await zip.file("[Content_Types].xml")?.async("string");

    expect(contentTypes).toContain(
      '<Default Extension="gif" ContentType="image/gif"/>',
    );
    expect(contentTypes).not.toContain('Extension="png"');
    expect(zip.file("word/media/image1.gif")).not.toBeNull();
  });

  it("round-trips a gif image through DOCX", async () => {
    const gifDataUrl =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const paragraph = createEditorParagraphFromRuns([
      {
        text: "\uFFFC",
        image: { src: gifDataUrl, width: 10, height: 10 },
      },
    ]);

    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([paragraph]),
    );
    const document = await importDocxToEditorDocument(buffer);
    const imageRun = getDocumentParagraphs(document)[0]!.runs.find(
      (r) => getRunImage(r),
    )!;
    const assetId = getRunImage(imageRun)!.src.split(":")[1]!;
    expect(document.assets?.[assetId]?.url).toMatch(/^data:image\/gif;base64,/);
  });

  it("exports linked images as external relationships without embedded media", async () => {
    const paragraph = createEditorParagraphFromRuns([
      {
        text: "\uFFFC",
        image: {
          src: "",
          linkedSrc: "https://example.com/image.png",
          width: 100,
          height: 50,
          alt: "linked alt",
        },
      },
    ]);

    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([paragraph]),
    );
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await readZipText(buffer, "word/document.xml");
    const relsXml = await readZipText(buffer, "word/_rels/document.xml.rels");
    const contentTypes = await readZipText(buffer, "[Content_Types].xml");

    expect(documentXml).toContain('r:link="rIdImg1"');
    expect(documentXml).not.toContain('r:embed="rIdImg1"');
    expect(relsXml).toContain(
      '<Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="https://example.com/image.png" TargetMode="External"/>',
    );
    expect(contentTypes).not.toContain('ContentType="image/png"');
    expect(zip.file("word/media/image1.png")).toBeNull();
  });

  it("round-trips linked images through DOCX without embedding binaries", async () => {
    const paragraph = createEditorParagraphFromRuns([
      {
        text: "\uFFFC",
        image: {
          src: "",
          linkedSrc: "https://example.com/image.png",
          width: 100,
          height: 50,
        },
      },
    ]);

    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([paragraph]),
    );
    const document = await importDocxToEditorDocument(buffer);
    const imageRun = getDocumentParagraphs(document)[0]!.runs.find(
      (r) => getRunImage(r),
    )!;

    expect(getRunImage(imageRun)?.src).toBe("");
    expect(getRunImage(imageRun)?.linkedSrc).toBe("https://example.com/image.png");
    expect(getRunImage(imageRun)?.width).toBe(100);
    expect(getRunImage(imageRun)?.height).toBe(50);
    expect(document.assets).toBeUndefined();
  });

  it("serializes first, even, and default header/footer references", async () => {
    const document = createEditorDocument([]);
    const pageSettings = document.pageSettings!;
    const body = createEditorParagraph("Body");
    const doc: EditorDocument = {
      ...document,
      sections: [
        {
          id: "section:1",
          pageSettings,
          blocks: [body],
          firstPageHeader: [createEditorParagraph("First header")],
          evenPageHeader: [createEditorParagraph("Even header")],
          header: [createEditorParagraph("Default header")],
          firstPageFooter: [createEditorParagraph("First footer")],
          evenPageFooter: [createEditorParagraph("Even footer")],
          footer: [createEditorParagraph("Default footer")],
        },
      ],
    };

    const buffer = await exportEditorDocumentToDocx(doc);
    const documentXml = await readZipText(buffer, "word/document.xml");
    const relsXml = await readZipText(buffer, "word/_rels/document.xml.rels");
    const settingsXml = await readZipText(buffer, "word/settings.xml");

    expect(documentXml).toContain('<w:headerReference w:type="first"');
    expect(documentXml).toContain('<w:headerReference w:type="even"');
    expect(documentXml).toContain('<w:headerReference w:type="default"');
    expect(documentXml).toContain('<w:footerReference w:type="first"');
    expect(documentXml).toContain('<w:footerReference w:type="even"');
    expect(documentXml).toContain('<w:footerReference w:type="default"');
    expect(documentXml).toContain("<w:titlePg/>");
    expect(settingsXml).toContain("<w:evenAndOddHeaders/>");
    expect(relsXml.match(/relationships\/header/g)).toHaveLength(3);
    expect(relsXml.match(/relationships\/footer/g)).toHaveLength(3);
  });

  it("round-trips independent multilevel numbering instances", async () => {
    const parent = createEditorParagraph("Parent");
    parent.list = {
      kind: "ordered",
      level: 0,
      instanceId: "source-7",
      format: "upperRoman",
      levelFormats: ["upperRoman", "lowerLetter"],
      levelText: "%1.",
      alignment: "right",
    };
    const child = createEditorParagraph("Child");
    child.list = {
      kind: "ordered",
      level: 1,
      instanceId: "source-7",
      format: "lowerLetter",
      levelFormats: ["upperRoman", "lowerLetter"],
      levelText: "%1.%2)",
      alignment: "center",
      legal: true,
      suffix: "space",
    };
    const restarted = createEditorParagraph("Restarted");
    restarted.list = { ...parent.list, instanceId: "source-8", startAt: 4 };

    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([parent, child, restarted]),
    );
    const numberingXml = await readZipText(buffer, "word/numbering.xml");
    expect(numberingXml.match(/<w:num w:numId=/g)).toHaveLength(2);
    expect(numberingXml).toContain('<w:lvlText w:val="%1.%2)"/>');
    expect(numberingXml).toContain('<w:lvlJc w:val="center"/>');
    expect(numberingXml).toContain('<w:suff w:val="space"/>');
    expect(numberingXml).toContain("<w:isLgl/>");
    expect(numberingXml).toContain('<w:start w:val="4"/>');

    const reimported = await importDocxToEditorDocument(buffer);
    const [roundParent, roundChild, roundRestarted] =
      getDocumentParagraphs(reimported);
    expect(roundParent!.list?.instanceId).toBe(roundChild!.list?.instanceId);
    expect(roundRestarted!.list?.instanceId).not.toBe(
      roundParent!.list?.instanceId,
    );
    expect(roundChild!.list).toMatchObject({
      levelText: "%1.%2)",
      alignment: "center",
      legal: true,
      suffix: "space",
    });
    expect(roundRestarted!.list?.startAt).toBe(4);
  });
});
