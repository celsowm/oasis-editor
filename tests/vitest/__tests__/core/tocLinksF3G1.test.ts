import {describe,expect,it} from "vitest";
import JSZip from "jszip";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,getParagraphText,type EditorState} from "@/core/model.js";
import {insertTableOfContents,updateTableOfContents} from "@/core/commands/tableOfContents.js";
import {findQualifiedTocRegion} from "@/core/document/tocFields.js";
import {linkQualifiedTableOfContents} from "@/core/document/tocLinks.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

const fixture=()=>{
  const title=createEditorParagraph("Introduction");
  title.style={styleId:"heading1"};
  const sub=createEditorParagraph("Details");
  sub.style={styleId:"heading2"};
  const state=insertTableOfContents(createEditorStateFromDocument(createEditorDocument([title,sub])),()=>1);
  return {state,title,sub};
};
const entries=(s:EditorState)=>{
  const blocks=getDocumentSections(s.document)[0]!.blocks,region=findQualifiedTocRegion(blocks)!;
  return blocks.slice(region.startBlockIndex+1,region.endBlockIndex).filter(b=>b.type==="paragraph");
};
describe("F3G1 linked flat TOC staging",()=>{
  it("adds unique hidden bookmark targets and internal links without changing offsets or selection",async()=>{
    const {state,title,sub}=fixture();
    const before=JSON.stringify(state);
    const result=linkQualifiedTableOfContents(state);
    expect(result.status).toBe("updated");
    expect(result.state.selection).toBe(state.selection);
    expect(entries(result.state).map(p=>[p.id,p.runs[0]!.id,getParagraphText(p)]))
      .toEqual(entries(state).map(p=>[p.id,p.runs[0]!.id,getParagraphText(p)]));
    const bookmarks=result.state.document.bookmarks!;
    expect(bookmarks.order).toHaveLength(2);
    const links=entries(result.state).map(p=>p.runs[0]!.styles?.link);
    expect(new Set(links).size).toBe(2);
    for(const [i,p] of [title,sub].entries()){
      const bm=bookmarks.items[bookmarks.order[i]!]!;
      expect(bm).toMatchObject({hidden:true,start:{paragraphId:p.id,offset:0},
        end:{paragraphId:p.id,offset:getParagraphText(p).length}});
      expect(links[i]).toBe("#"+bm.name);
    }
    expect(linkQualifiedTableOfContents(result.state)).toMatchObject({status:"unchanged",state:result.state});
    expect(JSON.stringify(state)).toBe(before);
    const buffer=await exportEditorDocumentToDocx(result.state.document);
    const zip=await JSZip.loadAsync(buffer);
    const xml=await zip.file("word/document.xml")!.async("string");
    for(const bm of Object.values(bookmarks.items)){
      expect(xml).toContain('w:name="'+bm.name+'"');
      expect(xml).toContain('w:anchor="'+bm.name+'"');
    }
    const imported=await importDocxToEditorDocument(buffer);
    const importedLinks=getDocumentSections(imported)[0]!.blocks.flatMap(b=>b.type==="paragraph"
      ?b.runs.flatMap(r=>r.styles?.link?[r.styles.link]:[]):[]);
    for(const link of links)expect(importedLinks).toContain(link);
    expect(Object.values(imported.bookmarks!.items).map(b=>"#"+b.name)).toEqual(links);
  });
  it("preserves stale caches and rolls back when the candidate cannot be measured",()=>{
    const {state}=fixture();
    const stale=updateTableOfContents(state,()=>2);
    expect(linkQualifiedTableOfContents(stale)).toMatchObject({status:"unsupported",state:stale});
    let calls=0;
    const result=linkQualifiedTableOfContents(state,doc=>{
      if(++calls===2)throw Error("candidate measurement failed");
      return projectDocumentLayout(doc);
    });
    expect(result).toMatchObject({status:"unsupported",state});
    expect(calls).toBe(2);
  });
  it("does not let plain refresh erase existing entry links",()=>{
    const linked=linkQualifiedTableOfContents(fixture().state).state;
    expect(updateTableOfContents(linked,()=>2)).toBe(linked);
  });
});
