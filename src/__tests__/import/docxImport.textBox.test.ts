import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import type { EditorParagraphNode, EditorTextRun } from "../../core/model.js";
import { getDocumentParagraphs } from "./docxTestHelpers.js";

/**
 * Builds a DOCX whose body paragraph contains an anchored WordprocessingShape
 * text box (`mc:AlternateContent` > `mc:Choice Requires="wps"` > `w:drawing` >
 * `wps:wsp` > `wps:txbx` > `w:txbxContent`) followed by normal text, mirroring
 * the structure of the real `caixa_texto.docx`.
 */
async function buildDocxWithTextBox(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="wp14">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:noProof/></w:rPr>
        <mc:AlternateContent>
          <mc:Choice Requires="wps">
            <w:drawing>
              <wp:anchor distT="45720" distB="45720" distL="114300" distR="114300" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">
                <wp:simplePos x="0" y="0"/>
                <wp:positionH relativeFrom="column"><wp:posOffset>-275590</wp:posOffset></wp:positionH>
                <wp:positionV relativeFrom="paragraph"><wp:posOffset>87630</wp:posOffset></wp:positionV>
                <wp:extent cx="2360930" cy="1404620"/>
                <wp:effectExtent l="0" t="0" r="22860" b="11430"/>
                <wp:wrapSquare wrapText="bothSides"/>
                <wp:docPr id="217" name="Caixa de Texto 2"/>
                <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                  <a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                    <wps:wsp>
                      <wps:cNvSpPr txBox="1"><a:spLocks noChangeArrowheads="1"/></wps:cNvSpPr>
                      <wps:spPr bwMode="auto">
                        <a:xfrm><a:off x="0" y="0"/><a:ext cx="2360930" cy="1404620"/></a:xfrm>
                        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                        <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
                        <a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:miter lim="800000"/></a:ln>
                      </wps:spPr>
                      <wps:txbx>
                        <w:txbxContent>
                          <w:p><w:r><w:t>insidebox</w:t></w:r></w:p>
                        </w:txbxContent>
                      </wps:txbx>
                      <wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t" anchorCtr="0"><a:spAutoFit/></wps:bodyPr>
                    </wps:wsp>
                  </a:graphicData>
                </a:graphic>
                <wp14:sizeRelH relativeFrom="margin"><wp14:pctWidth>40000</wp14:pctWidth></wp14:sizeRelH>
                <wp14:sizeRelV relativeFrom="margin"><wp14:pctHeight>20000</wp14:pctHeight></wp14:sizeRelV>
              </wp:anchor>
            </w:drawing>
          </mc:Choice>
          <mc:Fallback>
            <w:pict>
              <v:shape xmlns:v="urn:schemas-microsoft-com:vml" type="#_x0000_t202">
                <v:textbox><w:txbxContent><w:p><w:r><w:t>insidebox</w:t></w:r></w:p></w:txbxContent></v:textbox>
              </v:shape>
            </w:pict>
          </mc:Fallback>
        </mc:AlternateContent>
      </w:r>
      <w:r><w:t>normaltext</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

function findTextBoxRun(
  paragraphs: EditorParagraphNode[],
): EditorTextRun | undefined {
  for (const paragraph of paragraphs) {
    for (const run of paragraph.runs) {
      if (run.textBox) return run;
    }
  }
  return undefined;
}

describe("DOCX import: text boxes (wps:wsp)", () => {
  it("imports an anchored text box without dropping the box or sibling text", async () => {
    const docx = await buildDocxWithTextBox();
    const document = await importDocxToEditorDocument(docx);
    const paragraphs = getDocumentParagraphs(document);

    // The sibling body text must survive alongside the text box.
    const allText = paragraphs
      .flatMap((p) => p.runs.map((r) => r.text))
      .join("");
    expect(allText).toContain("normaltext");

    const run = findTextBoxRun(paragraphs);
    expect(run).toBeDefined();
    // The text-box run carries the object replacement character as its text.
    expect(run!.text).toBe("\uFFFC");
  });

  it("parses the inner text box content as block nodes", async () => {
    const docx = await buildDocxWithTextBox();
    const document = await importDocxToEditorDocument(docx);
    const run = findTextBoxRun(getDocumentParagraphs(document))!;
    const textBox = run.textBox!;

    expect(textBox.blocks).toHaveLength(1);
    const inner = textBox.blocks[0];
    expect(inner!.type).toBe("paragraph");
    const innerParagraph = inner as EditorParagraphNode;
    const innerText = innerParagraph.runs.map((r) => r.text).join("");
    expect(innerText).toBe("insidebox");
  });

  it("parses geometry, floating layout, shape and body properties", async () => {
    const docx = await buildDocxWithTextBox();
    const document = await importDocxToEditorDocument(docx);
    const textBox = findTextBoxRun(getDocumentParagraphs(document))!.textBox!;

    // wp:extent 2360930x1404620 EMU -> px (/9525).
    expect(textBox.width).toBe(Math.round(2360930 / 9525));
    expect(textBox.height).toBe(Math.round(1404620 / 9525));

    expect(textBox.name).toBe("Caixa de Texto 2");

    expect(textBox.floating).toBeDefined();
    expect(textBox.floating!.type).toBe("floating");
    expect(textBox.floating!.wrap).toBe("square");
    expect(textBox.floating!.positionH?.offset).toBe(-275590);
    expect(textBox.floating!.positionV?.offset).toBe(87630);

    expect(textBox.shape).toMatchObject({
      preset: "rect",
      fill: "#FFFFFF",
      borderColor: "#000000",
    });

    expect(textBox.body).toMatchObject({
      anchor: "t",
      wrap: "square",
      autoFit: true,
      // 91440 EMU / 9525 = 9.6 -> 10 px; 45720 / 9525 = 4.8 -> 5 px.
      paddingLeft: Math.round(91440 / 9525),
      paddingTop: Math.round(45720 / 9525),
    });
  });
});
