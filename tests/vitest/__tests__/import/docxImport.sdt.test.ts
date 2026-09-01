import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import type { EditorParagraphNode } from "@/core/model.js";

const SECT_PR = `<w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>`;

async function importBody(bodyXml: string) {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyXml}${SECT_PR}</w:body>
</w:document>`,
  );
  return importDocxToEditorDocument(
    await zip.generateAsync({ type: "arraybuffer" }),
  );
}

async function reexport(document: Awaited<ReturnType<typeof importBody>>) {
  const zip = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
  return (await zip.file("word/document.xml")?.async("string")) ?? "";
}

function bodyBlocks(document: Awaited<ReturnType<typeof importBody>>) {
  return document.sections![0]!.blocks;
}

describe("DOCX block-level SDT (content control) round-trip", () => {
  const SINGLE_SDT = `
    <w:sdt>
      <w:sdtPr>
        <w:alias w:val="Title"/>
        <w:tag w:val="doc-title"/>
        <w:id w:val="12345"/>
      </w:sdtPr>
      <w:sdtContent>
        <w:p><w:r><w:t>Inside the control</w:t></w:r></w:p>
      </w:sdtContent>
    </w:sdt>`;

  it("unwraps the content so it still renders/edits as a normal block", async () => {
    const document = await importBody(SINGLE_SDT);
    const blocks = bodyBlocks(document);
    expect(blocks).toHaveLength(1);
    const paragraph = blocks[0] as EditorParagraphNode;
    expect(paragraph.type).toBe("paragraph");
    expect(paragraph.runs[0]!.text).toBe("Inside the control");
  });

  it("preserves the w:sdtPr wrapper on the block", async () => {
    const document = await importBody(SINGLE_SDT);
    const paragraph = bodyBlocks(document)[0] as EditorParagraphNode;
    expect(paragraph.sdtWrappers).toHaveLength(1);
    const wrapper = paragraph.sdtWrappers![0]!;
    expect(wrapper.groupId).toMatch(/^sdt:/);
    expect(wrapper.sdtPr.tag).toBe("doc-title");
    expect(wrapper.sdtPr.alias).toBe("Title");
    expect(wrapper.sdtPr.id).toBe("12345");
  });

  it("re-wraps the content in a single w:sdt on export", async () => {
    const document = await importBody(SINGLE_SDT);
    const xml = await reexport(document);
    expect(xml).toContain("<w:sdt>");
    expect(xml).toContain("<w:sdtContent>");
    expect(xml).toContain('w:val="doc-title"');
    expect(xml).toContain("Inside the control");
    expect(xml.split("<w:sdt>").length - 1).toBe(1);
    expect(xml.indexOf("<w:sdtContent>")).toBeLessThan(
      xml.indexOf("Inside the control"),
    );
  });

  it("coalesces a multi-paragraph control back into one w:sdt", async () => {
    const document = await importBody(`
      <w:sdt>
        <w:sdtPr><w:tag w:val="rich"/></w:sdtPr>
        <w:sdtContent>
          <w:p><w:r><w:t>First</w:t></w:r></w:p>
          <w:p><w:r><w:t>Second</w:t></w:r></w:p>
        </w:sdtContent>
      </w:sdt>`);
    const blocks = bodyBlocks(document);
    expect(blocks).toHaveLength(2);
    const [a, b] = blocks as EditorParagraphNode[];
    expect(a!.sdtWrappers?.[0]?.groupId).toBe(b!.sdtWrappers?.[0]?.groupId);

    const xml = await reexport(document);
    expect(xml.split("<w:sdt>").length - 1).toBe(1);
    expect(xml).toContain("First");
    expect(xml).toContain("Second");
  });

  it("re-wraps nested content controls from the inside out", async () => {
    const document = await importBody(`
      <w:sdt>
        <w:sdtPr><w:tag w:val="outer"/></w:sdtPr>
        <w:sdtContent>
          <w:p><w:r><w:t>Before</w:t></w:r></w:p>
          <w:sdt>
            <w:sdtPr><w:tag w:val="inner"/></w:sdtPr>
            <w:sdtContent>
              <w:p><w:r><w:t>Nested</w:t></w:r></w:p>
            </w:sdtContent>
          </w:sdt>
        </w:sdtContent>
      </w:sdt>`);
    const blocks = bodyBlocks(document) as EditorParagraphNode[];
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.sdtWrappers).toHaveLength(1);
    expect(blocks[1]!.sdtWrappers).toHaveLength(2);

    const xml = await reexport(document);
    expect(xml).toContain('w:val="outer"');
    expect(xml).toContain('w:val="inner"');
    expect(xml.split("<w:sdt>").length - 1).toBe(2);
    expect(xml.indexOf('w:val="outer"')).toBeLessThan(
      xml.indexOf('w:val="inner"'),
    );
  });

  it("leaves ordinary blocks free of sdt wrappers", async () => {
    const document = await importBody(`<w:p><w:r><w:t>Plain</w:t></w:r></w:p>`);
    const paragraph = bodyBlocks(document)[0] as EditorParagraphNode;
    expect(paragraph.sdtWrappers).toBeUndefined();
    const xml = await reexport(document);
    expect(xml).not.toContain("<w:sdt>");
  });

  it("emits an empty <w:sdtPr/> when the source control had no properties", async () => {
    const document = await importBody(`
      <w:sdt>
        <w:sdtPr/>
        <w:sdtContent><w:p><w:r><w:t>Bare</w:t></w:r></w:p></w:sdtContent>
      </w:sdt>`);
    const wrapper = bodyBlocks(document)[0]!.sdtWrappers![0]!;
    expect(wrapper.sdtPr).toEqual({});
    const xml = await reexport(document);
    expect(xml).toContain("<w:sdtPr/>");
  });

  it("parses and round-trips placeholder + lock + appearance + temporary + color", async () => {
    const document = await importBody(`
      <w:sdt>
        <w:sdtPr>
          <w:lock w:val="sdtContentLocked"/>
          <w:placeholder><w:docPart w:val="DisclaimerBlock"/></w:placeholder>
          <w:temporary w:val="true"/>
          <w:appearance w:val="tags"/>
          <w:showingPlcHdr w:val="1"/>
          <w:color w:val="FF0000"/>
        </w:sdtPr>
        <w:sdtContent><w:p><w:r><w:t>Body</w:t></w:r></w:p></w:sdtContent>
      </w:sdt>`);
    const sdtPr = bodyBlocks(document)[0]!.sdtWrappers![0]!.sdtPr;
    expect(sdtPr.lock).toBe("sdtContentLocked");
    expect(sdtPr.placeholderDocPart).toBe("DisclaimerBlock");
    expect(sdtPr.temporary).toBe(true);
    expect(sdtPr.appearance).toBe("tags");
    expect(sdtPr.showingPlcHdr).toBe(true);
    expect(sdtPr.color).toBe("FF0000");

    const xml = await reexport(document);
    expect(xml).toContain('<w:lock w:val="sdtContentLocked"/>');
    expect(xml).toContain(
      '<w:placeholder><w:docPart w:val="DisclaimerBlock"/></w:placeholder>',
    );
    expect(xml).toContain('<w:temporary w:val="true"/>');
    expect(xml).toContain('<w:appearance w:val="tags"/>');
    expect(xml).toContain('<w:showingPlcHdr w:val="true"/>');
    expect(xml).toContain('<w:color w:val="FF0000"/>');
    expect(xml.indexOf('w:lock ')).toBeLessThan(xml.indexOf("w:placeholder"));
    expect(xml.indexOf("w:placeholder")).toBeLessThan(xml.indexOf("w:temporary"));
    expect(xml.indexOf("w:temporary")).toBeLessThan(xml.indexOf("w:appearance"));
  });

  it("parses legacy child-form w:dataBinding and exports canonical attributes", async () => {
    const document = await importBody(`
      <w:sdt>
        <w:sdtPr>
          <w:tag w:val="customer-name"/>
          <w:dataBinding>
            <w:prefixMappings w:val="xmlns:ns=urn:customers"/>
            <w:xpath w:val="/ns:customers/ns:customer[1]/ns:name"/>
            <w:storeItemID w:val="{abc-123}"/>
          </w:dataBinding>
        </w:sdtPr>
        <w:sdtContent><w:p><w:r><w:t>Acme</w:t></w:r></w:p></w:sdtContent>
      </w:sdt>`);
    const sdtPr = bodyBlocks(document)[0]!.sdtWrappers![0]!.sdtPr;
    expect(sdtPr.tag).toBe("customer-name");
    expect(sdtPr.dataBinding).toEqual({
      prefixMappings: "xmlns:ns=urn:customers",
      xpath: "/ns:customers/ns:customer[1]/ns:name",
      storeItemID: "{abc-123}",
    });

    const xml = await reexport(document);
    expect(xml).toContain(
      '<w:dataBinding w:prefixMappings="xmlns:ns=urn:customers" w:xpath="/ns:customers/ns:customer[1]/ns:name" w:storeItemID="{abc-123}"/>',
    );
    expect(xml).not.toContain("<w:prefixMappings");
    expect(xml).not.toContain("<w:xpath");
    expect(xml).not.toContain("<w:storeItemID");
  });

  it("parses and round-trips a dropDownList with list items", async () => {
    const document = await importBody(`
      <w:sdt>
        <w:sdtPr>
          <w:alias w:val="Country"/>
          <w:dropDownList>
            <w:listItem w:displayText="United States" w:value="US"/>
            <w:listItem w:displayText="Brazil" w:value="BR"/>
            <w:lastSelectedValue w:val="BR"/>
          </w:dropDownList>
        </w:sdtPr>
        <w:sdtContent><w:p><w:r><w:t>Brazil</w:t></w:r></w:p></w:sdtContent>
      </w:sdt>`);
    const sdtPr = bodyBlocks(document)[0]!.sdtWrappers![0]!.sdtPr;
    expect(sdtPr.alias).toBe("Country");
    expect(sdtPr.subtype).toEqual({
      kind: "dropDownList",
      listItems: [
        { displayText: "United States", value: "US" },
        { displayText: "Brazil", value: "BR" },
      ],
      lastSelectedValue: "BR",
    });

    const xml = await reexport(document);
    expect(xml).toContain("<w:dropDownList>");
    expect(xml).toContain('<w:listItem w:displayText="United States" w:value="US"/>');
    expect(xml).toContain('<w:listItem w:displayText="Brazil" w:value="BR"/>');
    expect(xml).toContain('<w:lastSelectedValue w:val="BR"/>');
    expect(xml).toContain('<w:alias w:val="Country"/>');
    expect(xml.indexOf("w:alias")).toBeLessThan(xml.indexOf("w:dropDownList"));
  });

  it("parses and round-trips a date picker with format and calendar", async () => {
    const document = await importBody(`
      <w:sdt>
        <w:sdtPr>
          <w:date w:fullDate="2024-06-15T10:30:00Z">
            <w:dateFormat w:val="MM/dd/yyyy"/>
            <w:lid w:val="en-US"/>
            <w:calendar w:val="gregorian"/>
          </w:date>
        </w:sdtPr>
        <w:sdtContent><w:p><w:r><w:t>06/15/2024</w:t></w:r></w:p></w:sdtContent>
      </w:sdt>`);
    const sdtPr = bodyBlocks(document)[0]!.sdtWrappers![0]!.sdtPr;
    expect(sdtPr.subtype).toEqual({
      kind: "date",
      fullDate: "2024-06-15T10:30:00Z",
      dateFormat: "MM/dd/yyyy",
      lid: "en-US",
      calendar: "gregorian",
    });

    const xml = await reexport(document);
    expect(xml).toContain('<w:date w:fullDate="2024-06-15T10:30:00Z">');
    expect(xml).toContain('<w:dateFormat w:val="MM/dd/yyyy"/>');
    expect(xml).toContain('<w:lid w:val="en-US"/>');
    expect(xml).toContain('<w:calendar w:val="gregorian"/>');
  });

  it("parses and round-trips a w14 checkbox with state and glyphs", async () => {
    const document = await importBody(`
      <w:sdt>
        <w:sdtPr>
          <w14:checkbox xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
            <w14:checked w14:val="1"/>
            <w14:checkedState w14:font="MS Gothic" w14:char="2611"/>
            <w14:uncheckedState w14:font="MS Gothic" w14:char="2610"/>
          </w14:checkbox>
        </w:sdtPr>
        <w:sdtContent><w:p><w:r><w:t>X</w:t></w:r></w:p></w:sdtContent>
      </w:sdt>`);
    const sdtPr = bodyBlocks(document)[0]!.sdtWrappers![0]!.sdtPr;
    expect(sdtPr.subtype).toEqual({
      kind: "checkbox",
      checked: true,
      checkedStateFont: "MS Gothic",
      checkedStateChar: "2611",
      uncheckedStateFont: "MS Gothic",
      uncheckedStateChar: "2610",
    });

    const xml = await reexport(document);
    expect(xml).toContain("<w14:checkbox>");
    expect(xml).toContain('<w14:checked w14:val="1"/>');
    expect(xml).toContain('<w14:checkedState w14:font="MS Gothic" w14:char="2611"/>');
    expect(xml).toContain('<w14:uncheckedState w14:font="MS Gothic" w14:char="2610"/>');
  });

  it("escapes special XML characters in alias values", async () => {
    const sourceSdt =
      '<w:sdt><w:sdtPr><w:alias w:val="Quote &quot;Test&quot;"/></w:sdtPr>' +
      "<w:sdtContent><w:p><w:r><w:t>Body</w:t></w:r></w:p></w:sdtContent></w:sdt>";
    const document = await importBody(sourceSdt);
    const sdtPr = bodyBlocks(document)[0]!.sdtWrappers![0]!.sdtPr;
    expect(sdtPr.alias).toBe('Quote "Test"');

    const xml = await reexport(document);
    expect(xml).toContain('<w:alias w:val="Quote &quot;Test&quot;"/>');
  });

  it("preserves unrecognized w:sdtPr children verbatim via unknownXml", async () => {
    const document = await importBody(`
      <w:sdt>
        <w:sdtPr>
          <w:tag w:val="future-proof"/>
          <w15:storeItem xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" w15:id="{store-99}"/>
          <w:rPr><w:b/></w:rPr>
        </w:sdtPr>
        <w:sdtContent><w:p><w:r><w:t>Body</w:t></w:r></w:p></w:sdtContent>
      </w:sdt>`);
    const sdtPr = bodyBlocks(document)[0]!.sdtWrappers![0]!.sdtPr;
    expect(sdtPr.tag).toBe("future-proof");
    expect(sdtPr.unknownXml).toContain("w15:storeItem");
    expect(sdtPr.unknownXml).toContain("{store-99}");
    expect(sdtPr.unknownXml).toMatch(/<w:rPr/);

    const xml = await reexport(document);
    expect(xml).toContain('<w:tag w:val="future-proof"/>');
    expect(xml).toContain("w15:storeItem");
    expect(xml).toContain("{store-99}");
    expect(xml).toMatch(/<w:rPr/);
    expect(xml).toContain("xmlns:w15=");
  });
});