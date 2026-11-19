import type { EditorState } from "@/core/model.js";
import type { OpaqueTransferManifest } from "@/ooxml/word/opaqueTransferManifest.js";
import { captureSelectedOpaqueChart } from "@/app/controllers/opaqueTransferTransaction.js";

/** Native clipboard carries ONLY an unpredictable handle, not raw XML or
 * workbook bytes. A single bounded in-memory record is shared by editor
 * instances in this module's realm. Never hydrate a manifest from an external
 * clipboard. Cross-tab/reload/other-app transfer requires a later trust design.
 */
export const OPAQUE_CHART_CLIPBOARD_TYPE="application/x-oasis-chart-token";
// Async ClipboardItem custom formats use the standardized "web " prefix.
// Native ClipboardEvent implementations may expose either spelling.
export const OPAQUE_CHART_WEB_TYPE="web "+OPAQUE_CHART_CLIPBOARD_TYPE;
export function isOpaqueChartClipboardType(type:string):boolean{
  return type===OPAQUE_CHART_CLIPBOARD_TYPE||type===OPAQUE_CHART_WEB_TYPE;
}
const TTL_MS=5*60*1000;
let sequence=0;
let latest:{token:string;manifest:OpaqueTransferManifest;expires:number}|undefined;
/** Prepare the copy synchronously in the user gesture. Only a confirmed
 * write publishes the manifest. Superseded asynchronous writes never revive it. */
export function stageOpaqueChartToken(state:EditorState):{token:string;confirm:()=>boolean}{
  const id=++sequence;
  latest=undefined;
  const manifest=captureSelectedOpaqueChart(state);
  const token=globalThis.crypto.randomUUID();
  let confirmed=false;
  return {token,confirm:()=>{
    if(confirmed||id!==sequence)return false;
    confirmed=true;
    latest={token,manifest,expires:Date.now()+TTL_MS};
    return true;
  }};
}
export function writeOpaqueChartToken(state:EditorState,transfer:DataTransfer):boolean{
  try{
    const staged=stageOpaqueChartToken(state);
    transfer.setData(OPAQUE_CHART_CLIPBOARD_TYPE,staged.token);
    if(!Array.from(transfer.types).includes(OPAQUE_CHART_CLIPBOARD_TYPE))return false;
    return staged.confirm();
  }catch{
    return false;
  }
}
export function readOpaqueChartToken(token:string):OpaqueTransferManifest|undefined{
  if(latest&&Date.now()>=latest.expires)latest=undefined;
  return latest&&latest.token===token?structuredClone(latest.manifest):undefined;
}
