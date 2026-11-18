import type { EditorState, EditorTextRun, EditorParagraphNode, EditorDocument, EditorDocxSourcePackage } from "@/core/model.js";
import { getActiveZone, getParagraphLength, getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import { createEditorNodeId } from "@/core/editorState.js";
import { normalizeSelection } from "@/core/selection.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import { insertRunsAtOffset } from "@/core/document/paragraphRuns.js";
import { getSelectedObjectRun } from "@/core/commands/selectedObjectRun.js";
import { captureOpaqueTransferManifest, type OpaqueTransferManifest } from "@/ooxml/word/opaqueTransferManifest.js";
import { inspectDocxOpaqueObjects } from "@/ooxml/word/opaqueObjects.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";
import { applyOpaqueTransferToDocx } from "@/export/docx/opc/applyOpaqueTransferToDocx.js";
import { captureRebuiltDocxPartHashes } from "@/export/docx/opc/rebuiltPartHashes.js";
import { captureDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { importDocxInWorker } from "@/import/docx/importDocxInWorker.js";

const fail=(message:string):never=>{throw Error("Opaque editor transfer rejected: "+message);};
function directBody(document:EditorDocument):EditorParagraphNode[]{
  if(document.sections?.length!==1)return fail("only one section is supported");
  return document.sections[0]!.blocks.filter((b):b is EditorParagraphNode=>b.type==="paragraph");
}
function checkState(state:EditorState):void{
  if(!state.document.sourcePackage||getActiveZone(state)!=="main"||state.document.sections?.length!==1||
    state.trackChangesEnabled||state.document.opaqueDeletionIntents?.length||state.document.opaqueRelocationIntent||
    state.document.bookmarks?.order.length||state.document.comments?.order.length)return fail("unsupported state or pending opaque edit");
}
/** Capture from a single selected original chart. No clipboard API yet. */
export function captureSelectedOpaqueChart(state:EditorState):OpaqueTransferManifest{
  checkState(state);
  const selected=getSelectedObjectRun(state,r=>r.kind==="opaque");
  if(!selected||selected.run.kind!=="opaque"||selected.run.revision||selected.run.sdtWrappers?.length||
    !directBody(state.document).some(p=>p.id===selected.paragraph.id))return fail("select one unwrapped chart in the main story");
  const source=state.document.sourcePackage!,opaque=selected.run.opaque;
  const matches=inspectDocxOpaqueObjects(source).objects.filter(o=>o.ownerPath===source.mainDocumentPart&&o.signature===opaque.signature);
  const object=matches.length===1?matches[0]:undefined;
  if(!object||object.fragmentXml!==opaque.fragmentXml||
    JSON.stringify(object.relationshipIds)!==JSON.stringify(opaque.relationshipIds))return fail("selection is not an unchanged original");
  return captureOpaqueTransferManifest(source,object);
}
// Compare ordered body content without depending on importer-generated IDs
// or the partitioning of adjacent text runs.
function bodyFingerprint(document:EditorDocument):string{
  return JSON.stringify(directBody(document).map(p=>{
    const objects:Array<[number,string,string]>=[];let offset=0;
    for(const r of p.runs){
      if(r.kind==="opaque")objects.push([offset,r.kind,r.opaque.signature]);
      offset+=r.text.length;
    }
    return [p.runs.map(r=>r.text).join(""),objects];
  }));
}
function insert(state:EditorState,paragraph:EditorParagraphNode,offset:number,run:EditorTextRun):EditorState{
  const inserted=insertRunsAtOffset(paragraph,offset,[run]);
  const position=paragraphOffsetToPosition(inserted,offset+1);
  return cloneStateWithParagraphs(state,getParagraphs(state).map(p=>p.id===paragraph.id?inserted:p),{anchor:position,focus:position});
}
/** Rebind existing model runs after a successful preservation export.
 * Serialization can change the inherited namespace declarations of a drawing
 * without changing its expanded-name signature. The old raw XML is no
 * longer the exact fragment of the new source snapshot. Do not weaken
 * serializer authorization: replace only verified original main-story runs
 * with freshly inspected fragments of the same unique identity and closure.
 */
function rebindMainStory(state:EditorState,source:EditorDocxSourcePackage):EditorState{
  const original=state.document.sourcePackage!;
  const oldObjects=inspectDocxOpaqueObjects(original).objects;
  const newObjects=inspectDocxOpaqueObjects(source).objects;
  const used=new Set<string>();
  const paragraphs=getParagraphs(state).map(paragraph=>{
    let changed=false;
    const runs=paragraph.runs.map(run=>{
      if(run.kind!=="opaque")return run;
      const opaque=run.opaque;
      const before=oldObjects.filter(o=>o.signature===opaque.signature);
      const after=newObjects.filter(o=>o.signature===opaque.signature);
      const a=before[0],b=after[0];
      if(before.length!==1||after.length!==1||!a||!b||
        a.ownerPath!==original.mainDocumentPart||b.ownerPath!==source.mainDocumentPart||
        a.kind!==opaque.objectKind||a.fragmentXml!==opaque.fragmentXml||
        JSON.stringify(a.relationshipIds)!==JSON.stringify(opaque.relationshipIds)||
        JSON.stringify(a.edges)!==JSON.stringify(b.edges)||
        JSON.stringify(a.partPaths)!==JSON.stringify(b.partPaths)||
        a.partPaths.some(path=>{
          const x=original.parts[path],y=source.parts[path];
          return !x||!y||x.kind!==y.kind||x.contentType!==y.contentType||x.encoding!==y.encoding||x.data!==y.data;
        })||used.has(a.signature))return fail("cannot rebind original chart provenance");
      used.add(a.signature);
      if(b.fragmentXml===opaque.fragmentXml)return run;
      changed=true;
      return {...run,opaque:{...opaque,fragmentXml:b.fragmentXml,relationshipIds:[...b.relationshipIds]}};
    });
    return changed?{...paragraph,runs}:paragraph;
  });
  return cloneStateWithParagraphs(state,paragraphs,state.selection);
}
/** Prepare an asynchronous, immutable editor transaction, not an immediate
 * mutation. The caller MUST compare the current state to the captured input
 * before committing the returned state as a single undoable transaction.
 * No native clipboard, arbitrary selection replacement or collaboration yet.
 * Rebase onto a privately staged, audited source snapshot, retaining model IDs.
 */
export async function prepareOpaqueChartPaste(state:EditorState,manifest:unknown):Promise<EditorState>{
  checkState(state);
  const selection=normalizeSelection(state);
  if(!selection.isCollapsed)return fail("paste requires a collapsed caret");
  const paragraph=getParagraphs(state)[selection.startIndex];
  const body=directBody(state.document),index=body.findIndex(p=>p.id===paragraph?.id);
  if(!paragraph||index<0)return fail("caret must be in a direct body paragraph");
  const offset=selection.startParagraphOffset;
  if(!Number.isSafeInteger(offset)||offset<0||offset>getParagraphLength(paragraph))return fail("invalid caret");
  // Initial support deliberately excludes complex target run boundaries.
  if(paragraph.runs.some(r=>r.kind!=="text"&&r.kind!=="opaque"||r.revision||r.sdtWrappers?.length||r.styles?.link))return fail("unsupported destination runs");
  // Validate the editable document's current preservation export before
  // allocating anything. Changes already made by the user are not discarded.
  const currentBytes=await exportEditorDocumentToDocxPreservingSource(state.document);
  const currentImported=await importDocxInWorker(currentBytes);
  if(bodyFingerprint(currentImported)!==bodyFingerprint(state.document))return fail("destination body projection mismatch");
  const staged=await applyOpaqueTransferToDocx(currentBytes,manifest,index);
  const source=await captureDocxSourcePackage(staged.buffer);
  const copied=source.opaqueObjects?.filter(o=>o.signature===staged.plan.destinationRun.signature&&o.ownerPath===source.mainDocumentPart);
  if(copied?.length!==1)return fail("staged chart identity mismatch");
  const data={...staged.plan.destinationRun,fragmentXml:copied[0]!.fragmentXml,relationshipIds:[...copied[0]!.relationshipIds]};
  const run:EditorTextRun={id:createEditorNodeId("run"),kind:"opaque",text:"\uFFFC",opaque:data,styles:{}};
  // Compute the baseline against the actual append staging location, NOT
  // the requested caret. Otherwise source preservation could resurrect the
  // append location when the intended insertion is in the middle of text.
  const rebound=rebindMainStory(state,source);
  const target=getParagraphs(rebound).find(p=>p.id===paragraph.id);
  if(!target)return fail("target paragraph lost during rebind");
  const appended=insert(rebound,target,getParagraphLength(target),run);
  const baselineDocument={...appended.document,sourcePackage:source};
  const stagedImported=await importDocxInWorker(staged.buffer);
  if(bodyFingerprint(stagedImported)!==bodyFingerprint(baselineDocument))return fail("staged body projection mismatch");
  source.rebuiltPartHashes=await captureRebuiltDocxPartHashes(baselineDocument,source);
  const next=insert(rebound,target,offset,run);
  const candidate={...next,document:{...next.document,sourcePackage:source}};
  // Prove the actual source-aware export placed the object at the requested
  // offset; existing opaque audit alone cannot distinguish in-story positions.
  const result=await exportEditorDocumentToDocxPreservingSource(candidate.document);
  const reopened=await importDocxInWorker(result);
  if(bodyFingerprint(reopened)!==bodyFingerprint(candidate.document))return fail("exported caret position mismatch");
  return candidate;
}
