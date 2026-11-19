import type { EditorBookmark, EditorDocument, EditorLayoutDocument, EditorParagraphNode } from "@/core/model.js";
import { getDocumentSections, getParagraphText, getParagraphLength } from "@/core/model.js";
import type { FieldEvaluationContext } from "./fieldEvaluation.js";

interface BodyEntry { paragraph: EditorParagraphNode; sectionIndex: number; blockOrdinal: number }
interface PageSegment { pageIndex: number; start: number; end: number; text: string }
interface PageFacts { sectionIndex?: number; displayNumber?: number; sectionPages?: number }

/** Index a document snapshot and its completed layout. No evaluation or cache
 * mutation occurs while building the index. Rebuild for each new snapshot. */
export function createDocumentFieldContext(document: EditorDocument, layout?: EditorLayoutDocument) {
  const sections = getDocumentSections(document);
  const body: BodyEntry[] = [];
  const bodyIndex = new Map<string, number>();
  let ordinal = 0;
  for (const [sectionIndex, section] of sections.entries()) {
    for (const block of section.blocks) {
      if (block.type === "paragraph") {
        bodyIndex.set(block.id, body.length);
        body.push({paragraph:block, sectionIndex, blockOrdinal:ordinal});
      }
      ordinal++;
    }
  }
  const bookmarks = new Map<string, EditorBookmark | null>();
  for (const bookmark of Object.values(document.bookmarks?.items ?? {})) {
    // Duplicate names are ambiguous, not missing.
    bookmarks.set(bookmark.name, bookmarks.has(bookmark.name) ? null : bookmark);
  }
  const validOffset = (p:EditorParagraphNode, n:number):boolean =>
    Number.isInteger(n) && n >= 0 && n <= getParagraphLength(p);

  function bookmarkText(name:string):string|null|undefined {
    if(!bookmarks.has(name))return null;
    const bookmark=bookmarks.get(name);
    if(!bookmark?.start||bookmark.colFirst!==undefined||bookmark.colLast!==undefined)return undefined;
    const start=bookmark.start,end=bookmark.end??start;
    const first=bodyIndex.get(start.paragraphId),last=bodyIndex.get(end.paragraphId);
    if(first===undefined||last===undefined||first>last)return undefined;
    const a=body[first]!,b=body[last]!;
    if(!validOffset(a.paragraph,start.offset)||!validOffset(b.paragraph,end.offset)||
      (first===last&&start.offset>end.offset))return undefined;
    // Do not flatten an intervening table or evaluate field-dependent text
    // recursively. Those ranges need their own story/dependency policy.
    if(b.blockOrdinal-a.blockOrdinal!==last-first)return undefined;
    const pieces:string[]=[];
    for(let i=first;i<=last;i++){
      const p=body[i]!.paragraph;
      const left=i===first?start.offset:0,right=i===last?end.offset:getParagraphLength(p);
      let offset=0;
      for(const run of p.runs){
        const next=offset+run.text.length;
        if((offset<right&&next>left&&run.text.length>0&&
           (run.kind!=="text"||run.revision||run.styles?.hidden))||
           (offset>=left&&offset<=right&&(run.kind==="fieldChar"||run.kind==="fieldInstruction")))return undefined;
        offset=next;
      }
      pieces.push(getParagraphText(p).slice(left,right));
    }
    return pieces.join("\n");
  }

  const pages=layout?.pages??[];
  const facts=new Map<number,PageFacts>();
  const segments=new Map<string,PageSegment[]>();
  const sectionPages=new Map<number,number[]>();
  const simpleSections=sections.every((s,i)=>i===0||!s.breakType||s.breakType==="nextPage");
  // Continuous sections share a physical page; even/odd/nextColumn breaks
  // are not yet faithfully paginated. Avoid fabricating display numbering.
  const validPageOrder=pages.every((p,i)=>p.index===i &&
    (p.sectionIndex!==undefined||sections.length===1) &&
    (p.sectionIndex??0)>=0 && (p.sectionIndex??0)<sections.length &&
    (i===0||(pages[i-1]!.sectionIndex??0)<=(p.sectionIndex??0)));
  for(const page of pages){
    const sectionIndex=page.sectionIndex??(sections.length===1?0:undefined);
    facts.set(page.index,{sectionIndex});
    if(sectionIndex!==undefined){
      const group=sectionPages.get(sectionIndex)??[];
      group.push(page.index); sectionPages.set(sectionIndex,group);
    }
    for(const block of page.blocks){
      if(block.blockType!=="paragraph"||!block.layout||!bodyIndex.has(block.layout.paragraphId))continue;
      const p=block.layout;
      const start=p.startOffset??0,end=p.endOffset??(start+p.text.length);
      const group=segments.get(p.paragraphId)??[];
      group.push({pageIndex:page.index,start,end,text:p.text});
      segments.set(p.paragraphId,group);
    }
  }
  if(simpleSections&&validPageOrder){
    let nextNumber:number|undefined=1;
    for(const [i,section] of sections.entries()){
      const group=sectionPages.get(i)??[];
      if(!group.length){nextNumber=undefined;continue;}
      const start=section.pageNumbering?.start;
      if(start!==undefined)nextNumber=Number.isSafeInteger(start)&&start>0?start:undefined;
      const chapter=!!section.pageNumbering?.chapterStyle;
      for(const index of group){
        facts.set(index,{sectionIndex:i,sectionPages:group.length,
          displayNumber:chapter?undefined:nextNumber});
        if(nextNumber!==undefined)nextNumber++;
      }
    }
  }

  function pageIndexAt(paragraphId:string,offset:number):number|undefined{
    const bodyPos=bodyIndex.get(paragraphId);
    if(bodyPos===undefined)return undefined;
    const p=body[bodyPos]!.paragraph;
    if(!validOffset(p,offset))return undefined;
    const group=segments.get(paragraphId);
    if(!group?.length)return undefined;
    const source=getParagraphText(p);
    // On a split paragraph, offsets must refer to the source text, not a
    // projected field result with different length. Verify complete coverage.
    let cursor=0;
    for(const s of group){
      if(s.start!==cursor||s.end<s.start||s.text!==source.slice(s.start,s.end))return undefined;
      cursor=s.end;
    }
    if(cursor!==source.length)return undefined;
    const result=group.find(s=>s.start<=offset&&offset<s.end) ??
      (offset===source.length?group.at(-1):undefined);
    return result?.pageIndex;
  }
  function bookmarkPage(name:string):number|null|undefined{
    if(!bookmarks.has(name))return null;
    const bookmark=bookmarks.get(name);
    if(!bookmark?.start||bookmark.colFirst!==undefined||bookmark.colLast!==undefined)return undefined;
    const index=pageIndexAt(bookmark.start.paragraphId,bookmark.start.offset);
    return index===undefined?undefined:facts.get(index)?.displayNumber;
  }
  function forPage(pageIndex:number):FieldEvaluationContext{
    const fact=facts.get(pageIndex);
    return {pageNumber:fact?.displayNumber,totalPages:layout&&simpleSections&&validPageOrder?pages.length:undefined,
      sectionNumber:fact?.sectionIndex===undefined?undefined:fact.sectionIndex+1,
      sectionPages:fact?.sectionPages,bookmarkText,bookmarkPage};
  }
  function forPosition(paragraphId:string,offset:number):FieldEvaluationContext{
    const entry=bodyIndex.get(paragraphId);
    const index=pageIndexAt(paragraphId,offset);
    const context=index===undefined?{totalPages:layout&&simpleSections&&validPageOrder?pages.length:undefined,bookmarkText,bookmarkPage}:forPage(index);
    const sectionIndex=entry===undefined?undefined:body[entry]!.sectionIndex;
    return {...context,sectionNumber:sectionIndex===undefined?undefined:sectionIndex+1};
  }
  return {bookmarkText,bookmarkPage,pageIndexAt,forPage,forPosition};
}
