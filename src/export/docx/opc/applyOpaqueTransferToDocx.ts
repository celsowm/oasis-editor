import JSZip from "jszip";
import { DOMParser, XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorDocxSourcePackage, EditorOpcRelationship } from "@/core/model.js";
import { captureDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { auditOpaqueObjectPreservation, inspectDocxOpaqueObjects, OpaqueObjectPreservationError } from "@/ooxml/word/opaqueObjects.js";
import { planOpaqueTransferInsertion, type OpaqueTransferInsertionPlan } from "@/ooxml/word/opaqueTransferInsertion.js";
import { OPC_CONTENT_TYPES_NAMESPACE as CT, OPC_RELATIONSHIPS_NAMESPACE as R, serializeOpcRelationships } from "@/ooxml/opc/packageXml.js";

const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WP="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const TYPES="[Content_Types].xml";
const RELS_TYPE="application/vnd.openxmlformats-package.relationships+xml";
const fail=(message:string):never=>{throw Error("Opaque transfer application rejected: "+message);};
function parse(xml:string,namespace:string,name:string){
  if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))return fail("unsafe XML declaration");
  const doc=new DOMParser({onError:()=>fail("malformed XML")}).parseFromString(xml,"application/xml");
  if(doc.documentElement?.namespaceURI!==namespace||doc.documentElement.localName!==name)return fail("unexpected XML root");
  return doc;
}
function children(el:XmlElement):XmlElement[]{
  return Array.from(el.childNodes).filter((node):node is XmlElement=>node.nodeType===1);
}
function relsPath(owner:string):string{
  const slash=owner.lastIndexOf("/");
  return owner.slice(0,slash+1)+"_rels/"+owner.slice(slash+1)+".rels";
}
function serialize(doc:Parameters<XMLSerializer["serializeToString"]>[0]):string{
  return new XMLSerializer().serializeToString(doc);
}
function appendRelationships(xml:string,added:EditorOpcRelationship[]):string{
  const doc=parse(xml,R,"Relationships"),root=doc.documentElement!;
  const ids=new Set<string>();
  for(const el of children(root)){
    const id=el.getAttribute("Id")??"";
    if(el.namespaceURI!==R||el.localName!=="Relationship"||!id||ids.has(id)||!el.getAttribute("Type")||!el.getAttribute("Target"))return fail("ambiguous existing relationships");
    const mode=el.getAttribute("TargetMode");
    if(mode&&mode!=="Internal"&&mode!=="External")return fail("unknown relationship mode");
    ids.add(id);
  }
  for(const edge of added){
    if(ids.has(edge.id))return fail("relationship collision");
    ids.add(edge.id);
    const el=doc.createElementNS(R,root.prefix?root.prefix+":Relationship":"Relationship");
    el.setAttribute("Id",edge.id);el.setAttribute("Type",edge.type);el.setAttribute("Target",edge.target);
    root.appendChild(el);
  }
  return serialize(doc);
}
function appendTypes(xml:string,plan:OpaqueTransferInsertionPlan):string{
  const doc=parse(xml,CT,"Types"),root=doc.documentElement!;
  const overrides=new Set<string>(),defaults=new Set<string>();
  let relsType:string|undefined;
  for(const el of children(root)){
    if(el.namespaceURI!==CT)return fail("unexpected content type element");
    const type=el.getAttribute("ContentType")??"";
    if(!type)return fail("missing content type");
    if(el.localName==="Default"){
      const extension=(el.getAttribute("Extension")??"").toLowerCase();
      if(!extension||defaults.has(extension))return fail("duplicate or invalid content type default");
      defaults.add(extension);
      if(extension==="rels")relsType=type;
    }else if(el.localName==="Override"){
      const name=(el.getAttribute("PartName")??"").toLowerCase();
      if(!name.startsWith("/")||overrides.has(name))return fail("duplicate or invalid content type override");
      overrides.add(name);
    }else return fail("unknown content type element");
  }
  if(relsType&&relsType!==RELS_TYPE)return fail("inconsistent relationship content type");
  if(!relsType){
    const el=doc.createElementNS(CT,root.prefix?root.prefix+":Default":"Default");
    el.setAttribute("Extension","rels");el.setAttribute("ContentType",RELS_TYPE);
    root.insertBefore(el,children(root).find(child=>child.localName==="Override")??null);
  }
  for(const [path,type] of Object.entries(plan.contentTypeOverrides)){
    const name="/"+path;
    if(overrides.has(name.toLowerCase()))return fail("content type override collision");
    overrides.add(name.toLowerCase());
    const el=doc.createElementNS(CT,root.prefix?root.prefix+":Override":"Override");
    el.setAttribute("PartName",name);el.setAttribute("ContentType",type);root.appendChild(el);
  }
  return serialize(doc);
}
function equalBytes(a:Uint8Array,b:Uint8Array):boolean{
  return a.byteLength===b.byteLength&&a.every((v,i)=>v===b[i]);
}
function rejectAmbiguousArchive(zip:JSZip):void{
  const names=new Set<string>();
  for(const [path,entry] of Object.entries(zip.files)){
    if(entry.dir)continue;
    const key=path.toLowerCase();
    if(names.has(key)||entry.unsafeOriginalName!==undefined&&entry.unsafeOriginalName!==path)return fail("ambiguous ZIP entry");
    names.add(key);
    if(key.startsWith("_xmlsignatures/"))return fail("signed package");
  }
}
function assertNotSigned(source:EditorDocxSourcePackage):void{
  if([...source.rootRelationships,...Object.values(source.parts).flatMap(p=>p.relationships??[])].some(r=>r.type.includes("digital-signature"))||
    [...Object.values(source.contentTypes.defaults),...Object.values(source.contentTypes.overrides)].some(t=>t.includes("digital-signature")))return fail("signed package");
}
export interface AppliedOpaqueTransfer {
  buffer:ArrayBuffer;
  plan:OpaqueTransferInsertionPlan;
}
/** Standalone package-level integration step, not an editor paste command.
 * Recompute from the actual destination bytes; append to one existing direct
 * body paragraph. Only the main story, its .rels, and [Content_Types].xml
 * may change. Return nothing on ANY failed preflight or postcondition.
 * This is deliberately not exported through the editor public API yet. */
export async function applyOpaqueTransferToDocx(
  destination:ArrayBuffer,manifest:unknown,paragraphIndex:number,
):Promise<AppliedOpaqueTransfer>{
  const originalZip=await JSZip.loadAsync(destination);
  rejectAmbiguousArchive(originalZip);
  const source=await captureDocxSourcePackage(destination);
  assertNotSigned(source);
  const plan=planOpaqueTransferInsertion(manifest,source);
  const owner=plan.destinationOwner,ownerPart=source.parts[owner]!;
  const doc=parse(ownerPart.data,W,"document"),root=doc.documentElement!;
  const bodies=children(root).filter(el=>el.namespaceURI===W&&el.localName==="body");
  if(bodies.length!==1)return fail("ambiguous document body");
  const paragraphs=children(bodies[0]!).filter(el=>el.namespaceURI===W&&el.localName==="p");
  if(!Number.isSafeInteger(paragraphIndex)||paragraphIndex<0||paragraphIndex>=paragraphs.length)return fail("invalid paragraph index");
  const paragraph=paragraphs[paragraphIndex]!;
  const fragment=parse(plan.destinationRun.fragmentXml,W,"drawing");
  const run=doc.createElementNS(W,root.prefix?root.prefix+":r":"r");
  run.appendChild(doc.importNode(fragment.documentElement!,true));
  paragraph.appendChild(run);
  const ownerXml=serialize(doc);
  const ownerRels=relsPath(owner);
  const priorRels=await originalZip.file(ownerRels)?.async("string")??'<Relationships xmlns="'+R+'"/>';
  const relationshipsXml=appendRelationships(priorRels,plan.addedRelationships);
  const priorTypes=await originalZip.file(TYPES)?.async("string");
  if(!priorTypes)return fail("missing content types");
  const typesXml=appendTypes(priorTypes,plan);
  // An explicit expected graph derives from the original source plus the
  // exact authorized insertion, not from the generated output's inventory.
  const expected:EditorDocxSourcePackage={
    ...source,
    parts:{...source.parts,[owner]:{...ownerPart,data:ownerXml,relationships:[...(ownerPart.relationships??[]),...plan.addedRelationships]}},
    contentTypes:{defaults:{...source.contentTypes.defaults,rels:RELS_TYPE},overrides:{...source.contentTypes.overrides,...plan.contentTypeOverrides}},
  };
  for(const p of plan.addedParts)expected.parts[p.path]={...p,originalHash:""};
  const before=inspectDocxOpaqueObjects(source),predicted=inspectDocxOpaqueObjects(expected);
  if(predicted.diagnostics.some(d=>d.level==="error")||predicted.objects.length!==before.objects.length+1)return fail("unexpected predicted inventory");
  const inserted=predicted.objects.filter(o=>o.ownerPath===owner&&o.signature===plan.destinationRun.signature);
  if(inserted.length!==1||JSON.stringify(inserted[0]!.partPaths)!==JSON.stringify(plan.addedParts.map(p=>p.path).sort()))return fail("predicted inserted closure mismatch");
  const originals=predicted.objects.filter(o=>o!==inserted[0]);
  // Original ordinals can shift when the selected paragraph precedes an
  // existing object. Compare identity multiset and full closure, not ordinal.
  const objectKey=(o:typeof originals[number])=>JSON.stringify([o.ownerPath,o.kind,o.signature,o.edges,o.partPaths]);
  if(JSON.stringify(originals.map(objectKey).sort())!==JSON.stringify(before.objects.map(objectKey).sort()))return fail("predicted loss of original objects");
  const drawingCount=Array.from(root.getElementsByTagNameNS(WP,"docPr")).filter(el=>Number(el.getAttribute("id"))===plan.drawingId).length;
  if(drawingCount!==1)return fail("drawing ID collision");
  const zip=await JSZip.loadAsync(destination);
  const addedNames=new Set<string>(),existingNames=new Set(Object.keys(zip.files).map(p=>p.toLowerCase()));
  const add=(path:string,data:string,base64=false):void=>{
    const key=path.toLowerCase();
    if(existingNames.has(key)||addedNames.has(key))return fail("part collision");
    addedNames.add(key);zip.file(path,data,{base64});
  };
  for(const p of plan.addedParts){
    add(p.path,p.data,p.encoding==="base64");
    if(p.relationships.length)add(relsPath(p.path),serializeOpcRelationships(p.relationships));
  }
  if(!originalZip.file(ownerRels))addedNames.add(ownerRels.toLowerCase());
  zip.file(owner,ownerXml);zip.file(ownerRels,relationshipsXml);zip.file(TYPES,typesXml);
  const buffer=await zip.generateAsync({type:"arraybuffer",compression:"DEFLATE"});
  const actualZip=await JSZip.loadAsync(buffer);
  rejectAmbiguousArchive(actualZip);
  const actual=await captureDocxSourcePackage(buffer);
  const diagnostics=auditOpaqueObjectPreservation(expected,actual);
  if(diagnostics.length)throw new OpaqueObjectPreservationError(diagnostics);
  // All existing streams outside the three authorized control/story parts
  // must survive byte-for-byte, including unrelated unknown binary parts.
  const changed=new Set([owner,ownerRels,TYPES]);
  for(const [path,entry] of Object.entries(originalZip.files)){
    if(entry.dir||changed.has(path))continue;
    const other=actualZip.file(path);
    if(!other||!equalBytes(await entry.async("uint8array"),await other.async("uint8array")))return fail("existing part changed: "+path);
  }
  for(const [path,entry] of Object.entries(actualZip.files)){
    if(!entry.dir&&!originalZip.file(path)&&!addedNames.has(path.toLowerCase()))return fail("unexpected added part: "+path);
  }
  for(const p of plan.addedParts){
    const part=actual.parts[p.path];
    if(!part||part.contentType!==p.contentType||part.kind!==p.kind||part.encoding!==p.encoding||part.data!==p.data)return fail("copied payload mismatch");
  }
  for(const [path,part] of Object.entries(source.parts)){
    if(actual.parts[path]?.contentType!==part.contentType)return fail("existing part content type changed");
  }
  // The relationship content-type default may be added to an incomplete
  // package only if doing so does not change any existing part type.
  for(const [extension,type] of Object.entries(source.contentTypes.defaults)){
    if(actual.contentTypes.defaults[extension]!==type)return fail("existing default changed");
  }
  for(const [path,type] of Object.entries(source.contentTypes.overrides)){
    if(actual.contentTypes.overrides[path]!==type)return fail("existing override changed");
  }
  const actualRels=actual.parts[owner]?.relationships??[],wantedRels=expected.parts[owner]!.relationships??[];
  if(JSON.stringify(actualRels)!==JSON.stringify(wantedRels))return fail("owner relationships changed");
  return {buffer,plan};
}
