import type {
  EditorDocument, EditorLayoutDocument, EditorParagraphNode, EditorPosition, EditorState,
} from "@/core/model.js";
import { getActiveZone, getDocumentSections } from "@/core/model.js";
import { createDocumentFieldContext } from "@/core/document/fieldDocumentContext.js";
import { evaluateField } from "@/core/document/fieldEvaluation.js";
import { indexFieldStory, isPlainFieldRun, type FieldProjectionCandidate } from "./fieldResultProjection.js";
import { projectDocumentLayout } from "./documentLayout.js";

const MAX_PASSES = 6;
const MAX_RESULT_LENGTH = 65536;
type Paginate = (document: EditorDocument) => EditorLayoutDocument;
interface RunEdit { runIndex:number; runId:string; start:number; end:number; text:string }
interface ParagraphEdit { paragraph:EditorParagraphNode; edits:RunEdit[] }
interface Anchor { paragraphId:string; offset:number }
interface RangeItem { start?:Anchor; end?:Anchor }
interface RangeRegistry { items:Record<string,RangeItem>; order:string[] }

export interface BodyFieldRefreshResult {
  state:EditorState;
  layout:EditorLayoutDocument;
  status:"updated"|"unchanged"|"unsupported"|"nonconvergent";
  passes:number;
  updatedFields:number;
}
const defaultPaginate:Paginate = document => projectDocumentLayout(document,undefined,undefined,undefined,{cachedBodyPageFields:true});

function mapAnchor<A extends Anchor>(anchor:A, edits:Map<string,ParagraphEdit>):A {
  const change=edits.get(anchor.paragraphId);
  if(!change)return anchor;
  let delta=0;
  for(const edit of change.edits){
    if(anchor.offset<=edit.start)break;
    if(anchor.offset<edit.end)throw Error("interior anchor must be rejected before mapping");
    delta+=edit.text.length-(edit.end-edit.start);
  }
  return delta ? {...anchor,offset:anchor.offset+delta}:anchor;
}
function mapRegistry<R extends RangeRegistry>(registry:R|undefined,edits:Map<string,ParagraphEdit>):R|undefined{
  if(!registry)return registry;
  let changed=false;
  const items={...registry.items};
  for(const [id,item] of Object.entries(items)){
    const start=item.start?mapAnchor(item.start,edits):undefined;
    const end=item.end?mapAnchor(item.end,edits):undefined;
    if(start!==item.start||end!==item.end){items[id]={...item,start,end};changed=true;}
  }
  return changed?{...registry,items}:registry;
}
function mapPosition(position:EditorPosition,edits:Map<string,ParagraphEdit>):EditorPosition{
  const change=edits.get(position.paragraphId);
  const edit=change?.edits.find(e=>e.runId===position.runId);
  if(!edit)return position;
  // Positions at the run's end follow the new end; interior positions were
  // rejected. Adjacent positions keep stable run ids and local offsets.
  return position.offset===edit.end-edit.start ? {...position,offset:edit.text.length}:position;
}
function safeParagraph(p:EditorParagraphNode):boolean{
  return !p.list&&!p.dropCap&&!p.sdtWrappers?.length&&!p.numberingRevision&&!p.style?.bidi&&
    (!p.style?.textDirection||p.style.textDirection==="lrTb")&&p.runs.every(isPlainFieldRun)&&
    new Set(p.runs.map(r=>r.id)).size===p.runs.length;
}
function collectAnchors(state:EditorState):Map<string,number[]>{
  const result=new Map<string,number[]>();
  for(const registry of [state.document.bookmarks,state.document.comments]){
    for(const item of Object.values(registry?.items??{})){
      for(const anchor of [item.start,item.end]){
        if(!anchor)continue;
        const offsets=result.get(anchor.paragraphId)??[];
        offsets.push(anchor.offset); result.set(anchor.paragraphId,offsets);
      }
    }
  }
  return result;
}

/** A dry, all-or-nothing cache refresh. Each pass measures the changed model,
 * then reevaluates against its new physical pages; only a fixed point is
 * returned. The original state is returned on cycles, exhausted passes or
 * loss of a previously qualified field. No editor/history/UI side effects.
 * Repeated header/footer fields cannot have one universal PAGE result and
 * are excluded from this transaction. */
export function refreshBodyFieldCaches(
  original:EditorState, paginate:Paginate=defaultPaginate,
):BodyFieldRefreshResult{
  const originalLayout=paginate(original.document);
  const fallback=(status:BodyFieldRefreshResult["status"],passes:number):BodyFieldRefreshResult=>
    ({state:original,layout:originalLayout,status,passes,updatedFields:0});
  const sections=getDocumentSections(original.document);
  const blocks=sections.flatMap(s=>s.blocks);
  if(original.trackChangesEnabled||getActiveZone(original)!=="main"||
      Object.keys(original.document.footnotes?.items??{}).length||
      Object.keys(original.document.endnotes?.items??{}).length||
      sections.some((s,i)=>i>0&&s.breakType&&s.breakType!=="nextPage")||
      blocks.some(b=>b.type!=="paragraph")||
      new Set(blocks.map(b=>b.id)).size!==blocks.length)return fallback("unsupported",0);
  const candidates=new Map<string,FieldProjectionCandidate[]>();
  indexFieldStory(blocks,candidates);
  if(!candidates.size)return fallback("unchanged",0);
  let state=original,layout=originalLayout;
  const touched=new Set<string>();
  const signatures=new Set<string>();
  for(let pass=1;pass<=MAX_PASSES;pass++){
    const context=createDocumentFieldContext(state.document,layout);
    const currentSections=getDocumentSections(state.document);
    const anchors=collectAnchors(state);
    const pageByParagraph=new Map<string,number|null>();
    for(const page of layout.pages){
      for(const block of page.blocks){
        if(block.sourceBlock.type!=="paragraph"||!block.layout)continue;
        const id=block.sourceBlock.id;
        if(!pageByParagraph.has(id))pageByParagraph.set(id,page.index);
        else if(pageByParagraph.get(id)!==page.index)pageByParagraph.set(id,null);
      }
    }
    const edits=new Map<string,ParagraphEdit>();
    const qualified=new Set<string>();
    const signature:string[]=[];
    for(const section of currentSections){
      for(const p of section.blocks){
        if(p.type!=="paragraph"||!safeParagraph(p))continue;
        const group=candidates.get(p.id),pageIndex=pageByParagraph.get(p.id);
        if(!group||pageIndex===null||pageIndex===undefined)continue;
        const fieldContext=context.forPage(pageIndex);
        const offsets:number[]=[];
        let offset=0;
        for(const run of p.runs){offsets.push(offset);offset+=run.text.length;}
        for(const {runIndex,field} of group){
          const run=p.runs[runIndex]!;
          const key=JSON.stringify([p.id,runIndex]);
          signature.push(JSON.stringify([key,run.text,pageIndex]));
          if(field.type==="PAGE"&&!field.format&&section.pageNumbering?.format&&section.pageNumbering.format!=="decimal")continue;
          if(field.type==="PAGEREF"&&currentSections.some(s=>s.pageNumbering?.format&&s.pageNumbering.format!=="decimal"))continue;
          const result=evaluateField(field,fieldContext,run.text);
          const start=offsets[runIndex]!,end=start+run.text.length;
          if(result.status!=="resolved"||!result.text.length||result.text.length>MAX_RESULT_LENGTH||
              !run.text.length||/[\r\n\t]/.test(result.text)||Array.from(result.text).length!==result.text.length)continue;
          if(result.text!==run.text&&(
            (anchors.get(p.id)??[]).some(o=>!Number.isInteger(o)||o<0||o>offset||(o>start&&o<end))||
            [state.selection.anchor,state.selection.focus].some(pos=>pos.paragraphId===p.id&&pos.runId===run.id&&
              pos.offset!==0&&pos.offset!==run.text.length)))continue;
          qualified.add(key);
          if(result.text===run.text)continue;
          const entry=edits.get(p.id)??{paragraph:p,edits:[]};
          entry.edits.push({runIndex,runId:run.id,start,end,text:result.text});
          edits.set(p.id,entry);
          touched.add(key);
        }
      }
    }
    if([...touched].some(key=>!qualified.has(key)))return fallback("nonconvergent",pass);
    if(!edits.size)return {state,layout,status:state===original?"unchanged":"updated",passes:pass,updatedFields:touched.size};
    const sig=JSON.stringify([layout.pages.length,signature]);
    if(signatures.has(sig))return fallback("nonconvergent",pass);
    signatures.add(sig);
    for(const entry of edits.values())entry.edits.sort((a,b)=>a.start-b.start);
    const document:EditorDocument={...state.document,
      sections:currentSections.map(section=>({...section,blocks:section.blocks.map(p=>{
        const change=edits.get(p.id);
        if(p.type!=="paragraph"||!change)return p;
        const byRun=new Map(change.edits.map(e=>[e.runIndex,e.text]));
        return {...p,runs:p.runs.map((run,i)=>byRun.has(i)?{...run,text:byRun.get(i)!}:run)};
      })})),
      bookmarks:mapRegistry(state.document.bookmarks,edits),
      comments:mapRegistry(state.document.comments,edits),
    };
    state={...state,document,selection:{
      anchor:mapPosition(state.selection.anchor,edits),
      focus:mapPosition(state.selection.focus,edits),
    }};
    layout=paginate(document);
  }
  return fallback("nonconvergent",MAX_PASSES);
}
