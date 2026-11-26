import type {EditorDocument,EditorLayoutDocument,EditorParagraphNode} from "@/core/model.js";
import {getDocumentSections,getParagraphLength} from "@/core/model.js";
import {createDocumentFieldContext} from "./fieldDocumentContext.js";
import {formatSectionPageLabel} from "@/core/format/pageNumberFormat.js";
import type {XePage} from "./xeEntries.js";

export interface XeRangePage extends XePage {
  sectionIndex:number;
}

/** Resolve a nonempty main-story bookmark as an exclusive-end range.
 * Keep every physical page and its own section's printed label. Rendering
 * a compact range across a numbering restart is a separate policy.
 */
export function resolveXeBookmarkRange(
  document:EditorDocument,layout:EditorLayoutDocument,name:string,
  context=createDocumentFieldContext(document,layout),
):XeRangePage[]|undefined{
  const registry=document.bookmarks;
  if(!registry||new Set(registry.order).size!==registry.order.length||
    registry.order.length!==Object.keys(registry.items).length||
    registry.order.some(id=>registry.items[id]?.id!==id))return undefined;
  const matches=Object.values(registry.items).filter(b=>b.name.toLowerCase()===name.toLowerCase());
  const bm=matches[0];
  if(matches.length!==1||!bm||bm.name!==name||!bm.start||!bm.end||
    bm.colFirst!==undefined||bm.colLast!==undefined)return undefined;
  const sections=getDocumentSections(document);
  const body:{p:EditorParagraphNode;sectionIndex:number}[]=[];
  const byId=new Map<string,number>();
  for(const [sectionIndex,section] of sections.entries()){
    for(const p of section.blocks){
      if(p.type!=="paragraph"||byId.has(p.id))return undefined;
      byId.set(p.id,body.length);body.push({p,sectionIndex});
    }
  }
  const first=byId.get(bm.start.paragraphId),last=byId.get(bm.end.paragraphId);
  if(first===undefined||last===undefined||first>last)return undefined;
  const valid=(i:number,n:number)=>Number.isSafeInteger(n)&&n>=0&&n<=getParagraphLength(body[i]!.p);
  if(!valid(first,bm.start.offset)||!valid(last,bm.end.offset)||
    (first===last&&bm.start.offset>=bm.end.offset))return undefined;
  // Empty paragraph-only ranges have no certified visible content.
  let firstPage:number|undefined,lastPage:number|undefined;
  for(let i=first;i<=last;i++){
    const {p,sectionIndex}=body[i]!;
    const left=i===first?bm.start.offset:0,right=i===last?bm.end.offset:getParagraphLength(p);
    if(right<=left)continue;
    if(p.sdtWrappers?.length||p.numberingRevision||p.dropCap||
      p.runs.some(r=>r.revision||r.revisionRangeMarker||r.sdtWrappers?.length||
        (r.text.length>0&&(r.kind!=="text"||r.styles?.hidden))))return undefined;
    const a=context.pageIndexAt(p.id,left),b=context.pageIndexAt(p.id,right-1);
    if(a===undefined||b===undefined||a>b||
      context.forPage(a).sectionNumber!==sectionIndex+1||
      context.forPage(b).sectionNumber!==sectionIndex+1||
      (lastPage!==undefined&&a<lastPage))return undefined;
    firstPage??=a;lastPage=b;
  }
  if(firstPage===undefined||lastPage===undefined||lastPage-firstPage>=4096)return undefined;
  const pages:XeRangePage[]=[];
  for(let i=firstPage;i<=lastPage;i++){
    const facts=context.forPage(i);
    if(facts.sectionNumber===undefined||facts.pageNumber===undefined)return undefined;
    const sectionIndex=facts.sectionNumber-1,section=sections[sectionIndex];
    if(!section)return undefined;
    const label=formatSectionPageLabel(facts.pageNumber,section.pageNumbering?.format);
    if(label===undefined)return undefined;
    pages.push({physicalPageIndex:i,sectionIndex,label:String(label)});
  }
  return pages;
}
