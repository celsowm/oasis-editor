import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,getParagraphText,type EditorState,type EditorTextRun} from "@/core/model.js";
import {insertTableOfContents,collectQualifiedTocHeadings,updateTableOfContents} from "@/core/commands/tableOfContents.js";
import {parseTocInstruction,findQualifiedTocRegion} from "@/core/document/tocFields.js";
import {refreshTableOfContentsConvergently} from "@/core/document/tocConvergence.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

function marker(id:string,raw:string):EditorTextRun[]{
  return [
    {id:id+"b",kind:"fieldChar",text:"",fieldChar:{kind:"begin"},styles:{hidden:true}},
    {id:id+"i",kind:"fieldInstruction",text:"",fieldInstruction:raw,styles:{hidden:true}},
    {id:id+"e",kind:"fieldChar",text:"",fieldChar:{kind:"end"},styles:{hidden:true}},
  ];
}
const raw=' TOC \\o "1-2" \\t "Legal,4" \\f A \\l "3-3" ';
function fixture(instruction=raw,overlap=false){
  const intro=createEditorParagraph("Intro");
  const first=createEditorParagraph("First");first.style={styleId:"heading1"};
  const mid=createEditorParagraph("Body");
  mid.runs.push(...marker("m",' TC "Marked" \\f A \\l 3 '),
    {id:"mid-text",kind:"text",text:" suffix"},...marker("n",' TC "No page" \\f A \\l 3 \\n '),
    ...marker("x",' TC "Excluded level" \\f A \\l 2 '),...marker("y",' TC "Excluded id" \\f B \\l 3 '));
  const custom=createEditorParagraph("Custom");custom.style={styleId:"legal"};
  const last=createEditorParagraph("Last");last.style={styleId:"heading2"};
  if(overlap)first.runs.push(...marker("overlap",' TC "Ambiguous" \\f A \\l 3 '));
  const doc=createEditorDocument([intro,first,mid,custom,last]);
  doc.styles={...doc.styles,legal:{id:"legal",name:"Legal",type:"paragraph",customStyle:true}};
  const inserted=insertTableOfContents(createEditorStateFromDocument(doc),()=>1);
  const section=getDocumentSections(inserted.document)[0]!;
  return {...inserted,document:{...inserted.document,sections:[{...section,blocks:section.blocks.map(b=>
    b.type==="paragraph"?{...b,runs:b.runs.map(r=>r.kind==="fieldInstruction"&&r.fieldInstruction.trim().startsWith("TOC")
      ?{...r,fieldInstruction:instruction}:r)}:b)}]}};
}
function entries(state:EditorState){
  const blocks=getDocumentSections(state.document)[0]!.blocks,region=findQualifiedTocRegion(blocks)!;
  return blocks.slice(region.startBlockIndex+1,region.endBlockIndex).filter(b=>b.type==="paragraph").map(getParagraphText);
}
describe("F4A3A mixed flat TOC source qualification",()=>{
  it("keeps outline and TC ranges independent; refuses mixed hyperlinks",()=>{
    expect(parseTocInstruction(raw)).toMatchObject({startLevel:1,endLevel:2,tcIdentifier:"A",tcMixedRange:[3,3],
      styleMappings:[{name:"Legal",level:4}]});
    expect(parseTocInstruction(raw+" \\h")).toBeUndefined();
    expect(parseTocInstruction('TOC \\u \\f A \\l "2-3"')).toMatchObject({useOutline:true,tcMixedRange:[2,3]});
    expect(parseTocInstruction('TOC \\t "Legal,4" \\f A')).toMatchObject({customOnly:true,tcMixedRange:[1,9]});
  });
  it("merges distinct paragraphs in source order and preserves omitted labels across DOCX",async()=>{
    const state=fixture(),before=JSON.stringify(state);
    const headings=collectQualifiedTocHeadings(state,parseTocInstruction(raw)!)!;
    expect(headings.map(h=>[h.text,h.level])).toEqual([["First",1],["Marked",3],["No page",3],["Custom",4],["Last",2]]);
    const result=refreshTableOfContentsConvergently(state);
    expect(result.status).toBe("updated");
    expect(entries(result.state)).toEqual(["First\t1","Marked\t1","No page","Custom\t1","Last\t1"]);
    expect(JSON.stringify(state)).toBe(before);
    expect(refreshTableOfContentsConvergently(result.state).status).toBe("unchanged");
    const reopened=createEditorStateFromDocument(await importDocxToEditorDocument(await exportEditorDocumentToDocx(result.state.document)));
    expect(entries(reopened)).toEqual(entries(result.state));
    expect(refreshTableOfContentsConvergently(reopened).status).toBe("unchanged");
  });
  it("supports custom-only style mapping plus TC without adding built-in headings",()=>{
    const state=fixture(' TOC \\t "Legal,4" \\f A \\l "3-3" ');
    const result=refreshTableOfContentsConvergently(state);
    expect(result.status).toBe("updated");
    expect(entries(result.state)).toEqual(["Marked\t1","No page","Custom\t1"]);
  });
  it("preserves the cache on overlapping sources or caller caps",()=>{
    const state=fixture(raw,true);
    expect(refreshTableOfContentsConvergently(state)).toMatchObject({status:"unsupported",state});
    const normal=fixture();
    expect(updateTableOfContents(normal,()=>1,2)).toBe(normal);
    expect(updateTableOfContents(normal,()=>undefined)).toBe(normal);
  });
});
