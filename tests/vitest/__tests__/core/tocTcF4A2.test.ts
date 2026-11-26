import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,getParagraphText,type EditorTextRun,type EditorDocument,type EditorParagraphNode} from "@/core/model.js";
import {parseTocInstruction,findQualifiedTocRegion} from "@/core/document/tocFields.js";
import {insertTableOfContents} from "@/core/commands/tableOfContents.js";
import {refreshTableOfContentsConvergently} from "@/core/document/tocConvergence.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

const tc=(id:string,raw:string):EditorTextRun[]=>[
  {id:id+"b",kind:"fieldChar",text:"",fieldChar:{kind:"begin"},styles:{hidden:true}},
  {id:id+"i",kind:"fieldInstruction",text:"",fieldInstruction:raw,styles:{hidden:true}},
  {id:id+"e",kind:"fieldChar",text:"",fieldChar:{kind:"end"},styles:{hidden:true}},
];
function fixture(raw=' TOC \\f A \\l "2-3" '){
  const intro=createEditorParagraph("Sumário");
  const heading=createEditorParagraph("Not a TC entry");heading.style={styleId:"heading1"};
  const body=createEditorParagraph("Body");
  body.runs.push(...tc("a",' TC "Primeira" \\f a \\l 2 '),
    ...tc("b",' TC "Sem página" \\f A \\l 3 \\n '),
    ...tc("c",' TC "Other identifier" \\f B \\l 2 '),
    ...tc("d",' TC "Outside range" \\f A \\l 1 '));
  const inserted=insertTableOfContents(createEditorStateFromDocument(createEditorDocument([intro,heading,body])),()=>1);
  const section=getDocumentSections(inserted.document)[0]!;
  const blocks=section.blocks.map(b=>b.type==="paragraph"?{...b,runs:b.runs.map(r=>
    r.kind==="fieldInstruction"&&r.fieldInstruction.trim().startsWith("TOC")?{...r,fieldInstruction:raw}:r)}:b);
  const state={...inserted,document:{...inserted.document,sections:[{...section,blocks,pageNumbering:{start:12,format:"upperRoman"}}]}};
  return {state,body};
}
function entries(doc:EditorDocument){
  const blocks=getDocumentSections(doc)[0]!.blocks,region=findQualifiedTocRegion(blocks)!;
  return blocks.slice(region.startBlockIndex+1,region.endBlockIndex).map(p=>getParagraphText(p as EditorParagraphNode));
}
describe("F4A2A TC-only flat TOC refresh",()=>{
  it("qualifies explicit TC-only grammar, refuses mixed and unsafe options",()=>{
    expect(parseTocInstruction('TOC \\f "A" \\l "2-3"')).toMatchObject({tcIdentifier:"A",startLevel:2,endLevel:3});
    for(const raw of ['TOC \\f','TOC \\f AB','TOC \\f A \\h','TOC \\f A \\o "1-3"','TOC \\l "2-3"','TOC \\f A \\l "3-2"'])
      expect(parseTocInstruction(raw),raw).toBeUndefined();
  });
  it("regenerates selected marker occurrences, suppresses pages and survives DOCX",async()=>{
    const {state}=fixture(),before=JSON.stringify(state);
    const result=refreshTableOfContentsConvergently(state);
    expect(result.status).toBe("updated");
    expect(entries(result.state.document)).toEqual(["Primeira\tXII","Sem página"]);
    expect(JSON.stringify(state)).toBe(before);
    expect(result.state.selection).toEqual(state.selection);
    expect(refreshTableOfContentsConvergently(result.state).status).toBe("unchanged");
    const doc=await importDocxToEditorDocument(await exportEditorDocumentToDocx(result.state.document));
    expect(entries(doc)).toEqual(["Primeira\tXII","Sem página"]);
    expect(refreshTableOfContentsConvergently(createEditorStateFromDocument(doc)).status).toBe("unchanged");
  });
  it("rolls back when page geometry or marker grammar is unqualified",()=>{
    const {state,body}=fixture();
    const section=getDocumentSections(state.document)[0]!;
    const unsupported={...state,document:{...state.document,sections:[{...section,pageNumbering:{format:"none"}}]}};
    expect(refreshTableOfContentsConvergently(unsupported)).toMatchObject({status:"unresolved",state:unsupported});
    const malformed={...state,document:{...state.document,sections:[{...section,blocks:section.blocks.map(b=>
      b.id===body.id&&b.type==="paragraph"?{...b,runs:b.runs.map(r=>r.id==="ai"&&r.kind==="fieldInstruction"?{...r,fieldInstruction:'TC "Bad" \\l 0'}:r)}:b)}]}};
    expect(refreshTableOfContentsConvergently(malformed)).toMatchObject({status:"unsupported",state:malformed});
  });
});
