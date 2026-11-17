import JSZip from "jszip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type { EditorDocxSourcePackage, EditorDocxOpaqueObject } from "@/core/model.js";
import type { OpaqueStoryRelocationPlan } from "@/ooxml/word/opaqueStoryRelocation.js";
import { resolveOpaqueClosure } from "@/ooxml/word/opaqueObjects.js";
import { OPC_RELATIONSHIPS_NAMESPACE } from "@/ooxml/opc/packageXml.js";

export function expectedOpaqueRelocation(source:EditorDocxSourcePackage,plan:OpaqueStoryRelocationPlan){
  const original=source.opaqueObjects?.find(o=>o.ownerPath===plan.sourceOwner&&o.ordinal===plan.sourceOrdinal&&o.signature===plan.sourceSignature);
  const destination=source.parts[plan.destinationOwner];
  if(!original||!destination)throw Error("Relocation source missing");
  const simulated={...source,parts:{...source.parts,[plan.destinationOwner]:{...destination,relationships:[...(destination.relationships??[]),...plan.addedRelationships]}}};
  const closure=resolveOpaqueClosure(simulated,plan.destinationOwner,plan.destinationRun.relationshipIds);
  if(closure.issues.length)throw Error("Invalid relocation closure");
  const expected:EditorDocxOpaqueObject={...original,ownerPath:plan.destinationOwner,signature:plan.destinationRun.signature,fragmentXml:plan.destinationRun.fragmentXml,relationshipIds:plan.destinationRun.relationshipIds,...closure};
  return {original,expected};
}
/** Runs AFTER source path overlay, against actual OPC paths. Never overwrite a
 * relationship already present in the output; the final audit checks the exact
 * rewritten fragment, full closure and every unrelated opaque object. */
export async function applyOpaqueStoryRelocation(buffer:ArrayBuffer,plan:OpaqueStoryRelocationPlan):Promise<ArrayBuffer>{
  const zip=await JSZip.loadAsync(buffer);
  if(!zip.file(plan.destinationOwner))throw Error("Original destination story was not retained");
  const slash=plan.destinationOwner.lastIndexOf("/");
  const path=(slash>=0?plan.destinationOwner.slice(0,slash+1):"")+"_rels/"+plan.destinationOwner.slice(slash+1)+".rels";
  const xml=await zip.file(path)?.async("string")??'<Relationships xmlns="'+OPC_RELATIONSHIPS_NAMESPACE+'"/>';
  if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))throw Error("Unsafe relationship XML");
  const doc=new DOMParser({onError:()=>{throw Error("Malformed relationships");}}).parseFromString(xml,"application/xml");
  const root=doc.documentElement;
  if(!root||root.namespaceURI!==OPC_RELATIONSHIPS_NAMESPACE||root.localName!=="Relationships")throw Error("Invalid destination relationships");
  const ids=new Set<string>();
  for(const el of Array.from(root.getElementsByTagNameNS(OPC_RELATIONSHIPS_NAMESPACE,"Relationship"))){
    const id=el.getAttribute("Id");
    if(!id||ids.has(id))throw Error("Duplicate destination relationship");
    ids.add(id);
  }
  for(const rel of plan.addedRelationships){
    if(ids.has(rel.id)||!rel.resolvedTarget||!zip.file(rel.resolvedTarget))throw Error("Relocation relationship collision or missing target");
    ids.add(rel.id);
    const el=doc.createElementNS(OPC_RELATIONSHIPS_NAMESPACE,root.prefix?root.prefix+":Relationship":"Relationship");
    el.setAttribute("Id",rel.id);el.setAttribute("Type",rel.type);el.setAttribute("Target",rel.target);
    root.appendChild(el);
  }
  zip.file(path,new XMLSerializer().serializeToString(doc));
  return zip.generateAsync({type:"arraybuffer"});
}
