import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph } from "@/core/editorState.js";
import { getDocumentSections, type EditorFieldData, type EditorParagraphNode } from "@/core/model.js";
import { projectDocumentLayout } from "@/layoutProjection/documentLayout.js";

function scalar(id:string,field:EditorFieldData,text:string):EditorParagraphNode{
  return {id,type:"paragraph",runs:[{id:id+":r",kind:"field",field,text}]};
}
function complex(id:string,instruction:string,locked=false):EditorParagraphNode {
  return {id,type:"paragraph",runs:[
    {id:id+":b",kind:"fieldChar",text:"",fieldChar:{kind:"begin",fieldLock:locked,dirty:true}},
    {id:id+":i",kind:"fieldInstruction",text:"",fieldInstruction:instruction},
    {id:id+":s",kind:"fieldChar",text:"",fieldChar:{kind:"separate"}},
    {id:id+":v",kind:"text",text:"0"},
    {id:id+":e",kind:"fieldChar",text:"",fieldChar:{kind:"end"}},
  ]};
}
describe("shared dynamic field projection",()=>{
  function fixture(start=7){
    const target=createEditorParagraph("NEW");
    const ref=scalar("ref",{type:"REF",bookmark:"Target"},"OLD");
    const page=scalar("page",{type:"PAGE"},"1");
    const pageRef=scalar("pageref",{type:"PAGEREF",bookmark:"Target"},"0");
    const sectionField=complex("section"," SECTION ");
    const sectionPages=complex("sectionPages"," SECTIONPAGES ");
    const locked=complex("locked"," SECTION ",true);
    const numPages=scalar("num",{type:"NUMPAGES"},"1");
    const base=createEditorDocument([target]);
    const first=getDocumentSections(base)[0]!;
    return {...base,sections:[first,{...first,id:"second",blocks:[ref,page,pageRef,sectionField,locked],
      header:[sectionPages],footer:[numPages],pageNumbering:{start}}],
      bookmarks:{items:{b:{id:"b",name:"Target",start:{paragraphId:target.id,offset:0},end:{paragraphId:target.id,offset:3}}},order:["b"]}};
  }
  it("projects real page/section and reference values without mutating model runs",()=>{
    const document=fixture();
    const before=JSON.stringify(document);
    const layout=projectDocumentLayout(document);
    expect(layout.pages).toHaveLength(2);
    const p=layout.pages[1]!;
    const values=Object.fromEntries([...p.blocks,...(p.headerBlocks??[]),...(p.footerBlocks??[])].map(b=>[b.sourceBlock.id,b.layout?.text]));
    expect(values).toMatchObject({ref:"NEW",page:"7",pageref:"1",section:"2",locked:"0",sectionPages:"1",num:"2"});
    const block=p.blocks.find(b=>b.sourceBlock.id==="ref")!;
    expect(block.layout?.lines.flatMap(l=>l.fragments).map(f=>f.text).join("")).toBe("NEW");
    expect(block.layout?.endOffset).toBe(3);
    expect(JSON.stringify(document)).toBe(before);
  });
  it("keeps existing projection for length changes and does not leak a stale REF across snapshots",()=>{
    const doc=fixture(12);
    const first=projectDocumentLayout(doc);
    expect(first.pages[1]!.blocks.find(b=>b.sourceBlock.id==="page")?.layout?.text).toBe("2");
    const target=doc.sections![0]!.blocks[0] as EditorParagraphNode;
    const edited={...doc,sections:doc.sections!.map((s,i)=>i===0?{...s,blocks:[{...target,runs:target.runs.map(r=>({...r,text:"ABC"}))}]}:s)};
    const second=projectDocumentLayout(edited);
    expect(second.pages[1]!.blocks.find(b=>b.sourceBlock.id==="ref")?.layout?.text).toBe("ABC");
    expect(first.pages[1]!.blocks.find(b=>b.sourceBlock.id==="ref")?.layout?.text).toBe("NEW");
  });
});
