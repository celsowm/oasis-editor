import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,getParagraphText,type EditorDocument,type EditorLayoutDocument,type EditorParagraphNode} from "@/core/model.js";
import {insertTableOfContents,hasTableOfContents,updateTableOfContents} from "@/core/commands/tableOfContents.js";
import {findQualifiedTocRegion} from "@/core/document/tocFields.js";
import {refreshTableOfContentsConvergently,type TocPaginate} from "@/core/document/tocConvergence.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

const fixture=()=>{
  const intro=createEditorParagraph("Prelude");
  const heading=createEditorParagraph("Chapter");
  heading.style={styleId:"heading1"};
  const end=createEditorParagraph("Body content");
  const original=createEditorStateFromDocument(createEditorDocument([intro,heading,end]));
  return {heading,state:insertTableOfContents(original)};
};
const entries=(d:EditorDocument):string[]=>{
  const blocks=getDocumentSections(d)[0]!.blocks,region=findQualifiedTocRegion(blocks)!;
  return blocks.slice(region.startBlockIndex+1,region.endBlockIndex)
    .map(p=>p.type==="paragraph"?getParagraphText(p):"");
};
/** Simulated 1- or 2-page physical pagination built from real measured
 * paragraphs. The actual geometry is still source certified. */
function syntheticPagination(headingId:string,shouldShift:(tocText:string)=>boolean):TocPaginate{
  return (document:EditorDocument):EditorLayoutDocument=>{
    const layout=projectDocumentLayout(document);
    const blocks=layout.pages.flatMap(page=>page.blocks);
    const headingIndex=blocks.findIndex(b=>b.sourceBlock.id===headingId);
    if(headingIndex<0)throw Error("missing heading");
    const template=layout.pages[0]!;
    const shift=shouldShift(entries(document).join("|"));
    if(!shift)return {pages:[{...template,index:0,sectionIndex:0,blocks}]};
    return {pages:[
      {...template,index:0,sectionIndex:0,blocks:blocks.slice(0,headingIndex)},
      {...template,index:1,sectionIndex:0,blocks:blocks.slice(headingIndex)},
    ]};
  };
}
describe("F3B transactional convergent TOC refresh",()=>{
  it("re-paginates when a new entry changes a heading page, then commits once",async()=>{
    const {heading,state}=fixture();
    const previous=JSON.stringify(state.document);
    const selected=JSON.stringify(state.selection);
    const pag=syntheticPagination(heading.id,text=>text.includes("\t1")||text.includes("\t2"));
    const refreshed=refreshTableOfContentsConvergently(state,pag);
    expect(refreshed).toMatchObject({status:"updated",passes:3,updatedEntries:1});
    expect(entries(refreshed.state.document)).toEqual(["Chapter\t2"]);
    expect(refreshed.layout?.pages).toHaveLength(2);
    expect(JSON.stringify(refreshed.state.selection)).toBe(selected);
    expect(JSON.stringify(state.document)).toBe(previous);
    expect(refreshTableOfContentsConvergently(refreshed.state,pag)).toMatchObject({
      status:"unchanged",passes:1,updatedEntries:0,
    });
    const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(refreshed.state.document));
    const restored=getDocumentSections(reopened)[0]!.blocks
      .filter(b=>b.type==="paragraph") as EditorParagraphNode[];
    expect(restored.some(p=>getParagraphText(p)==="Chapter\t2")).toBe(true);
  });
  it("returns original reference for a TOC whose printed pages already agree",()=>{
    const {state}=fixture();
    const updated=updateTableOfContents(state,()=>1);
    const result=refreshTableOfContentsConvergently(updated);
    expect(result.status).toBe("unchanged");
    expect(result.passes).toBe(1);
    expect(result.state).toBe(updated);
  });
  it("rolls back oscillating pagination without exposing speculative changes",()=>{
    const {heading,state}=fixture();
    const saved=JSON.stringify(state);
    const pag=syntheticPagination(heading.id,text=>text.includes("\t1"));
    const outcome=refreshTableOfContentsConvergently(state,pag);
    expect(outcome.status).toBe("nonconvergent");
    expect(outcome.state).toBe(state);
    expect(JSON.stringify(state)).toBe(saved);
  });
  it("rolls back on pass-budget exhaustion",()=>{
    const {heading,state}=fixture();
    const pag=syntheticPagination(heading.id,text=>text.includes("\t1")||text.includes("\t2"));
    expect(refreshTableOfContentsConvergently(state,pag,2)).toMatchObject({
      status:"nonconvergent",passes:2,state,
    });
  });
  it("does not erase results when heading pagination is unresolved",()=>{
    const {state}=fixture();
    const withLabels=updateTableOfContents(state,()=>4);
    const original=JSON.stringify(withLabels.document);
    const section=getDocumentSections(withLabels.document)[0]!;
    const roman={...withLabels,document:{...withLabels.document,sections:[
      {...section,pageNumbering:{start:1,format:"upperRoman"}},
    ]}};
    const result=refreshTableOfContentsConvergently(roman);
    expect(result.status).toBe("unresolved");
    expect(result.state).toBe(roman);
    expect(entries(result.state.document)).toEqual(["Chapter\t4"]);
    expect(JSON.stringify(withLabels.document)).toBe(original);
  });
  it("refuses unqualified fields and an active selection inside generated TOC entries",()=>{
    const {state}=fixture();
    const section=getDocumentSections(state.document)[0]!;
    const region=findQualifiedTocRegion(section.blocks)!;
    const entry=section.blocks[region.startBlockIndex+1] as EditorParagraphNode;
    const selected={...state,selection:{
      anchor:{paragraphId:entry.id,runId:entry.runs[0]!.id,offset:0},
      focus:{paragraphId:entry.id,runId:entry.runs[0]!.id,offset:0},
    }};
    expect(refreshTableOfContentsConvergently(selected)).toMatchObject({
      // The first certified layout must be measured before knowing whether
      // any existing TOC entry would be replaced.
      status:"unsupported",passes:1,state:selected,
    });
    const begin=section.blocks[region.startBlockIndex] as EditorParagraphNode;
    const locked={...state,document:{...state.document,sections:[{
      ...section,blocks:section.blocks.map(p=>p.id===begin.id&&p.type==="paragraph"?{
        ...p,runs:p.runs.map(r=>r.kind==="fieldChar"&&r.fieldChar.kind==="begin"
          ?{...r,fieldChar:{...r.fieldChar,fieldLock:true}}:r),
      }:p),
    }]}};
    expect(hasTableOfContents(locked)).toBe(false);
    expect(refreshTableOfContentsConvergently(locked)).toMatchObject({
      status:"unsupported",passes:0,state:locked,
    });
  });
  it("rolls back a measurement exception without committing intermediate entries",()=>{
    const {state}=fixture();
    let calls=0;
    const paginate:TocPaginate=document=>{
      if(++calls===2)throw Error("measurement failed");
      return projectDocumentLayout(document);
    };
    const result=refreshTableOfContentsConvergently(state,paginate);
    expect(result.status).toBe("unsupported");
    expect(result.state).toBe(state);
    expect(calls).toBe(2);
  });
});
