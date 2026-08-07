import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { createEditorParagraphFromRuns } from "@/core/editorState.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";
import { setEditorListOoxmlNumberingMetadata } from "@/ooxml/word/numberingMetadata.js";

const WORD_NS =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WORD15_NS = "http://schemas.microsoft.com/office/word/2012/wordml";
const OFFICE_REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";

async function buildSourcePackage(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rIdNumberingSource" Type="${OFFICE_REL_NS}/numbering" Target="numbering.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${WORD_NS}">
  <w:body>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="42"/></w:numPr></w:pPr>
      <w:r><w:t>Imported list</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
  );
  zip.file(
    "word/numbering.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="${WORD_NS}" xmlns:w15="${WORD15_NS}" w15:rootAttr="keep-root-attr">
  <w:abstractNum w:abstractNumId="7" w15:abstractAttr="keep-abstract-attr">
    <w:nsid w:val="A1B2C3D4"/>
    <w:multiLevelType w:val="multilevel"/>
    <w:tmpl w:val="DEADBEEF"/>
    <w:lvl w:ilvl="0" w15:levelAttr="keep-level-attr">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal" w15:formatAttr="keep-format-attr"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w15:lvlExtension w15:val="keep-level-extension"/>
    </w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="99">
    <w:nsid w:val="99999999"/>
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="upperRoman"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="42">
    <w:abstractNumId w:val="7"/>
    <w:lvlOverride w:ilvl="0" w15:overrideAttr="keep-override-root">
      <w:startOverride w:val="3" w15:startOverrideAttr="keep-start-override"/>
      <w:lvl w:ilvl="0" w15:overrideLevelAttr="keep-override-level">
        <w:start w:val="3"/>
        <w:numFmt w:val="lowerRoman" w15:overrideFormatAttr="keep-override-format"/>
        <w:lvlText w:val="(%1)"/>
        <w:lvlJc w:val="right"/>
        <w:pPr><w:ind w:left="1440" w:hanging="720"/></w:pPr>
        <w15:overrideLevelExtension w15:val="keep-override-level-extension"/>
      </w:lvl>
      <w15:overrideExtension w15:val="keep-override-extension"/>
    </w:lvlOverride>
    <w15:numExtension w15:val="keep-num-extension"/>
  </w:num>
  <w:num w:numId="99"><w:abstractNumId w:val="99"/></w:num>
  <w15:rootExtension w15:val="keep-root-extension"/>
</w:numbering>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("source-backed numbering preservation", () => {
  it("keeps imported ids and source-only numbering markup while active semantics change", async () => {
    const buffer = await buildSourcePackage();
    const document = await importDocxToEditorDocument(buffer);
    await attachDocxSourcePackage(document, buffer);

    const imported = document.sections?.[0]?.blocks[0];
    if (!imported || imported.type !== "paragraph" || !imported.list) {
      throw new Error("Expected imported list paragraph.");
    }
    // The source instance is a lower-Roman override starting at 3. Both edits
    // must win over the source override while its wrapper/opaque metadata stays.
    imported.list.startAt = 5;
    imported.list.format = "upperLetter";

    const created = createEditorParagraphFromRuns([{ text: "New Oasis list" }]);
    created.list = {
      kind: "ordered",
      level: 0,
      format: "decimal",
      suffix: "tab",
      instanceId: "copied-list-instance",
    };
    // Simulate stale metadata surviving a duplicated/re-instantiated list. The
    // changed instance identity must prevent it from stealing 42/7.
    setEditorListOoxmlNumberingMetadata(created.list, {
      sourceNumId: 42,
      sourceAbstractNumId: 7,
      format: "decimal",
    });
    document.sections![0]!.blocks.push(created);

    const output = await JSZip.loadAsync(
      await exportEditorDocumentToDocxPreservingSource(document),
    );
    const numberingXml = await output
      .file("word/numbering.xml")
      ?.async("string");
    expect(numberingXml).toBeDefined();

    // Imported identities are stable, while the new list is allocated above
    // every id in the source numbering graph (source max = 99), even though it
    // intentionally carries stale source identity metadata.
    expect(numberingXml).toContain('w:abstractNumId="7"');
    expect(numberingXml).toContain('w:numId="42"');
    expect(numberingXml).toContain('w:abstractNumId="100"');
    expect(numberingXml).toContain('w:numId="100"');

    // Canonical editor semantics win in both the generated abstract level and
    // the preserved instance override. Old lowerRoman/start=3 semantics never
    // get reapplied by the preservation layer.
    expect(numberingXml).toContain('<w:start w:val="5"/>');
    expect(numberingXml).toContain('w:numFmt w:val="upperLetter"');
    expect(numberingXml).toMatch(/w:startOverride[^>]*w:val="5"/);
    expect(numberingXml).not.toMatch(/w:startOverride[^>]*w:val="3"/);
    expect(numberingXml).not.toContain('w:val="lowerRoman"');

    // The override itself remains first-class OOXML preservation data.
    expect(numberingXml).toContain('<w:lvlOverride');
    expect(numberingXml).toContain('w15:overrideAttr="keep-override-root"');
    expect(numberingXml).toContain('w15:startOverrideAttr="keep-start-override"');
    expect(numberingXml).toContain('w15:overrideLevelAttr="keep-override-level"');
    expect(numberingXml).toContain('w15:overrideFormatAttr="keep-override-format"');
    expect(numberingXml).toContain('w15:val="keep-override-level-extension"');
    expect(numberingXml).toContain('w15:val="keep-override-extension"');
    // Override-specific paragraph properties deliberately remain distinct from
    // the abstract level's source pPr.
    expect(numberingXml).toContain('w:left="1440"');
    expect(numberingXml).toContain('w:hanging="720"');

    // Source-only metadata and extension markup survive inside the active
    // abstract definition and at the numbering root.
    expect(numberingXml).toContain('w15:rootAttr="keep-root-attr"');
    expect(numberingXml).toContain('w15:abstractAttr="keep-abstract-attr"');
    expect(numberingXml).toContain('w15:levelAttr="keep-level-attr"');
    expect(numberingXml).toContain('w15:formatAttr="keep-format-attr"');
    expect(numberingXml).toContain('w15:val="keep-level-extension"');
    expect(numberingXml).toContain('w15:val="keep-num-extension"');
    expect(numberingXml).toContain('w15:val="keep-root-extension"');
    expect(numberingXml).toContain('<w:nsid w:val="A1B2C3D4"/>');
    expect(numberingXml).toContain('<w:tmpl w:val="DEADBEEF"/>');
    expect(numberingXml).toContain('<w:tabs>');
    expect(numberingXml).toContain('w:hanging="360"');

    // Unused source definitions are inert but valid template data, so they are
    // retained instead of disappearing just because another list was edited.
    expect(numberingXml).toContain('w:abstractNumId="99"');
    expect(numberingXml).toContain('w:numId="99"');
    expect(numberingXml).toContain('w:val="upperRoman"');
  });
});
