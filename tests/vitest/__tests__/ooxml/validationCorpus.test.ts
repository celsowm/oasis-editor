import { describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import JSZip from "jszip";
import { createEditorDocument, createEditorParagraph, createEditorTable, createEditorTableCell, createEditorTableRow } from "@/core/editorState.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { attachDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";

// Opt-in artifact generation. Normal test runs do not write shared files.
const out=process.env.OOXML_VALIDATION_CORPUS;
describe.skipIf(!out)("OOXML validation corpus",()=>{
  it("exports fresh and source-backed synthetic documents through production paths",async()=>{
    const dir=out!;
    await mkdir(join(dir,"positive"),{recursive:true});
    await mkdir(join(dir,"negative"),{recursive:true});
    const save=(folder:string,name:string,bytes:ArrayBuffer)=>writeFile(join(dir,folder,name),new Uint8Array(bytes));
    const fresh=await exportEditorDocumentToDocxPreservingSource(createEditorDocument([createEditorParagraph("Conformance baseline")]));
    await save("positive","fresh-paragraph.docx",fresh);
    const table=createEditorTable([createEditorTableRow([createEditorTableCell([createEditorParagraph("Cell A")]),createEditorTableCell([createEditorParagraph("Cell B")])])],[100,100]);
    const complex=await exportEditorDocumentToDocxPreservingSource(createEditorDocument([createEditorParagraph("Table"),table]));
    await save("positive","fresh-table.docx",complex);
    const imported=await importDocxToEditorDocument(fresh);
    await attachDocxSourcePackage(imported,fresh);
    await save("positive","source-noop.docx",await exportEditorDocumentToDocxPreservingSource(imported));
    const p=imported.sections?.[0]?.blocks[0];
    if(p?.type!=="paragraph")throw Error("Missing imported paragraph");
    p.runs[0]!.text="Localized edit";
    const edited=await exportEditorDocumentToDocxPreservingSource(imported);
    await save("positive","source-edited.docx",edited);
    const zip=await JSZip.loadAsync(edited);
    const rels=await zip.file("_rels/.rels")!.async("string");
    zip.file("_rels/.rels",rels.replace(/Target="[^"]+"/,'Target="word/nonexistent.xml"'));
    await save("negative","missing-target.docx",await zip.generateAsync({type:"arraybuffer"}));
    const invalid=await JSZip.loadAsync(fresh);
    const xml=await invalid.file("word/document.xml")!.async("string");
    expect(xml).toContain("</w:body>");
    invalid.file("word/document.xml",xml.replace("</w:body>","<w:invalidForValidation/></w:body>"));
    await save("negative","invalid-schema.docx",await invalid.generateAsync({type:"arraybuffer"}));
  });
});
