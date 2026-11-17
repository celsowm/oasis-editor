import { DOMParser } from "@xmldom/xmldom";
import type {
  EditorDocxOpaqueObject, EditorDocxSourcePackage, EditorOpcRelationship, EditorOpcPart,
} from "@/core/model.js";
import { inspectDocxOpaqueObjects, projectOpaqueRunElement, resolveOpaqueClosure } from "./opaqueObjects.js";
import { resolveOpcRelationshipTarget } from "@/ooxml/opc/packageXml.js";

const R="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const MS="http://schemas.microsoft.com/office/2011/relationships";
const WP="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const CT="application/vnd.openxmlformats-officedocument.";
const LIMIT=16*1024*1024;
const MAX_PARTS=128,MAX_EDGES=4096;
const allowedTypes=new Map<string,ReadonlySet<string>>([
  [R+"/chart",new Set([CT+"drawingml.chart+xml"])],
  [MS+"/chartStyle",new Set(["application/vnd.ms-office.chartstyle+xml"])],
  [MS+"/chartColorStyle",new Set(["application/vnd.ms-office.chartcolorstyle+xml"])],
  [R+"/image",new Set(["image/png","image/jpeg","image/gif","image/bmp","image/tiff"])],
  [R+"/package",new Set([CT+"spreadsheetml.sheet"])],
]);
export const OPAQUE_TRANSFER_FORMAT="oasis.opc-chart-transfer.v1";
export interface OpaqueTransferPart {
  path:string;
  contentType:string;
  kind:"xml"|"binary";
  encoding:"utf8"|"base64";
  data:string;
  relationships:EditorOpcRelationship[];
}
export interface OpaqueTransferManifest {
  format:typeof OPAQUE_TRANSFER_FORMAT;
  ownerPath:string;
  fragmentXml:string;
  signature:string;
  relationships:EditorOpcRelationship[];
  parts:OpaqueTransferPart[];
}
const fail=(reason:string):never=>{throw Error("Opaque transfer rejected: "+reason);};
function record(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=="object"||Array.isArray(value))return fail("expected record");
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null)return fail("unexpected record prototype");
  return value as Record<string,unknown>;
}
function string(value:unknown,max=LIMIT):string{
  if(typeof value!=="string"||!value.length||value.length>max)return fail("invalid string or size");
  return value;
}
function array(value:unknown,max:number):unknown[]{
  if(!Array.isArray(value)||value.length>max)return fail("invalid array or count");
  return value;
}
function safePath(value:unknown):string{
  const p=string(value,512);
  if(!/^[A-Za-z0-9_.\-/]+$/.test(p)||p.split("/").some(s=>!s||s==="."||s===".."||s==="_rels")||p.endsWith(".rels")||p==="__proto__"||p==="constructor"||p==="prototype")return fail("unsafe part path");
  return p;
}
function parseXml(xml:string){
  if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))return fail("unsafe XML declaration");
  const root=new DOMParser({onError:()=>fail("malformed XML")}).parseFromString(xml,"application/xml").documentElement;
  if(!root)return fail("missing XML root");
  return root;
}
function relation(value:unknown,owner:string):EditorOpcRelationship{
  const r=record(value),id=string(r.id,256),type=string(r.type,512),target=string(r.target,512);
  if(!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(id)||!allowedTypes.has(type))return fail("unsupported relationship");
  if(r.targetMode!==undefined&&r.targetMode!=="Internal")return fail("external relationship");
  if(!/^[A-Za-z0-9_.\-/]+$/.test(target))return fail("unsafe relationship URI");
  const resolvedTarget=safePath(r.resolvedTarget);
  if(resolveOpcRelationshipTarget(owner,target)!==resolvedTarget)return fail("inconsistent relationship target");
  return {id,type,target,targetMode:"Internal",resolvedTarget};
}
function relationships(value:unknown,owner:string):EditorOpcRelationship[]{
  const entries=array(value,MAX_EDGES).map(v=>relation(v,owner));
  if(new Set(entries.map(r=>r.id)).size!==entries.length)return fail("duplicate relationship ID");
  return entries;
}
function validatePart(value:unknown):OpaqueTransferPart{
  const p=record(value),path=safePath(p.path),contentType=string(p.contentType,256),data=string(p.data);
  const xml=contentType.endsWith("+xml");
  if(![...allowedTypes.values()].some(types=>types.has(contentType)))return fail("unsupported content type");
  if(p.kind!==(xml?"xml":"binary")||p.encoding!==(xml?"utf8":"base64"))return fail("inconsistent part encoding");
  if(!xml&&!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data))return fail("invalid base64");
  if(xml)parseXml(data);
  return {path,contentType,kind:xml?"xml":"binary",encoding:xml?"utf8":"base64",data,relationships:relationships(p.relationships,path)};
}
/** Validate the detached transport at every receiving boundary. This proves
 * structural closure, not authenticity or safety of the embedded workbook.
 * No document, ZIP, browser clipboard, network or execution side effect. */
export function validateOpaqueTransferManifest(value:unknown):OpaqueTransferManifest{
  const m=record(value);
  if(m.format!==OPAQUE_TRANSFER_FORMAT)return fail("unsupported format");
  const ownerPath=safePath(m.ownerPath),fragmentXml=string(m.fragmentXml,1024*1024),signature=string(m.signature,2*1024*1024);
  const ownerRelationships=relationships(m.relationships,ownerPath);
  const parts=array(m.parts,MAX_PARTS).map(validatePart);
  // Count UTF-8 bytes conservatively by UTF-16 length x3, rather than
  // allocating a second copy of each large payload.
  if(3*(fragmentXml.length+signature.length+parts.reduce((n,p)=>n+p.data.length,0))>LIMIT)return fail("aggregate size limit");
  if(ownerRelationships.length+parts.reduce((n,p)=>n+p.relationships.length,0)>MAX_EDGES)return fail("aggregate relationship limit");
  const root=parseXml(fragmentXml),run=projectOpaqueRunElement(root);
  if(root.namespaceURI!==WP||root.localName!=="drawing"||!run||run.objectKind!=="chart"||run.placement!=="inline"||run.signature!==signature)return fail("unsupported or changed chart fragment");
  const chartRels=ownerRelationships.filter(r=>r.type===R+"/chart");
  if(chartRels.length!==1||ownerRelationships.some(r=>r.type!==R+"/chart")||
    JSON.stringify([...run.relationshipIds].sort())!==JSON.stringify(ownerRelationships.map(r=>r.id).sort()))return fail("chart relationship mismatch");
  const byPath=new Map(parts.map(p=>[p.path,p]));
  if(byPath.size!==parts.length||byPath.has(ownerPath))return fail("duplicate or story-dependent part");
  // Reject case-insensitive aliases, even on case-sensitive hosts.
  if(new Set([ownerPath,...byPath.keys()].map(p=>p.toLowerCase())).size!==parts.length+1)return fail("aliased part path");
  const queue=[...ownerRelationships],visited=new Set<string>();
  for(let i=0;i<queue.length;i++){
    const edge=queue[i]!,target=byPath.get(edge.resolvedTarget!);
    if(!target||!allowedTypes.get(edge.type)?.has(target.contentType))return fail("missing dependency or incompatible relationship type");
    if(visited.has(target.path))continue;
    visited.add(target.path);
    // Only chart XML owns dependencies in v1. Other allowed parts are leaves.
    if(target.contentType!==CT+"drawingml.chart+xml"&&target.relationships.length)return fail("unsupported nested dependency owner");
    if(target.relationships.some(r=>r.type===R+"/chart"))return fail("nested chart dependency");
    queue.push(...target.relationships);
  }
  if(visited.size!==parts.length)return fail("unreachable payload part");
  return {format:OPAQUE_TRANSFER_FORMAT,ownerPath,fragmentXml,signature,relationships:ownerRelationships,parts:parts.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)};
}

/** Snapshot exactly one original, unchanged inline chart and its transitive
 * dependency closure. Source inventory is always recomputed; callers must
 * still prove the selected model run matches this object before copying. */
export function captureOpaqueTransferManifest(source:EditorDocxSourcePackage,identity:Pick<EditorDocxOpaqueObject,"ownerPath"|"ordinal"|"signature">):OpaqueTransferManifest{
  const report=inspectDocxOpaqueObjects(source);
  if(report.diagnostics.some(d=>d.level==="error"))return fail("source inspection errors");
  const matches=report.objects.filter(o=>o.signature===identity.signature);
  const object=matches.length===1?matches[0]:undefined;
  if(!object||object.ownerPath!==identity.ownerPath||object.ordinal!==identity.ordinal)return fail("ambiguous original identity");
  if(object.kind!=="chart"||object.geometry?.placement!=="inline")return fail("only inline charts are supported");
  const closure=resolveOpaqueClosure(source,object.ownerPath,object.relationshipIds);
  if(closure.issues.length)return fail("unresolved source closure");
  const owner=source.parts[object.ownerPath]!;
  const parts=closure.partPaths.map(path=>{
    const p:EditorOpcPart|undefined=Object.hasOwn(source.parts,path)?source.parts[path]:undefined;
    if(!p)return fail("missing source part");
    return {path:p.path,contentType:p.contentType,kind:p.kind,encoding:p.encoding,data:p.data,relationships:p.relationships??[]};
  });
  return validateOpaqueTransferManifest({format:OPAQUE_TRANSFER_FORMAT,ownerPath:object.ownerPath,fragmentXml:object.fragmentXml,signature:object.signature,
    relationships:(owner.relationships??[]).filter(r=>object.relationshipIds.includes(r.id)),parts});
}
