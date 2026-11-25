import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,getParagraphText,type EditorState,type EditorBlockNode} from "@/core/model.js";
import {insertTableOfContents} from "@/core/commands/tableOfContents.js";
import {findQualifiedTocRegion} from "@/core/document/tocFields.js";
import {linkQualifiedTableOfContents,refreshLinkedTableOfContents} from "@/core/document/tocLinks.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";

const heading=(text:string)=>{
  const p=createEditorParagraph(text);p.style={styleId:"heading1"};return p;
};
const fixture=()=>{
  const intro=createEditorParagraph("Body");
  const a=heading("Alpha"),b=heading("Bravo");
  const plain=insertTableOfContents(createEditorStateFromDocument(createEditorDocument([intro,a,b])),()=>1);
  const linked=linkQualifiedTableOfContents(plain);
  expect(linked.status).toBe("updated");
  return {state:linked.state,a,b};
};
const blocks=(s:EditorState)=>getDocumentSections(s.document)[0]!.blocks;
const entries=(s:EditorState)=>{
  const region=findQualifiedTocRegion(blocks(s))!;
  return blocks(s).slice(region.startBlockIndex+1,region.endBlockIndex).filter(p=>p.type==="paragraph");
};
const links=(s:EditorState)=>entries(s).map(p=>p.runs[0]!.styles?.link);
const replace=(s:EditorState,next:EditorBlockNode[]):EditorState=>({...s,document:{...s.document,
  sections:[{...getDocumentSections(s.document)[0]!,blocks:next}]}});

describe("F3G2 linked TOC transactional regeneration",()=>{
  it("reuses heading targets after rename and reorder, and does not add bookmarks on no-op",()=>{
    const {state,a,b}=fixture(),old=links(state);
    // Same-length rename keeps existing bookmark offsets valid.
    const renamed={...a,runs:[{...a.runs[0]!,text:"Gamma"}]};
    const edited=replace(state,[...blocks(state).filter(p=>p.id!==a.id&&p.id!==b.id),b,renamed]);
    const snapshot=JSON.stringify(edited);
    const result=refreshLinkedTableOfContents(edited);
    expect(result.status).toBe("updated");
    expect(entries(result.state).map(getParagraphText)).toEqual(["Bravo\t1","Gamma\t1"]);
    expect(links(result.state)).toEqual([old[1],old[0]]);
    expect(result.state.document.bookmarks!.order).toEqual(state.document.bookmarks!.order);
    expect(result.state.selection).toBe(edited.selection);
    expect(refreshLinkedTableOfContents(result.state)).toMatchObject({status:"unchanged",state:result.state});
    expect(JSON.stringify(edited)).toBe(snapshot);
  });
  it("repairs a deleted owned target and links a newly inserted heading",()=>{
    const {state,a,b}=fixture(),old=links(state),c=heading("Charlie");
    const registry=state.document.bookmarks!;
    const retained=Object.values(registry.items).find(bm=>bm.start?.paragraphId===a.id)!;
    const edited=replace({...state,document:{...state.document,bookmarks:{
      items:{[retained.id]:retained},order:[retained.id],
    }}},[...blocks(state).filter(p=>p.id!==b.id),c]);
    const result=refreshLinkedTableOfContents(edited);
    expect(result.status).toBe("updated");
    expect(entries(result.state).map(getParagraphText)).toEqual(["Alpha\t1","Charlie\t1"]);
    expect(links(result.state)[0]).toBe(old[0]);
    expect(links(result.state)[1]).not.toBe(old[1]);
    expect(result.state.document.bookmarks!.order).toHaveLength(2);
    for(const bm of Object.values(result.state.document.bookmarks!.items))expect(bm.name.length).toBeLessThanOrEqual(40);
  });
  it("preserves foreign links and rolls back on measurement failure",()=>{
    const {state,a}=fixture();
    const first=entries(state)[0]!;
    const foreign=replace(state,blocks(state).map(p=>p.id===first.id?
      {...first,runs:[{...first.runs[0]!,styles:{link:"https://example.org"}}]}:p));
    expect(refreshLinkedTableOfContents(foreign)).toMatchObject({status:"unsupported",state:foreign});
    const edited=replace(state,blocks(state).map(p=>p.id===a.id?{...a,runs:[{...a.runs[0]!,text:"Gamma"}]}:p));
    const result=refreshLinkedTableOfContents(edited,doc=>{
      // Plain candidates may converge, but the linked result cannot be committed.
      const s={...edited,document:doc};
      if(entries(s).some(p=>getParagraphText(p)==="Gamma\t1"&&p.runs[0]!.styles?.link))throw Error("failed");
      return projectDocumentLayout(doc);
    });
    expect(result).toMatchObject({status:"unsupported",state:edited});
  });
});
