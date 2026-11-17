import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorDocxSourcePackage, EditorOpcRelationship, EditorOpaqueRunData } from "@/core/model.js";
import { resolveOpcRelationshipTarget } from "@/ooxml/opc/packageXml.js";
import { inspectDocxOpaqueObjects, projectOpaqueRunElement } from "./opaqueObjects.js";
import { validateOpaqueTransferManifest, type OpaqueTransferPart } from "./opaqueTransferManifest.js";

const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WP="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const C="http://schemas.openxmlformats.org/drawingml/2006/chart";
const R="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const STRICT_R="http://purl.oclc.org/ooxml/officeDocument/relationships";
const O="urn:schemas-microsoft-com:office:office";
const WP14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing";
const XMLNS="http://www.w3.org/2000/xmlns/";
const fail=(message:string):never=>{throw Error("Opaque insertion rejected: "+message);};
function parse(xml:string):XmlElement{
  if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))return fail("unsafe XML declaration");
  const root=new DOMParser({onError:()=>fail("malformed XML")}).parseFromString(xml,"application/xml").documentElement;
  if(!root)return fail("missing XML root");
  return root;
}
function all(root:XmlElement):XmlElement[]{
  const result:XmlElement[]=[],queue=[root];
  for(let i=0;i<queue.length;i++){
    const el=queue[i]!;result.push(el);
    for(const n of Array.from(el.childNodes))if(n.nodeType===1)queue.push(n as XmlElement);
  }
  return result;
}
function relsPath(path:string):string{
  const slash=path.lastIndexOf("/");
  return path.slice(0,slash+1)+"_rels/"+path.slice(slash+1)+".rels";
}
function relative(owner:string,target:string):string{
  const from=owner.split("/").slice(0,-1),to=target.split("/");
  while(from.length&&to.length&&from[0]===to[0]){from.shift();to.shift();}
  const uri="../".repeat(from.length)+to.join("/");
  if(resolveOpcRelationshipTarget(owner,uri)!==target)return fail("unrepresentable relative target");
  return uri;
}
function safePath(path:string):boolean{
  return /^[A-Za-z0-9_.\-/]+$/.test(path)&&!path.split("/").some(s=>!s||s==="."||s==="..");
}
const extensions:Record<string,string>={
  "application/vnd.openxmlformats-officedocument.drawingml.chart+xml":"xml",
  "application/vnd.ms-office.chartstyle+xml":"xml",
  "application/vnd.ms-office.chartcolorstyle+xml":"xml",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"xlsx",
  "image/png":"png","image/jpeg":"jpg","image/gif":"gif","image/bmp":"bmp","image/tiff":"tiff",
};
export interface OpaqueTransferInsertionPlan {
  destinationOwner:string;
  destinationRun:EditorOpaqueRunData;
  addedRelationships:EditorOpcRelationship[];
  addedParts:OpaqueTransferPart[];
  contentTypeOverrides:Record<string,string>;
  pathMapping:Array<{from:string;to:string}>;
  relationshipMapping:Array<{from:string;to:string}>;
  drawingId:number;
}
/** Pure plan for one chart inserted into an EXISTING Transitional main story.
 * Does not mutate either package, write ZIPs, authorize export or accept paste.
 * Recheck every reservation against the actual rebuilt output before applying. */
export function planOpaqueTransferInsertion(value:unknown,destination:EditorDocxSourcePackage):OpaqueTransferInsertionPlan{
  const manifest=validateOpaqueTransferManifest(value);
  const owner=destination.mainDocumentPart,story=Object.hasOwn(destination.parts,owner)?destination.parts[owner]:undefined;
  if(!safePath(owner)||!story||story.kind!=="xml")return fail("missing destination main story");
  const storyRoot=parse(story.data);
  if(storyRoot.namespaceURI!==W||storyRoot.localName!=="document")return fail("only Transitional main story is supported");
  if(inspectDocxOpaqueObjects(destination).diagnostics.some(d=>d.level==="error"))return fail("destination opaque inspection errors");
  const occupied=new Set<string>();
  const reserve=(path:string):void=>{
    if(path!=="[Content_Types].xml"&&!safePath(path))return fail("ambiguous destination OPC path");
    occupied.add(path.toLowerCase());
  };
  // Reserve actual parts, their relationship sidecars, explicit overrides,
  // and even dangling relationship targets. Never revive an unrelated edge.
  for(const [path,part] of Object.entries(destination.parts)){
    if(part.path!==path)return fail("inconsistent destination part path");
    reserve(path);reserve(relsPath(path));
    for(const edge of part.relationships??[]){
      if(edge.targetMode==="External")continue;
      if(!edge.resolvedTarget||resolveOpcRelationshipTarget(path,edge.target)!==edge.resolvedTarget)return fail("unresolved destination relationship");
      reserve(edge.resolvedTarget);
    }
  }
  for(const path of Object.keys(destination.contentTypes.overrides))reserve(path);
  for(const edge of destination.rootRelationships){
    if(edge.targetMode==="External")continue;
    if(!edge.resolvedTarget||resolveOpcRelationshipTarget(null,edge.target)!==edge.resolvedTarget)return fail("unresolved root relationship");
    reserve(edge.resolvedTarget);
  }
  if(new Set(Object.keys(destination.parts).map(p=>p.toLowerCase())).size!==Object.keys(destination.parts).length)return fail("aliased destination parts");
  // Reserve a whole isolated directory, including every descendant and
  // potential .rels sidecar. This also avoids conventional Oasis image names.
  let prefix="";
  for(let i=1;i<=100000;i++){
    const candidate="word/oasis-transfer-"+i;
    if(![...occupied].some(p=>p===candidate||p.startsWith(candidate+"/")||candidate.startsWith(p+"/"))){prefix=candidate;break;}
  }
  if(!prefix)return fail("part namespace exhausted");
  const paths=new Map(manifest.parts.map((p,i)=>[p.path,prefix+"/part-"+(i+1)+"."+extensions[p.contentType]]));
  const remapEdge=(edge:EditorOpcRelationship,newOwner:string,id=edge.id):EditorOpcRelationship=>{
    const target=paths.get(edge.resolvedTarget!);
    if(!target)return fail("unmapped dependency");
    return {...edge,id,target:relative(newOwner,target),resolvedTarget:target,targetMode:"Internal"};
  };
  const addedParts=manifest.parts.map(p=>{
    const path=paths.get(p.path)!;
    return {...p,path,relationships:p.relationships.map(r=>remapEdge(r,path))};
  });
  const occupiedIds=new Set((story.relationships??[]).map(r=>r.id));
  if(occupiedIds.size!==(story.relationships??[]).length)return fail("duplicate destination relationship ID");
  // Existing markup may contain unresolved/extension references as well.
  const storyValues=all(storyRoot).flatMap(el=>Array.from(el.attributes).map(a=>a.value));
  let serial=1;
  const relationshipMapping=manifest.relationships.map(edge=>{
    let id:string;
    do{id="rIdOasisTransfer"+serial++;}while(occupiedIds.has(id)||story.data.includes(id)||storyValues.some(v=>v.includes(id)));
    occupiedIds.add(id);
    return {from:edge.id,to:id};
  });
  const ids=new Map(relationshipMapping.map(r=>[r.from,r.to]));
  const addedRelationships=manifest.relationships.map(edge=>remapEdge(edge,owner,ids.get(edge.id)!));
  const drawing=parse(manifest.fragmentXml),nodes=all(drawing);
  const properties=nodes.filter(el=>el.namespaceURI===WP&&el.localName==="docPr");
  const charts=nodes.filter(el=>el.namespaceURI===C&&el.localName==="chart");
  if(properties.length!==1||charts.length!==1||
     !ids.has(charts[0]!.getAttributeNS(R,"id")??""))return fail("ambiguous chart or drawing identity");
  // Only the known c:chart/@r:id may be remapped by this first plan.
  // Reject unfamiliar identity-bearing attributes rather than guessing.
  for(const el of nodes){
    if(el!==drawing&&el.namespaceURI===W)return fail("nested WordprocessingML in chart drawing");
    for(const attr of Array.from(el.attributes)){
      if(attr.namespaceURI===WP14)return fail("unsupported extended drawing identity");
      const relationship=attr.namespaceURI===R||attr.namespaceURI===STRICT_R||(attr.namespaceURI===O&&attr.localName==="relid");
      if(relationship){
        if(el!==charts[0]||attr.namespaceURI!==R||attr.localName!=="id"||!ids.has(attr.value))return fail("unknown chart relationship reference");
        el.setAttributeNS(R,attr.name,ids.get(attr.value)!);
      }else if(attr.namespaceURI!==XMLNS&&ids.has(attr.value)){
        return fail("unknown attribute may reference a relationship");
      }
    }
  }
  const drawingIds=new Set<number>();
  for(const p of Object.values(destination.parts)){
    if(p.kind!=="xml"||!p.data.includes("docPr"))continue;
    const root=p.path===owner?storyRoot:parse(p.data);
    for(const el of all(root)){
      if(el.namespaceURI!==WP||el.localName!=="docPr")continue;
      const raw=el.getAttribute("id")??"";
      if(!/^\d+$/.test(raw)||Number(raw)>0xffffffff)return fail("invalid destination drawing ID");
      drawingIds.add(Number(raw));
    }
  }
  // The current normal image and text-box serializers allocate low IDs.
  // Reserving this high, signed-safe range minimizes overlap; the final
  // output must still independently check global drawing ID uniqueness.
  let drawingId=0x70000000;
  while(drawingIds.has(drawingId)&&drawingId<0x7fffffff)drawingId++;
  if(drawingIds.has(drawingId))return fail("drawing identity exhausted");
  properties[0]!.setAttribute("id",String(drawingId));
  const run=projectOpaqueRunElement(drawing);
  if(!run)return fail("chart projection lost");
  // Revalidate the actual REMAPPED graph with exactly the same detached
  // transport rules, including all payload content types and relationship IDs.
  const verified=validateOpaqueTransferManifest({
    ...manifest,ownerPath:owner,fragmentXml:run.fragmentXml,signature:run.signature,
    relationships:addedRelationships,parts:addedParts,
  });
  return {
    destinationOwner:owner,destinationRun:run,addedRelationships:verified.relationships,
    addedParts:verified.parts,
    contentTypeOverrides:Object.fromEntries(verified.parts.map(p=>[p.path,p.contentType])),
    pathMapping:[...paths].map(([from,to])=>({from,to})),relationshipMapping,drawingId,
  };
}
