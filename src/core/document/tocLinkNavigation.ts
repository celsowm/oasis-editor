import type {EditorState} from "@/core/model.js";
import {getDocumentSections,getParagraphLength,getParagraphText,paragraphOffsetToPosition} from "@/core/model.js";
import {collectQualifiedTocHeadings} from "@/core/commands/tableOfContents.js";
import type {TcOccurrence} from "./tcEntries.js";
import {findQualifiedTocRegion} from "./tocFields.js";
import {resolveNestedTocLink} from "./tocNestedPageRefs.js";

/** Resolve a flat or imported nested TOC entry to one main-story bookmark target.
 * The returned state changes only navigation/selection, never document data.
 */
export function resolveTocLinkNavigation(
  state:EditorState,paragraphId:string,offset:number,
):EditorState|undefined{
  if(!Number.isInteger(offset)||offset<0)return undefined;
  const sections=getDocumentSections(state.document);
  const candidates=sections.flatMap((s,i)=>s.blocks.filter(b=>b.id===paragraphId&&b.type==="paragraph")
    .map(p=>({p,i})));
  if(candidates.length!==1)return undefined;
  const {p:entry,i:sourceSection}=candidates[0]!;
  if(entry.type!=="paragraph"||offset>getParagraphLength(entry))return undefined;
  const blocks=sections[sourceSection]!.blocks;
  const region=findQualifiedTocRegion(blocks);
  let name:string,excluded:Set<string>,tc:TcOccurrence|undefined;
  if(region?.hyperlinks&&blocks.slice(region.startBlockIndex+1,region.endBlockIndex).some(b=>b.id===paragraphId)){
    const link=entry.runs[0]?.styles?.link;
    if(!link?.startsWith("#")||link.length<2)return undefined;
    name=link.slice(1);
    if(region.tcIdentifier!==undefined){
      const headings=collectQualifiedTocHeadings(state,region);
      const cached=blocks.slice(region.startBlockIndex+1,region.endBlockIndex);
      const heading=headings?.[cached.findIndex(b=>b.id===paragraphId)];
      if(!heading?.tc||headings?.length!==cached.length)return undefined;
      const text=getParagraphText(entry);
      if(heading.tc.omitPageNumber?text!==heading.text:!text.startsWith(heading.text+"\t"))return undefined;
      tc=heading.tc;
    }
    excluded=new Set(blocks.slice(region.startBlockIndex,region.endBlockIndex+1).map(b=>b.id));
  }else{
    const nested=resolveNestedTocLink(state,sourceSection,paragraphId,offset);
    if(!nested)return undefined;
    ({name,excluded}=nested);
  }
  const registry=state.document.bookmarks;
  if(!registry)return undefined;
  const matches=Object.values(registry.items).filter(b=>b.name.toLowerCase()===name.toLowerCase());
  if(matches.length!==1)return undefined;
  const bm=matches[0]!;
  if(bm.name!==name||!bm.start||!bm.end||!registry.order.includes(bm.id)||
     bm.start.paragraphId!==bm.end.paragraphId||excluded.has(bm.start.paragraphId)||
     bm.colFirst!==undefined||bm.colLast!==undefined)return undefined;
  if(tc&&(!bm.hidden||bm.start.paragraphId!==tc.paragraphId||
    bm.start.offset!==tc.offset||bm.end.offset!==tc.offset))return undefined;
  const targets=sections.flatMap((s,i)=>s.blocks.filter(b=>b.id===bm.start!.paragraphId&&b.type==="paragraph")
    .map(p=>({p,i})));
  if(targets.length!==1)return undefined;
  const {p,i}=targets[0]!;
  if(p.type!=="paragraph"||!Number.isInteger(bm.start.offset)||!Number.isInteger(bm.end.offset)||
    bm.start.offset<0||bm.end.offset<bm.start.offset||bm.end.offset>getParagraphLength(p))return undefined;
  const position=paragraphOffsetToPosition(p,bm.start.offset);
  return {...state,activeZone:"main",activeFootnoteId:undefined,activeSectionIndex:i,
    selection:{anchor:position,focus:position}};
}
