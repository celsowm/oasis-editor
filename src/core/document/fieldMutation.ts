import type { EditorParagraphNode, EditorState, EditorTextRun } from "@/core/model.js";
import { getParagraphLength, getParagraphs } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { cloneRun } from "./clone.js";
import { sliceRuns } from "./paragraphRunQuery.js";

export const hasFieldMarkers=(p:EditorParagraphNode):boolean=>
  p.runs.some(r=>r.kind==="fieldChar"||r.kind==="fieldInstruction");

/** A temporary conservative guard, NOT a semantic story graph.
 * Open or malformed streams protect the entire active zone until the
 * story-aware field engine can distinguish independent stories/ranges.
 * Balanced paragraph-local spans allow ordinary neighboring text edits.
 */
export function protectedFieldRanges(p:EditorParagraphNode):Array<{start:number;end:number}>|undefined{
  const ranges:Array<{start:number;end:number}>=[];
  let depth=0,start=0,offset=0;
  for(const r of p.runs){
    if(r.kind==="fieldChar"){
      if(r.fieldChar.kind==="begin"){
        if(depth===0)start=offset;
        depth++;
      }else if(r.fieldChar.kind==="end"){
        if(!depth)return undefined;
        if(--depth===0)ranges.push({start,end:offset});
      }else if(!depth)return undefined;
    }else if(r.kind==="fieldInstruction"&&!depth)return undefined;
    offset+=r.text.length;
  }
  return depth?undefined:ranges;
}
export function fieldRangeProtected(p:EditorParagraphNode,start:number,end:number):boolean{
  const ranges=protectedFieldRanges(p);
  if(!ranges)return true;
  return ranges.some(r=>start===end
    ? start>=r.start&&start<=r.end
    : r.start===r.end?start<r.start&&end>r.end:start<r.end&&end>r.start);
}
export function hasUnresolvedFieldStory(state:EditorState):boolean{
  return getParagraphs(state).some(p=>protectedFieldRanges(p)===undefined);
}
export function fieldSelectionProtected(state:EditorState):boolean{
  const paragraphs=getParagraphs(state);
  if(paragraphs.some(p=>protectedFieldRanges(p)===undefined))return true;
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
