import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,getParagraphText,type EditorState} from "@/core/model.js";
import {insertTableOfContents,updateTableOfContents} from "@/core/commands/tableOfContents.js";
import {parseTocInstruction,findQualifiedTocRegion} from "@/core/document/tocFields.js";
import {refreshTableOfContentsConvergently} from "@/core/document/tocConvergence.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

const fixture=(instruction:string)=>{
  const heading=createEditorParagraph("Introduction");
  heading.style={styleId:"heading1"};
  const custom=createEditorParagraph("Preliminares");
  custom.style={styleId:"legal"};
  const body=createEditorParagraph("Body");
  const doc=createEditorDocument([heading,custom,body]);
  doc.styles={...doc.styles,legal:{id:"legal",name:"Seção jurídica",type:"paragraph",customStyle:true}};
  const inserted=insertTableOfContents(createEditorStateFromDocument(doc),()=>1);
  const section=getDocumentSections(inserted.document)[0]!;
  return {...inserted,document:{...inserted.document,sections:[{...section,blocks:section.blocks.map(b=>
    b.type==="paragraph"?{...b,runs:b.runs.map(r=>r.kind==="fieldInstruction"?{...r,fieldInstruction:instruction}:r)}:b)}]}};
};
const entries=(state:EditorState)=>{
  const blocks=getDocumentSections(state.document)[0]!.blocks;
  const region=findQualifiedTocRegion(blocks)!;
  return blocks.slice(region.startBlockIndex+1,region.endBlockIndex).map(b=>b.type==="paragraph"?getParagraphText(b):"");
};
describe("F3E custom TOC paragraph style mappings",()=>{
  it("recognizes bounded mappings and rejects malformed or duplicate pairs",()=>{
    expect(parseTocInstruction('TOC \\t "Seção jurídica,2"')).toMatchObject({
      customOnly:true,styleMappings:[{name:"Seção jurídica",level:2}]});
    expect(parseTocInstruction('TOC \\o "1-3" \\t "Custom,5"')).toMatchObject({
      startLevel:1,endLevel:3,styleMappings:[{name:"Custom",level:5}]});
    for(const raw of ['TOC \\t "A,0"','TOC \\t "A,2,a,3"','TOC \\t "A,1,B"','TOC \\t ",1"','TOC \\t "A;1"','TOC \\t "A,1" \\u'])
      expect(parseTocInstruction(raw)).toBeUndefined();
  });
  it("regenerates custom-only entries and preserves the original instruction through DOCX",async()=>{
    const raw=' TOC \\t "Seção jurídica,2" ';
    const state=fixture(raw);
    const result=refreshTableOfContentsConvergently(state);
    expect(result.status).toBe("updated");
    expect(entries(result.state)).toEqual(["Preliminares\t1"]);
    expect(refreshTableOfContentsConvergently(result.state).status).toBe("unchanged");
    const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(result.state.document));
    const imported=createEditorStateFromDocument(reopened);
    expect(entries(imported)).toEqual(["Preliminares\t1"]);
    expect(getDocumentSections(reopened)[0]!.blocks.some(b=>b.type==="paragraph"&&b.runs.some(r=>r.kind==="fieldInstruction"&&r.fieldInstruction===raw))).toBe(true);
  });
  it("unions explicit styles with built-in headings in source order",()=>{
    const state=fixture('TOC \\o "1-3" \\t "legal,5"');
    const result=refreshTableOfContentsConvergently(state);
    expect(result.status).toBe("updated");
    expect(entries(result.state)).toEqual(["Introduction\t1","Preliminares\t1"]);
    expect(updateTableOfContents(state,()=>1,3)).toBe(state);
  });
  it("fails closed on missing or ambiguous style names",()=>{
    const missing=fixture('TOC \\t "Missing,2"');
    expect(refreshTableOfContentsConvergently(missing)).toMatchObject({state:missing,status:"unsupported"});
    const state=fixture('TOC \\t "Seção jurídica,2"');
    const ambiguous={...state,document:{...state.document,styles:{...state.document.styles,other:{id:"other",name:"Seção jurídica",type:"paragraph" as const}}}};
    expect(refreshTableOfContentsConvergently(ambiguous)).toMatchObject({state:ambiguous,status:"unsupported"});
  });
});
