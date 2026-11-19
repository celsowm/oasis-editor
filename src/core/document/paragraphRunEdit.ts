import type { EditorParagraphNode, EditorTextRun } from "@/core/model.js";
import { cloneRun } from "./clone.js";
import { getParagraphLength } from "@/core/model.js";
import { cloneStyle } from "@/core/textStyle/textStyleMutations.js";
import { buildParagraphFromRuns } from "./paragraphRunBuild.js";
import { getStyleAtOffset, sliceRuns } from "./paragraphRunQuery.js";

export function insertRunsAtOffset(
  paragraph: EditorParagraphNode,
  offset: number,
  textRuns: EditorTextRun[],
): EditorParagraphNode {
  const fieldMarkers = paragraph.runs.some(r => r.kind === "fieldChar" || r.kind === "fieldInstruction");
  const { beforeRuns, afterRuns } = fieldMarkers
    ? splitForFieldAdjacentInsertion(paragraph, offset)
    : { beforeRuns: sliceRuns(paragraph, 0, offset), afterRuns: sliceRuns(paragraph, offset, getParagraphLength(paragraph)) };
  const fallbackStyles = getStyleAtOffset(paragraph, offset);

  return buildParagraphFromRuns(
    paragraph,
    [
      ...beforeRuns,
      ...textRuns.map((run) => ({
        ...run,
        styles: cloneStyle(run.styles ?? fallbackStyles),
      })),
      ...afterRuns,
    ],
    fallbackStyles,
  );
}

/** Preserve the zero-width field stream during a single-paragraph insertion.
 * At ambiguous exact boundaries preserve marker order and insert after the
 * encountered markers (before subsequent visible text). General selection
 * deletion, multi-paragraph splits and field-range semantics require a
 * story-aware field span model; this is not that model. */
export function splitForFieldAdjacentInsertion(paragraph:EditorParagraphNode,offset:number):{
  beforeRuns:EditorTextRun[];afterRuns:EditorTextRun[];
}{
  const beforeRuns:EditorTextRun[]=[],afterRuns:EditorTextRun[]=[];
  const position=Math.max(0,Math.min(offset,getParagraphLength(paragraph)));
  let consumed=0;
  for(const run of paragraph.runs){
    const start=consumed,end=start+run.text.length;
    if(!run.text.length){
      (start<=position?beforeRuns:afterRuns).push(cloneRun(run));
    }else if(end<=position)beforeRuns.push(cloneRun(run));
    else if(start>=position)afterRuns.push(cloneRun(run));
    else{
      // Reuse existing object-aware slicing for the one visible run bisected
      // by the caret; do not use it for the zero-length instruction stream.
      const single={...paragraph,runs:[run]};
      beforeRuns.push(...sliceRuns(single,0,position-start));
      afterRuns.push(...sliceRuns(single,position-start,run.text.length));
    }
    consumed=end;
  }
  return {beforeRuns,afterRuns};
}
