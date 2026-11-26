import type {EditorBookmark,EditorState,EditorLayoutDocument,EditorParagraphNode} from "@/core/model.js";
import {getActiveSectionIndex,getActiveZone,getDocumentSections,getParagraphText,getParagraphLength} from "@/core/model.js";
import {createEditorBookmarkId} from "@/core/editorState.js";
import {collectQualifiedTocHeadings,tocEntryText,type TocHeading} from "@/core/commands/tableOfContents.js";
import {createDocumentFieldContext} from "./fieldDocumentContext.js";
import {createTocPageNumberResolver,findQualifiedTocRegion} from "./tocFields.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {refreshTableOfContentsConvergently,type TocPaginate,type TocConvergenceResult} from "./tocConvergence.js";

// Accept the earlier staging prefix for compatibility, but author names
// under Word’s 40-character limit (9-character prefix + 30 hex digits).
const isOwnedTocName=(name:string)=>/^_TocOasis(?:[0-9a-f]{30}|[0-9a-f]{32})$/.test(name);

export interface TocLinkResult {
  state:EditorState;
  status:"updated"|"unchanged"|"unsupported"|"unresolved";
  layout?:EditorLayoutDocument;
}

/** Qualify an already-current flat TOC before adding internal links.
 * Preserve paragraph/run identities and text offsets. Re-measure after adding
 * links; do not publish a candidate whose page labels no longer match.
 * This is an opt-in staging API, not a Ribbon command or automatic refresh.
 */
export function linkQualifiedTableOfContents(
  original:EditorState,paginate:TocPaginate=projectDocumentLayout,
):TocLinkResult{
  const fail=(status:TocLinkResult["status"],layout?:EditorLayoutDocument):TocLinkResult=>
    ({state:original,status,layout});
  if(getActiveZone(original)!=="main"||original.trackChangesEnabled)return fail("unsupported");
  const index=getActiveSectionIndex(original),sections=getDocumentSections(original.document);
  const section=sections[index];
  if(!section)return fail("unsupported");
  const region=findQualifiedTocRegion(section.blocks);
  if(!region?.hyperlinks)return fail("unsupported");
  const headings=collectQualifiedTocHeadings(original,region);
  const entries=section.blocks.slice(region.startBlockIndex+1,region.endBlockIndex);
  if(!headings||headings.length>2048||entries.length!==headings.length)return fail("unsupported");
  const body=new Map<string,EditorParagraphNode>();
  for(const s of sections)for(const block of s.blocks){
    if(block.type!=="paragraph")continue;
    if(body.has(block.id))return fail("unsupported");
    body.set(block.id,block);
  }
  const registry=original.document.bookmarks;
  const items={...registry?.items},order=[...registry?.order??[]];
  if(new Set(order).size!==order.length||order.length!==Object.keys(items).length||
    order.some(id=>!Object.hasOwn(items,id)||items[id]?.id!==id))return fail("unsupported");
  const names=new Map<string,EditorBookmark|null>();
  for(const bm of Object.values(items)){
    const key=bm.name.toLowerCase();
    names.set(key,names.has(key)?null:bm);
  }
  let before:EditorLayoutDocument;
  try{before=paginate(original.document);}catch{return fail("unsupported");}
  const resolve=createTocPageNumberResolver(original.document,before);
  const pages=headings.map(h=>resolve(h.id,h.tc));
  if(pages.some(p=>p===undefined))return fail("unresolved",before);
  const geometry=region.tcIdentifier!==undefined?createDocumentFieldContext(original.document,before):undefined;
  const matches=(bookmark:EditorBookmark|null|undefined,p:EditorParagraphNode,h:TocHeading):boolean=>
    !!bookmark&&bookmark.hidden===true&&bookmark.colFirst===undefined&&bookmark.colLast===undefined&&
    bookmark.start?.paragraphId===p.id&&bookmark.start.offset===(h.tc?.offset??0)&&
    bookmark.end?.paragraphId===p.id&&bookmark.end.offset===(h.tc?.offset??getParagraphLength(p));
  let changed=false;
  const replacements=new Map<string,EditorParagraphNode>();
  for(const [i,heading] of headings.entries()){
    const entry=entries[i],target=body.get(heading.id);
    if(!entry||entry.type!=="paragraph"||!target||target===entry||
      target.sdtWrappers?.length||target.numberingRevision||target.dropCap||
      target.runs.some(r=>r.revision||r.revisionRangeMarker||r.sdtWrappers?.length||r.styles?.rtl||
        (r.kind==="text"?!!r.styles?.hidden:
          !heading.tc||r.text.length!==0||(r.kind!=="fieldChar"&&r.kind!=="fieldInstruction")))||
      /[\r\n\t]/.test(heading.text)||getParagraphText(entry)!==tocEntryText(heading,pages[i]))
      return fail("unsupported",before);
    if(heading.tc){
      const offset=heading.tc.offset;
      if(!Number.isSafeInteger(offset)||offset<0||offset>getParagraphLength(target))return fail("unsupported",before);
      const page=geometry?.pageIndexAt(target.id,offset);
      if(page===undefined||geometry?.forPage(page).sectionNumber!==heading.tc.sectionIndex+1)
        return fail("unresolved",before);
    }
    const run=entry.runs[0]!;
    const link=run.styles?.link;
    if(link){
      if(!link.startsWith("#")||!matches(names.get(link.slice(1).toLowerCase()),target,heading)||
        names.get(link.slice(1).toLowerCase())?.name!==link.slice(1))return fail("unsupported",before);
      continue;
    }
    let bookmark=Object.values(items).find(bm=>isOwnedTocName(bm.name)&&
      names.get(bm.name.toLowerCase())===bm&&matches(bm,target,heading));
    if(!bookmark){
      const id=createEditorBookmarkId();
      const name="_TocOasis"+id.replace(/^bookmark:/,"").replace(/-/g,"").slice(0,30);
      if(!isOwnedTocName(name)||Object.hasOwn(items,id)||names.has(name.toLowerCase()))
        return fail("unsupported",before);
      // TC is an invisible marker: use a collapsed range at its exact
      // visible UTF-16 offset. Co-located markers share a navigation point.
      bookmark={id,name,hidden:true,start:{paragraphId:target.id,offset:heading.tc?.offset??0},
        end:{paragraphId:target.id,offset:heading.tc?.offset??getParagraphLength(target)}};
      items[id]=bookmark;order.push(id);names.set(name.toLowerCase(),bookmark);
    }
    replacements.set(entry.id,{...entry,runs:[{...run,styles:{...run.styles,link:"#"+bookmark.name}}]});
    changed=true;
  }
  if(!changed)return fail("unchanged",before);
  const nextSections=sections.map((s,i)=>i!==index?s:{...s,blocks:s.blocks.map(b=>replacements.get(b.id)??b)});
  const document={...original.document,sections:nextSections,bookmarks:{items,order}};
  let after:EditorLayoutDocument;
  try{after=paginate(document);}catch{return fail("unsupported",before);}
  const verify=createTocPageNumberResolver(document,after);
  if(headings.some((h,i)=>verify(h.id,h.tc)!==pages[i]))return fail("unresolved",before);
  if(region.tcIdentifier!==undefined){
    const afterGeometry=createDocumentFieldContext(document,after);
    if(headings.some(h=>{
      if(!h.tc)return false;
      const page=afterGeometry.pageIndexAt(h.id,h.tc.offset);
      return page===undefined||afterGeometry.forPage(page).sectionNumber!==h.tc.sectionIndex+1;
    }))return fail("unresolved",before);
  }
  return {state:{...original,document},status:"updated",layout:after};
}


/** Regenerate owned flat linked TOCs transactionally.
 * First accept a certified current cache; otherwise remove only owned links
 * on a provisional snapshot, converge plain labels, then reattach targets
 * and remeasure. No intermediate state enters history. Foreign/ambiguous
 * links and ranges anchored in replaced entries are not rewritten.
 */
export function refreshLinkedTableOfContents(
  original:EditorState,paginate:TocPaginate=projectDocumentLayout,
):TocConvergenceResult{
  let passes=0;
  const measure:TocPaginate=doc=>{passes++;return paginate(doc);};
  const fail=(status:TocConvergenceResult["status"]):TocConvergenceResult=>
    ({state:original,status,passes,updatedEntries:0});
  if(getActiveZone(original)!=="main"||original.trackChangesEnabled)return fail("unsupported");
  const index=getActiveSectionIndex(original),sections=getDocumentSections(original.document);
  const section=sections[index],region=section&&findQualifiedTocRegion(section.blocks);
  if(!section||!region?.hyperlinks)return fail("unsupported");
  const entries=section.blocks.slice(region.startBlockIndex+1,region.endBlockIndex);
  const existing=linkQualifiedTableOfContents(original,measure);
  if(existing.status==="unchanged")return {...existing,passes,updatedEntries:0};
  if(existing.status==="updated")return {...existing,passes,updatedEntries:entries.length};
  if(existing.status==="unresolved")return fail("unresolved");

  // A stale entry's owned bookmark may have been removed by a legitimate
  // heading deletion. Missing owned targets are repairable; ambiguous names,
  // foreign links or malformed surviving targets are not.
  const bookmarks=Object.values(original.document.bookmarks?.items??{});
  const replacements=new Map<string,EditorParagraphNode>();
  for(const entry of entries){
    if(entry.type!=="paragraph")return fail("unsupported");
    const run=entry.runs[0]!,link=run.styles?.link;
    if(!link)continue;
    if(!link.startsWith("#")||!isOwnedTocName(link.slice(1)))return fail("unsupported");
    const matching=bookmarks.filter(b=>b.name.toLowerCase()===link.slice(1).toLowerCase());
    if(matching.length>1||matching.some(b=>b.name!==link.slice(1)||!b.hidden||
      b.colFirst!==undefined||b.colLast!==undefined))return fail("unsupported");
    const {link:_link,...styles}=run.styles!;
    replacements.set(entry.id,{...entry,runs:[{...run,styles}]});
  }
  const entryIds=new Set(entries.map(b=>b.id));
  // Bookmarks into cache entries must not be orphaned by replacing blocks.
  if(bookmarks.some(b=>[b.start,b.end].some(a=>a&&entryIds.has(a.paragraphId))))
    return fail("unsupported");
  const staged:EditorState=replacements.size?{...original,document:{...original.document,
    sections:sections.map((s,i)=>i===index?{...s,blocks:s.blocks.map(b=>replacements.get(b.id)??b)}:s),
  }}:original;
  const plain=refreshTableOfContentsConvergently(staged,measure);
  if(plain.status!=="updated"&&plain.status!=="unchanged")return fail(plain.status);
  const linked=linkQualifiedTableOfContents(plain.state,measure);
  if(linked.status!=="updated"&&linked.status!=="unchanged")return fail(linked.status);
  const headings=collectQualifiedTocHeadings(linked.state,region);
  if(!headings)return fail("unsupported");
  return {state:linked.state,layout:linked.layout,status:"updated",passes,updatedEntries:headings.length};
}
