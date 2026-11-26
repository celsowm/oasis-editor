import type {EditorState,EditorTextRun,EditorParagraphNode,EditorDocument,EditorLayoutDocument} from "@/core/model.js";
import {getActiveZone,getActiveSectionIndex,getDocumentSections,getParagraphLength,positionToParagraphOffset} from "@/core/model.js";
import {createEditorParagraph,createEditorRun} from "@/core/editorState.js";
import {isSelectionCollapsed} from "@/core/selection.js";
import {getEditorParagraphOoxmlSource} from "@/ooxml/word/sourceFragments.js";
import {buildFieldStoryGraph} from "@/core/document/fieldStoryGraph.js";
import {parseFieldInstruction} from "@/ooxml/word/fieldInstruction.js";
import {parseXeInstruction,collectXeOccurrences} from "@/core/document/xeEntries.js";
import {parseIndexInstruction} from "@/core/document/indexPlan.js";
import {refreshIndexConvergently} from "@/core/document/indexRefresh.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";

export interface MarkIndexEntryOptions {
  path:readonly string[];
  identifier?:string;
  boldPage?:boolean;
  italicPage?:boolean;
}
export interface InsertIndexOptions {
  locale:string;
  identifier?:string;
}
function instruction(text:string,hidden=false):EditorTextRun{
  return {...createEditorRun(""),kind:"fieldInstruction",fieldInstruction:text,...(hidden?{styles:{hidden:true}}:{})};
}
function control(kind:"begin"|"separate"|"end",hidden=false):EditorTextRun{
  return {...createEditorRun(""),kind:"fieldChar",fieldChar:{kind},...(hidden?{styles:{hidden:true}}:{})};
}
function safeContext(state:EditorState){
  if(getActiveZone(state)!=="main"||state.trackChangesEnabled||!isSelectionCollapsed(state.selection))return undefined;
  const sections=getDocumentSections(state.document),index=getActiveSectionIndex(state),section=sections[index];
  if(!section||section.blocks.some(b=>b.type!=="paragraph"))return undefined;
  const paragraphs=section.blocks as EditorParagraphNode[];
  const at=paragraphs.findIndex(p=>p.id===state.selection.focus.paragraphId),p=paragraphs[at];
  if(!p||positionToParagraphOffset(p,state.selection.focus)!==getParagraphLength(p)||
    p.sdtWrappers?.length||p.list||p.numberingRevision||p.dropCap||p.style?.propertyRevision||
    p.runs.some(r=>r.revision||r.revisionRangeMarker||r.sdtWrappers?.length||r.styles?.propertyRevision))return undefined;
  const graph=buildFieldStoryGraph(paragraphs);
  if(graph.diagnostics.length)return undefined;
  return {sections,index,section,paragraphs,at,p,graph};
}
function replace(state:EditorState,c:NonNullable<ReturnType<typeof safeContext>>,blocks:EditorParagraphNode[]):EditorState{
  return {...state,document:{...state.document,sections:c.sections.map((s,i)=>i===c.index?{...s,blocks}:s)}};
}
function validId(id:string|undefined):boolean{return id===undefined||/^[A-Za-z]$/.test(id);}

/** First authoring slice: append a hidden XE at an explicit paragraph-end
 * caret. Do not split runs, move anchors, edit imported paragraph XML or
 * allow markers within another complex field. Caller supplies the entry text.
 */
export function markIndexEntry(state:EditorState,options:MarkIndexEntryOptions):EditorState{
  const c=safeContext(state);
  if(!c||!validId(options.identifier)||!Array.isArray(options.path)||!options.path.length||
    options.path.some(p=>typeof p!=="string"||p.trim()!==p||!p||/[:;\\\u0000-\u001f\u007f]/.test(p)))return state;
  if(getEditorParagraphOoxmlSource(c.p)||c.p.runs.some(r=>r.kind!=="text"||r.styles?.hidden||r.styles?.rtl)||
    c.graph.spans.some(f=>f.begin.paragraphIndex<=c.at&&(f.end?.paragraphIndex??Infinity)>=c.at))return state;
  // No boundary token ordering changes on a paragraph with anchored ranges.
  if([...Object.values(state.document.bookmarks?.items??{}),...Object.values(state.document.comments?.items??{})]
    .some(b=>b.start?.paragraphId===c.p.id||b.end?.paragraphId===c.p.id))return state;
  const label=options.path.join(":").replace(/"/g,'\\"');
  const raw=' XE "'+label+'"'+(options.identifier?' \\f '+options.identifier:"")+
    (options.boldPage?' \\b':"")+(options.italicPage?' \\i':"")+" ";
  if(!parseXeInstruction(raw))return state;
  const marked={...c.p,runs:[...c.p.runs,control("begin",true),instruction(raw,true),control("end",true)]};
  const next=replace(state,c,c.paragraphs.map((p,i)=>i===c.at?marked:p));
  return collectXeOccurrences(next.document)?next:state;
}

/** Insert one INDEX after an explicit paragraph-end caret. The blank
 * provisional cache never becomes visible unless regeneration converges.
 * Existing indexes, anchored documents and complex field boundaries are
 * deliberately excluded in this first authoring slice.
 */
export function insertIndex(state:EditorState,options:InsertIndexOptions,
  paginate:(doc:EditorDocument)=>EditorLayoutDocument=projectDocumentLayout):EditorState{
  const c=safeContext(state);
  if(!c||!validId(options.identifier)||typeof options.locale!=="string"||
    !/^[A-Za-z]{2,3}(?:-[A-Za-z]{2})?$/.test(options.locale)||
    Object.keys(state.document.bookmarks?.items??{}).length||Object.keys(state.document.comments?.items??{}).length)return state;
  if(c.graph.spans.some(f=>f.begin.paragraphIndex<=c.at&&(f.end?.paragraphIndex??Infinity)>c.at))return state;
  for(const section of c.sections){
    if(section.blocks.some(b=>b.type!=="paragraph"))return state;
    const graph=buildFieldStoryGraph(section.blocks as EditorParagraphNode[]);
    if(graph.diagnostics.length||graph.spans.some(f=>{
      const raw=f.code.map(p=>p.kind==="instruction"?p.raw:"").join("");
      return parseFieldInstruction(raw).command==="INDEX"||/^\s*INDEX(?=\s|\\|"|$)/i.test(raw);
    }))return state;
  }
  const raw=' INDEX \\z "'+options.locale+'"'+(options.identifier?' \\f '+options.identifier:"")+" ";
  if(!parseIndexInstruction(raw))return state;
  const begin=createEditorParagraph("");begin.runs=[control("begin"),instruction(raw),control("separate")];
  const end=createEditorParagraph("");end.runs=[control("end")];
  const candidate=replace(state,c,[...c.paragraphs.slice(0,c.at+1),begin,end,...c.paragraphs.slice(c.at+1)]);
  const result=refreshIndexConvergently(candidate,undefined,paginate);
  return result.status==="updated"?result.state:state;
}

export function updateIndex(state:EditorState,locale?:string):EditorState{
  const result=refreshIndexConvergently(state,locale);
  return result.status==="updated"?result.state:state;
}
