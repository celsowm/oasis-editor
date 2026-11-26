import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,getParagraphText,paragraphOffsetToPosition} from "@/core/model.js";
import {markIndexEntry,insertIndex,updateIndex} from "@/core/commands/indexEntries.js";
import {collectXeOccurrences} from "@/core/document/xeEntries.js";
import {findQualifiedIndexRegion} from "@/core/document/indexRefresh.js";
function fixture(){
  const p=createEditorParagraph("Contratos");
  const state=createEditorStateFromDocument(createEditorDocument([p]));
  const pos=paragraphOffsetToPosition(p,9);
  return {...state,selection:{anchor:pos,focus:pos}};
}
describe("F4B4A index authoring core",()=>{
  it("marks a hidden XE and inserts a converged INDEX without changing visible source or selection",()=>{
    const state=fixture(),before=JSON.stringify(state);
    const marked=markIndexEntry(state,{path:["Contratos","Licitação"],boldPage:true});
    expect(marked).not.toBe(state);
    expect(collectXeOccurrences(marked.document)?.map(e=>[e.path,e.offset,e.boldPage])).toEqual([[["Contratos","Licitação"],9,true]]);
    const inserted=insertIndex(marked,{locale:"pt-BR"});
    expect(inserted).not.toBe(marked);
    const blocks=getDocumentSections(inserted.document)[0]!.blocks;
    const region=findQualifiedIndexRegion(blocks)!;
    expect(blocks.slice(region.start+1,region.end).filter(b=>b.type==="paragraph").map(getParagraphText)).toEqual(["Contratos","Licitação, 1"]);
    expect(inserted.selection).toBe(state.selection);
    expect(updateIndex(inserted)).toBe(inserted);
    expect(insertIndex(inserted,{locale:"pt-BR"})).toBe(inserted);
    expect(JSON.stringify(state)).toBe(before);
  });
  it("rejects unsupported labels and rolls back incomplete insertion",()=>{
    const state=fixture();
    expect(markIndexEntry(state,{path:["a:b"]})).toBe(state);
    expect(insertIndex(state,{locale:"pt-BR"})).toBe(state);
    const marked=markIndexEntry(state,{path:["Contratos"]});
    expect(insertIndex(marked,{locale:"pt-BR"},()=>{throw Error("layout");})).toBe(marked);
    expect(insertIndex(marked,{locale:"invalid!"})).toBe(marked);
  });
});
