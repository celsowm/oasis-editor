import type { EditorParagraphNode, EditorPosition, EditorState, EditorTextRun } from "@/core/model.js";
import { getParagraphLength, positionToParagraphOffset, getParagraphs, getActiveZone, getDocumentSections, getBlockParagraphs, getEditableBlocksForZone } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { cloneRun } from "./clone.js";
import { sliceRuns } from "./paragraphRunQuery.js";
import { buildFieldStoryGraph } from "./fieldStoryGraph.js";

export const hasFieldMarkers=(p:EditorParagraphNode):boolean=>
  p.runs.some(r=>r.kind==="fieldChar"||r.kind==="fieldInstruction");

/** The paragraph-local mutation gate deliberately remains conservative.
 * The story graph knows cross-paragraph topology, but mutation commands have
 * not yet been qualified to operate across those spans. */
export function protectedFieldRanges(p:EditorParagraphNode):Array<{start:number;end:number}>|undefined{
  if(!hasFieldMarkers(p))return [];
  const graph=buildFieldStoryGraph([p]);
  if(graph.diagnostics.length)return undefined;
  return graph.spans.filter(s=>s.parentIndex===null).map(s=>({
    start:s.begin.offset,end:s.end!.offset,
  }));
}
export function fieldRangeProtected(p:EditorParagraphNode,start:number,end:number):boolean{
  const ranges=protectedFieldRanges(p);
  if(!ranges)return true;
  return ranges.some(r=>start===end
    ? start>=r.start&&start<=r.end
    : r.start===r.end?start<r.start&&end>r.end:start<r.end&&end>r.start);
}
/** Main XML is a single story even when the editor scopes selection to one
 * section. Related stories are resolved independently by the editing zone.
 * Text boxes are inline objects; their internal blocks are not flattened. */
function editableStory(state:EditorState){
  const zone=getActiveZone(state);
  const blocks=zone==="main"
    ? getDocumentSections(state.document).flatMap(s=>s.blocks)
    : getEditableBlocksForZone(state,zone);
  const paragraphs=blocks.flatMap(getBlockParagraphs);
  return {paragraphs,hasTables:blocks.some(b=>b.type==="table")};
}

/** Single-paragraph text edits, not structural edits. Closed caret boundaries
 * deliberately remain ambiguous; a nonempty range may abut a field but may
 * never remove a character within it or straddle an invisible field. */
export function fieldInlineRangeProtected(state:EditorState,p:EditorParagraphNode,start:number,end:number,affinity?:EditorPosition["fieldBoundaryAffinity"]):boolean{
  const story=editableStory(state);
  if(!story.paragraphs.some(hasFieldMarkers))return false;
  const index=story.paragraphs.indexOf(p);
  if(index<0)return true;
  const graph=buildFieldStoryGraph(story.paragraphs);
  if(graph.diagnostics.length)return true;
  const spans=graph.spans.filter(s=>s.parentIndex===null);
  // Table/cell topology is not qualified for cross-paragraph mutation.
  if(story.hasTables&&spans.some(s=>s.begin.paragraphIndex!==s.end!.paragraphIndex))return true;
  return spans.some(s=>{
    const last=s.end!;
    if(index<s.begin.paragraphIndex||index>last.paragraphIndex)return false;
    const left=index===s.begin.paragraphIndex?s.begin.offset:0;
    const right=index===last.paragraphIndex?last.offset:getParagraphLength(p);
    if(index>s.begin.paragraphIndex&&index<last.paragraphIndex)return true;
    if(start===end){
      if(start<left||start>right)return false;
      // Only actual outer edges can be escaped, never a clipped edge of
      // a span continuing from/to another paragraph. A zero-width span
      // may be escaped on either explicit side.
      if(start===left&&index===s.begin.paragraphIndex&&affinity==="before-markers")return false;
      if(start===right&&index===last.paragraphIndex&&affinity==="after-markers")return false;
      return true;
    }
    return left===right?start<left&&end>right:start<right&&end>left;
  });
}
export function fieldInlineSelectionProtected(state:EditorState):boolean{
  const paragraphs=getParagraphs(state);
  const s=normalizeSelection(state,paragraphs);
  if(s.startIndex!==s.endIndex)return fieldSelectionProtected(state);
  return fieldInlineRangeProtected(state,paragraphs[s.startIndex]!,s.startParagraphOffset,s.endParagraphOffset);
}
/** Affinity is deliberately opt-in, and only for an exact, valid raw
 * collapsed position. Never infer it from normalized visible offsets. */
export function fieldInsertionProtected(state:EditorState):boolean{
  const {anchor,focus}=state.selection;
  if(anchor.paragraphId!==focus.paragraphId||anchor.runId!==focus.runId||
     anchor.offset!==focus.offset||anchor.fieldBoundaryAffinity!==focus.fieldBoundaryAffinity)return true;
  const p=getParagraphs(state).find(p=>p.id===focus.paragraphId);
  const run=p?.runs.find(r=>r.id===focus.runId);
  if(!p||!run||!Number.isInteger(focus.offset)||focus.offset<0||focus.offset>run.text.length)return true;
  const offset=positionToParagraphOffset(p,focus);
  return fieldInlineRangeProtected(state,p,offset,offset,focus.fieldBoundaryAffinity);
}
export function hasUnresolvedFieldStory(state:EditorState):boolean{
  // Keep the structural guard conservative, including fields spanning sections.
  return editableStory(state).paragraphs.some(p=>protectedFieldRanges(p)===undefined);
}
export function fieldSelectionProtected(state:EditorState):boolean{
  const paragraphs=getParagraphs(state);
  if(hasUnresolvedFieldStory(state))return true;
  const s=normalizeSelection(state,paragraphs);
  for(let i=s.startIndex;i<=s.endIndex;i++){
    const p=paragraphs[i]!;
    const start=i===s.startIndex?s.startParagraphOffset:0;
    const end=i===s.endIndex?s.endParagraphOffset:getParagraphLength(p);
    if(fieldRangeProtected(p,start,end))return true;
    // Merging paragraphs with a zero-width field at the join is ambiguous.
    if(s.startIndex!==s.endIndex&&hasFieldMarkers(p))return true;
  }
  return false;
}
/** Rebuild a range without ever sending invisible controls to a text mapper.
 * Unlike sliceRuns (clipboard/visible selection), every zero-width run is
 * visited exactly once. The mapper is called only for visible intersections. */
export function mapFieldAdjacentRuns(p:EditorParagraphNode,start:number,end:number,mapper:(r:EditorTextRun)=>EditorTextRun|null):EditorTextRun[]{
  const result:EditorTextRun[]=[];
  let offset=0;
  for(const r of p.runs){
    const next=offset+r.text.length;
    const a=Math.max(offset,start),b=Math.min(next,end);
    if(a>=b){result.push(cloneRun(r));}
    else{
      const single={...p,runs:[r]};
      result.push(...sliceRuns(single,0,a-offset));
      for(const piece of sliceRuns(single,a-offset,b-offset)){
        const mapped=mapper(piece);
        if(mapped)result.push(mapped);
      }
      result.push(...sliceRuns(single,b-offset,r.text.length));
    }
    offset=next;
  }
  return result;
}
