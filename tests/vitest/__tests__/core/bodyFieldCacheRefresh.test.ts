import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentSections, type EditorParagraphNode, type EditorState } from "@/core/model.js";
import { projectDocumentLayout } from "@/layoutProjection/documentLayout.js";
import { refreshBodyFieldCaches } from "@/layoutProjection/bodyFieldCacheRefresh.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

function fixture(){
  const target=createEditorParagraph("Reference");
  const p:EditorParagraphNode={id:"p",type:"paragraph",runs:[
    {id:"page",kind:"field",field:{type:"PAGE"},text:"9"},
    {id:"gap",kind:"text",text:" "},
    {id:"ref",kind:"field",field:{type:"REF",bookmark:"Target"},text:"x"},
    {id:"tail",kind:"text",text:" end"},
  ]};
  const base=createEditorDocument([target,p]);
  const section=getDocumentSections(base)[0]!;
  const document={...base,sections:[{...section,pageNumbering:{start:10}}],
    bookmarks:{items:{
      target:{id:"target",name:"Target",start:{paragraphId:target.id,offset:0},end:{paragraphId:target.id,offset:9}},
      tail:{id:"tail",name:"Tail",start:{paragraphId:p.id,offset:3},end:{paragraphId:p.id,offset:7}},
    },order:["target","tail"]},
    comments:{items:{c:{id:"c",author:"A",text:"note",start:{paragraphId:p.id,offset:3},end:{paragraphId:p.id,offset:7}}},order:["c"]},
  };
  const initial=createEditorStateFromDocument(document);
  const pos={paragraphId:p.id,runId:"ref",offset:1};
  return {...initial,selection:{anchor:pos,focus:pos}};
}
function paragraph(state:EditorState):EditorParagraphNode{
  return state.document.sections![0]!.blocks[1] as EditorParagraphNode;
}
describe("bounded body field cache refresh",()=>{
  it("repaginates variable-length fields and maps disjoint range edits exactly",async()=>{
    const initial=fixture(),snapshot=JSON.stringify(initial);
    const result=refreshBodyFieldCaches(initial);
    expect(result.status).toBe("updated");
    expect(result.passes).toBe(2);
    expect(result.updatedFields).toBe(2);
    expect(paragraph(result.state).runs.map(r=>r.text)).toEqual(["10"," ","Reference"," end"]);
    expect(result.state.selection.focus.offset).toBe(9);
    expect(result.state.document.bookmarks?.items.tail?.start?.offset).toBe(12);
    expect(result.state.document.bookmarks?.items.tail?.end?.offset).toBe(16);
    expect(result.state.document.comments?.items.c?.start?.offset).toBe(12);
    expect(result.layout.pages[0]!.blocks.find(b=>b.sourceBlock.id==="p")?.layout?.text).toBe("10 Reference end");
    expect(JSON.stringify(initial)).toBe(snapshot);
    expect(refreshBodyFieldCaches(result.state).status).toBe("unchanged");
    const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(result.state.document));
    const p=getDocumentSections(reopened)[0]!.blocks[1] as EditorParagraphNode;
    expect(p.runs.filter(r=>r.kind==="field").map(r=>r.text)).toEqual(["10","Reference"]);
  });
  it("rolls back the whole refresh when pagination oscillates",()=>{
    const initial=fixture();
    const p=paragraph(initial);
    const withCount={...initial,document:{...initial.document,sections:initial.document.sections!.map(s=>({...s,blocks:s.blocks.map(b=>b.id===p.id?{...p,runs:p.runs.map(r=>r.id==="page"?{...r,kind:"field" as const,field:{type:"NUMPAGES" as const},text:"1"}:r)}:b)}))}};
    const result=refreshBodyFieldCaches(withCount,d=>{
      const current=d.sections![0]!.blocks[1] as EditorParagraphNode;
      const layout=projectDocumentLayout(d,undefined,undefined,undefined,{cachedBodyPageFields:true});
      return current.runs[0]!.text==="1" ? {pages:[...layout.pages,{...layout.pages[0]!,id:"extra",index:1,blocks:[]}]} : layout;
    });
    expect(result.status).toBe("nonconvergent");
    expect(result.state).toBe(withCount);
    expect(result.updatedFields).toBe(0);
  });
  it("does not move an anchor inside a changing field or update tracked documents",()=>{
    const initial=fixture();
    const p=paragraph(initial);
    const updated={...initial,document:{...initial.document,sections:initial.document.sections!.map(s=>({...s,blocks:s.blocks.map(b=>b.id===p.id?{...p,runs:p.runs.map(r=>r.id==="ref"?{...r,text:"xx"}:r)}:b)}))},
      selection:{anchor:{...initial.selection.anchor,offset:1},focus:{...initial.selection.focus,offset:1}}};
    const result=refreshBodyFieldCaches(updated);
    expect(paragraph(result.state).runs.find(r=>r.id==="ref")?.text).toBe("xx");
    expect(refreshBodyFieldCaches({...initial,trackChangesEnabled:true}).state.document).toBe(initial.document);
  });
});
