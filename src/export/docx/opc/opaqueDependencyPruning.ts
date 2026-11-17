import JSZip from "jszip";
import { DOMParser, XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorDocument, EditorDocxSourcePackage, EditorOpcRelationship } from "@/core/model.js";
import { getOpcRelationshipOwnerPath, resolveOpcRelationshipTarget, OPC_CONTENT_TYPES_PATH, OPC_CONTENT_TYPES_NAMESPACE, OPC_RELATIONSHIPS_NAMESPACE } from "@/ooxml/opc/packageXml.js";
import { inspectDocxOpaqueObjects } from "@/ooxml/word/opaqueObjects.js";

type Intent = NonNullable<EditorDocument["opaqueDeletionIntents"]>[number];
type Edge = {owner: string | null; relPath: string; id: string; type: string; target: string; mode: "Internal" | "External"; resolved?: string};
export interface OpaquePruningPlan {
  removeEdges: Edge[];
  removeParts: string[];
  skippedReason?: string;
}
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
const explicitTypes = new Set(["chart","diagramData","diagramLayout","diagramQuickStyle","diagramColors","oleObject","package","image"].map(t=>R+t));
const own=(s:EditorDocxSourcePackage,p:string)=>Object.hasOwn(s.parts,p);
const elementChildren=(el:XmlElement)=>Array.from(el.childNodes).filter((n):n is XmlElement=>n.nodeType===1);
function parse(xml:string){
  if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))throw Error("Unsupported XML declarations");
  const doc=new DOMParser({onError:()=>{throw Error("Invalid XML");}}).parseFromString(xml,"application/xml");
  if(!doc.documentElement)throw Error("Missing XML root");
  return doc;
}
function plainPath(path:string){
  return /^[A-Za-z0-9_.\-/]+$/.test(path)&&!path.startsWith("/")&&!path.split("/").some(s=>s===""||s==="."||s==="..");
}
function graph(source:EditorDocxSourcePackage):Edge[]{
  const all:Edge[]=[];
  for(const [path,part] of Object.entries(source.parts)){
    const owner=getOpcRelationshipOwnerPath(path);
    if(owner===undefined)continue;
    if(owner!==null&&!own(source,owner))throw Error("Relationship without owner");
    if(part.kind!=="xml")throw Error("Non-XML relationship part");
    const root=parse(part.data).documentElement!;
    if(root.namespaceURI!==OPC_RELATIONSHIPS_NAMESPACE||root.localName!=="Relationships")throw Error("Invalid relationship root");
    const seen=new Set<string>();
    for(const el of elementChildren(root)){
      if(el.namespaceURI!==OPC_RELATIONSHIPS_NAMESPACE||el.localName!=="Relationship")throw Error("Unknown relationship element");
      const id=el.getAttribute("Id"),type=el.getAttribute("Type"),target=el.getAttribute("Target");
      const mode=el.getAttribute("TargetMode")||"Internal";
      if(!id||!type||!target||seen.has(id)||(mode!=="Internal"&&mode!=="External"))throw Error("Invalid or duplicate relationship");
      seen.add(id);
      const edge:Edge={owner,relPath:path,id,type,target,mode};
      if(mode==="Internal"){
        if(!/^[A-Za-z0-9_.\-/]+$/.test(target))throw Error("Ambiguous internal relationship URI");
        const resolved=resolveOpcRelationshipTarget(owner,target);
        if(!resolved||!plainPath(resolved)||!own(source,resolved)||getOpcRelationshipOwnerPath(resolved)!==undefined||resolved===OPC_CONTENT_TYPES_PATH)throw Error("Unresolved internal relationship");
        edge.resolved=resolved;
      }
      all.push(edge);
    }
  }
  return all;
}
function safeCandidate(path:string,source:EditorDocxSourcePackage,output:EditorDocxSourcePackage):boolean{
  const a=source.parts[path],b=output.parts[path];
  if(!a||!b||!plainPath(path)||a.kind!==b.kind||a.data!==b.data||a.contentType!==b.contentType||a.encoding!==b.encoding)return false;
  const ct=a.contentType??"";
  return (
    (/^word\/charts\//.test(path)&&/^application\/vnd\.(?:openxmlformats-officedocument\.drawingml\.chart|ms-office\.chart(?:style|colorstyle))\+xml$/i.test(ct))||
    (/^word\/diagrams\//.test(path)&&/^application\/vnd\.openxmlformats-officedocument\.drawingml\.diagram(?:Data|Layout|Style|Colors)\+xml$/i.test(ct))||
    (/^word\/embeddings\//.test(path)&&/^(?:application\/vnd\.openxmlformats-officedocument\.(?:spreadsheetml\.sheet|wordprocessingml\.document|presentationml\.presentation|oleObject)|application\/vnd\.ms-excel)$/i.test(ct))||
    (/^word\/media\//.test(path)&&/^image\//.test(ct))
  );
}
function mentionsRelationship(xml:string,id:string):boolean{
  // Across all MC branches and foreign namespaces, including escaped values.
  // False positives retain data.
  if(xml.includes(id))return true;
  const pending=[parse(xml).documentElement!];
  while(pending.length){
    const el=pending.pop()!;
    if(Array.from(el.attributes).some(a=>a.value.includes(id)))return true;
    for(const n of Array.from(el.childNodes)){
      if(n.nodeType===1)pending.push(n as XmlElement);
      else if(n.nodeValue?.includes(id))return true;
    }
  }
  return false;
}
function sameEdge(e:Edge,r:EditorOpcRelationship){
  return e.id===r.id&&e.type===r.type&&e.mode===(r.targetMode??"Internal")&&e.resolved===r.resolvedTarget;
}
/** Deletion-local graph cut, not global garbage collection. Only called after
 * the mandatory intent audit. All retained parts are roots, even orphans. */
export function planOpaqueDependencyPruning(source:EditorDocxSourcePackage,output:EditorDocxSourcePackage,intents:readonly Intent[]):OpaquePruningPlan{
  const empty=(skippedReason?:string):OpaquePruningPlan=>({removeEdges:[],removeParts:[],...(skippedReason?{skippedReason}:{})});
  if(!intents.length)return empty();
  try{
    if(source.mainDocumentPart!==output.mainDocumentPart)return empty("Main part changed");
    if(Object.keys(output.parts).some(p=>p.startsWith("_xmlsignatures/")))return empty("Signed package");
    const inventory=inspectDocxOpaqueObjects(source);
    const candidates=new Set<string>(),idSet=new Set<string>();
    for(const intent of intents){
      const matches=inventory.objects.filter(o=>o.signature===intent.signature);
      const object=matches.length===1?matches[0]:undefined;
      if(!object||object.ownerPath!==source.mainDocumentPart||object.ownerPath!==intent.ownerPath||object.ordinal!==intent.ordinal||object.issues.length)return empty("Ambiguous deletion intent");
      for(const path of object.partPaths)if(safeCandidate(path,source,output))candidates.add(path);
      for(const id of object.relationshipIds)idSet.add(id);
    }
    if(!candidates.size)return empty();
    const edges=graph(output);
    const owner=output.parts[output.mainDocumentPart];
    if(!owner||owner.kind!=="xml")return empty("Missing main story XML");
    const removed=new Set<Edge>();
    for(const edge of edges){
      if(edge.owner!==output.mainDocumentPart||edge.mode!=="Internal"||!edge.resolved||!candidates.has(edge.resolved)||!idSet.has(edge.id)||!explicitTypes.has(edge.type))continue;
      const original=source.parts[source.mainDocumentPart]?.relationships?.find(r=>sameEdge(edge,r));
      if(!original||mentionsRelationship(owner.data,edge.id))continue;
      removed.add(edge);
    }
    if(!removed.size)return empty();
    const byOwner=new Map<string|null,Edge[]>();
    for(const edge of edges)if(!removed.has(edge)){
      const list=byOwner.get(edge.owner)??[];list.push(edge);byOwner.set(edge.owner,list);
    }
    const live=new Set<string>();
    const queue:(string|null)[]=[null,...Object.keys(output.parts).filter(p=>!candidates.has(p)&&p!==OPC_CONTENT_TYPES_PATH&&getOpcRelationshipOwnerPath(p)===undefined)];
    for(let i=0;i<queue.length;i++){
      const path=queue[i]!;
      if(path!==null){if(live.has(path))continue;live.add(path);}
      for(const edge of byOwner.get(path)??[])if(edge.resolved&&!live.has(edge.resolved))queue.push(edge.resolved);
    }
    const affected=new Set<string>(),pending=[...removed].flatMap(e=>e.resolved?[e.resolved]:[]);
    for(let i=0;i<pending.length;i++){
      const path=pending[i]!;
      if(!candidates.has(path)||affected.has(path))continue;
      affected.add(path);
      for(const e of byOwner.get(path)??[])if(e.resolved)pending.push(e.resolved);
    }
    const removeParts=[...affected].filter(p=>!live.has(p)).sort();
    const doomed=new Set(removeParts);
    for(const e of edges)if(e.resolved&&doomed.has(e.resolved)&&!removed.has(e)&&(e.owner===null||!doomed.has(e.owner)))return empty("Retained incoming edge");
    return {removeEdges:[...removed],removeParts};
  }catch(error){return empty(error instanceof Error?error.message:String(error));}
}
/** Apply to a new output ZIP only. Never mutate the original source snapshot. */
export async function applyOpaqueDependencyPruning(buffer:ArrayBuffer,plan:OpaquePruningPlan):Promise<ArrayBuffer>{
  if(!plan.removeParts.length&&!plan.removeEdges.length)return buffer;
  const zip=await JSZip.loadAsync(buffer);
  const serializer=new XMLSerializer();
  const read=async(path:string)=>{
    const entry=zip.file(path);if(!entry)throw Error("Missing planned OPC part "+path);
    return parse(await entry.async("string"));
  };
  for(const path of new Set(plan.removeEdges.map(e=>e.relPath))){
    const doc=await read(path),root=doc.documentElement!;
    const ids=new Set(plan.removeEdges.filter(e=>e.relPath===path).map(e=>e.id));
    for(const el of elementChildren(root))if(ids.has(el.getAttribute("Id")??"")){ids.delete(el.getAttribute("Id")!);root.removeChild(el);}
    if(ids.size)throw Error("OPC relationship plan became stale");
    if(elementChildren(root).length)zip.file(path,serializer.serializeToString(doc));else zip.remove(path);
  }
  const doomed=new Set(plan.removeParts);
  for(const [path,entry] of Object.entries(zip.files)){
    if(entry.dir)continue;
    const owner=getOpcRelationshipOwnerPath(path);
    if(doomed.has(path)||(typeof owner==="string"&&doomed.has(owner)))zip.remove(path);
  }
  const ct=await read(OPC_CONTENT_TYPES_PATH),root=ct.documentElement!;
  if(root.namespaceURI!==OPC_CONTENT_TYPES_NAMESPACE||root.localName!=="Types")throw Error("Invalid OPC content types");
  for(const el of elementChildren(root))if(el.namespaceURI===OPC_CONTENT_TYPES_NAMESPACE&&el.localName==="Override"&&doomed.has((el.getAttribute("PartName")??"").replace(/^\//,"")))root.removeChild(el);
  zip.file(OPC_CONTENT_TYPES_PATH,serializer.serializeToString(ct));
  return zip.generateAsync({type:"arraybuffer"});
}
