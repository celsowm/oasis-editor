import type { EditorState } from "@/core/model.js";
import { getParagraphs, getParagraphLength, paragraphOffsetToPosition, getActiveZone } from "@/core/model.js";
import { getSelectedObjectRun } from "./selectedObjectRun.js";
import { deleteSelectionRange } from "@/core/selection/rangeEditing.js";
import { insertRunsAtOffset } from "@/core/document/paragraphRuns.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { cloneRun } from "@/core/document/clone.js";
import { planOpaqueStoryRelocation, resolveOpaqueDefaultStoryOwner } from "@/ooxml/word/opaqueStoryRelocation.js";

export interface OpaqueRelocationDestination {
  zone: "main" | "header" | "footer";
  paragraphId: string;
  offset: number;
}
/** Transactional command for a unique inline opaque object. Throws on an
 * unsupported operation, before returning any changed state. */
export function relocateSelectedOpaqueObject(state:EditorState,destination:OpaqueRelocationDestination):EditorState{
  const source=state.document.sourcePackage,zone=getActiveZone(state);
  if(!source||state.document.sections?.length!==1||state.trackChangesEnabled||state.document.opaqueRelocationIntent||state.document.opaqueDeletionIntents?.length)throw Error("Relocation requires a single-section source-backed document without pending opaque edits or tracked changes");
  if(zone!=="main"&&zone!=="header"&&zone!=="footer")throw Error("Unsupported source zone");
  if(zone===destination.zone||(zone!=="main"&&state.activeHeaderFooterStory&&state.activeHeaderFooterStory!=="default"))throw Error("Only distinct default stories are supported");
  if(state.document.bookmarks?.order.length||state.document.comments?.order.length)throw Error("Cross-story anchors are not supported");
  const selected=getSelectedObjectRun(state,r=>r.kind==="opaque");
  if(!selected||selected.run.kind!=="opaque"||selected.run.opaque.placement!=="inline"||selected.run.revision||selected.run.sdtWrappers?.length)throw Error("Select exactly one unwrapped inline opaque object");
  const oldOwner=resolveOpaqueDefaultStoryOwner(source,zone),newOwner=resolveOpaqueDefaultStoryOwner(source,destination.zone);
  const signature=selected.run.opaque.signature;
  const originals=(source.opaqueObjects??[]).filter(o=>o.signature===signature);
  const original=originals.length===1?originals[0]:undefined;
  if(!original||original.ownerPath!==oldOwner)throw Error("Ambiguous source identity");
  const plan=planOpaqueStoryRelocation(source,original,newOwner);
  const section=state.document.sections[0]!;
  const fromBlocks=zone==="main"?section.blocks:section[zone];
  const toBlocks=destination.zone==="main"?section.blocks:section[destination.zone];
  if(!fromBlocks?.some(b=>b.type==="paragraph"&&b.id===selected.paragraph.id)||!toBlocks?.some(b=>b.type==="paragraph"&&b.id===destination.paragraphId))throw Error("Only top-level paragraphs of existing stories are supported");
  const targetState={...state,activeSectionIndex:0,activeZone:destination.zone,activeHeaderFooterStory:"default" as const};
  const target=getParagraphs(targetState).find(p=>p.id===destination.paragraphId);
  if(!target||!Number.isInteger(destination.offset)||destination.offset<0||destination.offset>getParagraphLength(target))throw Error("Invalid destination offset");
  const removed=deleteSelectionRange(state);
  const nextState={...removed,activeZone:destination.zone,activeSectionIndex:0,activeHeaderFooterStory:"default" as const};
  const paragraphs=getParagraphs(nextState);
  const nextTarget=paragraphs.find(p=>p.id===destination.paragraphId);
  if(!nextTarget)throw Error("Destination unavailable after deletion");
  const run=cloneRun(selected.run);
  if(run.kind!=="opaque")throw Error("Invalid cloned object");
  const inserted=insertRunsAtOffset(nextTarget,destination.offset,[{...run,opaque:plan.destinationRun}]);
  const next=cloneStateWithParagraphs(nextState,paragraphs.map(p=>p.id===inserted.id?inserted:p),{
    anchor:paragraphOffsetToPosition(inserted,destination.offset),
    focus:paragraphOffsetToPosition(inserted,destination.offset+1)
  });
  return {...next,document:{...next.document,opaqueRelocationIntent:{ownerPath:original.ownerPath,ordinal:original.ordinal,signature:original.signature,destinationOwner:newOwner}}};
}
