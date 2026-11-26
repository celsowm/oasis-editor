import type {EditorBlockNode,EditorDocument,EditorLayoutDocument,EditorParagraphNode,EditorState,EditorTextRun} from "@/core/model.js";
import {getActiveSectionIndex,getActiveZone,getDocumentSections,getParagraphText} from "@/core/model.js";
import {createEditorParagraphFromRuns} from "@/core/editorState.js";
import {getEditorParagraphOoxmlSource,getEditorRunOoxmlSource} from "@/ooxml/word/sourceFragments.js";
import {parseFieldInstruction} from "@/ooxml/word/fieldInstruction.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {buildFieldStoryGraph} from "./fieldStoryGraph.js";
import {buildIndexPlan,parseIndexInstruction,type IndexPlan} from "./indexPlan.js";
import {collectXeOccurrences} from "./xeEntries.js";

interface IndexRegion {
  start:number;
  end:number;
  raw:string;
}
interface Fragment {text:string;bold?:boolean;italic?:boolean}
interface EntryLine {indent:number;fragments:Fragment[]}
const MAX_PASSES=6;
const MAX_ENTRIES=2048;

const safeParagraph=(p:EditorParagraphNode)=>!p.sdtWrappers?.length&&!p.list&&!p.numberingRevision&&!p.dropCap&&
  !p.style?.propertyRevision&&p.runs.every(r=>!r.revision&&!r.revisionRangeMarker&&!r.sdtWrappers?.length&&
    !r.styles?.propertyRevision&&!r.styles?.hidden&&!r.styles?.rtl&&!r.styles?.link);

/** No unmodeled source children may disappear when replacing a cache.
 * This deliberately does not qualify named styles or source extensions yet.
 */
function simpleSource(xml:string|undefined):boolean{
  if(!xml)return true;
  if(/<!--|<!\[CDATA\[|<\?/.test(xml))return false;
  const allowed=new Set(["w:p","w:pPr","w:ind","w:r","w:rPr","w:b","w:i","w:t"]);
  return [...xml.matchAll(/<\/?([A-Za-z_][\w.:-]*)\b/g)].every(m=>allowed.has(m[1]!));
}
function simpleEntry(p:EditorParagraphNode):boolean{
  if(!safeParagraph(p)||Object.keys(p.style??{}).some(k=>k!=="indentLeft")||
    !Number.isFinite(p.style?.indentLeft??0)||!p.runs.length||getParagraphText(p).length>32768)return false;
  const source=getEditorParagraphOoxmlSource(p);
  if(!simpleSource(source?.xml)||!simpleSource(source?.paragraphProperties?.xml))return false;
  return p.runs.every(r=>r.kind==="text"&&!/[\r\n\t]/.test(r.text)&&
    Object.keys(r.styles??{}).every(k=>k==="bold"||k==="italic")&&
    simpleSource(getEditorRunOoxmlSource(r)?.xml));
}

/** Only a single complete flat INDEX with separate marker paragraphs. */
export function findQualifiedIndexRegion(blocks:readonly EditorBlockNode[]):IndexRegion|undefined{
  if(blocks.some(b=>b.type!=="paragraph"))return undefined;
  const paragraphs=blocks as readonly EditorParagraphNode[];
  const graph=buildFieldStoryGraph(paragraphs);
  if(graph.diagnostics.length)return undefined;
  const indexes=graph.spans.filter(span=>{
    const raw=span.code.map(p=>p.kind==="instruction"?p.raw:"").join("");
    return parseFieldInstruction(raw).command==="INDEX"||/^\s*INDEX(?=\s|\\|"|$)/i.test(raw);
  });
  if(indexes.length!==1)return undefined;
  const span=indexes[0]!;
  const raw=span.code.map(p=>p.kind==="instruction"?p.raw:"").join("");
  if(!parseIndexInstruction(raw)||span.parentIndex!==null||!span.separator||!span.end||
    span.beginMarker.fieldLock||span.beginMarker.dirty||span.code.some(p=>p.kind!=="instruction")||
    span.begin.paragraphIndex!==span.separator.paragraphIndex||span.begin.paragraphIndex>=span.end.paragraphIndex)return undefined;
  const start=span.begin.paragraphIndex,end=span.end.paragraphIndex;
  const head=paragraphs[start]!,tail=paragraphs[end]!;
  if(!safeParagraph(head)||!safeParagraph(tail)||span.begin.runIndex!==0||
    span.separator.runIndex!==head.runs.length-1||span.end.runIndex!==0||tail.runs.length!==1||
    head.runs.some(r=>r.text.length||r.kind!=="fieldChar"&&r.kind!=="fieldInstruction")||
    tail.runs[0]?.text.length!==0)return undefined;
  const entries=paragraphs.slice(start+1,end);
  if(!entries.every(simpleEntry)||span.result.some(p=>p.kind!=="run"||
    p.point.paragraphIndex<=start||p.point.paragraphIndex>=end)||
    span.result.length!==entries.reduce((n,p)=>n+p.runs.length,0))return undefined;
  return {start,end,raw};
}

/** Render only one-column indented plans. A range spanning section boundaries
 * is kept in the read-only plan but is not compacted into a misleading label.
 */
export function renderIndexPlan(plan:IndexPlan):EntryLine[]|undefined{
  if(!plan.entries.length||plan.entries.length>MAX_ENTRIES)return undefined;
  const lines:EntryLine[]=[];
  for(const entry of plan.entries){
    const label=entry.path.at(-1);
    if(!label)return undefined;
    const fragments:Fragment[]=[{text:label}];
    const references:{index:number;fragment:Fragment}[]=entry.pages.map(p=>({
      index:p.physicalPageIndex,fragment:{text:p.label,bold:p.bold,italic:p.italic},
    }));
    for(const range of entry.ranges??[]){
      const first=range.pages[0],last=range.pages.at(-1);
      if(!first||!last||range.pages.some(p=>p.sectionIndex!==first.sectionIndex)||
        (first!==last&&first.label===last.label))return undefined;
      references.push({index:first.physicalPageIndex,fragment:{
        text:first===last?first.label:first.label+(plan.settings.rangeSeparator??"–")+last.label,
        bold:range.bold,italic:range.italic,
      }});
    }
    references.sort((a,b)=>a.index-b.index);
    if(references.length){
      if(entry.crossReferences.length)return undefined;
      fragments.push({text:plan.settings.entrySeparator});
      references.forEach((ref,i)=>{
        if(i)fragments.push({text:plan.settings.pageSeparator});
        fragments.push(ref.fragment);
      });
    }else if(entry.crossReferences.length){
      if(entry.crossReferences.length!==1)return undefined;
      fragments.push({text:plan.settings.crossReferenceSeparator},{text:entry.crossReferences[0]!});
    }
    if(fragments.some(f=>/[\r\n\t]/.test(f.text))||
      fragments.reduce((n,f)=>n+f.text.length,0)>32768)return undefined;
    lines.push({indent:(entry.path.length-1)*24,fragments});
  }
  return lines;
}
function normalized(fragments:readonly Fragment[]){
  const output:{text:string;bold:boolean;italic:boolean}[]=[];
  for(const f of fragments){
    if(!f.text)continue;
    const bold=!!f.bold,italic=!!f.italic,last=output.at(-1);
    if(last&&last.bold===bold&&last.italic===italic)last.text+=f.text;
    else output.push({text:f.text,bold,italic});
  }
  return output;
}
function matchesLine(p:EditorBlockNode,line:EntryLine):boolean{
  return p.type==="paragraph"&&(p.style?.indentLeft??0)===line.indent&&
    JSON.stringify(normalized(p.runs.map(r=>({text:r.text,bold:r.styles?.bold,italic:r.styles?.italic}))))===
    JSON.stringify(normalized(line.fragments));
}
function makeLine(line:EntryLine):EditorParagraphNode{
  const p=createEditorParagraphFromRuns(normalized(line.fragments).map(f=>({
    text:f.text,...(f.bold||f.italic?{styles:{...(f.bold?{bold:true}:{}),...(f.italic?{italic:true}:{})}}:{}),
  })));
  if(line.indent)p.style={indentLeft:line.indent};
  return p;
}

/** A range crossing the replaceable region is also unsafe even if both
 * endpoints are outside. Conservatively reject unknown anchor locations. */
function hasCacheAnchors(state:EditorState,ids:Set<string>):boolean{
  const order=new Map<string,number>();
  for(const section of getDocumentSections(state.document))for(const b of section.blocks)order.set(b.id,order.size);
  if(ids.has(state.selection.anchor.paragraphId)||ids.has(state.selection.focus.paragraphId))return true;
  const cache=[...ids].map(id=>order.get(id)!);
  if(!cache.length)return false;
  const min=Math.min(...cache),max=Math.max(...cache);
  for(const range of [...Object.values(state.document.bookmarks?.items??{}),...Object.values(state.document.comments?.items??{})]){
    const a=range.start?order.get(range.start.paragraphId):undefined,b=range.end?order.get(range.end.paragraphId):undefined;
    if(a===undefined||b===undefined||a>b||(a<=max&&b>=min))return true;
  }
  return false;
}
export interface IndexRefreshResult {
  state:EditorState;
  status:"updated"|"unchanged"|"unsupported"|"unresolved"|"nonconvergent";
  passes:number;
  updatedEntries:number;
  layout?:EditorLayoutDocument;
}

/** Stage, measure and verify a fixed point before publishing any change.
 * Retain original marker and source paragraph identities and selection.
 */
export function refreshIndexConvergently(original:EditorState,documentLocale?:string,
  paginate:(document:EditorDocument)=>EditorLayoutDocument=projectDocumentLayout,maxPasses=MAX_PASSES):IndexRefreshResult{
  let initialLayout:EditorLayoutDocument|undefined;
  const fail=(status:IndexRefreshResult["status"],passes:number):IndexRefreshResult=>
    ({state:original,status,passes,updatedEntries:0,layout:initialLayout});
  if(getActiveZone(original)!=="main"||original.trackChangesEnabled||!Number.isSafeInteger(maxPasses)||maxPasses<1)
    return fail("unsupported",0);
  const sectionIndex=getActiveSectionIndex(original),section=getDocumentSections(original.document)[sectionIndex];
  if(!section||section.pageSettings.columns?.count&&section.pageSettings.columns.count>1)return fail("unsupported",0);
  const region=findQualifiedIndexRegion(section.blocks);
  if(!region)return fail("unsupported",0);
  const beginId=section.blocks[region.start]!.id,endId=section.blocks[region.end]!.id;
  const oldIds=new Set(section.blocks.slice(region.start+1,region.end).map(b=>b.id));
  const occurrences=collectXeOccurrences(original.document);
  if(!occurrences)return fail("unsupported",0);
  const sourceSignature=JSON.stringify(occurrences);
  let current=original;
  const seen=new Set<string>();
  const limit=Math.min(maxPasses,MAX_PASSES);
  for(let pass=1;pass<=limit;pass++){
    let layout:EditorLayoutDocument;
    try{layout=paginate(current.document);}catch{return fail("unsupported",pass);}
    initialLayout??=layout;
    const sections=getDocumentSections(current.document),activeSection=sections[sectionIndex];
    const active=activeSection&&findQualifiedIndexRegion(activeSection.blocks);
    if(!activeSection||!active||active.raw!==region.raw||activeSection.blocks[active.start]!.id!==beginId||
      activeSection.blocks[active.end]!.id!==endId||JSON.stringify(collectXeOccurrences(current.document))!==sourceSignature)
      return fail("unsupported",pass);
    const plan=buildIndexPlan(current.document,layout,active.raw,documentLocale);
    if(!plan)return fail("unresolved",pass);
    const lines=renderIndexPlan(plan);
    if(!lines)return fail("unsupported",pass);
    const cache=activeSection.blocks.slice(active.start+1,active.end);
    if(cache.length===lines.length&&cache.every((p,i)=>matchesLine(p,lines[i]!))){
      return {state:current,status:current===original?"unchanged":"updated",passes:pass,
        updatedEntries:current===original?0:lines.length,layout};
    }
    if(hasCacheAnchors(original,oldIds))return fail("unsupported",pass);
    const signature=JSON.stringify([lines,layout.pages.map(p=>[p.index,p.sectionIndex])]);
    if(seen.has(signature))return fail("nonconvergent",pass);
    seen.add(signature);
    const blocks=[...activeSection.blocks.slice(0,active.start+1),...lines.map(makeLine),...activeSection.blocks.slice(active.end)];
    current={...current,document:{...current.document,sections:sections.map((s,i)=>i===sectionIndex?{...s,blocks}:s)},
      selection:original.selection};
  }
  return fail("nonconvergent",limit);
}
