import { keyOf, dimensions } from "./registry.mjs";
const witnessed=new Set(["partial","supported"]);
export function compareReports(previous,current) {
  if(previous.version!==1||current.version!==1||!Array.isArray(previous.entries)||!Array.isArray(current.entries)) throw Error("Incompatible capability reports");
  if(previous.evidenceMode!=="runner-results"||current.evidenceMode!=="runner-results") throw Error("Regression comparison requires runner evidence on both reports");
  const now=new Map(current.entries.map(e=>[keyOf(e),e]));
  const regressions=[];
  for(const before of previous.entries){
    const after=now.get(keyOf(before));
    for(const d of dimensions){
      const old=before.support[d], next=after?.support[d]??"removed";
      if(witnessed.has(old)&&(!witnessed.has(next)||(old==="supported"&&next==="partial"))) regressions.push({key:keyOf(before),dimension:d,before:old,after:next});
    }
  }
  return regressions;
}
