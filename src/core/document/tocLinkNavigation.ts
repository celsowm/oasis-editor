import type {EditorState} from "@/core/model.js";
import {getDocumentSections,getParagraphLength,paragraphOffsetToPosition} from "@/core/model.js";
import {findQualifiedTocRegion} from "./tocFields.js";

/** Resolve a flat TOC entry to one certified main-story bookmark target.
 * The returned state changes only navigation/selection, never document data.
 */
export function resolveTocLinkNavigation(
  state:EditorState,paragraphId:string,offset:number,
):EditorState|undefined{
  if(!Number.isInteger(offset)||offset<0)return undefined;
  const sections=getDocumentSections(state.document);
  const candidates=sections.flatMap(s=>{
    const region=findQualifiedTocRegion(s.blocks);
    return region?.hyperlinks?s.blocks.slice(region.startBlockIndex+1,region.endBlockIndex)
      .filter(b=>b.id===paragraphId&&b.type==="paragraph"):[];
  });
  if(candidates.length!==1)return undefined;
  const entry=candidates[0]!;
  if(entry.type!=="paragraph"||offset>getParagraphLength(entry))return undefined;
  const link=entry.runs[0]?.styles?.link;
  if(!link?.startsWith("#")||link.length<2)return undefined;
  const registry=state.document.bookmarks;
  if(!registry)return undefined;
  const name=link.slice(1);
  const matches=Object.values(registry.items).filter(b=>b.name.toLowerCase()===name.toLowerCase());
  if(matches.length!==1)return undefined;
  const bm=matches[0]!;
  if(bm.name!==name||!bm.start||!bm.end||!registry.order.includes(bm.id)||
     bm.start.paragraphId!==bm.end.paragraphId||bm.start.paragraphId===paragraphId||
     bm.colFirst!==undefined||bm.colLast!==undefined)return undefined;
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
