import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { createEditorDocument, createEditorParagraph, createEditorTable, createEditorTableCell, createEditorTableRow } from "@/core/editorState.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { docxTypeface } from "@/export/docx/typeface.js";
import { serializeRunProperties } from "@/export/docx/text/runPropertiesXml.js";
import { DOMParser } from "@xmldom/xmldom";
describe("OOXML validator regression fixes",()=>{
  it("exports a single Word typeface, including previously nested fallback lists",()=>{
    expect(docxTypeface("Calibri, sans-serif")).toBe("Calibri");
    expect(docxTypeface('"Calibri, sans-serif", sans-serif')).toBe("Calibri");
    expect(docxTypeface('"Times New Roman", serif')).toBe("Times New Roman");
    expect(docxTypeface('"Face, Name", serif')).toBe("Face, Name");
    expect(serializeRunProperties({fontFamily:"Calibri, sans-serif",fontSize:11,color:"#112233",bold:true})).toMatch(/<w:rFonts[^>]*w:ascii="Calibri"[^>]*\/>.*<w:b\/>.*<w:color[^>]*\/>.*<w:sz /);
  });
  it("emits paragraph and cell properties in schema order in production output",async()=>{
    const table=createEditorTable([createEditorTableRow([createEditorTableCell([createEditorParagraph("Cell")])])],[100]);
    const doc=createEditorDocument([createEditorParagraph("Test"),table]);
    const zip=await JSZip.loadAsync(await exportEditorDocumentToDocx(doc));
    const xml=await zip.file("word/document.xml")!.async("string");
    expect(xml).toMatch(/<w:pPr>.*<w:spacing.*<w:ind.*<w:jc.*<\/w:pPr>/);
    const styles=await zip.file("word/styles.xml")!.async("string");
    const root=new DOMParser().parseFromString(styles,"application/xml");
    const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    for(const tag of ["qFormat","semiHidden"])for(const n of Array.from(root.getElementsByTagNameNS(W,tag)))expect(["true","false",""]).toContain(n.getAttributeNS(W,"val")??"");
    for(const n of Array.from(root.getElementsByTagNameNS(W,"tcPr"))){
      const names=Array.from(n.childNodes).filter(x=>x.nodeType===1).map(x=>x.nodeName);
      if(names.includes("w:tcBorders")&&names.includes("w:tcMar"))expect(names.indexOf("w:tcBorders")).toBeLessThan(names.indexOf("w:tcMar"));
    }
  });
});
