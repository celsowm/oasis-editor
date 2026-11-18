import type { EditorState } from "@/core/model.js";
import type { OpaqueTransferManifest } from "@/ooxml/word/opaqueTransferManifest.js";
import { captureSelectedOpaqueChart } from "@/app/controllers/opaqueTransferTransaction.js";

/** Native clipboard carries ONLY an unpredictable handle, not raw XML or
 * workbook bytes. A single bounded in-memory record is shared by editor
 * instances in this module's realm. Never hydrate a manifest from an external
 * clipboard. Cross-tab/reload/other-app transfer requires a later trust design.
 */
export const OPAQUE_CHART_CLIPBOARD_TYPE="application/x-oasis-chart-token";
const TTL_MS=5*60*1000;
let latest:{token:string;manifest:OpaqueTransferManifest;expires:number}|undefined;
export function writeOpaqueChartToken(state:EditorState,transfer:DataTransfer):boolean{
  // Drop the previous record even on failure; never associate stale data with
  // a new successful-looking copy. No text or HTML replacement fallback.
  latest=undefined;
  try{
    const manifest=captureSelectedOpaqueChart(state);
    const token=globalThis.crypto.randomUUID();
    transfer.setData(OPAQUE_CHART_CLIPBOARD_TYPE,token);
    if(!Array.from(transfer.types).includes(OPAQUE_CHART_CLIPBOARD_TYPE))return false;
    latest={token,manifest,expires:Date.now()+TTL_MS};
    return true;
  }catch{
    return false;
  }
}
export function readOpaqueChartToken(token:string):OpaqueTransferManifest|undefined{
  if(latest&&Date.now()>=latest.expires)latest=undefined;
  return latest&&latest.token===token?structuredClone(latest.manifest):undefined;
}
