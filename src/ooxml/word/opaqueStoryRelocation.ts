import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorDocxOpaqueObject, EditorDocxSourcePackage, EditorOpcRelationship, EditorOpaqueRunData } from "@/core/model.js";
import { resolveOpcRelationshipTarget } from "@/ooxml/opc/packageXml.js";
import { inspectDocxOpaqueObjects, projectOpaqueRunElement, resolveOpaqueClosure } from "@/ooxml/word/opaqueObjects.js";

const R="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const STRICT_R="http://purl.oclc.org/ooxml/officeDocument/relationships";
const O="urn:schemas-microsoft-com:office:office";
const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const own=(source:EditorDocxSourcePackage,path:string)=>Object.hasOwn(source.parts,path);
const safePath=(path:string)=>/^[A-Za-z0-9_.\-/]+$/.test(path)&&!path.startsWith("/")&&!path.split("/").some(s=>!s||s==="."||s==="..");
const safeTarget=(target:string)=>/^[A-Za-z0-9_.\-/]+$/.test(target);
function parse(xml:string):XmlElement{
  if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))throw Error("Unsafe XML declaration");
  const root=new DOMParser({onError:()=>{throw Error("Malformed XML");}}).parseFromString(xml,"application/xml").documentElement;
  if(!root)throw Error("Missing XML root");
  return root;
}
function elements(root:XmlElement):XmlElement[]{
  const result:XmlElement[]=[],pending=[root];
  while(pending.length){
    const el=pending.pop()!;result.push(el);
    for(const n of Array.from(el.childNodes))if(n.nodeType===1)pending.push(n as XmlElement);
  }
  return result;
}
function rebase(owner:string,target:string):string{
  const from=owner.split("/").slice(0,-1),to=target.split("/");
  while(from.length&&to.length&&from[0]===to[0]){from.shift();to.shift();}
  const value="../".repeat(from.length)+to.join("/");
  if(resolveOpcRelationshipTarget(owner,value)!==target)throw Error("Cannot rebase target");
  return value;
}
export interface OpaqueStoryRelocationPlan {
  sourceOwner: string;
  destinationOwner: string;
  sourceOrdinal: number;
  sourceSignature: string;
  destinationRun: EditorOpaqueRunData;
  addedRelationships: EditorOpcRelationship[];
  idMapping: Array<{from:string;to:string}>;
  sharedPartPaths: string[];
}
/**
 * Plan ONLY. Existing same-package main/header/footer owners, unique original
 * object, unambiguous internal explicit relationships. Does not edit the
 * source, delete old edges, authorize export or create another object.
 * The caller must commit movement and a dedicated audit atomically.
 */
export function planOpaqueStoryRelocation(source:EditorDocxSourcePackage,identity:Pick<EditorDocxOpaqueObject,"ownerPath"|"ordinal"|"signature">,destinationOwner:string):OpaqueStoryRelocationPlan{
  if(identity.ownerPath===destinationOwner)throw Error("Same-story move does not need relationship relocation");
  if(!safePath(identity.ownerPath)||!safePath(destinationOwner)||!own(source,destinationOwner))throw Error("Unknown or unsafe destination story");
  const report=inspectDocxOpaqueObjects(source);
  if(report.diagnostics.some(d=>d.level==="error"))throw Error("Opaque source inventory has errors");
  const originals=report.objects.filter(o=>o.signature===identity.signature);
  const object=originals.length===1?originals[0]:undefined;
  if(!object||object.ownerPath!==identity.ownerPath||object.ordinal!==identity.ordinal)throw Error("Ambiguous original object");
  const dest=source.parts[destinationOwner]!;
  const main=source.parts[source.mainDocumentPart];
  const supportedStory=(path:string)=>{
    const part=source.parts[path];
    if(!part||part.kind!=="xml")return false;
    const root=parse(part.data);
    if(root.namespaceURI!==W)return false;
    if(path===source.mainDocumentPart)return root.localName==="document";
    const kind=root.localName==="hdr"?"header":root.localName==="ftr"?"footer":undefined;
    return Boolean(kind&&part.contentType==="application/vnd.openxmlformats-officedocument.wordprocessingml."+kind+"+xml"&&main?.relationships?.some(r=>r.targetMode!=="External"&&r.type===R+"/"+kind&&r.resolvedTarget===path));
  };
  if(!supportedStory(object.ownerPath)||!supportedStory(destinationOwner))throw Error("Unsupported or unlinked story");
  if(object.partPaths.includes(destinationOwner)||object.partPaths.includes(object.ownerPath))throw Error("Story-dependent object closure");
  const root=parse(object.fragmentXml),destRoot=parse(dest.data);
  // wp:docPr IDs must not collide with existing drawing IDs in the new story.
  const WP="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
  const docPrIds=new Set(elements(destRoot).filter(e=>e.namespaceURI===WP&&e.localName==="docPr").map(e=>e.getAttribute("id")));
  if(elements(root).some(e=>e.namespaceURI===WP&&e.localName==="docPr"&&docPrIds.has(e.getAttribute("id"))))throw Error("Destination drawing ID collision");
  const originalRelationships=source.parts[object.ownerPath]?.relationships??[];
  const destinationRelationships=dest.relationships??[];
  const occupied=new Set(destinationRelationships.map(r=>r.id));
  if(occupied.size!==destinationRelationships.length)throw Error("Duplicate destination relationship IDs");
  // Also reserve names appearing in unknown or unresolved destination markup.
  const destValues=elements(destRoot).flatMap(el=>Array.from(el.attributes).map(a=>a.value));
  let nextId=1;
  const allocate=()=>{
    let id:string;
    do{id="rIdOasisOpaque"+nextId++;}while(occupied.has(id)||dest.data.includes(id)||destValues.some(v=>v.includes(id)));
    occupied.add(id);return id;
  };
  const map=new Map<string,string>(),addedRelationships:EditorOpcRelationship[]=[];
  for(const id of object.relationshipIds){
    const matches=originalRelationships.filter(r=>r.id===id);
    const r=matches.length===1?matches[0]:undefined;
    if(!r||r.targetMode==="External"||!r.resolvedTarget||!safeTarget(r.target)||!safePath(r.resolvedTarget)||!own(source,r.resolvedTarget)||resolveOpcRelationshipTarget(object.ownerPath,r.target)!==r.resolvedTarget)throw Error("Unsupported or ambiguous direct relationship "+id);
    const newId=allocate();
    map.set(id,newId);
    addedRelationships.push({...r,id:newId,target:rebase(destinationOwner,r.resolvedTarget),targetMode:"Internal"});
  }
  const seen=new Set<string>();
  for(const el of elements(root)){
    for(const attr of Array.from(el.attributes)){
      const isRel=attr.namespaceURI===R||attr.namespaceURI===STRICT_R||(attr.namespaceURI===O&&attr.localName==="relid");
      const remapped=map.get(attr.value);
      if(isRel&&remapped){
        seen.add(attr.value);el.setAttributeNS(attr.namespaceURI!,attr.name,remapped);
      }else if(!isRel&&attr.namespaceURI!=="http://www.w3.org/2000/xmlns/"&&[...map.keys()].some(id=>attr.value===id)){
        throw Error("Unknown attribute may carry a relationship reference");
      }else if(isRel&&attr.value&&!remapped){
        throw Error("Unmapped relationship reference");
      }
    }
  }
  if(seen.size!==map.size)throw Error("Source relationship reference missing");
  const destinationRun=projectOpaqueRunElement(root);
  if(!destinationRun||destinationRun.objectKind!==object.kind)throw Error("Relocation changed object kind");
  // Prove the rewritten root still closes over exactly the same immutable
  // targets. Nested relationships keep their owning parts and original IDs.
  const simulated:EditorDocxSourcePackage={...source,parts:{...source.parts,[destinationOwner]:{...dest,relationships:[...destinationRelationships,...addedRelationships]}}};
  const closure=resolveOpaqueClosure(simulated,destinationOwner,destinationRun.relationshipIds);
  if(closure.issues.length||JSON.stringify(closure.partPaths)!==JSON.stringify(object.partPaths))throw Error("Relocated relationship closure differs");
  return {sourceOwner:object.ownerPath,destinationOwner,sourceOrdinal:object.ordinal,sourceSignature:object.signature,destinationRun,addedRelationships,idMapping:[...map].map(([from,to])=>({from,to})),sharedPartPaths:[...object.partPaths]};
}

/** Resolve only explicit, unshared default stories of a single-section package.
 * The caller must also ensure the editable model still has one section. */
export function resolveOpaqueDefaultStoryOwner(source:EditorDocxSourcePackage,zone:"main"|"header"|"footer"):string{
  const main=source.parts[source.mainDocumentPart];
  if(!main||main.kind!=="xml")throw Error("Missing main story");
  const root=parse(main.data);
  const sections=elements(root).filter(e=>e.namespaceURI===W&&e.localName==="sectPr"&&!(e.parentNode?.nodeType===1&&(e.parentNode as XmlElement).localName==="sectPrChange"));
  if(sections.length!==1)throw Error("Only one original section is supported");
  if(zone==="main")return source.mainDocumentPart;
  const refs=Array.from(sections[0]!.childNodes).filter((node):node is XmlElement=>node.nodeType===1&&(node as XmlElement).namespaceURI===W&&["headerReference","footerReference"].includes((node as XmlElement).localName??""));
  const selected=refs.filter(e=>e.localName===zone+"Reference"&&e.getAttributeNS(W,"type")==="default");
  if(selected.length!==1)throw Error("Missing or ambiguous default story");
  const id=selected[0]!.getAttributeNS(R,"id");
  const matches=(main.relationships??[]).filter(r=>r.id===id&&r.type===R+"/"+zone&&r.targetMode!=="External");
  const path=matches.length===1?matches[0]!.resolvedTarget:undefined;
  if(!path||!own(source,path))throw Error("Unresolved story owner");
  if(refs.filter(e=>(main.relationships??[]).some(r=>r.id===e.getAttributeNS(R,"id")&&r.resolvedTarget===path)).length!==1)throw Error("Shared or aliased story");
  return path;
}
