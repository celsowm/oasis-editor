import type {EditorBookmark,EditorState,EditorLayoutDocument,EditorParagraphNode} from "@/core/model.js";
import {getActiveSectionIndex,getActiveZone,getDocumentSections,getParagraphText,getParagraphLength} from "@/core/model.js";
import {createEditorBookmarkId} from "@/core/editorState.js";
import {collectQualifiedTocHeadings} from "@/core/commands/tableOfContents.js";
import {createTocPageNumberResolver,findQualifiedTocRegion} from "./tocFields.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import type {TocPaginate} from "./tocConvergence.js";

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
  const pages=headings.map(h=>resolve(h.id));
  if(pages.some(p=>p===undefined))return fail("unresolved",before);
  const matches=(bookmark:EditorBookmark|null|undefined,p:EditorParagraphNode):boolean=>
    !!bookmark&&bookmark.hidden===true&&bookmark.colFirst===undefined&&bookmark.colLast===undefined&&
    bookmark.start?.paragraphId===p.id&&bookmark.start.offset===0&&
    bookmark.end?.paragraphId===p.id&&bookmark.end.offset===getParagraphLength(p);
  let changed=false;
  const replacements=new Map<string,EditorParagraphNode>();
  for(const [i,heading] of headings.entries()){
    const entry=entries[i],target=body.get(heading.id);
    if(!entry||entry.type!=="paragraph"||!target||target===entry||
      target.sdtWrappers?.length||target.numberingRevision||target.dropCap||
      target.runs.some(r=>r.kind!=="text"||r.revision||r.revisionRangeMarker||r.sdtWrappers?.length||r.styles?.hidden||r.styles?.rtl)||
      /[\r\n\t]/.test(heading.text)||getParagraphText(entry)!==heading.text+"\t"+pages[i])
      return fail("unsupported",before);
    const run=entry.runs[0]!;
    const link=run.styles?.link;
    if(link){
      if(!link.startsWith("#")||!matches(names.get(link.slice(1).toLowerCase()),target)||
        names.get(link.slice(1).toLowerCase())?.name!==link.slice(1))return fail("unsupported",before);
      continue;
    }
    let bookmark=Object.values(items).find(bm=>/^_TocOasis[0-9a-f]{32}$/.test(bm.name)&&
      names.get(bm.name.toLowerCase())===bm&&matches(bm,target));
    if(!bookmark){
      const id=createEditorBookmarkId();
      const name="_TocOasis"+id.replace(/^bookmark:/,"").replace(/-/g,"");
      if(!/^_TocOasis[0-9a-f]{32}$/.test(name)||Object.hasOwn(items,id)||names.has(name.toLowerCase()))
        return fail("unsupported",before);
      bookmark={id,name,hidden:true,start:{paragraphId:target.id,offset:0},
        end:{paragraphId:target.id,offset:getParagraphLength(target)}};
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
  if(headings.some((h,i)=>verify(h.id)!==pages[i]))return fail("unresolved",before);
  return {state:{...original,document},status:"updated",layout:after};
}
