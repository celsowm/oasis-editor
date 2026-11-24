import type {EditorDocument,EditorLayoutDocument,EditorState} from "@/core/model.js";
import {getActiveSectionIndex,getActiveZone,getDocumentSections} from "@/core/model.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {collectTocHeadings,DEFAULT_TOC_MAX_LEVEL,updateTableOfContents} from "@/core/commands/tableOfContents.js";
import {createTocPageNumberResolver,findQualifiedTocRegion} from "./tocFields.js";

export type TocPaginate=(document:EditorDocument)=>EditorLayoutDocument;
export type TocConvergenceStatus="unchanged"|"updated"|"unsupported"|"unresolved"|"nonconvergent";
export interface TocConvergenceResult {
  state:EditorState;
  /** Layout of exactly the returned state, never a discarded candidate. */
  layout?:EditorLayoutDocument;
  status:TocConvergenceStatus;
  passes:number;
  updatedEntries:number;
}
export const MAX_TOC_CONVERGENCE_PASSES=6;

/** A pure, all-or-nothing TOC refresh. On each pass it paginates the current
 * candidate, resolves the *printed* page for every qualified heading, then
 * regenerates the flat TOC. It commits only when a subsequent page measurement
 * agrees with every cached label. Any missing page, oscillation, unqualified
 * field or exhausted pass budget returns the original EditorState object.
 *
 * The caller must apply the returned state in ONE undo/redo transaction.
 * No mutations, UI actions, clock or global caches occur here.
 */
export function refreshTableOfContentsConvergently(
  original:EditorState,
  paginate:TocPaginate=projectDocumentLayout,
  maxPasses=MAX_TOC_CONVERGENCE_PASSES,
  maxLevel=DEFAULT_TOC_MAX_LEVEL,
):TocConvergenceResult{
  const result=(status:TocConvergenceStatus,passes:number,layout?:EditorLayoutDocument):TocConvergenceResult=>
    ({state:original,layout,status,passes,updatedEntries:0});
  if(getActiveZone(original)!=="main"||original.trackChangesEnabled||
     !Number.isSafeInteger(maxPasses)||maxPasses<1||
     !Number.isSafeInteger(maxLevel)||maxLevel<1||maxLevel>9)return result("unsupported",0);
  const allowedPasses=Math.min(maxPasses,MAX_TOC_CONVERGENCE_PASSES);
  const sectionIndex=getActiveSectionIndex(original);
  const sections=getDocumentSections(original.document);
  const section=sections[sectionIndex];
  if(!section)return result("unsupported",0);
  const region=findQualifiedTocRegion(section.blocks);
  if(!region)return result("unsupported",0);
  const beginId=section.blocks[region.startBlockIndex]!.id;
  const endId=section.blocks[region.endBlockIndex]!.id;
  const oldEntryIds=new Set(section.blocks.slice(region.startBlockIndex+1,region.endBlockIndex).map(b=>b.id));
  const headers=collectTocHeadings(original,Math.min(maxLevel,region.endLevel))
    .filter(h=>h.level>=region.startLevel);
  if(headers.length>2048)return result("unsupported",0);
  const initialSignature=JSON.stringify(headers.map(h=>[h.id,h.level,h.text]));
  const seen=new Set<string>();
  let current=original;
  let initialLayout:EditorLayoutDocument|undefined;
  for(let pass=1;pass<=allowedPasses;pass++){
    let layout:EditorLayoutDocument;
    try{layout=paginate(current.document);}
    catch{return result("unsupported",pass,initialLayout);}
    initialLayout??=layout;
    const blocks=getDocumentSections(current.document)[sectionIndex]?.blocks;
    const active=blocks&&findQualifiedTocRegion(blocks);
    if(!blocks||!active||blocks[active.startBlockIndex]?.id!==beginId||
       blocks[active.endBlockIndex]?.id!==endId)return result("unsupported",pass,initialLayout);
    const headings=collectTocHeadings(current,Math.min(maxLevel,active.endLevel))
      .filter(h=>h.level>=active.startLevel);
    if(JSON.stringify(headings.map(h=>[h.id,h.level,h.text]))!==initialSignature)
      return result("unsupported",pass,initialLayout);
    const resolver=createTocPageNumberResolver(current.document,layout);
    const pages=headings.map(h=>resolver(h.id));
    if(pages.some(p=>p===undefined))return result("unresolved",pass,initialLayout);
    const candidate=updateTableOfContents(current,resolver,maxLevel);
    if(candidate===current){
      return {state:current===original?original:{...current,selection:original.selection},
        layout,status:current===original?"unchanged":"updated",passes:pass,
        updatedEntries:current===original?0:headings.length};
    }
    // A no-op is always safe. Reject a real edit if an active selection would
    // lose its original cached-result run identity during replacement.
    if(oldEntryIds.has(original.selection.anchor.paragraphId)||
       oldEntryIds.has(original.selection.focus.paragraphId))
      return result("unsupported",pass,initialLayout);
    const signature=JSON.stringify([headings.map((h,i)=>[h.id,h.text,pages[i]]),
      layout.pages.map(p=>[p.index,p.sectionIndex])]);
    if(seen.has(signature))return result("nonconvergent",pass,initialLayout);
    seen.add(signature);
    // The newly generated entries may change pagination, so the candidate
    // remains provisional until the NEXT measurement reaches a fixed point.
    current={...candidate,selection:original.selection};
  }
  return result("nonconvergent",allowedPasses,initialLayout);
}
