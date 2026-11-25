import {DOMParser} from "@xmldom/xmldom";
import type {EditorState,EditorDocument,EditorLayoutDocument,EditorParagraphNode,EditorTextRun,EditorBookmark,EditorSdtBlockWrapper} from "@/core/model.js";
import {getActiveZone,getActiveSectionIndex,getDocumentSections,getParagraphLength} from "@/core/model.js";
import {buildFieldStoryGraph} from "./fieldStoryGraph.js";
import {parseFieldInstruction} from "@/ooxml/word/fieldInstruction.js";
import {compileFieldInstruction} from "./fieldEvaluation.js";
import {parseTocInstruction} from "./tocFields.js";
import {createDocumentFieldContext} from "./fieldDocumentContext.js";
import {formatSectionPageLabel} from "@/core/format/pageNumberFormat.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import type {TocPaginate,TocConvergenceResult} from "./tocConvergence.js";

type Entry={paragraphId:string;runIds:string[];bookmark:string};
type Region={entries:Entry[];paragraphIds:Set<string>;hyperlinks:boolean};
const raw=(code:readonly {kind:string;raw?:string}[])=>code.map(p=>p.kind==="instruction"?p.raw??"":"").join("");
const safeRun=(r:EditorTextRun)=>["text","fieldChar","fieldInstruction"].includes(r.kind)&&
  !r.revision&&!r.revisionRangeMarker&&!r.sdtWrappers?.length&&!r.styles?.hidden&&!r.styles?.rtl;
const safeParagraph=(p:EditorParagraphNode)=>!p.numberingRevision&&!p.dropCap&&!p.list&&
  !p.style?.bidi&&(!p.style?.textDirection||p.style.textDirection==="lrTb")&&
  p.runs.every(safeRun)&&new Set(p.runs.map(r=>r.id)).size===p.runs.length;

const WORD_NS="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
/** The importer retains Word's built-in document-part metadata as raw XML.
 * Recognize only the known TOC gallery shape; do not grant edit permission
 * based on an alias, arbitrary tag, substring, or unknown extension. */
function isTocGalleryXml(xml:string):boolean{
  if(!xml||xml.length>8192||/<!|<\?/.test(xml))return false;
  try{
    const root=new DOMParser().parseFromString(
      '<root xmlns:w="'+WORD_NS+'">'+xml+'</root>',"application/xml").documentElement;
    if(!root||root.localName!=="root")return false;
    const elements=(parent:typeof root)=>{
      const out:typeof root[]=[];
      for(let i=0;i<parent.childNodes.length;i++){
        const n=parent.childNodes.item(i);
        if(n?.nodeType===1)out.push(n as typeof root);
        else if(n?.nodeType!==3||n.nodeValue?.trim())return undefined;
      }
      return out;
    };
    const top=elements(root);
    if(top?.length!==1||top[0]!.namespaceURI!==WORD_NS||top[0]!.localName!=="docPartObj")return false;
    const children=elements(top[0]!);
    if(!children||children.length<1||children.length>3)return false;
    const seen=new Set<string>();
    for(const child of children){
      const name=child.localName;
      if(child.namespaceURI!==WORD_NS||!name||seen.has(name)||
        !["docPartGallery","docPartCategory","docPartUnique"].includes(name)||elements(child)?.length!==0)return false;
      seen.add(name);
      const value=child.getAttributeNS(WORD_NS,"val");
      if(name==="docPartGallery"&&value!=="Table of Contents")return false;
      if(name==="docPartCategory"&&!value)return false;
      if(name==="docPartUnique"&&value&&!["1","0","true","false","on","off"].includes(value))return false;
    }
    return seen.has("docPartGallery");
  }catch{return false;}
}
function safeTocWrapper(wrapper:EditorSdtBlockWrapper):boolean{
  const p=wrapper.sdtPr;
  return !!wrapper.groupId&&(!p.lock||p.lock==="unlocked"||p.lock==="sdtLocked")&&
    !p.dataBinding&&!p.temporary&&!p.showingPlcHdr&&!p.repeatingSectionProperties&&
    !p.subtype&&isTocGalleryXml(p.unknownXml??"");
}
function safeTocWrappers(paragraphs:readonly EditorParagraphNode[]):boolean{
  const first=paragraphs[0]?.sdtWrappers??[];
  if(!first.length)return paragraphs.every(p=>!p.sdtWrappers?.length);
  // One shared Word gallery control, not nested or crossing SDT boundaries.
  if(first.length!==1||!safeTocWrapper(first[0]!))return false;
  const identity=JSON.stringify(first);
  return paragraphs.every(p=>JSON.stringify(p.sdtWrappers??[])===identity);
}

/** A bounded page-number-only grammar, separate from flat TOC regeneration.
 * Never treat an arbitrary nested field as an independently editable cache. */
function qualify(state:EditorState,sectionIndex=getActiveSectionIndex(state),navigation=false):Region|undefined{
  if(!navigation&&(getActiveZone(state)!=="main"||state.trackChangesEnabled))return undefined;
  const section=getDocumentSections(state.document)[sectionIndex];
  if(!section)return undefined;
  const found:Region[]=[];
  let tocCount=0;
  for(let i=0;i<section.blocks.length;){
    if(section.blocks[i]?.type!=="paragraph"){i++;continue;}
    const ps:EditorParagraphNode[]=[];
    while(section.blocks[i]?.type==="paragraph")ps.push(section.blocks[i++] as EditorParagraphNode);
    const graph=buildFieldStoryGraph(ps);
    if(graph.diagnostics.length)return undefined;
    for(const outer of graph.spans){
      const instruction=raw(outer.code);
      if(parseFieldInstruction(instruction).command!=="TOC")continue;
      tocCount++;
      const settings=parseTocInstruction(instruction);
      if(!settings||outer.parentIndex!==null||!outer.separator||!outer.end||
        outer.beginMarker.fieldLock||outer.beginMarker.dirty||outer.code.some(p=>p.kind!=="instruction")||
        outer.begin.paragraphIndex!==outer.separator.paragraphIndex||outer.begin.runIndex!==0||
        outer.end.runIndex!==ps[outer.end.paragraphIndex]!.runs.length-1)continue;
      const start=outer.begin.paragraphIndex,end=outer.end.paragraphIndex;
      const region=ps.slice(start,end+1);
      if(region.length>2050||!region.every(safeParagraph)||!safeTocWrappers(region)||
        new Set(region.map(p=>p.id)).size!==region.length)continue;
      const entries:Entry[]=[];
      const used=new Set<number>();
      let valid=true;
      for(let j=start;j<=end;j++){
        const p=ps[j]!;
        const lo=j===start?outer.separator.runIndex+1:0;
        const hi=j===end?outer.end.runIndex:p.runs.length;
        if(lo===hi&&(j===start||j===end))continue;
        const children=graph.spans.filter(x=>x.parentIndex===outer.index&&x.begin.paragraphIndex===j);
        if(children.length!==1){valid=false;break;}
        const child=children[0]!;
        if(!child.separator||!child.end||child.beginMarker.fieldLock||child.beginMarker.dirty||
          child.end.paragraphIndex!==j||child.separator.paragraphIndex!==j||
          child.begin.runIndex<=lo||child.end.runIndex!==hi-1||
          child.code.some(x=>x.kind!=="instruction")||!child.result.length||child.result.length>128||
          child.result.some(x=>x.kind!=="run")){valid=false;break;}
        const field=compileFieldInstruction(raw(child.code));
        if(field?.type!=="PAGEREF"){valid=false;break;}
        const prefix=p.runs.slice(lo,child.begin.runIndex);
        const text=prefix.map(r=>r.text).join("");
        const results=p.runs.slice(child.separator.runIndex+1,child.end.runIndex);
        const cached=results.map(r=>r.text).join("");
        if(results.length!==child.result.length||results.some((r,k)=>{
          const part=child.result[k];
          return r.kind!=="text"||!r.text.length||part?.kind!=="run"||
            part.point.paragraphIndex!==j||part.point.runIndex!==child.separator!.runIndex+1+k;
        })||!cached.length||cached.length>128||/[\r\n\t]/.test(cached)||
          (results.length>1&&!/^(?:[0-9]+|[A-Za-z]+)$/.test(cached))||
          text.length>8192||!text.endsWith("\t")||
          !text.slice(0,-1).trim()||/[\r\n]/.test(text)||
          !prefix.every(r=>r.kind==="text")||
          [...prefix,...results].some(r=>r.styles?.link&&r.styles.link!=="#"+field.bookmark)){
          valid=false;break;
        }
        used.add(child.index);entries.push({paragraphId:p.id,runIds:results.map(r=>r.id),bookmark:field.bookmark});
      }
      if(!valid||!entries.length||entries.length>2048||
        outer.result.some(x=>x.kind==="nested"&&!used.has(x.fieldIndex))||
        graph.spans.some(x=>x.parentIndex===outer.index&&!used.has(x.index)))continue;
      found.push({entries,paragraphIds:new Set(region.map(p=>p.id)),hyperlinks:settings.hyperlinks});
    }
  }
  return tocCount===1&&found.length===1?found[0]:undefined;
}
export function hasNestedTocPageRefs(state:EditorState):boolean{return !!qualify(state);}

/** Read-only hit resolution for an explicitly linked text run in a qualified
 * imported TOC. A PAGEREF instruction by itself is not a clickable run. */
export function resolveNestedTocLink(
  state:EditorState,sectionIndex:number,paragraphId:string,offset:number,
):{name:string;excluded:Set<string>}|undefined{
  const region=qualify(state,sectionIndex,true);
  if(!region?.hyperlinks)return undefined;
  const entry=region.entries.find(e=>e.paragraphId===paragraphId);
  const p=getDocumentSections(state.document)[sectionIndex]?.blocks.find(b=>b.id===paragraphId);
  if(!entry||!p||p.type!=="paragraph"||!Number.isInteger(offset)||offset<0||
    offset>getParagraphLength(p))return undefined;
  const name=entry.bookmark;
  let cursor=0;
  for(const r of p.runs){
    const end=cursor+r.text.length;
    const hit=r.text.length>0&&offset>=cursor&&(offset<end||
      offset===end&&end===getParagraphLength(p));
    if(hit)return r.kind==="text"&&r.styles?.link==="#"+name?
      {name,excluded:region.paragraphIds}:undefined;
    cursor=end;
  }
  return undefined;
}

function labels(document:EditorDocument,layout:EditorLayoutDocument,region:Region):(string|undefined)[]{
  const sections=getDocumentSections(document);
  const body=new Map<string,{p:EditorParagraphNode;section:number}|null>();
  sections.forEach((s,i)=>s.blocks.forEach(p=>{
    if(p.type==="paragraph")body.set(p.id,body.has(p.id)?null:{p,section:i});
  }));
  const registry=document.bookmarks;
  const names=new Map<string,EditorBookmark|null>();
  for(const b of Object.values(registry?.items??{})){
    const key=b.name.toLowerCase();names.set(key,names.has(key)?null:b);
  }
  const context=createDocumentFieldContext(document,layout);
  return region.entries.map(entry=>{
    const b=names.get(entry.bookmark.toLowerCase());
    if(!b||b.name!==entry.bookmark||!registry?.order.includes(b.id)||!b.start||!b.end||
      b.colFirst!==undefined||b.colLast!==undefined||b.start.paragraphId!==b.end.paragraphId||
      region.paragraphIds.has(b.start.paragraphId))return undefined;
    const target=body.get(b.start.paragraphId);
    if(!target||!Number.isInteger(b.start.offset)||!Number.isInteger(b.end.offset)||
      b.start.offset<0||b.end.offset<b.start.offset||b.end.offset>getParagraphLength(target.p))return undefined;
    const page=context.pageIndexAt(target.p.id,b.start.offset);
    if(page===undefined)return undefined;
    const facts=context.forPage(page);
    if(facts.sectionNumber!==target.section+1||facts.pageNumber===undefined)return undefined;
    const value=formatSectionPageLabel(facts.pageNumber,sections[target.section]!.pageNumbering?.format);
    return value===undefined?undefined:String(value);
  });
}

/** Keep every original result run nonempty, preserve its style and identity,
 * and retain existing prefix widths whenever possible. Growth is assigned
 * to the last fragment; shrinkage trims from right to left with one character
 * reserved per remaining run. Refuse rather than erase a styled fragment.
 */
function distributeLabel(text:string,lengths:readonly number[]):string[]|undefined{
  if(text.length<lengths.length)return undefined;
  let offset=0;
  return lengths.map((length,i)=>{
    const count=i===lengths.length-1?text.length-offset:
      Math.min(length,text.length-offset-(lengths.length-i-1));
    const part=text.slice(offset,offset+count);offset+=count;return part;
  });
}

/** A fixed point over the original nested cache runs, not a rebuilt TOC.
 * Conservatively refuse length-changing edits in anchored paragraphs. */
export function refreshNestedTocPageRefs(
  original:EditorState,paginate:TocPaginate=doc=>projectDocumentLayout(doc,undefined,undefined,undefined,{cachedBodyPageFields:true}),
):TocConvergenceResult{
  let initialLayout:EditorLayoutDocument|undefined;
  const fail=(status:TocConvergenceResult["status"],passes:number):TocConvergenceResult=>
    ({state:original,status,passes,layout:initialLayout,updatedEntries:0});
  const region=qualify(original);
  if(!region)return fail("unsupported",0);
  const sections=getDocumentSections(original.document);
  const all=sections.flatMap(s=>s.blocks);
  if(new Set(all.map(b=>b.id)).size!==all.length)return fail("unsupported",0);
  const anchored=new Set<string>();
  for(const registry of [original.document.bookmarks,original.document.comments])
    for(const item of Object.values(registry?.items??{}))
      for(const anchor of [item.start,item.end])if(anchor)anchored.add(anchor.paragraphId);
  anchored.add(original.selection.anchor.paragraphId);
  anchored.add(original.selection.focus.paragraphId);
  const signature=JSON.stringify(region.entries);
  const seen=new Set<string>(),touched=new Set<string>();
  let current=original;
  for(let pass=1;pass<=6;pass++){
    let layout:EditorLayoutDocument;
    try{layout=paginate(current.document);}catch{return fail("unsupported",pass);}
    initialLayout??=layout;
    const active=qualify(current);
    if(!active||JSON.stringify(active.entries)!==signature)return fail("unsupported",pass);
    const desired=labels(current.document,layout,active);
    if(desired.some(x=>x===undefined))return fail("unresolved",pass);
    const blocks=getDocumentSections(current.document).flatMap(s=>s.blocks);
    const edits=new Map<string,Map<string,string>>();
    const old:string[]=[];
    for(const [i,entry] of active.entries.entries()){
      const p=blocks.find(b=>b.id===entry.paragraphId);
      if(!p||p.type!=="paragraph")return fail("unsupported",pass);
      const runs=entry.runIds.map(id=>p.runs.find(r=>r.id===id));
      if(runs.some(r=>!r||r.kind!=="text"))return fail("unsupported",pass);
      const lengths=runs.map(r=>r!.text.length);
      const cached=runs.map(r=>r!.text).join("");
      old.push(cached);
      const text=desired[i]!;
      if(cached===text)continue;
      const parts=distributeLabel(text,lengths);
      if(!parts)return fail("unsupported",pass);
      if(parts.some((part,j)=>part.length!==lengths[j])&&anchored.has(entry.paragraphId))
        return fail("unsupported",pass);
      edits.set(entry.paragraphId,new Map(entry.runIds.map((id,j)=>[id,parts[j]!])));
      touched.add(entry.paragraphId);
    }
    if(!edits.size)return {state:current,layout,status:current===original?"unchanged":"updated",
      passes:pass,updatedEntries:touched.size};
    const key=JSON.stringify([old,desired]);
    if(seen.has(key))return fail("nonconvergent",pass);
    seen.add(key);
    current={...current,document:{...current.document,sections:getDocumentSections(current.document).map(s=>({...s,
      blocks:s.blocks.map(p=>{
        const edit=edits.get(p.id);
        return !edit||p.type!=="paragraph"?p:{...p,runs:p.runs.map(r=>edit.has(r.id)&&edit.get(r.id)!==r.text?{...r,text:edit.get(r.id)!}:r)};
      })}))}};
  }
  return fail("nonconvergent",6);
}
