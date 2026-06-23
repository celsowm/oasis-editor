import { getRunImage, getRunTextBox, getRunField, getRunFieldChar, getRunFieldInstruction, getRunFootnoteReference, getRunEndnoteReference, getRunSym } from "@/core/model.js";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { resolveEffectiveTextStyleForParagraph } from "@/core/model.js";
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

  it("imports literal run shading and round-trips it as w:shd", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr>
          <w:shd w:val="clear" w:color="auto" w:fill="FEF3C7"/>
        </w:rPr>
        <w:t>Shaded run</w:t>
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

    expect(run.styles?.shading).toBe("#FEF3C7");

    const reexportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const reexported = await reexportedZip
      .file("word/document.xml")
      ?.async("string");
    expect(reexported).toContain(
      '<w:shd w:val="clear" w:color="auto" w:fill="FEF3C7"/>',
    );
  });

  it("imports run language tags and round-trips w:lang", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr>
          <w:lang w:val="pt-BR" w:eastAsia="ja-JP" w:bidi="ar-SA"/>
        </w:rPr>
        <w:t>Texto</w:t>
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

    expect(run.styles?.language).toEqual({
      value: "pt-BR",
      eastAsia: "ja-JP",
      bidi: "ar-SA",
    });

    const reexportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const reexported = await reexportedZip
      .file("word/document.xml")
      ?.async("string");
    expect(reexported).toContain(
      '<w:lang w:val="pt-BR" w:eastAsia="ja-JP" w:bidi="ar-SA"/>',
    );
  });

  it("imports noProof and round-trips it as w:noProof", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:noProof/></w:rPr>
        <w:t>CodeIdentifier</w:t>
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

    expect(run.styles?.noProof).toBe(true);

    const reexportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const reexported = await reexportedZip
      .file("word/document.xml")
      ?.async("string");
    expect(reexported).toContain("<w:noProof/>");
  });

  it("imports webHidden and round-trips it as w:webHidden", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:webHidden/></w:rPr>
        <w:t>Hidden in web view</w:t>
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

    expect(run.styles?.webHidden).toBe(true);

    const reexportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const reexported = await reexportedZip
      .file("word/document.xml")
      ?.async("string");
    expect(reexported).toContain("<w:webHidden/>");
  });

  it("imports specVanish and round-trips it as w:specVanish", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:specVanish/></w:rPr>
        <w:t>Special placeholder</w:t>
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

    expect(run.styles?.specVanish).toBe(true);

    const reexportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const reexported = await reexportedZip
      .file("word/document.xml")
      ?.async("string");
    expect(reexported).toContain("<w:specVanish/>");
  });

  it("imports legacy text effect and round-trips it as w:effect", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:effect w:val="blinkBackground"/></w:rPr>
        <w:t>Legacy effect</w:t>
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

    expect(run.styles?.textEffect).toBe("blinkBackground");

    const reexportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const reexported = await reexportedZip
      .file("word/document.xml")
      ?.async("string");
    expect(reexported).toContain('<w:effect w:val="blinkBackground"/>');
  });

  it("imports and round-trips the run decorations bdr/em/outline/shadow/emboss/imprint/rtl/cs/fitText/snapToGrid", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr>
          <w:outline/>
          <w:shadow/>
          <w:emboss/>
          <w:imprint/>
          <w:snapToGrid w:val="0"/>
          <w:bdr w:val="single" w:sz="8" w:space="0" w:color="FF0000"/>
          <w:fitText w:val="1440"/>
          <w:rtl/>
          <w:cs/>
          <w:em w:val="dot"/>
        </w:rPr>
        <w:t>Decorated</w:t>
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

    expect(run.styles?.outline).toBe(true);
    expect(run.styles?.shadow).toBe(true);
    expect(run.styles?.emboss).toBe(true);
    expect(run.styles?.imprint).toBe(true);
    expect(run.styles?.snapToGrid).toBe(false);
    expect(run.styles?.rtl).toBe(true);
    expect(run.styles?.complexScript).toBe(true);
    expect(run.styles?.emphasisMark).toBe("dot");
    expect(run.styles?.fitText).toBeCloseTo(72, 3); // 1440 twips = 72 pt
    expect(run.styles?.textBorder).toEqual({
      width: 1,
      type: "solid",
      color: "#FF0000",
    });

    const reexportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const reexported = await reexportedZip
      .file("word/document.xml")
      ?.async("string");
    expect(reexported).toContain("<w:outline/>");
    expect(reexported).toContain("<w:shadow/>");
    expect(reexported).toContain("<w:emboss/>");
    expect(reexported).toContain("<w:imprint/>");
    expect(reexported).toContain('<w:snapToGrid w:val="0"/>');
    expect(reexported).toContain(
      '<w:bdr w:val="single" w:sz="8" w:space="0" w:color="FF0000"/>',
    );
    expect(reexported).toContain('<w:fitText w:val="1440"/>');
    expect(reexported).toContain("<w:rtl/>");
    expect(reexported).toContain("<w:cs/>");
    expect(reexported).toContain('<w:em w:val="dot"/>');
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

  it("imports and round-trips all five w14 OpenType font features", async () => {
    const zip = new JSZip();
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr>
          <w14:ligatures w14:val="standard"/>
          <w14:numForm w14:val="lining"/>
          <w14:numSpacing w14:val="proportional"/>
          <w14:stylisticSets w14:val="1"/>
          <w14:cntxtAlts w14:val="1"/>
        </w:rPr>
        <w:t>OpenType features</w:t>
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

    expect(run.styles?.ligatures).toBe("standard");
    expect(run.styles?.numberForm).toBe("lining");
    expect(run.styles?.numberSpacing).toBe("proportional");
    expect(run.styles?.stylisticSet).toBe(1);
    expect(run.styles?.contextualAlternates).toBe(true);

    const reexportedZip = await JSZip.loadAsync(
      await exportEditorDocumentToDocx(document),
    );
    const reexported = await reexportedZip
      .file("word/document.xml")
      ?.async("string");
    expect(reexported).toContain('<w14:ligatures w14:val="standard"/>');
    expect(reexported).toContain('<w14:numForm w14:val="lining"/>');
    expect(reexported).toContain('<w14:numSpacing w14:val="proportional"/>');
    // stylisticSet 1 is serialised as a bitmask: bit 0 set = 0x00000001
    expect(reexported).toContain('<w14:stylisticSets w14:val="00000001"/>');
    expect(reexported).toContain('<w14:cntxtAlts w14:val="1"/>');
  });

  it("imports all ligature enum values for w14:ligatures", async () => {
    async function importLigatures(val: string) {
      const zip = new JSZip();
      zip.file(
        "word/document.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
  <w:body>
    <w:p><w:r><w:rPr><w14:ligatures w14:val="${val}"/></w:rPr><w:t>x</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`,
      );
      const doc = await importDocxToEditorDocument(
        await zip.generateAsync({ type: "arraybuffer" }),
      );
      return getDocumentParagraphs(doc)[0]!.runs[0]!.styles?.ligatures;
    }

    expect(await importLigatures("none")).toBe("none");
    expect(await importLigatures("contextual")).toBe("contextual");
    expect(await importLigatures("historical")).toBe("historical");
    expect(await importLigatures("standardContextual")).toBe(
      "standardContextual",
    );
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

describe("w14:textFill and w14:textOutline", () => {
  const W14_NS = "http://schemas.microsoft.com/office/word/2010/wordml";
  const MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006";

  function buildW14Docx(rPrXml: string): Promise<ArrayBuffer> {
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:w14="${W14_NS}"
            xmlns:mc="${MC_NS}">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr>${rPrXml}</w:rPr>
        <w:t>Styled text</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
    );
    return zip.generateAsync({ type: "arraybuffer" });
  }

  it("imports w14:textFill solid and round-trips via mc:AlternateContent", async () => {
    const docx = await buildW14Docx(
      `<w14:textFill><w14:solidFill><w14:srgbClr w14:val="FF0000"/></w14:solidFill></w14:textFill>`,
    );
    const doc = await importDocxToEditorDocument(docx);
    const run = getDocumentParagraphs(doc)[0]!.runs[0]!;
    expect(run.styles?.textFill).toEqual({ type: "solid", color: "#FF0000" });

    const rezip = await JSZip.loadAsync(await exportEditorDocumentToDocx(doc));
    const xml = await rezip.file("word/document.xml")!.async("string");
    expect(xml).toContain("<w14:textFill>");
    expect(xml).toContain('<w14:solidFill><w14:srgbClr w14:val="FF0000"/></w14:solidFill>');
    expect(xml).toContain('<mc:Fallback><w:color w:val="FF0000"/></mc:Fallback>');
  });

  it("imports w14:textFill gradient with stops and angle", async () => {
    const docx = await buildW14Docx(`
      <w14:textFill>
        <w14:gradFill>
          <w14:gsLst>
            <w14:gs w14:pos="0"><w14:srgbClr w14:val="FF0000"/></w14:gs>
            <w14:gs w14:pos="100000"><w14:srgbClr w14:val="0000FF"/></w14:gs>
          </w14:gsLst>
          <w14:lin w14:ang="0" w14:scaled="0"/>
        </w14:gradFill>
      </w14:textFill>`);
    const doc = await importDocxToEditorDocument(docx);
    const run = getDocumentParagraphs(doc)[0]!.runs[0]!;
    const fill = run.styles?.textFill;
    expect(fill?.type).toBe("gradient");
    if (fill?.type === "gradient") {
      expect(fill.stops).toHaveLength(2);
      expect(fill.stops[0]).toEqual({ position: 0, color: "#FF0000" });
      expect(fill.stops[1]).toEqual({ position: 1, color: "#0000FF" });
      expect(fill.angle).toBe(0);
    }
  });

  it("imports w14:textFill wrapped in mc:AlternateContent/mc:Choice", async () => {
    const docx = await buildW14Docx(`
      <mc:AlternateContent>
        <mc:Choice Requires="w14">
          <w14:textFill><w14:solidFill><w14:srgbClr w14:val="00FF00"/></w14:solidFill></w14:textFill>
        </mc:Choice>
        <mc:Fallback><w:color w:val="00FF00"/></mc:Fallback>
      </mc:AlternateContent>`);
    const doc = await importDocxToEditorDocument(docx);
    const run = getDocumentParagraphs(doc)[0]!.runs[0]!;
    expect(run.styles?.textFill).toEqual({ type: "solid", color: "#00FF00" });
  });

  it("imports w14:textOutline with width and color", async () => {
    // 19050 EMU = 1.5 pt
    const docx = await buildW14Docx(`
      <w14:textOutline w14:w="19050" w14:cap="flat" w14:cmpd="sng" w14:algn="ctr">
        <w14:solidFill><w14:srgbClr w14:val="000000"/></w14:solidFill>
      </w14:textOutline>`);
    const doc = await importDocxToEditorDocument(docx);
    const run = getDocumentParagraphs(doc)[0]!.runs[0]!;
    const outline = run.styles?.textOutline;
    expect(outline).toBeDefined();
    expect(outline?.widthPt).toBeCloseTo(1.5, 2);
    expect(outline?.color).toBe("#000000");
  });

  it("round-trips w14:textOutline via mc:AlternateContent with w:outline fallback", async () => {
    const docx = await buildW14Docx(`
      <w14:textOutline w14:w="19050" w14:cap="flat" w14:cmpd="sng" w14:algn="ctr">
        <w14:solidFill><w14:srgbClr w14:val="0000FF"/></w14:solidFill>
      </w14:textOutline>`);
    const doc = await importDocxToEditorDocument(docx);
    const rezip = await JSZip.loadAsync(await exportEditorDocumentToDocx(doc));
    const xml = await rezip.file("word/document.xml")!.async("string");
    expect(xml).toContain("<w14:textOutline");
    expect(xml).toContain('<w14:solidFill><w14:srgbClr w14:val="0000FF"/></w14:solidFill>');
    expect(xml).toContain("<mc:Fallback><w:outline/></mc:Fallback>");
  });
});

describe("w:sym symbol characters", () => {
  function buildSymDocx(runXml: string): Promise<ArrayBuffer> {
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>${runXml}</w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
    );
    return zip.generateAsync({ type: "arraybuffer" });
  }

  it("imports w:sym with rPr font into sym metadata and text", async () => {
    const docx = await buildSymDocx(`
      <w:r>
        <w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/></w:rPr>
        <w:sym w:font="Symbol" w:char="F0B7"/>
      </w:r>`);
    const doc = await importDocxToEditorDocument(docx);
    const run = getDocumentParagraphs(doc)[0]!.runs[0]!;
    expect(getRunSym(run)).toEqual({ font: "Symbol", char: "F0B7" });
    expect(run.text).toBe(String.fromCodePoint(0xf0b7));
  });

  it("applies sym font to styles.fontFamily when w:rPr has no rFonts", async () => {
    const docx = await buildSymDocx(`
      <w:r>
        <w:sym w:font="Wingdings" w:char="F077"/>
      </w:r>`);
    const doc = await importDocxToEditorDocument(docx);
    const run = getDocumentParagraphs(doc)[0]!.runs[0]!;
    expect(getRunSym(run)).toEqual({ font: "Wingdings", char: "F077" });
    expect(run.styles?.fontFamily).toBe("Wingdings");
  });

  it("exports sym run as w:sym element (not w:t)", async () => {
    const docx = await buildSymDocx(`
      <w:r>
        <w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/></w:rPr>
        <w:sym w:font="Symbol" w:char="F0B7"/>
      </w:r>`);
    const doc = await importDocxToEditorDocument(docx);
    const exported = await exportEditorDocumentToDocx(doc);
    const outZip = await JSZip.loadAsync(exported);
    const xml = await outZip.file("word/document.xml")!.async("string");
    expect(xml).toContain('w:sym w:font="Symbol" w:char="F0B7"');
    // The sym character must not be emitted as plain w:t content
    expect(xml).not.toContain(`<w:t>${String.fromCodePoint(0xf0b7)}</w:t>`);
  });
});
