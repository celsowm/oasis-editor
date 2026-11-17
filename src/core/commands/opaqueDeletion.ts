import type { EditorState, EditorTextRun } from "@/core/model.js";
import { getActiveZone, getParagraphLength, getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { deleteSelectionRange } from "@/core/selection/rangeEditing.js";

/** Returns undefined for ordinary text edits, or the resulting state when
 * a keyboard deletion touches exactly one opaque replacement character.
 * Ambiguous provenance, non-main stories and tracked deletion are no-ops
 * until their relationship and revision semantics can be proven.
 */
export function tryDeleteOpaqueObject(state: EditorState, direction: "backward" | "forward"): EditorState | undefined {
  const paragraphs=getParagraphs(state);
  const selection=normalizeSelection(state,paragraphs);
  if(selection.startIndex!==selection.endIndex)return undefined;
  const paragraph=paragraphs[selection.startIndex];
  if(!paragraph)return undefined;
  let start=selection.startParagraphOffset,end=selection.endParagraphOffset;
  if(selection.isCollapsed){
    if(direction==="backward")start-=1;
    else end+=1;
  }
  if(start<0||end>getParagraphLength(paragraph)||end-start!==1)return undefined;
  let offset=0;
  let target:Extract<EditorTextRun,{kind:"opaque"}>|undefined;
  for(const run of paragraph.runs){
    if(offset===start&&run.kind==="opaque"&&run.text==="\uFFFC"){target=run;break;}
    offset+=run.text.length;
  }
  if(!target)return undefined;
  if(state.trackChangesEnabled||target.revision||getActiveZone(state)!=="main")return state;
  const source=state.document.sourcePackage;
  if(!source)return state;
  const signature=target.opaque.signature;
  // Global uniqueness avoids confusing a copied object from a different
  // story with the original. Same-signature originals need occurrence IDs.
  const matches=(source.opaqueObjects??[]).filter(o=>o.signature===signature);
  if(matches.length!==1||matches[0]!.ownerPath!==source.mainDocumentPart||matches[0]!.issues.length)return state;
  const sourceObject=matches[0]!;
  const existing=state.document.opaqueDeletionIntents??[];
  if(existing.some(i=>i.ownerPath===sourceObject.ownerPath&&i.ordinal===sourceObject.ordinal))return state;
  // Delegate actual removal to the normal range command so surrounding
  // text, selections, comments and bookmarks use the usual edit path.
  const next=deleteSelectionRange({...state,selection:{
    anchor:paragraphOffsetToPosition(paragraph,start),
    focus:paragraphOffsetToPosition(paragraph,end),
  }});
  const intent={ownerPath:sourceObject.ownerPath,ordinal:sourceObject.ordinal,signature:sourceObject.signature};
  return {...next,document:{...next.document,opaqueDeletionIntents:[...existing,intent]}};
}
