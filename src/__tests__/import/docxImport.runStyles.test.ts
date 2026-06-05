import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "../../export/docx/exportEditorDocumentToDocx.js";
import { resolveEffectiveTextStyleForParagraph } from "../../core/model.js";
import {
  getDocumentParagraphs,
  importComplexDocument,
} from "./docxTestHelpers.js";

const THEME1_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="1A1A1A"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="44546A"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="4472C4"/></a:accent1>
      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>
      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
  </a:themeElements>
</a:theme>`;

function buildThemeColorDocx(colorXml: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr>${colorXml}</w:rPr>
        <w:t>Themed</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  zip.file("word/document.xml", documentXml);
  zip.file("word/theme/theme1.xml", THEME1_XML);
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("DOCX run style import", () => {
  it("imports bold/italic/size declared only on complex-script run properties", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr>
          <w:bCs/>
          <w:iCs/>
          <w:szCs w:val="28"/>
        </w:rPr>
        <w:t>Complex script</w:t>
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
    const run = getDocumentParagraphs(document)[0]!.runs[0]!;

    expect(run.styles?.bold).toBe(true);
    expect(run.styles?.italic).toBe(true);
    expect(run.styles?.fontSize).toBeCloseTo(18.6667, 3);
  });

  it("exports bold/italic/size with their complex-script twins", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:i/>
          <w:sz w:val="28"/>
        </w:rPr>
        <w:t>Bold italic</w:t>
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

    const reexportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const reexported = await reexportedZip
      .file("word/document.xml")
      ?.async("string");

    expect(reexported).toContain("<w:b/><w:bCs/>");
    expect(reexported).toContain("<w:i/><w:iCs/>");
    expect(reexported).toContain('<w:sz w:val="28"/><w:szCs w:val="28"/>');
  });

  it("resolves w:themeColor against the document color scheme", async () => {
    const document = await importDocxToEditorDocument(
      await buildThemeColorDocx('<w:color w:themeColor="accent1"/>'),
    );
    const run = getDocumentParagraphs(document)[0]!.runs[0]!;
    expect(run.styles?.color).toBe("#4472C4");
  });

  it("applies w:themeShade to a resolved theme color", async () => {
    const document = await importDocxToEditorDocument(
      await buildThemeColorDocx(
        '<w:color w:themeColor="accent1" w:themeShade="BF"/>',
      ),
    );
    const run = getDocumentParagraphs(document)[0]!.runs[0]!;
    // 0xBF/0xFF ≈ 0.749 darkening applied per channel to #4472C4.
    expect(run.styles?.color).toBe("#335593");
  });

  it("maps the text1 theme token to dk1 (reading sysClr lastClr)", async () => {
    const document = await importDocxToEditorDocument(
      await buildThemeColorDocx('<w:color w:themeColor="text1"/>'),
    );
    const run = getDocumentParagraphs(document)[0]!.runs[0]!;
    expect(run.styles?.color).toBe("#1A1A1A");
  });

  it("prefers a literal w:val over w:themeColor and drops auto", async () => {
    const explicit = await importDocxToEditorDocument(
      await buildThemeColorDocx(
        '<w:color w:val="FF0000" w:themeColor="accent1"/>',
      ),
    );
    expect(getDocumentParagraphs(explicit)[0]!.runs[0]!.styles?.color).toBe(
      "#FF0000",
    );

    const auto = await importDocxToEditorDocument(
      await buildThemeColorDocx(
        '<w:color w:val="auto" w:themeColor="accent1"/>',
      ),
    );
    expect(
      getDocumentParagraphs(auto)[0]!.runs[0]!.styles?.color,
    ).toBeUndefined();
  });

  it("re-exports a resolved theme color as a concrete hex value", async () => {
    const document = await importDocxToEditorDocument(
      await buildThemeColorDocx('<w:color w:themeColor="accent1"/>'),
    );
    const reexportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const reexported = await reexportedZip
      .file("word/document.xml")
      ?.async("string");
    expect(reexported).toContain('<w:color w:val="4472C4"/>');
  });

  it("honors explicit w:b w:val='0' overriding a bold character style", async () => {
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="character" w:styleId="StrongRef">
    <w:name w:val="Strong Ref"/>
    <w:rPr><w:b/></w:rPr>
  </w:style>
</w:styles>`;
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rStyle w:val="StrongRef"/>
          <w:b w:val="0"/>
        </w:rPr>
        <w:t>Not bold</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", documentXml);
    zip.file("word/styles.xml", stylesXml);
    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const paragraph = getDocumentParagraphs(document)[0]!;
    const run = paragraph.runs[0]!;

    // The explicit-off must survive import and override the bold style.
    expect(run.styles?.bold).toBe(false);
    const effective = resolveEffectiveTextStyleForParagraph(
      run.styles,
      paragraph.style?.styleId,
      document.styles,
    );
    expect(effective.bold).toBe(false);

    const reexportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const reexported = await reexportedZip
      .file("word/document.xml")
      ?.async("string");
    expect(reexported).not.toContain("<w:b/>");
  });

  it("does not treat a bare w:b w:val='0' run as bold", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:rPr><w:b w:val="0"/></w:rPr><w:t>Plain</w:t></w:r>
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
    const run = getDocumentParagraphs(document)[0]!.runs[0]!;

    expect(run.styles?.bold).not.toBe(true);
  });

  it("preserves mixed Times New Roman and Calibri theme fonts in the complex document", async () => {
    const document = await importComplexDocument();
    const paragraphs = getDocumentParagraphs(document);

    const effectiveFamilies = paragraphs
      .flatMap((paragraph) =>
        paragraph.runs.map(
          (run) =>
            resolveEffectiveTextStyleForParagraph(
              run.styles,
              paragraph.style?.styleId,
              document.styles,
            ).fontFamily,
        ),
      )
      .filter((family): family is string => typeof family === "string");

    expect(
      effectiveFamilies.some((family) => family.includes("Times New Roman")),
    ).toBe(true);
    expect(effectiveFamilies.some((family) => family.includes("Calibri"))).toBe(
      true,
    );
  });
});
