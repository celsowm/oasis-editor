import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections} from "@/core/model.js";
import {insertTableOfContents} from "@/core/commands/tableOfContents.js";
import {refreshLinkedTableOfContents} from "@/core/document/tocLinks.js";
import {findQualifiedTocRegion} from "@/core/document/tocFields.js";
import {resolveTocLinkNavigation} from "@/core/document/tocLinkNavigation.js";

const fixture=()=>{
  const intro=createEditorParagraph("Body"),title=createEditorParagraph("Heading");
  title.style={styleId:"heading1"};
  const state=refreshLinkedTableOfContents(insertTableOfContents(
    createEditorStateFromDocument(createEditorDocument([intro,title])))).state;
  const blocks=getDocumentSections(state.document)[0]!.blocks;
  const region=findQualifiedTocRegion(blocks)!;
  return {state,title,entry:blocks[region.startBlockIndex+1]!};
};
describe("F3G3 internal TOC link navigation",()=>{
  it("moves only the caret to the bookmark destination",()=>{
    const {state,title,entry}=fixture();
    const next=resolveTocLinkNavigation(state,entry.id,1);
    expect(next?.document).toBe(state.document);
    expect(next?.selection.anchor.paragraphId).toBe(title.id);
    expect(next?.selection.focus).toEqual(next?.selection.anchor);
    expect(next?.activeZone).toBe("main");
  });
  it("rejects absent and ambiguous targets, wrong source and out-of-range hit",()=>{
    const {state,title,entry}=fixture();
    expect(resolveTocLinkNavigation(state,title.id,1)).toBeUndefined();
    expect(resolveTocLinkNavigation(state,entry.id,9999)).toBeUndefined();
    expect(resolveTocLinkNavigation({...state,document:{...state.document,bookmarks:undefined}},entry.id,1)).toBeUndefined();
    const registry=state.document.bookmarks!,bm=registry.items[registry.order[0]!]!;
    const ambiguous={...state,document:{...state.document,bookmarks:{items:{...registry.items,
      duplicate:{...bm,id:"duplicate"}},order:[...registry.order,"duplicate"]}}};
    expect(resolveTocLinkNavigation(ambiguous,entry.id,1)).toBeUndefined();
  });
});
