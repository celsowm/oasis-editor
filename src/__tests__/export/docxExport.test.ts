import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorParagraphFromRuns,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "../../core/editorState.js";
import { exportEditorDocumentToDocx } from "../../export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import { getDocumentParagraphs } from "../../core/model.js";
import type { EditorDocument } from "../../core/model.js";

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
    expect(xml).toContain(
      '<w:tab w:val="right" w:pos="1440" w:leader="dot"/>',
    );
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

  it("serializes no-break and soft hyphen run content", async () => {
    const paragraph = createEditorParagraph("non\u2011breaking soft\u00ADhyphen");

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
    const imageRun = reimported.runs.find((r) => r.image)!;

    expect(imageRun.image?.crop).toEqual({
      left: 0.1,
      top: 0.05,
      right: 0.2,
      bottom: undefined,
    });
    expect(imageRun.image?.rotation).toBe(90);
    expect(imageRun.image?.flipV).toBe(true);
    expect(imageRun.image?.flipH).toBeUndefined();
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
      (r) => r.image,
    )!;
    expect(imageRun.image?.fillMode).toBe("tile");
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
    const contentTypes = await zip
      .file("[Content_Types].xml")
      ?.async("string");

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
      (r) => r.image,
    )!;
    const assetId = imageRun.image!.src.split(":")[1]!;
    expect(document.assets?.[assetId]?.url).toMatch(/^data:image\/gif;base64,/);
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
});
