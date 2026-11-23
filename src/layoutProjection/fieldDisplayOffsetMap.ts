import type { EditorLayoutDisplayOffsetSpan } from "@/core/model.js";

/** Project a visual caret boundary back to the source DOCX coordinate system.
 * The interior of a display-only replacement is not editable: it snaps to
 * the start of its cached result; the final boundary maps to sourceEnd. */
export function displayOffsetToSource(
  offset:number,spans:readonly EditorLayoutDisplayOffsetSpan[] | undefined,
):number {
  if(!spans?.length)return offset;
  let delta=0,previousEnd=-1;
  for(const span of spans){
    if(span.displayStart<previousEnd||span.displayEnd<=span.displayStart||
      span.sourceStart<0||span.sourceEnd<=span.sourceStart) return offset;
    if(offset<span.displayStart)return offset+delta;
    if(offset<span.displayEnd)return span.sourceStart;
    delta=span.sourceEnd-span.displayEnd;
    previousEnd=span.displayEnd;
  }
  return offset+delta;
}

/** Construct monotonic per-field mapping from unchanged original run lengths.
 * The painter uses visual lengths; hit tests use the source mapping instead. */
export function buildDisplayOffsetMap(
  sourceLengths:readonly number[],visualLengths:readonly number[],
):EditorLayoutDisplayOffsetSpan[] {
  if(sourceLengths.length!==visualLengths.length)return [];
  const spans:EditorLayoutDisplayOffsetSpan[]=[];
  let source=0,display=0;
  for(let i=0;i<sourceLengths.length;i++){
    const from=sourceLengths[i]!,to=visualLengths[i]!;
    if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<0||to<0)
      return [];
    if(from!==to){
      if(from===0||to===0)return [];
      spans.push({displayStart:display,displayEnd:display+to,sourceStart:source,sourceEnd:source+from});
    }
    source+=from;display+=to;
  }
  return spans;
}
