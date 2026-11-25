import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,type EditorTextRun} from "@/core/model.js";
import {hasNestedTocPageRefs,refreshNestedTocPageRefs} from "@/core/document/tocNestedPageRefs.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";
import JSZip from "jszip";

const marker=(id:string,kind:"begin"|"separate"|"end"):EditorTextRun=>
  ({id,kind:"fieldChar",text:"",fieldChar:{kind}});
const code=(id:string,fieldInstruction:string):EditorTextRun=>
  ({id,kind:"fieldInstruction",text:"",fieldInstruction});
const text=(id:string,value:string,link?:string):EditorTextRun=>
  ({id,kind:"text",text:value,styles:{bold:true,...(link?{link}:{})}});
const fixture=()=>{
  const title=createEditorParagraph("Alpha");title.style={styleId:"heading1"};
  const entry=createEditorParagraph("");
  entry.style={styleId:"TOC1",indentLeft:12};
  entry.runs=[marker("outer-b","begin"),code("outer-i",' TOC \\o "1-3" \\h '),marker("outer-s","separate"),
    text("prefix-a","Al","#_TocAlpha"),text("prefix-b","pha\t","#_TocAlpha"),
    marker("inner-b","begin"),code("inner-i"," PAGEREF _TocAlpha \\h "),marker("inner-s","separate"),
    text("number","1","#_TocAlpha"),marker("inner-e","end"),marker("outer-e","end")];
  const doc=createEditorDocument([title,entry]);
  doc.styles={...doc.styles,TOC1:{id:"TOC1",name:"TOC 1",type:"paragraph"}};
  const section=getDocumentSections(doc)[0]!;
  doc.sections=[{...section,pageNumbering:{start:12,format:"upperRoman"}}];
  doc.bookmarks={order:["bm"],items:{bm:{id:"bm",name:"_TocAlpha",hidden:true,
    start:{paragraphId:title.id,offset:0},end:{paragraphId:title.id,offset:5}}}};
  return {state:createEditorStateFromDocument(doc),entry};
};
describe("F3H1 nested TOC PAGEREF cache",()=>{
  it("updates only the formatted page result, keeping all markers and source styles",async()=>{
    const {state,entry}=fixture();
    expect(hasNestedTocPageRefs(state)).toBe(true);
    const result=refreshNestedTocPageRefs(state);
    expect(result.status).toBe("updated");
    const p=getDocumentSections(result.state.document)[0]!.blocks[1]!;
    expect(p).toEqual({...entry,runs:entry.runs.map(r=>r.id==="number"?{...r,text:"XII"}:r)});
    expect(result.state.document.bookmarks).toBe(state.document.bookmarks);
    expect(result.state.selection).toBe(state.selection);
    expect(refreshNestedTocPageRefs(result.state).status).toBe("unchanged");
    const bytes=await exportEditorDocumentToDocx(result.state.document);
    const xml=await (await JSZip.loadAsync(bytes)).file("word/document.xml")!.async("string");
    expect(xml).toContain("PAGEREF _TocAlpha");
    expect(xml).toContain("XII");
    const imported=await importDocxToEditorDocument(bytes);
    expect(getDocumentSections(imported)[0]!.blocks.some(b=>b.type==="paragraph"&&b.runs.some(r=>r.text==="XII"))).toBe(true);
  });
  it("rolls back if bookmark is missing or candidate pagination fails",()=>{
    const {state}=fixture();
    const missing={...state,document:{...state.document,bookmarks:undefined}};
    expect(refreshNestedTocPageRefs(missing)).toMatchObject({state:missing,status:"unresolved"});
    let calls=0;
    expect(refreshNestedTocPageRefs(state,doc=>{
      if(++calls===2)throw Error("layout unavailable");
      return projectDocumentLayout(doc);
    })).toMatchObject({state,status:"unsupported"});
  });
  it("refuses locked child fields",()=>{
    const {state,entry}=fixture();
    const section=getDocumentSections(state.document)[0]!;
    const locked={...state,document:{...state.document,sections:[{...section,blocks:section.blocks.map(b=>b.id===entry.id?
      {...entry,runs:entry.runs.map(r=>r.id==="inner-b"&&r.kind==="fieldChar"?{...r,fieldChar:{...r.fieldChar,fieldLock:true}}:r)}:b)}]}};
    expect(hasNestedTocPageRefs(locked)).toBe(false);
    expect(refreshNestedTocPageRefs(locked)).toMatchObject({state:locked,status:"unsupported"});
  });
});
