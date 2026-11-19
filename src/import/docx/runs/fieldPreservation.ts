import type { ImportedRun } from "./types.js";
import { stylesEqual } from "@/core/textStyle/textStyleMutations.js";

/** Scalar projection must never flatten typed objects, markers, links or
 * distinct formatting. Conservative: retain runs on any ambiguous shape. */
export function canProjectFieldResult(runs:readonly ImportedRun[]):boolean{
  const first=runs[0];
  return runs.every(r=>!r.bookmark&&!r.comment&&!r.opaque&&!r.image&&!r.textBox&&
    !r.math&&!r.sym&&!r.footnoteReference&&!r.endnoteReference&&!r.revision&&
    !r.revisionRangeMarker&&!r.sdtWrappers?.length&&!r.field&&!r.fieldChar&&
    r.fieldInstruction===undefined&&!r.styles?.link&&
    stylesEqual(first?.styles,r.styles));
}

/** Accept only a single well-ordered complex span. A missing separator is
 * permitted for the legacy instruction-only PAGE representation. */
export function inspectScalarFieldSpan(span:readonly ImportedRun[]):ImportedRun[]|undefined{
  if(span[0]?.fieldChar?.kind!=="begin"||span.at(-1)?.fieldChar?.kind!=="end")return undefined;
  let separated=false,hasInstruction=false;
  const result:ImportedRun[]=[];
  for(let i=0;i<span.length;i++){
    const run=span[i]!;
    if(run.fieldChar){
      if(run.fieldChar.fieldLock||run.fieldChar.dirty)return undefined;
      if(i===0||i===span.length-1)continue;
      if(run.fieldChar.kind!=="separate"||separated||!hasInstruction)return undefined;
      separated=true;
    }else if(run.fieldInstruction!==undefined){
      if(separated)return undefined;
      hasInstruction=true;
    }else{
      if(!separated)return undefined;
      result.push(run);
    }
  }
  return hasInstruction&&canProjectFieldResult(result)?result:undefined;
}
