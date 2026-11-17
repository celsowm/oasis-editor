import { describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import JSZip from "jszip";
import { createEditorDocument, createEditorParagraph, createEditorParagraphFromRuns, createEditorStateFromDocument } from "@/core/editorState.js";
import { paragraphOffsetToPosition } from "@/core/model.js";
import { editHeaderFooter, exitHeaderFooter, insertPageNumber } from "@/core/commands/headerFooter.js";
import { insertTextAtSelection } from "@/core/commands/text.js";
import { insertDateField } from "@/core/commands/fieldDate.js";
import { insertCommentAtSelection, replyToComment } from "@/core/commands/commentAuthoring.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

const out=process.env.OOXML_VALIDATION_CORPUS;
const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const M="http://schemas.openxmlformats.org/officeDocument/2006/math";
describe.skipIf(!out)("OOXML extended characterization corpus",()=>{
  it("exports separate feature documents through production paths",async()=>{
    const dir=join(out!,"extended");await mkdir(dir,{recursive:true});
    async function save(name:string,doc:Parameters<typeof exportEditorDocumentToDocx>[0],part:string,marker:string){
      const bytes=await exportEditorDocumentToDocx(doc),zip=await JSZip.loadAsync(bytes);
      const xml=await zip.file(part)?.async("string");expect(xml).toContain(marker);
      await writeFile(join(dir,name),new Uint8Array(bytes));
    }
    const body=()=>createEditorStateFromDocument(createEditorDocument([createEditorParagraph("Body text")]));
    const date=insertDateField(body(),{dateFormat:"yyyy-MM-dd",value:new Date(2026,0,1,0,0,0)});
    await save("date-field.docx",date.document,"word/document.xml","DATE");
    let header=editHeaderFooter(body(),"header");
    header=insertTextAtSelection(header,"Header");
    header=insertPageNumber(header);
    let footer=editHeaderFooter(exitHeaderFooter(header),"footer");
    footer=insertTextAtSelection(footer,"Footer");
    footer=insertPageNumber(footer);
    await save("header-footer.docx",exitHeaderFooter(footer).document,"word/header1.xml","Header");
    const image=createEditorParagraphFromRuns([{text:"\uFFFC",image:{src:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC2sAAAAASUVORK5CYII=",width:32,height:32}}]);
    await save("image.docx",createEditorDocument([image]),"word/document.xml","<w:drawing>");
    const p=createEditorParagraph("Please review this clause.");
    const state=createEditorStateFromDocument(createEditorDocument([p]));
    const selected={...state,selection:{anchor:paragraphOffsetToPosition(p,7),focus:paragraphOffsetToPosition(p,13)}};
    const commented=insertCommentAtSelection(selected,{id:"comment:root",author:"Reviewer",text:"Clarify this clause.",date:1760000000000});
    const threaded=replyToComment(commented,"comment:root",{id:"comment:reply",author:"Writer",text:"Clarified.",date:1760000001000});
    await save("threaded-comments.docx",threaded.document,"word/comments.xml","Clarify this clause.");
    async function fromMarkup(content:string,numbering?:string){
      const z=new JSZip();
      z.file("word/document.xml",`<w:document xmlns:w="${W}" xmlns:m="${M}"><w:body>${content}<w:sectPr/></w:body></w:document>`);
      if(numbering)z.file("word/numbering.xml",numbering);
      return importDocxToEditorDocument(await z.generateAsync({type:"arraybuffer"}));
    }
    const math=await fromMarkup("<w:p><m:oMath><m:f><m:num><m:r><m:t>a</m:t></m:r></m:num><m:den><m:r><m:t>b</m:t></m:r></m:den></m:f></m:oMath></w:p>");
    await save("equation.docx",math,"word/document.xml","<m:f>");
    const list=await fromMarkup('<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="21"/></w:numPr></w:pPr><w:r><w:t>Item</w:t></w:r></w:p>',`<w:numbering xmlns:w="${W}"><w:abstractNum w:abstractNumId="12"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/></w:lvl></w:abstractNum><w:num w:numId="21"><w:abstractNumId w:val="12"/></w:num></w:numbering>`);
    await save("numbering.docx",list,"word/numbering.xml","<w:numFmt");
    const revision=await fromMarkup('<w:p><w:pPr><w:jc w:val="center"/><w:pPrChange w:id="21" w:author="Reviewer" w:date="2026-02-03T04:05:06Z"><w:pPr><w:keepNext/><w:jc w:val="right"/></w:pPr></w:pPrChange></w:pPr><w:r><w:rPr><w:i/><w:rPrChange w:id="20" w:author="Reviewer" w:date="2026-02-02T03:04:05Z"><w:rPr><w:b/></w:rPr></w:rPrChange></w:rPr><w:t>Revision</w:t></w:r></w:p>');
    await save("property-revisions.docx",revision,"word/document.xml","<w:pPrChange");
  },30000);
});
