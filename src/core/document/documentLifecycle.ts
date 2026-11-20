import type { EditorDocument } from "@/core/model.js";

/** Host-confirmed events only. Exporting a Blob, displaying a print dialog
 * or cancelling it is not evidence that a save/print happened.
 * Return a snapshot; the host decides whether and how to persist it. */
export function recordConfirmedDocumentEvent(document:EditorDocument,event:"created"|"saved"|"printed",epochMs:number):EditorDocument{
  if(!Number.isSafeInteger(epochMs))return document;
  const date=new Date(epochMs);
  if(!Number.isFinite(date.getTime())||date.getUTCFullYear()<1||date.getUTCFullYear()>9999)return document;
  const prior=document.coreTimestamps?.[event];
  if(prior===epochMs||event==="created"&&prior!==undefined)return document;
  return {...document,coreTimestamps:{...document.coreTimestamps,[event]:epochMs}};
}
