import { describe, expect, it } from "vitest";
import { parseImportedStyles } from "@/import/docx/stylesXml.js";
import { buildStylesXml } from "@/export/docx/stylesXml.js";

describe("DOCX quick-style metadata", () => {
  it("recognizes semantic built-ins and preserves explicitly custom names on round-trip", () => {
    const xml = `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:style w:type="paragraph" w:styleId="Heading1" w:customStyle="0"><w:name w:val="heading 1"/></w:style>
      <w:style w:type="paragraph" w:styleId="Titulo2"><w:name w:val="Título 2"/></w:style>
      <w:style w:type="paragraph" w:styleId="Heading3" w:customStyle="1"><w:name w:val="Heading 3"/></w:style>
      <w:style w:type="paragraph" w:styleId="CustomTitle"><w:name w:val="Title"/></w:style>
    </w:styles>`;
    const parse = (value: string) => parseImportedStyles(value, { fonts: {}, colors: {} }) ?? {};
    const styles = parse(xml);
    expect(styles.Heading1).toMatchObject({ builtinStyle: "heading1", name: "heading 1", customStyle: false });
    expect(styles.Titulo2).toMatchObject({ builtinStyle: "heading2", name: "Título 2" });
    expect(styles.Heading3?.builtinStyle).toBeUndefined();
    expect(styles.Heading3?.customStyle).toBe(true);
    expect(styles.CustomTitle?.builtinStyle).toBeUndefined();
    const exported = buildStylesXml(styles);
    expect(exported).toContain('w:customStyle="1"');
    expect(exported).toContain('w:customStyle="0"');
    expect(parse(exported).Heading1?.builtinStyle).toBe("heading1");
    expect(parse(exported).Heading3?.builtinStyle).toBeUndefined();
  });

  it("imports and exports quick-style gallery metadata", () => {
    const xml = `<?xml version="1.0"?>
      <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:style w:type="character" w:styleId="Emphasis">
          <w:name w:val="Emphasis"/>
          <w:uiPriority w:val="20"/>
          <w:qFormat/>
          <w:semiHidden w:val="0"/>
          <w:unhideWhenUsed/>
          <w:rPr><w:i/></w:rPr>
        </w:style>
      </w:styles>`;

    const styles = parseImportedStyles(xml, { fonts: {}, colors: {} });
    expect(styles?.Emphasis).toMatchObject({
      type: "character",
      qFormat: true,
      uiPriority: 20,
      semiHidden: false,
      unhideWhenUsed: true,
    });

    const exported = buildStylesXml(styles ?? {});
    expect(exported).toContain('<w:uiPriority w:val="20"/>');
    expect(exported).toContain('<w:qFormat/>');
    expect(exported).toContain('<w:semiHidden w:val="off"/>');
    expect(exported).toContain('<w:unhideWhenUsed/>');
    expect(parseImportedStyles(exported, { fonts: {}, colors: {} })?.Emphasis).toMatchObject({ qFormat: true, semiHidden: false, unhideWhenUsed: true });
  });
});
