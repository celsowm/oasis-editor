import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentSections, type EditorLayoutDocument, type EditorParagraphNode } from "@/core/model.js";
import { createDocumentFieldContext } from "@/core/document/fieldDocumentContext.js";
import { evaluateFieldInstruction } from "@/core/document/fieldEvaluation.js";
import { resolveBookmarkReferenceText, insertCrossReference } from "@/core/commands/crossReference.js";

describe("document-backed field context",()=>{
  function fixture(){
    const ps=["Outside","Alpha beta","Middle","Gamma delta","After"].map(text=>createEditorParagraph(text));
    const base=createEditorDocument(ps);
    const section=getDocumentSections(base)[0]!;
    const bookmark={id:"b",name:"Target",start:{paragraphId:ps[1]!.id,offset:6},end:{paragraphId:ps[3]!.id,offset:5}};
    const document={...base,sections:[
      {...section,blocks:ps.slice(0,2)},
      {...section,id:"s2",blocks:ps.slice(2),pageNumbering:{start:7}},
    ],bookmarks:{items:{b:bookmark},order:["b"]}};
    const block=(p:EditorParagraphNode,start=0,end=p.runs.map(r=>r.text).join("").length)=>({
      blockId:p.id,sourceBlockId:p.id,sourceBlock:p,blockType:"paragraph" as const,paragraphId:p.id,globalIndex:0,estimatedHeight:20,
      layout:{paragraphId:p.id,text:p.runs.map(r=>r.text).join("").slice(start,end),fragments:[],lines:[],startOffset:start,endOffset:end},
    });
    const page=(index:number,sectionIndex:number,blocks:ReturnType<typeof block>[])=>({
      id:"page"+index,index,sectionIndex,blocks,height:100,maxHeight:100,pageSettings:section.pageSettings,
    });
    const layout:EditorLayoutDocument={pages:[
      page(0,0,[block(ps[0]!),block(ps[1]!,0,6)]),
      page(1,0,[block(ps[1]!,6)]),
      page(2,1,[block(ps[2]!),block(ps[3]!),block(ps[4]!)]),
    ]};
    return {document,layout,ps,bookmark};
  }
  it("uses actual section counts and restarted display numbering",()=>{
    const {document,layout,ps}=fixture();
    const index=createDocumentFieldContext(document,layout);
    expect(index.forPage(2)).toMatchObject({pageNumber:7,totalPages:3,sectionNumber:2,sectionPages:1});
    expect(index.forPage(1)).toMatchObject({pageNumber:2,totalPages:3,sectionNumber:1,sectionPages:2});
    expect(index.pageIndexAt(ps[1]!.id,6)).toBe(1);
    expect(index.pageIndexAt(ps[1]!.id,5)).toBe(0);
    expect(evaluateFieldInstruction("PAGEREF Target",index.forPage(2),"old").text).toBe("2");
    expect(evaluateFieldInstruction("SECTIONPAGES",index.forPage(1),"old").text).toBe("2");
    expect(evaluateFieldInstruction("PAGE",index.forPosition(ps[3]!.id,1),"old").text).toBe("7");
  });
  it("extracts only the actual bookmark interval, including both endpoints",()=>{
    const {document,layout,bookmark}=fixture();
    const index=createDocumentFieldContext(document,layout);
    expect(index.bookmarkText("Target")).toBe("beta\nMiddle\nGamma");
    expect(index.bookmarkText("Missing")).toBeNull();
    const state=createEditorStateFromDocument(document);
    expect(resolveBookmarkReferenceText(state,bookmark)).toBe("beta\nMiddle\nGamma");
    expect(evaluateFieldInstruction("REF Target",index.forPage(0),"old").text).toBe("beta\nMiddle\nGamma");
    // Current scalar authoring uses a real single-line cached REF when known.
    const target={...bookmark,end:{paragraphId:bookmark.start.paragraphId,offset:10}};
    const simple={...document,bookmarks:{items:{b:target},order:["b"]}};
    const authored=insertCrossReference(createEditorStateFromDocument(simple),{bookmark:"Target"});
    const first=getDocumentSections(authored.document)[0]!.blocks[0] as EditorParagraphNode;
    expect(first.runs.find(r=>r.kind==="field")?.text).toBe("beta");
  });
  it("preserves caches rather than inventing split geometry or continuous-section numbers",()=>{
    const {document,layout,ps}=fixture();
    const stale={pages:layout.pages.map((p,i)=>i===1?{...p,blocks:p.blocks.map(b=>({...b,layout:{...b.layout!,text:"wrong"}}))}:p)};
    expect(createDocumentFieldContext(document,stale).pageIndexAt(ps[1]!.id,6)).toBeUndefined();
    const continuous={...document,sections:document.sections!.map((s,i)=>i===1?{...s,breakType:"continuous" as const}:s)};
    const ctx=createDocumentFieldContext(continuous,layout);
    expect(evaluateFieldInstruction("PAGE",ctx.forPage(2),"old")).toMatchObject({status:"preserved",text:"old"});
    expect(evaluateFieldInstruction("SECTION",ctx.forPosition(ps[3]!.id,1),"old").text).toBe("2");
    expect(createDocumentFieldContext(document).bookmarkPage("Target")).toBeUndefined();
  });
});
